import { aviso, el, vaciar } from '../ui'

/**
 * Plantilla común de los JSP de mantenimiento (Empleado / Producto / Cliente):
 * formulario a la izquierda, tabla `table-hover` a la derecha y las acciones
 * Editar (btn-warning) / Eliminar (btn-danger).
 */
export interface Columna<T> {
  titulo: string
  valor: (fila: T) => string
  clase?: string
}

export interface Campo {
  name: string
  label: string
  type?: 'text' | 'number' | 'password'
  placeholder?: string
  ancho?: string
  requerido?: boolean
}

export interface ConfigCrud<T extends { id: number }> {
  recurso: string
  campos: Campo[]
  columnas: Columna<T>[]
  listar: () => Promise<T[]>
  crear: (datos: Record<string, string>) => Promise<unknown>
  actualizar: (id: number, datos: Record<string, string>) => Promise<unknown>
  eliminar: (id: number) => Promise<unknown>
  aFormulario: (fila: T) => Record<string, string>
  mensajeVacio?: string
}

export function vistaCrud<T extends { id: number }>(contenedor: HTMLElement, config: ConfigCrud<T>): void {
  const mensajeVacio = config.mensajeVacio ?? 'Sin registros'

  const cuerpoTabla = el('tbody')
  const zonaAvisos = el('div')
  const tituloEdicion = el('span', { class: 'badge bg-secondary', texto: 'Agregar' })
  const idEdicion = el('input', { type: 'hidden', name: 'id', value: '' })

  const campos = config.campos.map((campo) =>
    el('div', { class: 'form-group' }, [
      el('label', { class: 'form-label', texto: campo.label }),
      el('input', {
        class: 'form-control',
        type: campo.type ?? 'text',
        name: campo.name,
        placeholder: campo.placeholder ?? '',
        required: campo.requerido ?? false,
        style: campo.ancho ? `max-width:${campo.ancho}` : undefined,
      }),
    ]),
  )

  const entradas = new Map<string, HTMLInputElement>()
  for (const [indice, campo] of config.campos.entries()) {
    const nodo = campos[indice]?.querySelector('input')
    if (nodo instanceof HTMLInputElement) entradas.set(campo.name, nodo)
  }

  function leerFormulario(): Record<string, string> {
    const datos: Record<string, string> = {}
    for (const [nombre, nodo] of entradas) datos[nombre] = nodo.value.trim()
    return datos
  }

  function limpiarFormulario(): void {
    for (const nodo of entradas.values()) nodo.value = ''
    idEdicion.value = ''
    tituloEdicion.textContent = 'Agregar'
    tituloEdicion.className = 'badge bg-secondary'
  }

  function cargarFormulario(fila: T): void {
    const datos = config.aFormulario(fila)
    for (const [nombre, nodo] of entradas) nodo.value = datos[nombre] ?? ''
    idEdicion.value = String(fila.id)
    tituloEdicion.textContent = `Editando #${fila.id}`
    tituloEdicion.className = 'badge bg-warning text-dark'
  }

  async function recargar(): Promise<void> {
    const filas = await config.listar()
    vaciar(cuerpoTabla)

    if (filas.length === 0) {
      cuerpoTabla.append(
        el('tr', {}, [el('td', { colspan: config.columnas.length + 1, class: 'text-center text-muted', texto: mensajeVacio })]),
      )
      return
    }

    for (const fila of filas) {
      const botonEditar = el('button', {
        type: 'button',
        class: 'btn btn-warning',
        texto: 'Editar',
        onclick: () => cargarFormulario(fila),
      })
      const botonEliminar = el('button', {
        type: 'button',
        class: 'btn btn-danger',
        texto: 'Eliminar',
        style: 'margin-left:10px',
        onclick: async () => {
          if (!confirm(`¿Eliminar el registro #${fila.id}?`)) return
          try {
            await config.eliminar(fila.id)
            if (idEdicion.value === String(fila.id)) limpiarFormulario()
            await recargar()
            aviso(zonaAvisos, 'Registro eliminado.', 'ok')
          } catch (error) {
            aviso(zonaAvisos, error instanceof Error ? error.message : 'No se pudo eliminar.', 'error')
          }
        },
      })

      const celdas = config.columnas.map((columna) =>
        el('td', { class: columna.clase ?? '', texto: columna.valor(fila) }),
      )
      cuerpoTabla.append(el('tr', {}, [...celdas, el('td', { class: 'd-flex' }, [botonEditar, botonEliminar])]))
    }
  }

  const botonAgregar = el('button', {
    type: 'submit',
    class: 'btn btn-info',
    name: 'accion',
    texto: 'Agregar',
    onclick: () => {
      idEdicion.value = ''
      tituloEdicion.textContent = 'Agregar'
      tituloEdicion.className = 'badge bg-secondary'
    },
  })

  const botonActualizar = el('button', {
    type: 'submit',
    class: 'btn btn-success',
    name: 'accion',
    texto: 'Actualizar',
    style: 'margin-left:10px',
  })

  const form = el(
    'form',
    {
      onsubmit: async (evento: Event) => {
        evento.preventDefault()
        const boton = (evento as SubmitEvent).submitter ?? botonAgregar
        const editando = (boton === botonActualizar ? botonActualizar : botonAgregar) === botonActualizar
        const id = idEdicion.value

        try {
          const datos = leerFormulario()
          if (editando) {
            if (!id) {
              aviso(zonaAvisos, 'Primero seleccione un registro de la tabla con "Editar".', 'error')
              return
            }
            await config.actualizar(Number(id), datos)
            aviso(zonaAvisos, `Registro #${id} actualizado.`, 'ok')
          } else {
            await config.crear(datos)
            aviso(zonaAvisos, 'Registro agregado.', 'ok')
          }
          limpiarFormulario()
          await recargar()
        } catch (error) {
          aviso(zonaAvisos, error instanceof Error ? error.message : 'No se pudo guardar.', 'error')
        }
      },
    },
    [idEdicion, ...campos, el('div', { class: 'd-flex align-items-center gap-2' }, [botonAgregar, botonActualizar, tituloEdicion])],
  )

  const tabla = el('table', { class: 'table table-hover' }, [
    el('thead', {}, [
      el('tr', {}, [
        ...config.columnas.map((columna) => el('th', { texto: columna.titulo })),
        el('th', { texto: 'ACCIONES' }),
      ]),
    ]),
    cuerpoTabla,
  ])

  contenedor.append(
    zonaAvisos,
    el('div', { class: 'd-flex flex-wrap' }, [
      el('div', { class: 'col-sm-5' }, [el('div', { class: 'card-body' }, [form])]),
      el('div', { class: 'col-sm-7' }, [tabla]),
    ]),
  )

  recargar().catch((error: unknown) => {
    aviso(zonaAvisos, error instanceof Error ? error.message : 'No se pudo cargar la lista.', 'error')
  })
}
