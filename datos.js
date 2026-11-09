// datos.js — modelo y guardado. Funciones puras, sin DOM.
// Las funciones que cambian el estado reciben uno y devuelven uno NUEVO
// (no mutan), para que la vista siempre pinte a partir del estado devuelto.

export const CLAVE = 'app-tareas:v1';
export const COLOR_INICIAL = '#6750A4';

export const PALETA = [
  { nombre: 'Azul', color: '#1A73E8' },
  { nombre: 'Morado', color: '#6750A4' },
  { nombre: 'Verde', color: '#1E8E3E' },
  { nombre: 'Rojo', color: '#D93025' },
  { nombre: 'Naranja', color: '#F57C00' },
  { nombre: 'Rosa', color: '#D81B60' },
  { nombre: 'Turquesa', color: '#00897B' },
  { nombre: 'Amarillo', color: '#F9AB00' },
];

const MATERIAS_EJEMPLO = ['Matemáticas', 'Español', 'Ciencias', 'Historia', 'Inglés'];

const AVISO_CARGA = 'No se pudieron leer tus datos guardados; empezamos de cero.';
const AVISO_GUARDA = 'No se pudo guardar. Revisa que tu navegador permita guardar datos.';

function nuevoId() {
  return crypto.randomUUID();
}

/** Estado nuevo con las 5 materias de ejemplo y sin tareas ni exámenes. */
export function estadoInicial() {
  return {
    version: 1,
    color: COLOR_INICIAL,
    materias: MATERIAS_EJEMPLO.map((nombre, i) => ({
      id: nuevoId(),
      nombre,
      color: PALETA[i].color,
    })),
    tareas: [],
    examenes: [],
  };
}

/** Comprueba que un objeto cargado tenga la forma esperada. */
function estadoValido(e) {
  return (
    e &&
    typeof e === 'object' &&
    e.version === 1 &&
    typeof e.color === 'string' &&
    Array.isArray(e.materias) &&
    Array.isArray(e.tareas) &&
    Array.isArray(e.examenes)
  );
}

/**
 * Lee el estado del almacén. Nunca lanza: si algo falla (JSON roto, almacén
 * bloqueado, forma inválida), arranca con el estado inicial y devuelve un aviso.
 * @returns {{ estado: object, aviso: string|null }}
 */
export function cargar(almacen) {
  try {
    const texto = almacen.getItem(CLAVE);
    if (texto == null) return { estado: estadoInicial(), aviso: null };
    const datos = JSON.parse(texto);
    if (!estadoValido(datos)) return { estado: estadoInicial(), aviso: AVISO_CARGA };
    return { estado: datos, aviso: null };
  } catch {
    return { estado: estadoInicial(), aviso: AVISO_CARGA };
  }
}

/**
 * Guarda el estado. Nunca lanza.
 * @returns {string|null} aviso si falló, o null si todo bien.
 */
export function guardar(almacen, estado) {
  try {
    almacen.setItem(CLAVE, JSON.stringify(estado));
    return null;
  } catch {
    return AVISO_GUARDA;
  }
}

/**
 * Valida los campos obligatorios de una tarea o examen.
 * @returns {{ ok: boolean, errores: { titulo?: string, fecha?: string } }}
 */
export function validar({ titulo, fecha }) {
  const errores = {};
  if (!titulo || !titulo.trim()) errores.titulo = 'Escribe un título';
  if (!fecha) errores.fecha = 'Elige una fecha';
  return { ok: Object.keys(errores).length === 0, errores };
}

// --- Tareas ------------------------------------------------------------

export function crearTarea(estado, { titulo, materiaId, fecha, notas }) {
  const tarea = {
    id: nuevoId(),
    titulo: (titulo ?? '').trim(),
    materiaId: materiaId ?? null,
    fecha,
    notas: notas ?? '',
    hecha: false,
  };
  return { ...estado, tareas: [...estado.tareas, tarea] };
}

export function actualizarTarea(estado, id, cambios) {
  const limpios = { ...cambios };
  if (typeof limpios.titulo === 'string') limpios.titulo = limpios.titulo.trim();
  return {
    ...estado,
    tareas: estado.tareas.map((t) => (t.id === id ? { ...t, ...limpios } : t)),
  };
}

export function borrarTarea(estado, id) {
  return { ...estado, tareas: estado.tareas.filter((t) => t.id !== id) };
}

export function alternarHecha(estado, id) {
  return {
    ...estado,
    tareas: estado.tareas.map((t) => (t.id === id ? { ...t, hecha: !t.hecha } : t)),
  };
}

// --- Exámenes ----------------------------------------------------------

export function crearExamen(estado, { titulo, materiaId, fecha, notas }) {
  const examen = {
    id: nuevoId(),
    titulo: (titulo ?? '').trim(),
    materiaId: materiaId ?? null,
    fecha,
    notas: notas ?? '',
  };
  return { ...estado, examenes: [...estado.examenes, examen] };
}

export function actualizarExamen(estado, id, cambios) {
  const limpios = { ...cambios };
  if (typeof limpios.titulo === 'string') limpios.titulo = limpios.titulo.trim();
  return {
    ...estado,
    examenes: estado.examenes.map((x) => (x.id === id ? { ...x, ...limpios } : x)),
  };
}

export function borrarExamen(estado, id) {
  return { ...estado, examenes: estado.examenes.filter((x) => x.id !== id) };
}

// --- Materias ----------------------------------------------------------

export function crearMateria(estado, { nombre, color }) {
  const materia = { id: nuevoId(), nombre: (nombre ?? '').trim(), color };
  return { ...estado, materias: [...estado.materias, materia] };
}

export function actualizarMateria(estado, id, cambios) {
  const limpios = { ...cambios };
  if (typeof limpios.nombre === 'string') limpios.nombre = limpios.nombre.trim();
  return {
    ...estado,
    materias: estado.materias.map((m) => (m.id === id ? { ...m, ...limpios } : m)),
  };
}

/** Borra la materia y deja en null el materiaId de lo que la usaba (no borra esos elementos). */
export function borrarMateria(estado, id) {
  return {
    ...estado,
    materias: estado.materias.filter((m) => m.id !== id),
    tareas: estado.tareas.map((t) => (t.materiaId === id ? { ...t, materiaId: null } : t)),
    examenes: estado.examenes.map((x) => (x.materiaId === id ? { ...x, materiaId: null } : x)),
  };
}

/** Cuántas tareas y exámenes usan esta materia. */
export function contarUsos(estado, materiaId) {
  const t = estado.tareas.filter((x) => x.materiaId === materiaId).length;
  const e = estado.examenes.filter((x) => x.materiaId === materiaId).length;
  return t + e;
}

/** Devuelve la materia por id, o null si no existe (o si id es null). */
export function buscarMateria(estado, id) {
  if (id == null) return null;
  return estado.materias.find((m) => m.id === id) ?? null;
}

// --- Listas ------------------------------------------------------------

/** Tareas filtradas por 'pendientes' o 'hechas', ordenadas por fecha ascendente. */
export function tareasFiltradas(estado, filtro) {
  const hecha = filtro === 'hechas';
  return estado.tareas
    .filter((t) => t.hecha === hecha)
    .slice()
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
}

/** Exámenes: futuros y de hoy primero (ascendente), luego los pasados (descendente). */
export function examenesOrdenados(estado, hoyIso) {
  const futuros = [];
  const pasados = [];
  for (const x of estado.examenes) {
    (x.fecha >= hoyIso ? futuros : pasados).push(x);
  }
  futuros.sort((a, b) => a.fecha.localeCompare(b.fecha));
  pasados.sort((a, b) => b.fecha.localeCompare(a.fecha));
  return [...futuros, ...pasados];
}

export function cambiarColor(estado, color) {
  return { ...estado, color };
}
