import { empleadoApi, type Empleado } from '../api'
import { vistaCrud } from './crud'

/** Réplica de `web/Empleado.jsp`. */
export function vistaEmpleado(contenedor: HTMLElement): void {
  vistaCrud<Empleado>(contenedor, {
    recurso: 'empleados',
    campos: [
      { name: 'dni', label: 'Dni', placeholder: 'Ingrese el DNI' },
      { name: 'nom', label: 'Nombres', placeholder: 'Ingrese los nombres', requerido: true },
      { name: 'tel', label: 'Telefono', placeholder: 'Ingrese el teléfono' },
      { name: 'estado', label: 'Estado', placeholder: '1 = activo, 0 = inactivo' },
      { name: 'user', label: 'Usuario', placeholder: 'Ingrese el usuario', requerido: true },
    ],
    columnas: [
      { titulo: 'ID', valor: (e) => String(e.id) },
      { titulo: 'DNI', valor: (e) => e.dni },
      { titulo: 'NOMBRES', valor: (e) => e.nom },
      { titulo: 'TELEFONO', valor: (e) => e.tel },
      { titulo: 'ESTADO', valor: (e) => e.estado },
      { titulo: 'USUARIO', valor: (e) => e.user },
    ],
    aFormulario: (e) => ({ dni: e.dni, nom: e.nom, tel: e.tel, estado: e.estado, user: e.user }),
    listar: async () => (await empleadoApi.listar()).empleados,
    crear: async (datos) => {
      await empleadoApi.agregar(datos)
    },
    actualizar: async (id, datos) => {
      await empleadoApi.actualizar(id, datos)
    },
    eliminar: async (id) => {
      await empleadoApi.eliminar(id)
    },
  })
}
