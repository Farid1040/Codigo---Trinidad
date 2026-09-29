import path from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'
import compression from 'compression'
import { registrarRutasAuth } from './controlador/auth.js'
import { crearRutas } from './controlador/rutas.js'

const raiz = path.resolve(fileURLToPath(new URL('..', import.meta.url)))

const app = express()
app.disable('x-powered-by')
app.use(compression())
app.use(express.json({ limit: '256kb' }))

const auth = express.Router()
registrarRutasAuth(auth)
app.use('/api', auth)
app.use('/api', crearRutas())

const dist = path.join(raiz, 'dist')
app.use(express.static(dist))
app.get(/^(?!\/api\/).*/, (_req, res) => {
  res.sendFile(path.join(dist, 'index.html'))
})

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const mensaje = error instanceof Error ? error.message : 'Error interno del servidor'
  if (!res.headersSent) res.status(500).json({ ok: false, error: mensaje })
})

export default app