/** Cliente HTTP de la API. Sustituye al `forward()` de los servlets. */

const CLAVE_TOKEN = 'sistema-ventas:token'
const CLAVE_USUARIO = 'sistema-ventas:usuario'

export interface Usuario {
  idEmpleado: number
  user: string
  dni: string
  nom: string
  tel: string
}

export class ErrorApi extends Error {
  readonly estado: number

  constructor(mensaje: string, estado: number) {
    super(mensaje)
    this.name = 'ErrorApi'
    this.estado = estado
  }
}

export function guardarToken(token: string): void {
  sessionStorage.setItem(CLAVE_TOKEN, token)
}

export function obtenerToken(): string | null {
  return sessionStorage.getItem(CLAVE_TOKEN)
}

export function guardarUsuario(usuario: Usuario): void {
  sessionStorage.setItem(CLAVE_USUARIO, JSON.stringify(usuario))
}

export function obtenerUsuario(): Usuario | null {
  const crudo = sessionStorage.getItem(CLAVE_USUARIO)
  if (!crudo) return null
  try {
    return JSON.parse(crudo) as Usuario
  } catch {
    return null
  }
}

export function limpiarSesion(): void {
  sessionStorage.removeItem(CLAVE_TOKEN)
  sessionStorage.removeItem(CLAVE_USUARIO)
}

type Respuesta<T> = { ok: true } & T

async function pedir<T>(ruta: string, metodo: string, cuerpo?: unknown): Promise<T> {
  const cabeceras: Record<string, string> = { Accept: 'application/json' }
  if (cuerpo !== undefined) cabeceras['Content-Type'] = 'application/json'

  const token = obtenerToken()
  if (token) cabeceras.Authorization = `Bearer ${token}`

  const respuesta = await fetch(`/api${ruta}`, {
    method: metodo,
    headers: cabeceras,
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  })

  const texto = await respuesta.text()
  let datos: unknown = null
  if (texto) {
    try {
      datos = JSON.parse(texto)
    } catch {
      datos = null
    }
  }

  if (!respuesta.ok) {
    const mensaje =
      datos && typeof datos === 'object' && 'error' in datos
        ? String((datos as { error: unknown }).error)
        : `Error ${respuesta.status}`
    if (respuesta.status === 401) {
      limpiarSesion()
      window.dispatchEvent(new Event('sesion:expirada'))
    }
    throw new ErrorApi(mensaje, respuesta.status)
  }

  return datos as T
}

export const api = {
  get: <T>(ruta: string) => pedir<T>(ruta, 'GET'),
  post: <T>(ruta: string, cuerpo?: unknown) => pedir<T>(ruta, 'POST', cuerpo ?? {}),
  put: <T>(ruta: string, cuerpo?: unknown) => pedir<T>(ruta, 'PUT', cuerpo ?? {}),
  delete: <T>(ruta: string) => pedir<T>(ruta, 'DELETE'),
}

export type { Respuesta }

// --------------------------------------------------------------------- Modelo
export interface Empleado {
  id: number
  dni: string
  nom: string
  tel: string
  estado: string
  user: string
}

export interface Cliente {
  id: number
  dni: string
  nom: string
  dir: string
  es: string
}

export interface Producto {
  id: number
  nom: string
  pre: number
  stock: number
  estado: string
}

export interface ItemVenta {
  item: number
  idProducto: number
  descripcion: string
  precio: number
  cantidad: number
  subtotal: number
}

export const empleadoApi = {
  listar: () => api.get<Respuesta<{ empleados: Empleado[] }>>('/empleados'),
  agregar: (empleado: Partial<Empleado> & { password?: string }) =>
    api.post<Respuesta<{ id: number }>>('/empleados', empleado),
  actualizar: (id: number, empleado: Partial<Empleado> & { password?: string }) =>
    api.put<Respuesta<{ filas: number }>>(`/empleados/${id}`, empleado),
  eliminar: (id: number) => api.delete<Respuesta<{ filas: number }>>(`/empleados/${id}`),
}

export const clienteApi = {
  listar: () => api.get<Respuesta<{ clientes: Cliente[] }>>('/clientes'),
  buscarPorDni: (dni: string) => api.get<Respuesta<{ cliente: Cliente }>>(`/clientes/dni/${encodeURIComponent(dni)}`),
  agregar: (cliente: Partial<Cliente>) => api.post<Respuesta<{ id: number }>>('/clientes', cliente),
  actualizar: (id: number, cliente: Partial<Cliente>) => api.put<Respuesta<{ filas: number }>>(`/clientes/${id}`, cliente),
  eliminar: (id: number) => api.delete<Respuesta<{ filas: number }>>(`/clientes/${id}`),
}

export const productoApi = {
  listar: () => api.get<Respuesta<{ productos: Producto[] }>>('/productos'),
  porId: (id: number) => api.get<Respuesta<{ producto: Producto }>>(`/productos/${id}`),
  agregar: (producto: Partial<Producto>) => api.post<Respuesta<{ id: number }>>('/productos', producto),
  actualizar: (id: number, producto: Partial<Producto>) =>
    api.put<Respuesta<{ filas: number }>>(`/productos/${id}`, producto),
  eliminar: (id: number) => api.delete<Respuesta<{ filas: number }>>(`/productos/${id}`),
}

export const ventaApi = {
  serie: () => api.get<Respuesta<{ nserie: string }>>('/ventas/serie'),
  registrar: (cuerpo: {
    idCliente: number
    idEmpleado?: number
    numSerie: string
    detalles: { idProducto: number; descripcion: string; precioVenta: number; cantidad: number }[]
  }) => api.post<Respuesta<{ venta: { idVentas: number; numeroSerie: string; monto: number } }>>('/ventas', cuerpo),
}
