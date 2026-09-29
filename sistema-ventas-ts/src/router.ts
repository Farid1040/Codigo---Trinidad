import { limpiarSesion, obtenerUsuario, type Usuario } from './api'
import { el } from './ui'
import { vistaEmpleado } from './vistas/Empleado'
import { vistaCliente } from './vistas/Cliente'
import { vistaProducto } from './vistas/Producto'
import { vistaRegistrarVenta } from './vistas/RegistrarVenta'

/**
 * Réplica de `web/Principal.jsp`.
 *
 * El Java cargaba cada JSP dentro de un `<iframe name="myFrame">`; aquí el
 * "marco" es un `div` y cada `menu` del menú se resuelve con el router de hash.
 */
export type Menu = 'Principal' | 'Producto' | 'Empleado' | 'Clientes' | 'RegistrarVenta'

const RUTAS: { menu: Menu; titulo: string; render: (c: HTMLElement) => void }[] = [
  { menu: 'Principal', titulo: 'Home', render: renderHome },
  { menu: 'Producto', titulo: 'Producto', render: vistaProducto },
  { menu: 'Empleado', titulo: 'Empleado', render: vistaEmpleado },
  { menu: 'Clientes', titulo: 'Clientes', render: vistaCliente },
  { menu: 'RegistrarVenta', titulo: 'Nueva Venta', render: vistaRegistrarVenta },
]

function renderHome(contenedor: HTMLElement): void {
  const usuario = obtenerUsuario()
  contenedor.append(
    el('div', { class: 'card' }, [
      el('div', { class: 'card-body text-center' }, [
        el('h4', { class: 'card-title', texto: 'Sistema de Ventas Web' }),
        el('p', { class: 'card-text', texto: `Bienvenido, ${usuario?.nom ?? usuario?.user ?? ''}.` }),
        el('p', { class: 'text-muted', texto: 'Seleccione una opción del menú superior.' }),
      ]),
    ]),
  )
}

export function menuActual(): Menu {
  const bruto = (location.hash || '').replace(/^#\/?/, '').split('?')[0]
  const encontrado = RUTAS.find((ruta) => ruta.menu === bruto)
  return encontrado?.menu ?? 'Principal'
}

function pintarContenido(marco: HTMLElement): void {
  const ruta = RUTAS.find((r) => r.menu === menuActual()) ?? RUTAS[0]!
  marco.replaceChildren()
  ruta.render(marco)
  for (const boton of document.querySelectorAll<HTMLAnchorElement>('[data-menu]')) {
    boton.classList.toggle('active', boton.dataset['menu'] === ruta.menu)
  }
}

function alCambiarRuta(): void {
  const marco = document.getElementById('marco')
  if (marco) pintarContenido(marco)
}

export function vistaPrincipal(contenedor: HTMLElement, alSalir: () => void): void {
  const usuario: Usuario | null = obtenerUsuario()
  const marco = el('div', { id: 'marco', class: 'm-4', style: 'min-height:550px' })

  const enlaces: { menu: Menu; titulo: string }[] = RUTAS.map(({ menu, titulo }) => ({ menu, titulo }))

  const menu = el(
    'ul',
    { class: 'navbar-nav' },
    enlaces.map(({ menu: nombre, titulo }) =>
      el('li', { class: 'nav-item' }, [
        el('a', {
          class: nombre === 'Principal' ? 'nav-link' : 'btn btn-outline-light',
          'data-menu': nombre,
          href: `#/${nombre}`,
          texto: titulo,
          style: nombre === 'Principal' ? '' : 'margin-left:10px;border:none',
        }),
      ]),
    ),
  )

  const desplegable = el('div', { class: 'dropdown' }, [
    el(
      'button',
      {
        class: 'btn btn-outline-light dropdown-toggle',
        style: 'border:none',
        type: 'button',
        'data-bs-toggle': 'dropdown',
        'aria-expanded': 'false',
        texto: 'Usuario Ingresado',
      },
      [],
    ),
    el('div', { class: 'dropdown-menu text-center' }, [
      el('a', { class: 'dropdown-item' }, [el('img', { src: '/img/logo.png', alt: 'Usuario', height: 60, width: 60 })]),
      el('a', { class: 'dropdown-item', texto: usuario?.user ?? '' }),
      el('a', { class: 'dropdown-item', texto: usuario?.tel ?? '' }),
      el('div', { class: 'dropdown-divider' }),
      el('button', {
        class: 'dropdown-item',
        type: 'button',
        texto: 'Salir',
        onclick: alSalir,
      }),
    ]),
  ])

  const barra = el('nav', { class: 'navbar navbar-expand-lg navbar-light bg-info' }, [
    el('div', { class: 'container-fluid' }, [
      el('div', { class: 'collapse navbar-collapse', id: 'navbarNav' }, [menu]),
      desplegable,
    ]),
  ])

  contenedor.append(barra, marco)

  window.removeEventListener('hashchange', alCambiarRuta)
  window.addEventListener('hashchange', alCambiarRuta)
  pintarContenido(marco)
}

export function cerrarSesionLocal(): void {
  limpiarSesion()
  location.hash = ''
}
