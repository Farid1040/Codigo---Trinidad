import { Router } from 'express'
import { ClienteDAO } from '../modelo/ClienteDAO.js'
import { ProductoDAO } from '../modelo/ProductoDAO.js'
import { VentaDAO } from '../modelo/VentaDAO.js'
import { EmpleadoDAO } from '../modelo/EmpleadoDAO.js'
import type { Cliente, DetalleVenta, Producto, Venta } from '../modelo/tipos.js'
import { autenticar, mensajeError } from './auth.js'

/**
 * Puerto de `Controlador/Controlador.java`.
 *
 * Cada `menu` del Java (`?menu=Empleado&accion=Listar`, `?menu=RegistrarVenta`,
 * …) se traduce aquí en un recurso REST, y cada `accion` en un método.
 */
const empleadoDAO = new EmpleadoDAO()
const clienteDAO = new ClienteDAO()
const productoDAO = new ProductoDAO()
const ventaDAO = new VentaDAO()

function texto(valor: unknown, porDefecto = ''): string {
  if (valor === undefined || valor === null) return porDefecto
  return String(valor).trim()
}

function numero(valor: unknown, porDefecto = 0): number {
  if (valor === undefined || valor === null || valor === '') return porDefecto
  const parsed = Number(valor)
  return Number.isFinite(parsed) ? parsed : porDefecto
}

function idDe(req: { params: Record<string, string | undefined> }, campo = 'id'): number {
  return Number.parseInt(String(req.params[campo]), 10)
}

function envolver(fn: (req: any, res: any) => Promise<void>) {
  return (req: any, res: any): void => {
    fn(req, res).catch((error: unknown) => {
      if (!res.headersSent) {
        res.status(500).json({ ok: false, error: mensajeError(error) })
      }
    })
  }
}

export function crearRutas(): Router {
  const router = Router()

  router.get('/salud', envolver(async (_req, res) => {
    res.json({ ok: true, servicio: 'Sistema de Ventas Web (TypeScript)' })
  }))

  router.use(autenticar)

  // ------------------------------------------------------------------ Empleado
  // accion = Listar
  router.get('/empleados', envolver(async (_req, res) => {
    res.json({ ok: true, empleados: await empleadoDAO.listar() })
  }))

  // accion = Editar
  router.get('/empleados/:id', envolver(async (req, res) => {
    const empleado = await empleadoDAO.listarId(idDe(req))
    if (!empleado) {
      res.status(404).json({ ok: false, error: 'El empleado no existe.' })
      return
    }
    res.json({ ok: true, empleado })
  }))

  // accion = Agregar
  router.post('/empleados', envolver(async (req, res) => {
    const nombre = texto(req.body?.nom)
    const usuario = texto(req.body?.user)
    if (!nombre || !usuario) {
      res.status(400).json({ ok: false, error: 'Nombres y Usuario son obligatorios.' })
      return
    }
    const id = await empleadoDAO.agregar(
      {
        id: 0,
        dni: texto(req.body?.dni),
        nom: nombre,
        tel: texto(req.body?.tel),
        estado: texto(req.body?.estado, '1'),
        user: usuario,
      },
      texto(req.body?.password) || undefined,
    )
    res.status(201).json({ ok: true, id })
  }))

  // accion = Actualizar
  router.put('/empleados/:id', envolver(async (req, res) => {
    const id = idDe(req)
    const nombre = texto(req.body?.nom)
    const usuario = texto(req.body?.user)
    if (!nombre || !usuario) {
      res.status(400).json({ ok: false, error: 'Nombres y Usuario son obligatorios.' })
      return
    }
    const filas = await empleadoDAO.actualizar(
      {
        id,
        dni: texto(req.body?.dni),
        nom: nombre,
        tel: texto(req.body?.tel),
        estado: texto(req.body?.estado, '1'),
        user: usuario,
      },
      texto(req.body?.password) || undefined,
    )
    res.json({ ok: true, filas })
  }))

  // accion = Delete
  router.delete('/empleados/:id', envolver(async (req, res) => {
    res.json({ ok: true, filas: await empleadoDAO.delete(idDe(req)) })
  }))

  // ------------------------------------------------------------------ Cliente
  router.get('/clientes', envolver(async (_req, res) => {
    res.json({ ok: true, clientes: await clienteDAO.listar() })
  }))

  // accion = BuscarCliente (por DNI)
  router.get('/clientes/dni/:dni', envolver(async (req, res) => {
    const cliente = await clienteDAO.buscar(String(req.params.dni))
    res.json({ ok: true, cliente })
  }))

  router.get('/clientes/:id', envolver(async (req, res) => {
    const cliente = await clienteDAO.listarId(idDe(req))
    if (!cliente) {
      res.status(404).json({ ok: false, error: 'El cliente no existe.' })
      return
    }
    res.json({ ok: true, cliente })
  }))

  router.post('/clientes', envolver(async (req, res) => {
    const nombre = texto(req.body?.nom)
    if (!nombre) {
      res.status(400).json({ ok: false, error: 'Nombres es obligatorio.' })
      return
    }
    const cliente: Cliente = {
      id: 0,
      dni: texto(req.body?.dni),
      nom: nombre,
      dir: texto(req.body?.dir),
      es: texto(req.body?.es, texto(req.body?.estado, '1')),
    }
    res.status(201).json({ ok: true, id: await clienteDAO.agregar(cliente) })
  }))

  router.put('/clientes/:id', envolver(async (req, res) => {
    const nombre = texto(req.body?.nom)
    if (!nombre) {
      res.status(400).json({ ok: false, error: 'Nombres es obligatorio.' })
      return
    }
    const cliente: Cliente = {
      id: idDe(req),
      dni: texto(req.body?.dni),
      nom: nombre,
      dir: texto(req.body?.dir),
      es: texto(req.body?.es, texto(req.body?.estado, '1')),
    }
    res.json({ ok: true, filas: await clienteDAO.actualizar(cliente) })
  }))

  router.delete('/clientes/:id', envolver(async (req, res) => {
    res.json({ ok: true, filas: await clienteDAO.delete(idDe(req)) })
  }))

  // ----------------------------------------------------------------- Producto
  router.get('/productos', envolver(async (_req, res) => {
    res.json({ ok: true, productos: await productoDAO.listar() })
  }))

  router.get('/productos/:id', envolver(async (req, res) => {
    const producto = await productoDAO.listarId(idDe(req))
    if (!producto) {
      res.status(404).json({ ok: false, error: 'El producto no existe.' })
      return
    }
    res.json({ ok: true, producto })
  }))

  router.post('/productos', envolver(async (req, res) => {
    const nombre = texto(req.body?.nom)
    if (!nombre) {
      res.status(400).json({ ok: false, error: 'Nombres es obligatorio.' })
      return
    }
    const producto: Producto = {
      id: 0,
      nom: nombre,
      pre: numero(req.body?.pre),
      stock: Math.trunc(numero(req.body?.stock)),
      estado: texto(req.body?.estado, '1'),
    }
    res.status(201).json({ ok: true, id: await productoDAO.agregar(producto) })
  }))

  router.put('/productos/:id', envolver(async (req, res) => {
    const nombre = texto(req.body?.nom)
    if (!nombre) {
      res.status(400).json({ ok: false, error: 'Nombres es obligatorio.' })
      return
    }
    const producto: Producto = {
      id: idDe(req),
      nom: nombre,
      pre: numero(req.body?.pre),
      stock: Math.trunc(numero(req.body?.stock)),
      estado: texto(req.body?.estado, '1'),
    }
    res.json({ ok: true, filas: await productoDAO.actualizar(producto) })
  }))

  router.delete('/productos/:id', envolver(async (req, res) => {
    res.json({ ok: true, filas: await productoDAO.delete(idDe(req)) })
  }))

  // ------------------------------------------------------------ RegistrarVenta
  // Nro de serie siguiente (calculado en el default del switch del Java).
  router.get('/ventas/serie', envolver(async (_req, res) => {
    res.json({ ok: true, nserie: await ventaDAO.siguienteSerie() })
  }))

  router.get('/ventas', envolver(async (_req, res) => {
    res.json({ ok: true, ventas: await ventaDAO.listar() })
  }))

  router.get('/ventas/:id', envolver(async (req, res) => {
    const id = idDe(req)
    const venta = await ventaDAO.listarId(id)
    if (!venta) {
      res.status(404).json({ ok: false, error: 'La venta no existe.' })
      return
    }
    res.json({ ok: true, venta: { ...venta, detalles: await ventaDAO.listarDetalle(id) } })
  }))

  // accion = GenerarVenta
  router.post('/ventas', envolver(async (req, res) => {
    const idCliente = Math.trunc(numero(req.body?.idCliente))
    const detallesCrudos = Array.isArray(req.body?.detalles) ? (req.body.detalles as any[]) : []

    if (!idCliente) {
      res.status(400).json({ ok: false, error: 'Debe buscar un cliente antes de registrar la venta.' })
      return
    }
    if (detallesCrudos.length === 0) {
      res.status(400).json({ ok: false, error: 'Agregue al menos un producto a la venta.' })
      return
    }

    const detalles: DetalleVenta[] = detallesCrudos.map((detalle) => ({
      idVentas: 0,
      idProducto: Math.trunc(numero(detalle?.idProducto)),
      cantidad: Math.trunc(numero(detalle?.cantidad, 1)),
      precioVenta: numero(detalle?.precioVenta),
      descripcion: texto(detalle?.descripcion),
    }))

    if (detalles.some((detalle) => detalle.idProducto <= 0 || detalle.cantidad <= 0)) {
      res.status(400).json({ ok: false, error: 'Los productos agregados no son válidos.' })
      return
    }

    const monto = detalles.reduce((total, detalle) => total + detalle.cantidad * detalle.precioVenta, 0)
    const cabecera: Venta = {
      id: null,
      item: 0,
      idcliente: idCliente,
      // El Java fijaba IdEmpleado = 2; aquí se usa el empleado que inició sesión.
      idempleado: Math.trunc(numero(req.body?.idEmpleado, req.usuario?.idEmpleado ?? 2)),
      idproducto: 0,
      numserie: texto(req.body?.numSerie) || (await ventaDAO.siguienteSerie()),
      descripcionP: '',
      fecha: texto(req.body?.fecha),
      precio: monto,
      cantidad: detalles.length,
      subtotal: monto,
      monto,
      estado: '1',
    }

    res.status(201).json({ ok: true, venta: await ventaDAO.registrarVenta(cabecera, detalles) })
  }))

  return router
}
