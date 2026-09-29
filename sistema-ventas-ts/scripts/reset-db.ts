/**
 * Carga (o recarga) `db/db_ventas.sql` en MySQL.
 * Equivale a:  mysql -u root -p < db/db_ventas.sql
 *
 *   npm run db:reset
 */
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import mysql from 'mysql2/promise'
import { config } from '../server/config/env.js'
import { cerrarConexion } from '../server/config/conexion.js'

const archivoSql = fileURLToPath(new URL('../db/db_ventas.sql', import.meta.url))

const conexion = await mysql.createConnection({
  host: config.db.host,
  port: config.db.port,
  user: config.db.user,
  password: config.db.password,
  multipleStatements: true,
  charset: 'utf8mb4',
})

try {
  const sql = await readFile(archivoSql, 'utf8')
  await conexion.query(sql)
  console.log(`[db] db_ventas.sql cargado en ${config.db.host}:${config.db.port}`)
  console.log('[db] Usuarios de prueba (contraseña 123456): emp01, Jo46, Em22')
} catch (error) {
  console.error('[db] Error al cargar el script:', error instanceof Error ? error.message : error)
  process.exitCode = 1
} finally {
  await conexion.end()
  await cerrarConexion()
}
