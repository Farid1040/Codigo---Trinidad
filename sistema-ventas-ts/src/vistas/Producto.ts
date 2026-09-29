import { productoApi, type Producto } from '../api'
import { vistaCrud } from './crud'

/** Réplica de `web/Producto.jsp` (misma plantilla que Empleado.jsp). */
export function vistaProducto(contenedor: HTMLElement): void {
  vistaCrud<Producto>(contenedor, {
    recurso: 'productos',
    campos: [
      { name: 'nom', label: 'Nombres', placeholder: 'Ingrese el nombre del producto', requerido: true },
      { name: 'pre', label: 'Precio', type: 'number', placeholder: 'S/. 0.00', requerido: true },
      { name: 'stock', label: 'Stock', type: 'number', placeholder: 'Stock' },
      { name: 'estado', label: 'Estado', placeholder: '1 = activo, 0 = inactivo' },
    ],
    columnas: [
      { titulo: 'ID', valor: (p) => String(p.id) },
      { titulo: 'NOMBRES', valor: (p) => p.nom },
      { titulo: 'PRECIO', valor: (p) => p.pre.toFixed(2), clase: 'text-end' },
      { titulo: 'STOCK', valor: (p) => String(p.stock), clase: 'text-end' },
      { titulo: 'ESTADO', valor: (p) => p.estado },
    ],
    aFormulario: (p) => ({
      nom: p.nom,
      pre: String(p.pre),
      stock: String(p.stock),
      estado: p.estado,
    }),
    listar: async () => (await productoApi.listar()).productos,
    crear: async (datos) => {
      await productoApi.agregar({ ...datos, pre: Number(datos['pre'] ?? 0), stock: Number(datos['stock'] ?? 0) })
    },
    actualizar: async (id, datos) => {
      await productoApi.actualizar(id, { ...datos, pre: Number(datos['pre'] ?? 0), stock: Number(datos['stock'] ?? 0) })
    },
    eliminar: async (id) => {
      await productoApi.eliminar(id)
    },
  })
}
