import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CLAVE,
  COLOR_INICIAL,
  PALETA,
  estadoInicial,
  cargar,
  guardar,
  validar,
  crearTarea,
  actualizarTarea,
  borrarTarea,
  alternarHecha,
  crearExamen,
  actualizarExamen,
  borrarExamen,
  crearMateria,
  actualizarMateria,
  borrarMateria,
  contarUsos,
  buscarMateria,
  tareasFiltradas,
  examenesOrdenados,
  cambiarColor,
} from '../datos.js';

// Almacén falso sobre un Map, para probar sin navegador.
function almacenFalso(inicial = {}) {
  const mapa = new Map(Object.entries(inicial));
  return {
    getItem: (k) => (mapa.has(k) ? mapa.get(k) : null),
    setItem: (k, v) => mapa.set(k, String(v)),
  };
}

// Almacén que siempre lanza (modo privado / bloqueado).
function almacenRoto() {
  return {
    getItem() {
      throw new Error('bloqueado');
    },
    setItem() {
      throw new Error('bloqueado');
    },
  };
}

test('constantes básicas', () => {
  assert.equal(CLAVE, 'app-tareas:v1');
  assert.equal(COLOR_INICIAL, '#6750A4');
  assert.equal(PALETA.length, 8);
  assert.ok(PALETA.every((c) => c.nombre && /^#[0-9A-F]{6}$/i.test(c.color)));
});

test('estadoInicial trae 5 materias de ejemplo', () => {
  const e = estadoInicial();
  assert.equal(e.version, 1);
  assert.equal(e.color, COLOR_INICIAL);
  assert.equal(e.materias.length, 5);
  assert.equal(e.tareas.length, 0);
  assert.equal(e.examenes.length, 0);
  const nombres = e.materias.map((m) => m.nombre);
  assert.deepEqual(nombres, ['Matemáticas', 'Español', 'Ciencias', 'Historia', 'Inglés']);
});

test('cargar con almacén vacío da estado inicial sin aviso', () => {
  const { estado, aviso } = cargar(almacenFalso());
  assert.equal(aviso, null);
  assert.equal(estado.materias.length, 5);
  assert.equal(estado.tareas.length, 0);
  assert.equal(estado.color, '#6750A4');
});

test('cargar con JSON roto no se cae: estado inicial + aviso', () => {
  const { estado, aviso } = cargar(almacenFalso({ [CLAVE]: '{roto' }));
  assert.equal(estado.materias.length, 5);
  assert.ok(typeof aviso === 'string' && aviso.length > 0);
});

test('cargar con almacén que lanza no se cae: estado inicial + aviso', () => {
  const { estado, aviso } = cargar(almacenRoto());
  assert.equal(estado.materias.length, 5);
  assert.ok(typeof aviso === 'string' && aviso.length > 0);
});

test('guardar y cargar: ida y vuelta', () => {
  const almacen = almacenFalso();
  let estado = estadoInicial();
  estado = crearTarea(estado, { titulo: 'Leer', materiaId: null, fecha: '2026-11-10', notas: '' });
  const aviso = guardar(almacen, estado);
  assert.equal(aviso, null);
  const { estado: recargado } = cargar(almacen);
  assert.deepEqual(recargado, estado);
});

test('guardar en almacén bloqueado devuelve aviso, no lanza', () => {
  const aviso = guardar(almacenRoto(), estadoInicial());
  assert.ok(typeof aviso === 'string' && aviso.length > 0);
});

test('validar título y fecha', () => {
  const malo = validar({ titulo: '   ', fecha: '' });
  assert.equal(malo.ok, false);
  assert.ok(malo.errores.titulo);
  assert.ok(malo.errores.fecha);

  const bueno = validar({ titulo: 'Tarea', fecha: '2026-11-10' });
  assert.equal(bueno.ok, true);
  assert.deepEqual(bueno.errores, {});
});

test('crearTarea agrega sin mutar y recorta el título', () => {
  const original = estadoInicial();
  const nuevo = crearTarea(original, {
    titulo: '  Ensayo  ',
    materiaId: null,
    fecha: '2026-11-12',
    notas: '',
  });
  assert.equal(original.tareas.length, 0); // no se mutó
  assert.equal(nuevo.tareas.length, 1);
  assert.equal(nuevo.tareas[0].titulo, 'Ensayo');
  assert.equal(nuevo.tareas[0].hecha, false);
  assert.ok(nuevo.tareas[0].id);
});

test('alternarHecha cambia dos veces seguidas', () => {
  let e = crearTarea(estadoInicial(), { titulo: 'X', materiaId: null, fecha: '2026-11-10', notas: '' });
  const id = e.tareas[0].id;
  e = alternarHecha(e, id);
  assert.equal(e.tareas[0].hecha, true);
  e = alternarHecha(e, id);
  assert.equal(e.tareas[0].hecha, false);
});

test('actualizarTarea y borrarTarea afectan solo el id dado', () => {
  let e = estadoInicial();
  e = crearTarea(e, { titulo: 'A', materiaId: null, fecha: '2026-11-10', notas: '' });
  e = crearTarea(e, { titulo: 'B', materiaId: null, fecha: '2026-11-11', notas: '' });
  const idA = e.tareas[0].id;
  const idB = e.tareas[1].id;

  e = actualizarTarea(e, idA, { titulo: 'A2' });
  assert.equal(e.tareas.find((t) => t.id === idA).titulo, 'A2');
  assert.equal(e.tareas.find((t) => t.id === idB).titulo, 'B');

  e = borrarTarea(e, idA);
  assert.equal(e.tareas.length, 1);
  assert.equal(e.tareas[0].id, idB);
});

test('exámenes: crear, actualizar, borrar', () => {
  let e = crearExamen(estadoInicial(), { titulo: 'Parcial', materiaId: null, fecha: '2026-11-15', notas: '' });
  const id = e.examenes[0].id;
  assert.equal(e.examenes.length, 1);
  e = actualizarExamen(e, id, { titulo: 'Final' });
  assert.equal(e.examenes[0].titulo, 'Final');
  e = borrarExamen(e, id);
  assert.equal(e.examenes.length, 0);
});

test('borrarMateria deja en null lo que la usaba y no borra esos elementos', () => {
  let e = estadoInicial();
  const matId = e.materias[0].id;
  e = crearTarea(e, { titulo: 'T1', materiaId: matId, fecha: '2026-11-10', notas: '' });
  e = crearTarea(e, { titulo: 'T2', materiaId: matId, fecha: '2026-11-11', notas: '' });
  e = crearExamen(e, { titulo: 'E1', materiaId: matId, fecha: '2026-11-12', notas: '' });

  assert.equal(contarUsos(e, matId), 3);

  e = borrarMateria(e, matId);
  assert.equal(e.materias.find((m) => m.id === matId), undefined);
  assert.equal(e.tareas.length, 2);
  assert.equal(e.examenes.length, 1);
  assert.ok(e.tareas.every((t) => t.materiaId === null));
  assert.ok(e.examenes.every((x) => x.materiaId === null));
});

test('buscarMateria con null devuelve null', () => {
  assert.equal(buscarMateria(estadoInicial(), null), null);
});

test('crearMateria y actualizarMateria recortan el nombre', () => {
  let e = crearMateria(estadoInicial(), { nombre: '  Física  ', color: '#D93025' });
  assert.equal(e.materias.length, 6);
  const id = e.materias[5].id;
  assert.equal(e.materias[5].nombre, 'Física');
  e = actualizarMateria(e, id, { nombre: '  Química  ' });
  assert.equal(e.materias[5].nombre, 'Química');
});

test('tareasFiltradas ordena por fecha y separa hechas/pendientes', () => {
  let e = estadoInicial();
  e = crearTarea(e, { titulo: 'Tarde', materiaId: null, fecha: '2026-11-20', notas: '' });
  e = crearTarea(e, { titulo: 'Pronto', materiaId: null, fecha: '2026-11-09', notas: '' });
  e = crearTarea(e, { titulo: 'Media', materiaId: null, fecha: '2026-11-14', notas: '' });
  // marcar "Media" como hecha
  const idMedia = e.tareas.find((t) => t.titulo === 'Media').id;
  e = alternarHecha(e, idMedia);

  const pend = tareasFiltradas(e, 'pendientes');
  assert.deepEqual(pend.map((t) => t.titulo), ['Pronto', 'Tarde']);

  const hechas = tareasFiltradas(e, 'hechas');
  assert.deepEqual(hechas.map((t) => t.titulo), ['Media']);
});

test('examenesOrdenados: futuros y hoy ascendentes, luego pasados descendentes', () => {
  let e = estadoInicial();
  for (const f of ['2026-11-05', '2026-11-20', '2026-11-08', '2026-11-01']) {
    e = crearExamen(e, { titulo: f, materiaId: null, fecha: f, notas: '' });
  }
  const orden = examenesOrdenados(e, '2026-11-08').map((x) => x.fecha);
  assert.deepEqual(orden, ['2026-11-08', '2026-11-20', '2026-11-05', '2026-11-01']);
});

test('cambiarColor actualiza el color del estado sin mutar', () => {
  const original = estadoInicial();
  const nuevo = cambiarColor(original, '#1E8E3E');
  assert.equal(nuevo.color, '#1E8E3E');
  assert.equal(original.color, '#6750A4');
});
