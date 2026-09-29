/**
 * Genera el número de serie correlativo de una venta.
 *
 * Puerto de `Config/GenerarSerie.java`: se toma el último número usado, se
 * incrementa y se rellena con ceros a la izquierda hasta 8 dígitos.
 *
 * Corrección sobre el Java: allí los rangos se solapaban (`dato < 10` añadía
 * 8 ceros más el dígito, produciendo 9 caracteres: "000000002"), lo que
 * rompía la serie "00000001" en cuanto había pocas ventas registradas. Aquí
 * se rellena a 8 dígitos exactos.
 */
export class GenerarSerie {
  private numero = ''

  numeroSerie(dato: number): string {
    const valor = Math.trunc(dato) + 1
    this.numero = String(valor).padStart(8, '0')
    return this.numero
  }
}

/** Atajo funcional equivalente a `new GenerarSerie().numeroSerie(dato)`. */
export function numeroSerie(dato: number): string {
  return new GenerarSerie().numeroSerie(dato)
}

export const SERIE_INICIAL = '00000001'
