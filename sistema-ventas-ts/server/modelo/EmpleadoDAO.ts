import bcrypt from 'bcryptjs'
import { consultar, ejecutar, query } from '../config/conexion.js'
import type { Empleado } from './tipos.js'

interface FilaEmpleado {
  IdEmpleado: number
  Dni: string | null
  Nombres: string | null
  Telefono: string | null
  Estado: string | null
  User: string | null
  Password: string | null
}

const CAMPOS = '`IdEmpleado`, `Dni`, `Nombres`, `Telefono`, `Estado`, `User`'

function mapear(fila: FilaEmpleado): Empleado {
  return {
    id: fila.IdEmpleado,
    dni: fila.Dni ?? '',
    nom: fila.Nombres ?? '',
    tel: fila.Telefono ?? '',
    estado: fila.Estado ?? '',
    user: fila.User ?? '',
  }
}

export class EmpleadoDAO {
  /**
   * Puerto de `EmpleadoDAO.validar(user, dni)`.
   * El proyecto Java usaba el DNI como contraseña; aquí se valida contra el
   * hash bcrypt de la columna `Password` (y se acepta el DNI si no hay hash).
   */
  async validar(user: string, pass: string): Promise<Empleado | null> {
    const fila = await consultar<FilaEmpleado>(
      `SELECT ${CAMPOS}, \`Password\` FROM \`empleado\` WHERE \`User\` = ? LIMIT 1`,
      [user],
    )
    if (!fila) return null

    const hash = fila.Password
    const coincide = hash ? await bcrypt.compare(pass, hash) : fila.Dni === pass
    return coincide ? mapear(fila) : null
  }

  async listar(): Promise<Empleado[]> {
    const filas = await query<FilaEmpleado>(`SELECT ${CAMPOS} FROM \`empleado\` ORDER BY \`IdEmpleado\``)
    return filas.map(mapear)
  }

  async agregar(empleado: Empleado, password?: string): Promise<number> {
    const hash = password ? await bcrypt.hash(password, 10) : null
    const resultado = await ejecutar(
      'INSERT INTO `empleado` (`Dni`, `Nombres`, `Telefono`, `Estado`, `User`, `Password`) VALUES (?, ?, ?, ?, ?, ?)',
      [empleado.dni, empleado.nom, empleado.tel, empleado.estado, empleado.user, hash],
    )
    return resultado.insertId
  }

  async listarId(id: number): Promise<Empleado | null> {
    const fila = await consultar<FilaEmpleado>(`SELECT ${CAMPOS} FROM \`empleado\` WHERE \`IdEmpleado\` = ?`, [id])
    return fila ? mapear(fila) : null
  }

  async actualizar(empleado: Empleado, password?: string): Promise<number> {
    if (password) {
      const hash = await bcrypt.hash(password, 10)
      const resultado = await ejecutar(
        'UPDATE `empleado` SET `Dni` = ?, `Nombres` = ?, `Telefono` = ?, `Estado` = ?, `User` = ?, `Password` = ? WHERE `IdEmpleado` = ?',
        [empleado.dni, empleado.nom, empleado.tel, empleado.estado, empleado.user, hash, empleado.id],
      )
      return resultado.affectedRows
    }
    const resultado = await ejecutar(
      'UPDATE `empleado` SET `Dni` = ?, `Nombres` = ?, `Telefono` = ?, `Estado` = ?, `User` = ? WHERE `IdEmpleado` = ?',
      [empleado.dni, empleado.nom, empleado.tel, empleado.estado, empleado.user, empleado.id],
    )
    return resultado.affectedRows
  }

  async delete(id: number): Promise<number> {
    const resultado = await ejecutar('DELETE FROM `empleado` WHERE `IdEmpleado` = ?', [id])
    return resultado.affectedRows
  }
}
