import { clienteApi, type Cliente } from '../api'
import { vistaCrud } from './crud'

/** Réplica de `web/Clientes.jsp` (misma plantilla que Empleado.jsp). */
export function vistaCliente(contenedor: HTMLElement): void {
  vistaCrud<Cliente>(contenedor, {
    recurso: 'clientes',
    campos: [
      { name: 'dni', label: 'Dni', placeholder: 'Ingrese el DNI' },
      { name: 'nom', label: 'Nombres', placeholder: 'Ingrese los nombres', requerido: true },
      { name: 'dir', label: 'Direccion', placeholder: 'Ingrese la dirección' },
      { name: 'es', label: 'Estado', placeholder: '1 = activo, 0 = inactivo' },
    ],
    columnas: [
      { titulo: 'ID', valor: (c) => String(c.id) },
      { titulo: 'DNI', valor: (c) => c.dni },
      { titulo: 'NOMBRES', valor: (c) => c.nom },
      { titulo: 'DIRECCION', valor: (c) => c.dir },
      { titulo: 'ESTADO', valor: (c) => c.es },
    ],
    aFormulario: (c) => ({ dni: c.dni, nom: c.nom, dir: c.dir, es: c.es }),
    listar: async () => (await clienteApi.listar()).clientes,
    crear: async (datos) => {
      await clienteApi.agregar(datos)
    },
    actualizar: async (id, datos) => {
      await clienteApi.actualizar(id, datos)
    },
    eliminar: async (id) => {
      await clienteApi.eliminar(id)
    },
  })
}
