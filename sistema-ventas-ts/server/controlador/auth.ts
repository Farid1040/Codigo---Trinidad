import { randomUUID } from 'node:crypto'
import type { Request, Response, NextFunction } from 'express'
import { consultar, ejecutar } from '../config/conexion.js'
import { EmpleadoDAO } from '../modelo/EmpleadoDAO.js'
import type { SesionUsuario } from '../modelo/tipos.js'

/**
 * Puerto de `Controlador/Validar.java`.
 *
 * El servlet guardaba al empleado en el `HttpSession`; aquí la sesión es un
 * token opaco persistido en MySQL/TiDB con una caducidad de 30 minutos (el
 * session-timeout del web.xml original).
 */
const CADUCIDAD_MS = 30 * 60 * 1000

const empleadoDAO = new EmpleadoDAO()

async function crearSesion(usuario: SesionUsuario): Promise<string> {
  const token = randomUUID()
  const expira = new Date(Date.now() + CADUCIDAD_MS)
  await ejecutar('DELETE FROM sesiones WHERE Expira <= CURRENT_TIMESTAMP')
  await ejecutar('INSERT INTO sesiones (Token, IdEmpleado, Expira) VALUES (?, ?, ?)', [token, usuario.idEmpleado, expira])
  return token
}

async function leerSesion(token: string | undefined): Promise<SesionUsuario | null> {
  if (!token) return null
  return consultar<SesionUsuario>(
    'SELECT e.IdEmpleado AS idEmpleado, e.User AS user, e.Dni AS dni, e.Nombres AS nom, e.Telefono AS tel ' +
      'FROM sesiones s JOIN empleado e ON e.IdEmpleado = s.IdEmpleado ' +
      'WHERE s.Token = ? AND s.Expira > CURRENT_TIMESTAMP',
    [token],
  )
}

async function cerrarSesion(token: string | undefined): Promise<void> {
  if (token) await ejecutar('DELETE FROM sesiones WHERE Token = ?', [token])
}

function extraerToken(req: Request): string | undefined {
  const cabecera = req.headers.authorization
  if (cabecera?.startsWith('Bearer ')) return cabecera.slice(7).trim()
  return typeof req.query.token === 'string' ? req.query.token : undefined
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      usuario?: SesionUsuario
    }
  }
}

export async function autenticar(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const usuario = await leerSesion(extraerToken(req))
    if (!usuario) {
      res.status(401).json({ ok: false, error: 'Sesión no iniciada o expirada. Vuelve a ingresar.' })
      return
    }
    req.usuario = usuario
    next()
  } catch (error) {
    next(error)
  }
}

export function registrarRutasAuth(router: import('express').Router): void {
  // processRequest → doPost("accion=Ingresar")
  router.post('/auth/login', async (req, res) => {
    const user = String(req.body?.user ?? '').trim()
    const pass = String(req.body?.password ?? '')

    if (!user || !pass) {
      res.status(400).json({ ok: false, error: 'Ingrese su usuario y su contraseña.' })
      return
    }

    try {
      const empleado = await empleadoDAO.validar(user, pass)
      if (!empleado) {
        res.status(401).json({ ok: false, error: 'Usuario o contraseña incorrectos.' })
        return
      }

      const usuario: SesionUsuario = {
        idEmpleado: empleado.id,
        user: empleado.user,
        dni: empleado.dni,
        nom: empleado.nom,
        tel: empleado.tel,
      }
      const token = await crearSesion(usuario)

      res.json({ ok: true, token, usuario })
    } catch (error) {
      res.status(500).json({ ok: false, error: mensajeError(error) })
    }
  })

  router.post('/auth/logout', async (req, res, next) => {
    try {
      await cerrarSesion(extraerToken(req))
      res.json({ ok: true })
    } catch (error) {
      next(error)
    }
  })

  router.get('/auth/session', autenticar, (req, res) => {
    res.json({ ok: true, usuario: req.usuario })
  })
}

export function mensajeError(error: unknown): string {
  return error instanceof Error ? error.message : 'Error interno del servidor'
}
