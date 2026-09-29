import { config as loadDotenv } from 'dotenv'
import { fileURLToPath } from 'node:url'

loadDotenv({ path: fileURLToPath(new URL('../../.env', import.meta.url)), quiet: true })

function entero(nombre: string, porDefecto: number): number {
  const crudo = process.env[nombre]
  if (crudo === undefined || crudo === '') return porDefecto
  const valor = Number.parseInt(crudo, 10)
  if (Number.isNaN(valor)) {
    throw new Error(`La variable de entorno ${nombre} debe ser un número entero, recibido: "${crudo}"`)
  }
  return valor
}

function texto(nombre: string, porDefecto: string): string {
  const crudo = process.env[nombre]
  return crudo === undefined || crudo === '' ? porDefecto : crudo
}

export const config = {
  puerto: entero('PUERTO_API', 3000),
  db: {
    host: texto('DB_HOST', '127.0.0.1'),
    port: entero('DB_PORT', 3306),
    user: texto('DB_USER', 'root'),
    password: texto('DB_PASSWORD', ''),
    database: texto('DB_NAME', 'db_ventas'),
    poolSize: entero('DB_POOL_SIZE', 5),
  },
} as const
