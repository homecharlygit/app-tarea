// app.js — arranque de la app: carga el estado, lo pinta y conecta los eventos.
// Coordina datos.js (modelo) con vista.js (pantalla).

import { cargar, guardar, alternarHecha } from './datos.js';
import { hoyISO } from './fechas.js';
import { pintarTareas, pintarExamenes, mostrarAviso } from './vista.js';

const el = (id) => document.getElementById(id);

// --- Estado del módulo ---
let estado;
let filtro = 'pendientes';

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

// El formulario para crear/editar llega en la Task 4.
function onAbrir(id) {
  // TODO (Task 4): abrirFormulario({ tipo, id });
}

// --- Chips de filtro (Pendientes / Hechas), selección única ---
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

// --- Botones que se completan en tasks siguientes ---
function conectarBotones() {
  el('btn-nueva')?.addEventListener('click', () => onAbrir(null)); // Task 4
  // #btn-color se conecta en la Task 6.
}

// Arranque
conectarFiltros();
conectarBotones();
pintarTodo();
if (inicio.aviso) mostrarAviso(inicio.aviso);
