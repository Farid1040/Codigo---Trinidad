import { consultar, ejecutar, query } from '../config/conexion.js'
import type { Producto } from './tipos.js'

interface FilaProducto {
  IdProducto: number
  Nombres: string | null
  Precio: number | null
  Stock: number | null
  Estado: string | null
}

const CAMPOS = '`IdProducto`, `Nombres`, `Precio`, `Stock`, `Estado`'

function mapear(fila: FilaProducto): Producto {
  return {
    id: fila.IdProducto,
    nom: fila.Nombres ?? '',
    pre: Number(fila.Precio ?? 0),
    stock: Number(fila.Stock ?? 0),
    estado: fila.Estado ?? '',
  }
}

export class ProductoDAO {
  async listar(): Promise<Producto[]> {
    const filas = await query<FilaProducto>(`SELECT ${CAMPOS} FROM \`producto\` ORDER BY \`IdProducto\``)
    return filas.map(mapear)
  }

  async agregar(producto: Producto): Promise<number> {
    const resultado = await ejecutar(
      'INSERT INTO `producto` (`Nombres`, `Precio`, `Stock`, `Estado`) VALUES (?, ?, ?, ?)',
      [producto.nom, producto.pre, producto.stock, producto.estado],
    )
    return resultado.insertId
  }

  async listarId(id: number): Promise<Producto | null> {
    const fila = await consultar<FilaProducto>(`SELECT ${CAMPOS} FROM \`producto\` WHERE \`IdProducto\` = ?`, [id])
    return fila ? mapear(fila) : null
  }

  async actualizar(producto: Producto): Promise<number> {
    const resultado = await ejecutar(
      'UPDATE `producto` SET `Nombres` = ?, `Precio` = ?, `Stock` = ?, `Estado` = ? WHERE `IdProducto` = ?',
      [producto.nom, producto.pre, producto.stock, producto.estado, producto.id],
    )
    return resultado.affectedRows
  }

  async delete(id: number): Promise<number> {
    const resultado = await ejecutar('DELETE FROM `producto` WHERE `IdProducto` = ?', [id])
    return resultado.affectedRows
  }
}
