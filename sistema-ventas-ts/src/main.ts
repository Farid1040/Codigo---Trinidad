import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap-icons/font/bootstrap-icons.css'
import 'bootstrap'
import './estilos.css'

import { api, ErrorApi, obtenerToken } from './api'
import { cerrarSesionLocal, vistaPrincipal } from './router'
import { el, vaciar } from './ui'
import { vistaLogin } from './vistas/Login'

const app = document.getElementById('app')
if (!(app instanceof HTMLElement)) {
  throw new Error('No se encontró el contenedor #app en index.html')
}
const contenedor: HTMLElement = app

function mostrarLogin(): void {
  vaciar(contenedor)
  vistaLogin(contenedor, () => {
    location.hash = '#/Principal'
    mostrarPrincipal()
  })
}

function mostrarPrincipal(): void {
  vaciar(contenedor)
  vistaPrincipal(contenedor, () => {
    void api.post('/auth/logout').catch(() => undefined)
    cerrarSesionLocal()
    mostrarLogin()
  })
}

async function iniciar(): Promise<void> {
  if (!obtenerToken()) {
    mostrarLogin()
    return
  }

  try {
    await api.get('/auth/session')
    mostrarPrincipal()
  } catch (error) {
    if (error instanceof ErrorApi && error.estado === 401) {
      mostrarLogin()
      return
    }
    contenedor.append(
      el('div', { class: 'container mt-5' }, [
        el('div', { class: 'alert alert-danger' }, [
          `No se pudo conectar con la API. Ejecuta "npm run dev" y carga MySQL con "npm run db:reset". Detalle: ${String(error)}`,
        ]),
      ]),
    )
  }
}

window.addEventListener('sesion:expirada', () => {
  if (obtenerToken() === null) mostrarLogin()
})

void iniciar()
