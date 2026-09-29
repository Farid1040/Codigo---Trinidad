import { api, guardarToken, guardarUsuario, ErrorApi } from '../api'
import { aviso, el, vaciar } from '../ui'

/** Réplica de `web/index.jsp` (validado por el servlet `Validar`). */
export function vistaLogin(contenedor: HTMLElement, alIngresar: () => void): void {
  vaciar(contenedor)

  const cajaPass = el('input', {
    id: 'txtpass',
    class: 'form-control',
    type: 'password',
    name: 'txtpass',
    placeholder: 'Ingrese su Contraseña',
    autocomplete: 'current-password',
  })

  const ojo = el('button', {
    id: 'show_password',
    class: 'btn btn-primary',
    type: 'button',
    'aria-label': 'Mostrar contraseña',
    onclick: () => {
      const visible = cajaPass.getAttribute('type') === 'text'
      cajaPass.setAttribute('type', visible ? 'password' : 'text')
      vaciar(ojo)
      ojo.append(el('i', { class: visible ? 'bi bi-eye-slash' : 'bi bi-eye' }))
      ojo.setAttribute('aria-label', visible ? 'Mostrar contraseña' : 'Ocultar contraseña')
    },
  })
  ojo.append(el('i', { class: 'bi bi-eye-slash' }))

  const boton = el('input', {
    class: 'btn btn-primary w-100',
    type: 'submit',
    name: 'accion',
    value: 'Ingresar',
  })

  const form = el(
    'form',
    {
      class: 'form-sign',
      novalidate: true,
      onsubmit: async (evento: Event) => {
        evento.preventDefault()
        const datos = new FormData(evento.currentTarget as HTMLFormElement)
        boton.setAttribute('disabled', '')
        boton.value = 'Verificando...'
        try {
          const respuesta = await api.post<{
            ok: boolean
            token: string
            usuario: { idEmpleado: number; user: string; dni: string; nom: string; tel: string }
          }>('/auth/login', {
            accion: 'Ingresar',
            user: String(datos.get('txtuser') ?? '').trim(),
            password: String(datos.get('txtpass') ?? ''),
          })
          guardarToken(respuesta.token)
          guardarUsuario(respuesta.usuario)
          alIngresar()
        } catch (error) {
          const mensaje = error instanceof ErrorApi ? error.message : 'No se pudo iniciar sesión.'
          aviso(contenedor, mensaje, 'error')
        } finally {
          boton.removeAttribute('disabled')
          boton.value = 'Ingresar'
        }
      },
    },
    [
      el('div', { class: 'form-group text-center' }, [
        el('h3', { texto: 'Login' }),
        el('img', { src: '/img/logo.png', alt: 'Sistema de Ventas', height: 70, width: 70 }),
        el('label', { texto: 'Bienvenido al Sistema', class: 'form-label' }),
      ]),

      el('div', { class: 'form-group' }, [
        el('label', { class: 'form-label', texto: 'Usuario:' }),
        el('input', {
          class: 'form-control',
          type: 'text',
          name: 'txtuser',
          placeholder: 'Ingrese su Usuario',
          autocomplete: 'username',
        }),
      ]),

      el('div', { class: 'form-group' }, [
        el('label', { class: 'form-label', texto: 'Contraseña:' }),
        el('div', { class: 'input-group' }, [cajaPass, ojo]),
      ]),

      el('div', { class: 'form-group' }, [boton]),

      el('p', { class: 'text-muted small text-center mb-0' }, [
        'Usuarios de prueba: emp01 / Jo46 / Em22 — contraseña 123456',
      ]),
    ],
  )

  contenedor.append(
    el('div', { class: 'container mt-4 col-lg-4' }, [
      el('div', { class: 'card col-sm-10' }, [el('div', { class: 'card-body' }, [form])]),
    ]),
  )

  ;(form.querySelector('input[name="txtuser"]') as HTMLInputElement | null)?.focus()
}
