import app from './app.js'
import { config } from './config/env.js'
import { cerrarConexion, verificarConexion } from './config/conexion.js'

const servidor = app.listen(config.puerto, () => {
  console.log(`[api] Sistema de Ventas escuchando en http://localhost:${config.puerto}`)
  verificarConexion()
    .then((info) => console.log(`[api] MySQL conectado a "${info.db}" (${info.version})`))
    .catch((error: unknown) =>
      console.error(
        `[api] Sin conexión a MySQL: ${error instanceof Error ? error.message : String(error)}\n` +
          '     Carga la base con:  npm run db:reset',
      ),
    )
})

for (const senal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(senal, () => {
    servidor.close(() => {
      void cerrarConexion().then(() => process.exit(0))
    })
  })
}
