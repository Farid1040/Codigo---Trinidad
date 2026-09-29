import { clienteApi, obtenerUsuario, productoApi, ventaApi, type Cliente, type ItemVenta } from '../api'
import { aviso, el, vaciar } from '../ui'

/** Réplica de `web/RegistrarVenta.jsp`. */
export function vistaRegistrarVenta(contenedor: HTMLElement): void {
  vaciar(contenedor)

  const zonaAvisos = el('div')
  const cuerpoTabla = el('tbody')
  const inputTotal = el('input', { type: 'text', name: 'txtTotal', class: 'form-control', value: '0' })

  const estado = {
    cliente: null as Cliente | null,
    producto: null as { id: number; nom: string; pre: number; stock: number } | null,
    lista: [] as ItemVenta[],
    item: 0,
    nserie: '',
  }

  // ------------------------------------------------------------- formulario
  const inputCodigoCliente = el('input', {
    type: 'text',
    name: 'codigocliente',
    class: 'form-control',
    placeholder: 'Codigo',
  })
  const inputNombresCliente = el('input', {
    type: 'text',
    name: 'nombrescliente',
    class: 'form-control',
    placeholder: 'Datos Cliente',
    readonly: true,
  })
  const inputCodigoProducto = el('input', {
    type: 'text',
    name: 'codigoproducto',
    class: 'form-control',
    placeholder: 'Codigo',
  })
  const inputNombreProducto = el('input', {
    type: 'text',
    name: 'nomproducto',
    class: 'form-control',
    placeholder: 'Datos Producto',
    readonly: true,
  })
  const inputPrecio = el('input', { type: 'text', name: 'precio', class: 'form-control', placeholder: 'S/. 0.00' })
  const inputCantidad = el('input', { type: 'number', name: 'cant', class: 'form-control', placeholder: '', min: 1, value: '1' })
  const inputStock = el('input', { type: 'text', name: 'stock', class: 'form-control', placeholder: 'Stock', readonly: true })
  const inputSerie = el('input', { type: 'text', name: 'NroSerie', class: 'form-control', readonly: true })

  function totalPagar(): number {
    return estado.lista.reduce((total, item) => total + item.subtotal, 0)
  }

  function pintarDetalle(): void {
    vaciar(cuerpoTabla)
    inputTotal.value = totalPagar().toFixed(2)

    if (estado.lista.length === 0) {
      cuerpoTabla.append(
        el('tr', {}, [el('td', { colspan: 7, class: 'text-center text-muted', texto: 'Agregue productos a la venta' })]),
      )
      return
    }

    for (const item of estado.lista) {
      const botonEditar = el('button', {
        type: 'button',
        class: 'btn btn-warning',
        texto: 'Editar',
        onclick: () => {
          // Devuelve el ítem al formulario para corregirlo y volver a agregarlo.
          estado.lista = estado.lista.filter((otro) => otro.item !== item.item)
          estado.lista = estado.lista.map((otro, indice) => ({ ...otro, item: indice + 1 }))
          estado.item = estado.lista.length
          estado.producto = { id: item.idProducto, nom: item.descripcion, pre: item.precio, stock: 0 }
          inputCodigoProducto.value = String(item.idProducto)
          inputNombreProducto.value = item.descripcion
          inputPrecio.value = item.precio.toFixed(2)
          inputCantidad.value = String(item.cantidad)
          inputStock.value = ''
          pintarDetalle()
        },
      })
      const botonEliminar = el('button', {
        type: 'button',
        class: 'btn btn-danger',
        texto: 'Delete',
        style: 'margin-left:10px',
        onclick: () => {
          estado.lista = estado.lista.filter((otro) => otro.item !== item.item)
          estado.lista = estado.lista.map((otro, indice) => ({ ...otro, item: indice + 1 }))
          estado.item = estado.lista.length
          pintarDetalle()
        },
      })

      cuerpoTabla.append(
        el('tr', {}, [
          el('td', { texto: String(item.item) }),
          el('td', { texto: String(item.idProducto) }),
          el('td', { texto: item.descripcion }),
          el('td', { texto: item.precio.toFixed(2) }),
          el('td', { texto: String(item.cantidad) }),
          el('td', { texto: item.subtotal.toFixed(2) }),
          el('td', { class: 'd-flex' }, [botonEditar, botonEliminar]),
        ]),
      )
    }
  }

  // accion = BuscarCliente
  async function buscarCliente(): Promise<void> {
    const dni = inputCodigoCliente.value.trim()
    if (!dni) {
      aviso(zonaAvisos, 'Ingrese el código (DNI) del cliente.', 'error')
      return
    }
    try {
      const { cliente } = await clienteApi.buscarPorDni(dni)
      if (!cliente.id) {
        aviso(zonaAvisos, `No existe un cliente con el DNI ${dni}.`, 'error')
        estado.cliente = null
        inputNombresCliente.value = ''
        return
      }
      estado.cliente = cliente
      inputNombresCliente.value = cliente.nom
      aviso(zonaAvisos, `Cliente encontrado: ${cliente.nom}`, 'ok')
    } catch (error) {
      aviso(zonaAvisos, error instanceof Error ? error.message : 'Error al buscar el cliente.', 'error')
    }
  }

  // accion = BuscarProducto
  async function buscarProducto(): Promise<void> {
    const codigo = Number.parseInt(inputCodigoProducto.value.trim(), 10)
    if (!Number.isFinite(codigo)) {
      aviso(zonaAvisos, 'Ingrese el código (IdProducto) del producto.', 'error')
      return
    }
    try {
      const { producto } = await productoApi.porId(codigo)
      estado.producto = producto
      inputNombreProducto.value = producto.nom
      inputPrecio.value = producto.pre.toFixed(2)
      inputStock.value = String(producto.stock)
      aviso(zonaAvisos, `Producto encontrado: ${producto.nom}`, 'ok')
    } catch (error) {
      estado.producto = null
      inputNombreProducto.value = ''
      inputPrecio.value = ''
      inputStock.value = ''
      aviso(zonaAvisos, error instanceof Error ? error.message : 'Error al buscar el producto.', 'error')
    }
  }

  // accion = Agregar
  function agregarProducto(): void {
    if (!estado.producto) {
      aviso(zonaAvisos, 'Busque un producto antes de agregarlo.', 'error')
      return
    }
    const cantidad = Math.max(1, Number.parseInt(inputCantidad.value, 10) || 1)
    const precio = Number.parseFloat(inputPrecio.value) || estado.producto.pre
    if (cantidad > estado.producto.stock) {
      aviso(zonaAvisos, `Stock insuficiente. Disponible: ${estado.producto.stock}.`, 'error')
      return
    }

    estado.item += 1
    estado.lista.push({
      item: estado.item,
      idProducto: estado.producto.id,
      descripcion: estado.producto.nom,
      precio,
      cantidad,
      subtotal: precio * cantidad,
    })
    pintarDetalle()
    aviso(zonaAvisos, 'Producto agregado a la venta.', 'ok')
  }

  // accion = GenerarVenta
  async function generarVenta(boton: HTMLButtonElement): Promise<void> {
    if (!estado.cliente) {
      aviso(zonaAvisos, 'Debe buscar un cliente antes de registrar la venta.', 'error')
      return
    }
    if (estado.lista.length === 0) {
      aviso(zonaAvisos, 'Agregue al menos un producto a la venta.', 'error')
      return
    }

    boton.setAttribute('disabled', '')
    try {
      const respuesta = await ventaApi.registrar({
        idCliente: estado.cliente.id,
        idEmpleado: obtenerUsuario()?.idEmpleado,
        numSerie: estado.nserie,
        detalles: estado.lista.map((item) => ({
          idProducto: item.idProducto,
          descripcion: item.descripcion,
          precioVenta: item.precio,
          cantidad: item.cantidad,
        })),
      })
      vaciar(zonaAvisos)
      aviso(
        contenedor,
        `Venta N° ${respuesta.venta.numeroSerie} registrada por S/. ${respuesta.venta.monto.toFixed(2)}`,
        'ok',
      )
      reiniciar()
    } catch (error) {
      aviso(zonaAvisos, error instanceof Error ? error.message : 'No se pudo registrar la venta.', 'error')
    } finally {
      boton.removeAttribute('disabled')
    }
  }

  // accion = Cancelar
  function reiniciar(): void {
    estado.cliente = null
    estado.producto = null
    estado.lista = []
    estado.item = 0
    for (const input of [
      inputCodigoCliente,
      inputNombresCliente,
      inputCodigoProducto,
      inputNombreProducto,
      inputPrecio,
      inputStock,
    ]) {
      input.value = ''
    }
    inputCantidad.value = '1'
    cargarSerie().catch(() => undefined)
    pintarDetalle()
  }

  async function cargarSerie(): Promise<void> {
    try {
      const { nserie } = await ventaApi.serie()
      estado.nserie = nserie
      inputSerie.value = nserie
    } catch {
      inputSerie.value = ''
    }
  }

  const botonGenerar = el('button', {
    type: 'button',
    class: 'btn btn-success',
    texto: 'Generar Venta',
    style: 'margin-right:10px',
    onclick: (e: Event) => {
      void generarVenta(e.currentTarget as HTMLButtonElement)
    },
  })

  const form = el(
    'form',
    {
      onsubmit: (e: Event) => e.preventDefault(),
    },
    [
      el('div', { class: 'form-group' }, [el('label', { class: 'form-label', texto: 'Datos del Cliente' })]),
      el('div', { class: 'form-group d-flex' }, [
        el('div', { class: 'col-sm-6 d-flex gap-2' }, [
          inputCodigoCliente,
          el('button', {
            type: 'button',
            class: 'btn btn-outline-info',
            texto: 'BuscarCliente',
            onclick: () => void buscarCliente(),
          }),
        ]),
        el('div', { class: 'col-sm-6' }, [inputNombresCliente]),
      ]),

      el('div', { class: 'form-group' }, [el('label', { class: 'form-label', texto: 'Datos del Producto' })]),
      el('div', { class: 'form-group d-flex' }, [
        el('div', { class: 'col-sm-6 d-flex gap-2' }, [
          inputCodigoProducto,
          el('button', {
            type: 'button',
            class: 'btn btn-outline-info',
            texto: 'Buscar Producto',
            onclick: () => void buscarProducto(),
          }),
        ]),
        el('div', { class: 'col-sm-6' }, [inputNombreProducto]),
      ]),
      el('div', { class: 'form-group d-flex' }, [
        el('div', { class: 'col-sm-6 d-flex' }, [inputPrecio]),
        el('div', { class: 'col-sm-3' }, [inputCantidad]),
        el('div', { class: 'col-sm-3' }, [inputStock]),
      ]),
      el('div', { class: 'form-group' }, [
        el('button', {
          type: 'button',
          class: 'btn btn-outline-primary',
          texto: 'Agregar Producto',
          onclick: agregarProducto,
        }),
      ]),
    ],
  )

  const tabla = el('table', { class: 'table table-hover' }, [
    el('thead', {}, [
      el('tr', {}, [
        el('th', { texto: 'Nro' }),
        el('th', { texto: 'Codigo' }),
        el('th', { texto: 'Descripcion' }),
        el('th', { texto: 'Precio' }),
        el('th', { texto: 'Cantidad' }),
        el('th', { texto: 'SubTotal' }),
        el('th', { texto: 'Acciones' }),
      ]),
    ]),
    cuerpoTabla,
  ])

  contenedor.append(
    zonaAvisos,
    el('div', { class: 'd-flex flex-wrap' }, [
      el('div', { class: 'col-sm-5' }, [el('div', { class: 'card' }, [form])]),

      el('div', { class: 'col-sm-7' }, [
        el('div', { class: 'card' }, [
          el('div', { class: 'card-body' }, [
            el('div', { class: 'd-flex gap-2 justify-content-end mb-3' }, [
              el('label', { class: 'form-label mb-0', texto: 'Nro de Serie:' }),
              el('div', { class: 'col-sm-4' }, [inputSerie]),
            ]),
            tabla,
          ]),
          el('div', { class: 'card-footer d-flex' }, [
            el('div', { class: 'col-sm-6' }, [
              botonGenerar,
              el('button', {
                type: 'button',
                class: 'btn btn-danger',
                texto: 'Cancelar',
                onclick: reiniciar,
              }),
            ]),
            el('div', { class: 'col-sm-4 ms-auto' }, [inputTotal]),
          ]),
        ]),
      ]),
    ]),
  )

  pintarDetalle()
  cargarSerie().catch(() => undefined)
}
