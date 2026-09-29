import { randomUUID } from 'node:crypto'
import type { Request, Response, NextFunction } from 'express'
import { EmpleadoDAO } from '../modelo/EmpleadoDAO.js'
import type { SesionUsuario } from '../modelo/tipos.js'

/**
 * Puerto de `Controlador/Validar.java`.
 *
 * El servlet guardaba al empleado en el `HttpSession`; aquí la sesión es un
 * token opaco guardado en memoria con una caducidad de 30 minutos (el
 * session-timeout del web.xml original).
 */
const CADUCIDAD_MS = 30 * 60 * 1000

interface Sesion {
  usuario: SesionUsuario
  expira: number
}

const sesiones = new Map<string, Sesion>()
const empleadoDAO = new EmpleadoDAO()

function crearSesion(usuario: SesionUsuario): string {
  const token = randomUUID()
  sesiones.set(token, { usuario, expira: Date.now() + CADUCIDAD_MS })
  return token
}

function leerSesion(token: string | undefined): SesionUsuario | null {
  if (!token) return null
  const sesion = sesiones.get(token)
  if (!sesion) return null
  if (sesion.expira <= Date.now()) {
    sesiones.delete(token)
    return null
  }
  return sesion.usuario
}

function cerrarSesion(token: string | undefined): void {
  if (token) sesiones.delete(token)
}

function limpiarSesionesVencidas(): void {
  const ahora = Date.now()
  for (const [token, sesion] of sesiones) {
    if (sesion.expira <= ahora) sesiones.delete(token)
  }
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

export function autenticar(req: Request, res: Response, next: NextFunction): void {
  const usuario = leerSesion(extraerToken(req))
  if (!usuario) {
    res.status(401).json({ ok: false, error: 'Sesión no iniciada o expirada. Vuelve a ingresar.' })
    return
  }
  req.usuario = usuario
  next()
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
      const token = crearSesion(usuario)
      limpiarSesionesVencidas()

      res.json({ ok: true, token, usuario })
    } catch (error) {
      res.status(500).json({ ok: false, error: mensajeError(error) })
    }
  })

  router.post('/auth/logout', (req, res) => {
    cerrarSesion(extraerToken(req))
    res.json({ ok: true })
  })

  router.get('/auth/session', autenticar, (req, res) => {
    res.json({ ok: true, usuario: req.usuario })
  })
}

export function mensajeError(error: unknown): string {
  return error instanceof Error ? error.message : 'Error interno del servidor'
}
