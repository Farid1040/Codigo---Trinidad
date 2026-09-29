import mysql from 'mysql2/promise'
import { config } from './env.js'

/**
 * Puerto de la base de datos `db_ventas`.
 *
 * mysql2 lanza un AggregateError con el mensaje vacío cuando falla la conexión
 * inicial; sin normalizarlo el cliente recibe un error sin ninguna pista.
 */
function normalizarError(error: unknown): Error {
  if (error instanceof AggregateError) {
    const causas = (error.errors ?? []).map((causa) => causa?.message).filter(Boolean)
    const base = causas[0] ?? 'la conexión fue rechazada'
    return new Error(`No se pudo conectar con MySQL (${config.db.host}:${config.db.port}): ${base}`)
  }
  return error instanceof Error ? error : new Error(String(error))
}

let pool: mysql.Pool | null = null

export function getPool(): mysql.Pool {
  if (!pool) {
    pool = mysql.createPool({
      host: config.db.host,
      port: config.db.port,
      user: config.db.user,
      password: config.db.password,
      database: config.db.database,
      waitForConnections: true,
      connectionLimit: config.db.poolSize,
      queueLimit: 0,
      charset: 'utf8mb4',
      dateStrings: ['DATE', 'DATETIME'],
    })
  }
  return pool
}

export async function query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  try {
    const [filas] = await getPool().query(sql, params)
    return filas as T[]
  } catch (error) {
    throw normalizarError(error)
  }
}

export async function ejecutar(sql: string, params: any[] = []): Promise<mysql.ResultSetHeader> {
  try {
    const [resultado] = await getPool().execute(sql, params)
    return resultado as mysql.ResultSetHeader
  } catch (error) {
    throw normalizarError(error)
  }
}

export async function consultar<T = any>(sql: string, params: any[] = []): Promise<T | null> {
  const filas = await query<T>(sql, params)
  return filas[0] ?? null
}

export async function enTransaccion<T>(fn: (conexion: mysql.PoolConnection) => Promise<T>): Promise<T> {
  const conexion = await getPool().getConnection()
  try {
    await conexion.beginTransaction()
    const resultado = await fn(conexion)
    await conexion.commit()
    return resultado
  } catch (error) {
    await conexion.rollback()
    throw normalizarError(error)
  } finally {
    conexion.release()
  }
}

export async function verificarConexion(): Promise<{ db: string | null; version: string }> {
  const fila = await consultar<{ db: string | null; version: string }>('SELECT DATABASE() AS db, VERSION() AS version')
  return { db: fila?.db ?? null, version: fila?.version ?? '' }
}

export async function cerrarConexion(): Promise<void> {
  if (!pool) return
  const actual = pool
  pool = null
  await actual.end()
}
