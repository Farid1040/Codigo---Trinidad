import { consultar, ejecutar, enTransaccion, query } from '../config/conexion.js'
import { numeroSerie, SERIE_INICIAL } from '../config/generarSerie.js'
import type { DetalleVenta, Venta, VentaRegistrada } from './tipos.js'

interface FilaVenta {
  IdVentas: number
  IdCliente: number
  IdEmpleado: number
  NumeroSerie: string | null
  FechaVentas: string | null
  Monto: number | null
  Estado: string | null
}

function mapear(fila: FilaVenta): VentaRegistrada {
  return {
    idVentas: fila.IdVentas,
    idCliente: fila.IdCliente,
    idEmpleado: fila.IdEmpleado,
    numeroSerie: fila.NumeroSerie ?? '',
    fechaVentas: fila.FechaVentas ?? '',
    monto: Number(fila.Monto ?? 0),
    estado: fila.Estado ?? '',
    detalles: [],
  }
}

function fechaDeHoy(): string {
  const hoy = new Date()
  const mes = String(hoy.getMonth() + 1).padStart(2, '0')
  const dia = String(hoy.getDate()).padStart(2, '0')
  return `${hoy.getFullYear()}-${mes}-${dia}`
}

export class VentaDAO {
  /** Puerto de `VentaDAO.GenerarSerie()`. */
  async generarSerie(): Promise<string | null> {
    const fila = await consultar<{ serie: string | null }>('SELECT MAX(`NumeroSerie`) AS serie FROM `ventas`')
    const serie = fila?.serie ?? null
    return serie === '' ? null : serie
  }

  /** Puerto de `VentaDAO.IdVentas()`. */
  async idVentas(): Promise<number> {
    const fila = await consultar<{ id: number | null }>('SELECT MAX(`IdVentas`) AS id FROM `ventas`')
    return Number(fila?.id ?? 0)
  }

  /**
   * Siguiente número de serie disponible, con la misma lógica del controlador
   * Java: si no hay ventas se usa "00000001"; si las hay, se incrementa el
   * último y se rellena a 8 dígitos.
   */
  async siguienteSerie(): Promise<string> {
    const ultima = await this.generarSerie()
    if (ultima === null) return SERIE_INICIAL
    return numeroSerie(Number.parseInt(ultima, 10))
  }

  async guardarVenta(venta: Venta): Promise<number> {
    const resultado = await ejecutar(
      'INSERT INTO `ventas` (`IdCliente`, `IdEmpleado`, `NumeroSerie`, `FechaVentas`, `Monto`, `Estado`) VALUES (?, ?, ?, ?, ?, ?)',
      [venta.idcliente, venta.idempleado, venta.numserie, venta.fecha || fechaDeHoy(), venta.monto, venta.estado],
    )
    return resultado.insertId
  }

  async guardarDetalleVentas(venta: Venta): Promise<number> {
    const resultado = await ejecutar(
      'INSERT INTO `detalle_ventas` (`IdVentas`, `IdProducto`, `Cantidad`, `PrecioVenta`) VALUES (?, ?, ?, ?)',
      [venta.id ?? 0, venta.idproducto, venta.cantidad, venta.precio],
    )
    return resultado.affectedRows
  }

  /**
   * Equivalente a `Controlador?menu=RegistrarVenta&accion=GenerarVenta`:
   * guarda la cabecera y todos sus detalles en una sola transacción.
   */
  async registrarVenta(cabecera: Venta, detalles: DetalleVenta[]): Promise<VentaRegistrada> {
    return enTransaccion(async (conexion) => {
      const [resVenta] = await conexion.execute(
        'INSERT INTO `ventas` (`IdCliente`, `IdEmpleado`, `NumeroSerie`, `FechaVentas`, `Monto`, `Estado`) VALUES (?, ?, ?, ?, ?, ?)',
        [
          cabecera.idcliente,
          cabecera.idempleado,
          cabecera.numserie,
          cabecera.fecha || fechaDeHoy(),
          cabecera.monto,
          cabecera.estado,
        ],
      )
      const idVentas = (resVenta as { insertId: number }).insertId

      for (const detalle of detalles) {
        await conexion.execute(
          'INSERT INTO `detalle_ventas` (`IdVentas`, `IdProducto`, `Cantidad`, `PrecioVenta`) VALUES (?, ?, ?, ?)',
          [idVentas, detalle.idProducto, detalle.cantidad, detalle.precioVenta],
        )
      }

      return {
        idVentas,
        idCliente: cabecera.idcliente,
        idEmpleado: cabecera.idempleado,
        numeroSerie: cabecera.numserie,
        fechaVentas: cabecera.fecha || fechaDeHoy(),
        monto: cabecera.monto,
        estado: cabecera.estado,
        detalles,
      }
    })
  }

  async listar(limite = 50): Promise<VentaRegistrada[]> {
    const filas = await query<FilaVenta>(
      `SELECT \`IdVentas\`, \`IdCliente\`, \`IdEmpleado\`, \`NumeroSerie\`, \`FechaVentas\`, \`Monto\`, \`Estado\`
         FROM \`ventas\` ORDER BY \`IdVentas\` DESC LIMIT ?`,
      [limite],
    )
    return filas.map(mapear)
  }

  async listarId(id: number): Promise<VentaRegistrada | null> {
    const fila = await consultar<FilaVenta>(
      `SELECT \`IdVentas\`, \`IdCliente\`, \`IdEmpleado\`, \`NumeroSerie\`, \`FechaVentas\`, \`Monto\`, \`Estado\`
         FROM \`ventas\` WHERE \`IdVentas\` = ?`,
      [id],
    )
    return fila ? mapear(fila) : null
  }

  async listarDetalle(idVentas: number): Promise<DetalleVenta[]> {
    return query<DetalleVenta>(
      `SELECT d.\`IdVentas\`, d.\`IdProducto\`, d.\`Cantidad\`, d.\`PrecioVenta\`, p.\`Nombres\` AS \`descripcion\`
         FROM \`detalle_ventas\` d
         JOIN \`producto\` p ON p.\`IdProducto\` = d.\`IdProducto\`
        WHERE d.\`IdVentas\` = ?
        ORDER BY d.\`IdDetalleVentas\``,
      [idVentas],
    )
  }
}
