// fechas.js — cálculos de fecha, funciones puras.
// No toca el DOM ni el almacenamiento, para poder probarlo con node --test.
//
// Regla clave: las fechas se guardan como texto "AAAA-MM-DD" y se interpretan
// en hora LOCAL. Nunca usar new Date("AAAA-MM-DD"), porque eso es UTC y en
// México (UTC-6) daría un día menos.

/** Parte "AAAA-MM-DD" en [año, mes, día] numéricos. */
function partes(fechaISO) {
  const [a, m, d] = fechaISO.split('-').map(Number);
  return [a, m, d];
}

/**
 * Fecha local de hoy como "AAAA-MM-DD".
 * @param {Date} [ahora] - por defecto, el momento actual.
 */
export function hoyISO(ahora = new Date()) {
  const a = ahora.getFullYear();
  const m = String(ahora.getMonth() + 1).padStart(2, '0');
  const d = String(ahora.getDate()).padStart(2, '0');
  return `${a}-${m}-${d}`;
}

/**
 * Días enteros desde hoyIso hasta fechaISO (negativo si ya pasó).
 * Se comparan en UTC de medianoche para evitar saltos de horario de verano.
 */
export function diasHasta(fechaISO, hoyIso) {
  const [a1, m1, d1] = partes(fechaISO);
  const [a2, m2, d2] = partes(hoyIso);
  const msDestino = Date.UTC(a1, m1 - 1, d1);
  const msHoy = Date.UTC(a2, m2 - 1, d2);
  return Math.round((msDestino - msHoy) / 86_400_000);
}

/**
 * Clasifica qué tan urgente es una fecha.
 * Si hecha=true, siempre devuelve "Hecha".
 * @returns {{tipo: 'vencida'|'hoy'|'manana'|'futuro'|'hecha', texto: string}}
 */
export function urgencia(fechaISO, hoyIso, hecha = false) {
  if (hecha) return { tipo: 'hecha', texto: 'Hecha' };
  const dias = diasHasta(fechaISO, hoyIso);
  if (dias < 0) return { tipo: 'vencida', texto: 'Vencida' };
  if (dias === 0) return { tipo: 'hoy', texto: 'HOY' };
  if (dias === 1) return { tipo: 'manana', texto: 'MAÑANA' };
  return { tipo: 'futuro', texto: `en ${dias} días` };
}

/** Cuenta regresiva para exámenes: "¡Hoy!", "Mañana", "Faltan N días" o "Ya pasó". */
export function cuentaRegresiva(fechaISO, hoyIso) {
  const dias = diasHasta(fechaISO, hoyIso);
  if (dias < 0) return 'Ya pasó';
  if (dias === 0) return '¡Hoy!';
  if (dias === 1) return 'Mañana';
  return `Faltan ${dias} días`;
}

/**
 * Formato corto en es-MX, por ejemplo "vie 13 nov".
 * Se arma con formatToParts para que el resultado sea igual en todos los
 * entornos (algunos insertan "de" o comas en el formato completo).
 */
export function formatoCorto(fechaISO) {
  const [a, m, d] = partes(fechaISO);
  const fecha = new Date(a, m - 1, d);
  const partesFmt = new Intl.DateTimeFormat('es-MX', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).formatToParts(fecha);
  const sacar = (tipo) =>
    (partesFmt.find((p) => p.type === tipo)?.value ?? '').replace(/[.,]/g, '');
  return `${sacar('weekday')} ${sacar('day')} ${sacar('month')}`.trim();
}
