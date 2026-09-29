import { consultar, ejecutar, query } from '../config/conexion.js'
import type { Cliente } from './tipos.js'

interface FilaCliente {
  IdCliente: number
  Dni: string | null
  Nombres: string | null
  Direccion: string | null
  Estado: string | null
}

const CAMPOS = '`IdCliente`, `Dni`, `Nombres`, `Direccion`, `Estado`'

function mapear(fila: FilaCliente): Cliente {
  return {
    id: fila.IdCliente,
    dni: fila.Dni ?? '',
    nom: fila.Nombres ?? '',
    dir: fila.Direccion ?? '',
    es: fila.Estado ?? '',
  }
}

const CLIENTE_VACIO: Cliente = { id: 0, dni: '', nom: '', dir: '', es: '' }

export class ClienteDAO {
  /** Puerto de `ClienteDAO.buscar(dni)`. */
  async buscar(dni: string): Promise<Cliente> {
    const fila = await consultar<FilaCliente>(`SELECT ${CAMPOS} FROM \`cliente\` WHERE \`Dni\` = ? LIMIT 1`, [dni])
    return fila ? mapear(fila) : { ...CLIENTE_VACIO }
  }

  async listar(): Promise<Cliente[]> {
    const filas = await query<FilaCliente>(`SELECT ${CAMPOS} FROM \`cliente\` ORDER BY \`IdCliente\``)
    return filas.map(mapear)
  }

  async agregar(cliente: Cliente): Promise<number> {
    const resultado = await ejecutar(
      'INSERT INTO `cliente` (`Dni`, `Nombres`, `Direccion`, `Estado`) VALUES (?, ?, ?, ?)',
      [cliente.dni, cliente.nom, cliente.dir, cliente.es],
    )
    return resultado.insertId
  }

  async listarId(id: number): Promise<Cliente | null> {
    const fila = await consultar<FilaCliente>(`SELECT ${CAMPOS} FROM \`cliente\` WHERE \`IdCliente\` = ?`, [id])
    return fila ? mapear(fila) : null
  }

  async actualizar(cliente: Cliente): Promise<number> {
    const resultado = await ejecutar(
      'UPDATE `cliente` SET `Dni` = ?, `Nombres` = ?, `Direccion` = ?, `Estado` = ? WHERE `IdCliente` = ?',
      [cliente.dni, cliente.nom, cliente.dir, cliente.es, cliente.id],
    )
    return resultado.affectedRows
  }

  async delete(id: number): Promise<number> {
    const resultado = await ejecutar('DELETE FROM `cliente` WHERE `IdCliente` = ?', [id])
    return resultado.affectedRows
  }
}
