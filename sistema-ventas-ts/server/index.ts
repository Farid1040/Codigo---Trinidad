import path from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'
import compression from 'compression'
import { config } from './config/env.js'
import { cerrarConexion, verificarConexion } from './config/conexion.js'
import { registrarRutasAuth } from './controlador/auth.js'
import { crearRutas } from './controlador/rutas.js'

const raiz = path.resolve(fileURLToPath(new URL('..', import.meta.url)))

const app = express()
app.disable('x-powered-by')
app.use(compression())
app.use(express.json({ limit: '256kb' }))

// Puerto de `Validar` + `Controlador`.
const auth = express.Router()
registrarRutasAuth(auth)
app.use('/api', auth)
app.use('/api', crearRutas())

// En producción el mismo Express sirve el bundle de Vite (npm run build && npm start).
const dist = path.join(raiz, 'dist')
app.use(express.static(dist))
app.get(/^(?!\/api\/).*/, (_req, res) => {
  res.sendFile(path.join(dist, 'index.html'))
})

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const mensaje = error instanceof Error ? error.message : 'Error interno del servidor'
  if (!res.headersSent) res.status(500).json({ ok: false, error: mensaje })
})

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
