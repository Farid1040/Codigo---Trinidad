const { getPool, sendJson, sendDatabaseError } = require('./_db');

function readPayload(request) {
  if (typeof request.body === 'string') {
    try {
      return JSON.parse(request.body);
    } catch {
      return null;
    }
  }
  return request.body && typeof request.body === 'object' ? request.body : null;
}

function validateOrder(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return 'La información del pedido no es válida.';
  const nombres = typeof body.nombres === 'string' ? body.nombres.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const direccion = typeof body.direccion === 'string' ? body.direccion.trim() : '';
  const dni = typeof body.dni === 'string' ? body.dni.trim() : '';

  if (!nombres || nombres.length > 120) return 'Ingresa un nombre válido (máximo 120 caracteres).';
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Ingresa un correo electrónico válido.';
  if (!direccion || direccion.length > 255) return 'Ingresa una dirección válida (máximo 255 caracteres).';
  if (dni && !/^\d{8}$/.test(dni)) return 'El DNI debe tener 8 dígitos.';
  if (!Array.isArray(body.items) || body.items.length < 1 || body.items.length > 30) return 'El carrito debe tener entre 1 y 30 productos.';

  const quantities = new Map();
  for (const item of body.items) {
    if (!item || !Number.isSafeInteger(item.idProducto) || item.idProducto < 1 ||
        !Number.isSafeInteger(item.cantidad) || item.cantidad < 1 || item.cantidad > 20) {
      return 'Uno de los productos o cantidades no es válido.';
    }
    const quantity = (quantities.get(item.idProducto) || 0) + item.cantidad;
    if (quantity > 20) return 'La cantidad máxima por producto es 20 unidades.';
    quantities.set(item.idProducto, quantity);
  }

  return { nombres, email, direccion, dni: dni || null, items: [...quantities].map(([idProducto, cantidad]) => ({ idProducto, cantidad })) };
}

module.exports = async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return sendJson(response, 405, { message: 'Método no permitido.' });
  }

  const order = validateOrder(readPayload(request));
  if (typeof order === 'string') return sendJson(response, 400, { message: order });

  let connection;
  try {
    connection = await getPool().getConnection();
    await connection.beginTransaction();

    const ids = order.items.map((item) => item.idProducto);
    const placeholders = ids.map(() => '?').join(', ');
    const [products] = await connection.execute(
      `SELECT idProducto, Nombres, Precio, Stock FROM producto WHERE idProducto IN (${placeholders}) FOR UPDATE`,
      ids
    );
    const productById = new Map(products.map((product) => [product.idProducto, product]));

    let totalCents = 0;
    for (const item of order.items) {
      const product = productById.get(item.idProducto);
      if (!product) {
        await connection.rollback();
        return sendJson(response, 404, { message: 'Uno de los productos ya no está disponible.' });
      }
      if (product.Stock < item.cantidad) {
        await connection.rollback();
        return sendJson(response, 409, { message: `Stock insuficiente para ${product.Nombres}. Actualiza el carrito e inténtalo nuevamente.` });
      }
      const unitPriceCents = Math.round(Number(product.Precio) * 100);
      if (!Number.isSafeInteger(unitPriceCents) || unitPriceCents < 0) {
        throw new Error(`Precio no válido para el producto ${product.idProducto}.`);
      }
      totalCents += unitPriceCents * item.cantidad;
    }

    if (!Number.isSafeInteger(totalCents) || totalCents < 1 || totalCents > 9999999999) {
      await connection.rollback();
      return sendJson(response, 400, { message: 'El total del pedido no es válido.' });
    }

    const total = (totalCents / 100).toFixed(2);
    const [customerResult] = await connection.execute(
      'INSERT INTO cliente (Dni, Nombres, Direccion, Email, Password) VALUES (?, ?, ?, ?, NULL)',
      [order.dni, order.nombres, order.direccion, order.email]
    );
    const [paymentResult] = await connection.execute('INSERT INTO pago (Monto) VALUES (?)', [total]);
    const [purchaseResult] = await connection.execute(
      'INSERT INTO compras (idCliente, idPago, FechaCompras, Monto, Estado) VALUES (?, ?, NOW(), ?, ?)',
      [customerResult.insertId, paymentResult.insertId, total, 'Pendiente de pago']
    );

    for (const item of order.items) {
      const product = productById.get(item.idProducto);
      const unitPrice = (Math.round(Number(product.Precio) * 100) / 100).toFixed(2);
      await connection.execute(
        'INSERT INTO detalle_compras (idProducto, idCompras, Cantidad, PrecioCompra) VALUES (?, ?, ?, ?)',
        [item.idProducto, purchaseResult.insertId, item.cantidad, unitPrice]
      );
      const [stockResult] = await connection.execute(
        'UPDATE producto SET Stock = Stock - ? WHERE idProducto = ? AND Stock >= ?',
        [item.cantidad, item.idProducto, item.cantidad]
      );
      if (stockResult.affectedRows !== 1) {
        await connection.rollback();
        return sendJson(response, 409, { message: `El stock de ${product.Nombres} cambió. Actualiza el carrito e inténtalo nuevamente.` });
      }
    }

    await connection.commit();
    return sendJson(response, 201, { orderId: purchaseResult.insertId, total: Number(total), status: 'Pendiente de pago' });
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error('No se pudo revertir la transacción del pedido:', rollbackError);
      }
    }
    return sendDatabaseError(response, error);
  } finally {
    if (connection) connection.release();
  }
};
