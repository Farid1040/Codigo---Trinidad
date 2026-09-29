/** Puerto en TypeScript de las clases del paquete `Modelo` del proyecto Java. */

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

export interface Venta {
  id: number | null
  item: number
  idcliente: number
  idempleado: number
  idproducto: number
  numserie: string
  descripcionP: string
  fecha: string
  precio: number
  cantidad: number
  subtotal: number
  monto: number
  estado: string
}

export interface DetalleVenta {
  idVentas: number
  idProducto: number
  cantidad: number
  precioVenta: number
  descripcion: string
}

export interface VentaRegistrada {
  idVentas: number
  idCliente: number
  idEmpleado: number
  numeroSerie: string
  fechaVentas: string
  monto: number
  estado: string
  detalles: DetalleVenta[]
}

/** Cliente + empleado + venta, tal como viaja por la API. */
export interface SesionUsuario {
  idEmpleado: number
  user: string
  dni: string
  nom: string
  tel: string
}
