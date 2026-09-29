/** Utilidades mínimas de DOM (sin framework). */

type Escucha = (evento: Event) => void

export type Atributos = Record<string, string | number | boolean | null | undefined | Escucha>

export type Contenido = Node | string | number | null | undefined | false

export function el<K extends keyof HTMLElementTagNameMap>(
  etiqueta: K,
  atributos: Atributos = {},
  hijos: Contenido[] = [],
): HTMLElementTagNameMap[K] {
  const nodo = document.createElement(etiqueta)

  for (const [clave, valor] of Object.entries(atributos)) {
    if (valor === null || valor === undefined || valor === false) continue

    if (clave === 'texto') {
      nodo.textContent = String(valor)
    } else if (clave.startsWith('on') && typeof valor === 'function') {
      nodo.addEventListener(clave.slice(2).toLowerCase(), valor as Escucha)
    } else if (clave === 'class') {
      nodo.className = String(valor)
    } else if (valor === true) {
      nodo.setAttribute(clave, '')
    } else {
      nodo.setAttribute(clave, String(valor))
    }
  }

  for (const contenido of hijos) {
    if (contenido === null || contenido === undefined || contenido === false) continue
    nodo.append(typeof contenido === 'object' ? contenido : document.createTextNode(String(contenido)))
  }

  return nodo
}

export function vaciar(nodo: Element): void {
  while (nodo.firstChild) nodo.firstChild.remove()
}

export function valorDe(nodo: HTMLInputElement | HTMLSelectElement): string {
  return nodo.value.trim()
}

/** Campo de formulario con etiqueta, equivalente a los `.form-group` del JSP. */
export function campo(etiqueta: string, entrada: HTMLElement): HTMLElement {
  return el('div', { class: 'form-group' }, [
    el('label', { class: 'form-label', texto: etiqueta }),
    entrada,
  ])
}

export function aviso(container: Element, mensaje: string, tipo: 'ok' | 'error' | 'info' = 'info'): void {
  const clase = { ok: 'alert-success', error: 'alert-danger', info: 'alert-info' }[tipo]
  const alerta = el('div', { class: `alert ${clase} alert-dismissible py-2`, role: 'alert' }, [
    mensaje,
    el('button', {
      type: 'button',
      class: 'btn-close',
      'aria-label': 'Cerrar',
      onclick: (e: Event) => (e.currentTarget as HTMLElement).closest('.alert')?.remove(),
    }),
  ])
  container.prepend(alerta)
}
