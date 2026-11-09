// app.js — arranque de la app: carga el estado, lo pinta y conecta los eventos.
// Coordina datos.js (modelo) con vista.js (pantalla).

import {
  cargar,
  guardar,
  validar,
  alternarHecha,
  crearTarea,
  actualizarTarea,
  borrarTarea,
  crearExamen,
  actualizarExamen,
  borrarExamen,
  crearMateria,
  actualizarMateria,
  borrarMateria,
  contarUsos,
  PALETA,
} from './datos.js';
import { hoyISO } from './fechas.js';
import { pintarTareas, pintarExamenes, pintarMaterias, mostrarAviso } from './vista.js';

const el = (id) => document.getElementById(id);

// --- Estado del módulo ---
let estado;
let filtro = 'pendientes';

// Qué se está editando en el diálogo: { tipo, id } o null (nuevo).
let edicion = null;

// localStorage puede lanzar al tocarlo en modo privado; cargar() lo envuelve.
const inicio = cargar(window.localStorage);
estado = inicio.estado;

/** Vuelve a pintar todo a partir del estado actual. */
function pintarTodo() {
  const hoy = hoyISO();
  pintarTareas(el('lista-tareas'), estado, filtro, hoy, { onAlternar, onAbrir });
  pintarExamenes(el('lista-examenes'), estado, hoy, { onAbrir });
  pintarMaterias(el('lista-materias'), estado, {
    onAbrir: onAbrirMateria,
    onNueva: () => abrirFormularioMateria({}),
  });
}

/** Guarda el nuevo estado, vuelve a pintar y avisa si el guardado falló. */
export function actualizar(nuevoEstado) {
  estado = nuevoEstado;
  const aviso = guardar(window.localStorage, estado);
  pintarTodo();
  if (aviso) mostrarAviso(aviso);
}

function onAlternar(id) {
  actualizar(alternarHecha(estado, id));
}

/** Abre el formulario a partir de un id de la lista (resuelve si es tarea o examen). */
function onAbrir(id) {
  const esTarea = estado.tareas.some((t) => t.id === id);
  abrirFormulario({ tipo: esTarea ? 'tarea' : 'examen', id });
}

// ===================== Formulario (diálogo) =====================

const dialogo = el('dialogo-elemento');

function elementoPorId(tipo, id) {
  const lista = tipo === 'examen' ? estado.examenes : estado.tareas;
  return lista.find((x) => x.id === id) ?? null;
}

/** Rellena el menú de materias con las materias actuales + "Sin materia". */
function llenarMaterias(materiaId) {
  const select = el('campo-materia');
  select.replaceChildren();
  const sin = document.createElement('option');
  sin.value = '';
  sin.textContent = 'Sin materia';
  select.appendChild(sin);
  for (const m of estado.materias) {
    const op = document.createElement('option');
    op.value = m.id;
    op.textContent = m.nombre;
    select.appendChild(op);
  }
  select.value = materiaId ?? '';
}

function limpiarErrores() {
  el('error-titulo').textContent = '';
  el('error-fecha').textContent = '';
  el('campo-titulo').closest('.campo').classList.remove('con-error');
  el('campo-fecha').closest('.campo').classList.remove('con-error');
}

/**
 * Abre el formulario para crear (sin id) o editar (con id).
 * @param {{ tipo: 'tarea'|'examen', id?: string }} opciones
 */
export function abrirFormulario({ tipo = 'tarea', id = null } = {}) {
  const editando = id != null;
  const item = editando ? elementoPorId(tipo, id) : null;
  if (editando && !item) return; // id que ya no existe
  edicion = editando ? { tipo, id } : null;

  const titulos = {
    'nuevo-tarea': 'Nueva tarea',
    'nuevo-examen': 'Nuevo examen',
    'editar-tarea': 'Editar tarea',
    'editar-examen': 'Editar examen',
  };
  el('dialogo-titulo').textContent = titulos[`${editando ? 'editar' : 'nuevo'}-${tipo}`];

  // Tipo (bloqueado al editar)
  for (const radio of dialogo.querySelectorAll('input[name="tipo"]')) {
    radio.checked = radio.value === tipo;
    radio.disabled = editando;
  }

  el('campo-titulo').value = item ? item.titulo : '';
  el('campo-fecha').value = item ? item.fecha : '';
  el('campo-notas').value = item ? (item.notas ?? '') : '';
  llenarMaterias(item ? item.materiaId : null);

  el('btn-borrar').hidden = !editando;
  limpiarErrores();
  dialogo.showModal();
  el('campo-titulo').focus();
}

function tipoSeleccionado() {
  const marcado = dialogo.querySelector('input[name="tipo"]:checked');
  return marcado ? marcado.value : 'tarea';
}

function guardarFormulario() {
  const titulo = el('campo-titulo').value;
  const fecha = el('campo-fecha').value;
  const materiaId = el('campo-materia').value || null;
  const notas = el('campo-notas').value;

  const { ok, errores } = validar({ titulo, fecha });
  if (!ok) {
    el('error-titulo').textContent = errores.titulo ?? '';
    el('error-fecha').textContent = errores.fecha ?? '';
    el('campo-titulo').closest('.campo').classList.toggle('con-error', !!errores.titulo);
    el('campo-fecha').closest('.campo').classList.toggle('con-error', !!errores.fecha);
    return; // no cerrar
  }

  const datos = { titulo, materiaId, fecha, notas };
  const tipo = edicion ? edicion.tipo : tipoSeleccionado();

  let nuevo;
  if (edicion) {
    nuevo = tipo === 'examen'
      ? actualizarExamen(estado, edicion.id, datos)
      : actualizarTarea(estado, edicion.id, datos);
  } else {
    nuevo = tipo === 'examen'
      ? crearExamen(estado, datos)
      : crearTarea(estado, datos);
  }
  actualizar(nuevo);
  dialogo.close();
}

function borrarFormulario() {
  if (!edicion) return;
  const item = elementoPorId(edicion.tipo, edicion.id);
  const nombre = item ? item.titulo : 'este elemento';
  if (!window.confirm(`¿Borrar «${nombre}»?`)) return;
  const nuevo = edicion.tipo === 'examen'
    ? borrarExamen(estado, edicion.id)
    : borrarTarea(estado, edicion.id);
  actualizar(nuevo);
  dialogo.close();
}

// ===================== Materias (diálogo) =====================

const dialogoMateria = el('dialogo-materia');
let edicionMateria = null; // id en edición, o null
let colorMateria = PALETA[0].color;

function onAbrirMateria(id) {
  abrirFormularioMateria({ id });
}

/** Dibuja los 8 swatches de PALETA y marca el color activo. */
function pintarSwatches() {
  const cont = el('campo-mat-colores');
  cont.replaceChildren();
  for (const c of PALETA) {
    const sw = document.createElement('button');
    sw.type = 'button';
    sw.className = 'swatch' + (c.color.toLowerCase() === colorMateria.toLowerCase() ? ' sel' : '');
    sw.style.background = c.color;
    sw.setAttribute('aria-label', c.nombre);
    sw.addEventListener('click', () => elegirColor(c.color));
    cont.appendChild(sw);
  }
}

function elegirColor(color) {
  colorMateria = color;
  el('campo-mat-color-custom').value = color;
  pintarSwatches();
}

export function abrirFormularioMateria({ id = null } = {}) {
  const editando = id != null;
  const materia = editando ? estado.materias.find((m) => m.id === id) : null;
  if (editando && !materia) return;
  edicionMateria = editando ? id : null;

  el('dialogo-materia-titulo').textContent = editando ? 'Editar materia' : 'Nueva materia';
  el('campo-mat-nombre').value = materia ? materia.nombre : '';
  el('error-mat-nombre').textContent = '';
  el('campo-mat-nombre').closest('.campo').classList.remove('con-error');

  colorMateria = materia ? materia.color : PALETA[0].color;
  el('campo-mat-color-custom').value = colorMateria;
  pintarSwatches();

  el('btn-mat-borrar').hidden = !editando;
  dialogoMateria.showModal();
  el('campo-mat-nombre').focus();
}

function guardarMateriaForm() {
  const nombre = el('campo-mat-nombre').value;
  if (!nombre || !nombre.trim()) {
    el('error-mat-nombre').textContent = 'Escribe un nombre';
    el('campo-mat-nombre').closest('.campo').classList.add('con-error');
    return;
  }
  const datos = { nombre, color: colorMateria };
  const nuevo = edicionMateria
    ? actualizarMateria(estado, edicionMateria, datos)
    : crearMateria(estado, datos);
  actualizar(nuevo);
  dialogoMateria.close();
}

function borrarMateriaForm() {
  if (!edicionMateria) return;
  const materia = estado.materias.find((m) => m.id === edicionMateria);
  const nombre = materia ? materia.nombre : 'esta materia';
  const usos = contarUsos(estado, edicionMateria);
  const mensaje = usos > 0
    ? `«${nombre}» se usa en ${usos} ${usos === 1 ? 'elemento' : 'elementos'}. Quedarán como «Sin materia». ¿Borrar?`
    : `¿Borrar «${nombre}»?`;
  if (!window.confirm(mensaje)) return;
  actualizar(borrarMateria(estado, edicionMateria));
  dialogoMateria.close();
}

// ===================== Chips de filtro =====================
function conectarFiltros() {
  const chips = Array.from(el('filtro-tareas').querySelectorAll('m3e-filter-chip'));
  for (const chip of chips) {
    chip.addEventListener('change', () => {
      if (chip.selected) {
        for (const otro of chips) if (otro !== chip) otro.selected = false;
        filtro = chip.getAttribute('value');
      } else {
        chip.selected = true; // no permitir quedarse sin filtro
      }
      pintarTodo();
    });
  }
}

// ===================== Botones =====================
function conectarBotones() {
  el('btn-nueva')?.addEventListener('click', () => abrirFormulario({ tipo: 'tarea' }));
  el('btn-guardar')?.addEventListener('click', guardarFormulario);
  el('btn-cancelar')?.addEventListener('click', () => dialogo.close());
  el('btn-borrar')?.addEventListener('click', borrarFormulario);

  el('btn-mat-guardar')?.addEventListener('click', guardarMateriaForm);
  el('btn-mat-cancelar')?.addEventListener('click', () => dialogoMateria.close());
  el('btn-mat-borrar')?.addEventListener('click', borrarMateriaForm);
  el('campo-mat-color-custom')?.addEventListener('input', (e) => elegirColor(e.target.value));
  // #btn-color se conecta en la Task 6.
}

// Arranque
conectarFiltros();
conectarBotones();
pintarTodo();
if (inicio.aviso) mostrarAviso(inicio.aviso);
