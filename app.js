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
} from './datos.js';
import { hoyISO } from './fechas.js';
import { pintarTareas, pintarExamenes, mostrarAviso } from './vista.js';

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
  // La pestaña Materias se pinta en la Task 5.
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
  // #btn-color se conecta en la Task 6.
}

// Arranque
conectarFiltros();
conectarBotones();
pintarTodo();
if (inicio.aviso) mostrarAviso(inicio.aviso);
