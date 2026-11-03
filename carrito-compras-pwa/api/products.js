const { getPool, sendJson, sendDatabaseError } = require('./_db');

module.exports = async function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return sendJson(response, 405, { message: 'Método no permitido.' });
  }

  try {
    const [rows] = await getPool().execute(
      'SELECT idProducto, Nombres, Foto IS NOT NULL AND OCTET_LENGTH(Foto) > 0 AS TieneFoto, Descripcion, Precio, Stock FROM producto ORDER BY idProducto DESC LIMIT 100'
    );
    const products = rows.map((row) => ({
      idProducto: row.idProducto,
      nombres: row.Nombres,
      foto: row.TieneFoto ? `/api/product-image?id=${row.idProducto}` : null,
      descripcion: row.Descripcion || '',
      precio: row.Precio,
      stock: row.Stock
    }));
    return sendJson(response, 200, { products });
  } catch (error) {
    return sendDatabaseError(response, error);
  }
};
