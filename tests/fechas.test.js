import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  hoyISO,
  diasHasta,
  urgencia,
  cuentaRegresiva,
  formatoCorto,
} from '../fechas.js';

test('hoyISO usa la fecha local, no UTC', () => {
  // 8 nov 2026, 23:30 hora local -> sigue siendo el día 8
  assert.equal(hoyISO(new Date(2026, 10, 8, 23, 30)), '2026-11-08');
  // 1 ene 2027, 00:10 local
  assert.equal(hoyISO(new Date(2027, 0, 1, 0, 10)), '2027-01-01');
});

test('diasHasta cuenta días enteros entre dos fechas ISO', () => {
  assert.equal(diasHasta('2026-11-09', '2026-11-08'), 1);
  assert.equal(diasHasta('2026-11-08', '2026-11-08'), 0);
  assert.equal(diasHasta('2026-11-01', '2026-11-08'), -7);
  assert.equal(diasHasta('2026-12-01', '2026-11-30'), 1); // cambio de mes
  assert.equal(diasHasta('2027-01-01', '2026-12-31'), 1); // cambio de año
});

test('urgencia clasifica según la fecha', () => {
  const hoy = '2026-11-08';

  const vencida = urgencia('2026-11-01', hoy, false);
  assert.equal(vencida.tipo, 'vencida');
  assert.equal(vencida.texto, 'Vencida');

  const deHoy = urgencia('2026-11-08', hoy, false);
  assert.equal(deHoy.tipo, 'hoy');
  assert.equal(deHoy.texto, 'HOY');

  const manana = urgencia('2026-11-09', hoy, false);
  assert.equal(manana.tipo, 'manana');
  assert.equal(manana.texto, 'MAÑANA');

  const futuro = urgencia('2026-11-14', hoy, false);
  assert.equal(futuro.tipo, 'futuro');
  assert.equal(futuro.texto, 'en 6 días');
});

test('urgencia con hecha=true siempre es "Hecha"', () => {
  const hoy = '2026-11-08';
  // aunque esté vencida, si ya está hecha, es "Hecha"
  const hecha = urgencia('2026-11-01', hoy, true);
  assert.equal(hecha.tipo, 'hecha');
  assert.equal(hecha.texto, 'Hecha');
});

test('cuentaRegresiva para exámenes', () => {
  const hoy = '2026-11-08';
  assert.equal(cuentaRegresiva('2026-11-08', hoy), '¡Hoy!');
  assert.equal(cuentaRegresiva('2026-11-09', hoy), 'Mañana');
  assert.equal(cuentaRegresiva('2026-11-11', hoy), 'Faltan 3 días');
  assert.equal(cuentaRegresiva('2026-11-07', hoy), 'Ya pasó');
});

test('formatoCorto da "vie 13 nov" sin puntos', () => {
  assert.equal(formatoCorto('2026-11-13'), 'vie 13 nov');
});
