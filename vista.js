// vista.js — genera el HTML de las listas a partir del estado.
// No guarda nada. Todo el texto escrito por el usuario se pone con
// textContent (nunca innerHTML), para que un título con HTML se vea literal.

import { urgencia, cuentaRegresiva, formatoCorto, diasHasta } from './fechas.js';
import { buscarMateria, tareasFiltradas, examenesOrdenados } from './datos.js';

function limpiar(contenedor) {
  contenedor.replaceChildren();
}

function nodo(tag, clase, texto) {
  const el = document.createElement(tag);
  if (clase) el.className = clase;
  if (texto != null) el.textContent = texto;
  return el;
}

function vacio(contenedor, texto) {
  const p = nodo('p', 'vacio', texto);
  contenedor.appendChild(p);
}

// Pinta la parte de materia (nombre + color) dentro de .meta.
function etiquetaMateria(estado, materiaId) {
  const materia = buscarMateria(estado, materiaId);
  if (!materia) {
    const span = nodo('span', 'sin-materia', 'Sin materia');
    return { span, color: null };
  }
  return { span: nodo('span', null, materia.nombre), color: materia.color };
}

/**
 * Pinta la lista de tareas según el filtro.
 * @param {{ onAlternar(id), onAbrir(id) }} acciones
 */
export function pintarTareas(contenedor, estado, filtro, hoyIso, acciones) {
  limpiar(contenedor);
  const tareas = tareasFiltradas(estado, filtro);

  if (tareas.length === 0) {
    vacio(contenedor, filtro === 'hechas'
      ? 'Aún no marcas tareas como hechas'
      : '¡Nada pendiente! 🎉');
    return;
  }

  for (const [i, tarea] of tareas.entries()) {
    const item = nodo('div', 'item' + (tarea.hecha ? ' hecha' : ''));
    item.style.animationDelay = `${Math.min(i, 10) * 0.035}s`;
    item.addEventListener('click', () => acciones.onAbrir(tarea.id));

    const barra = nodo('span', 'barra');
    const { span: materiaSpan, color } = etiquetaMateria(estado, tarea.materiaId);
    if (color) barra.style.background = color;
    item.appendChild(barra);

    // Casilla redonda (no debe abrir el formulario al tocarla)
    const check = document.createElement('button');
    check.type = 'button';
    check.className = 'check' + (tarea.hecha ? ' on' : '');
    check.setAttribute('aria-label', 'Marcar como hecha');
    const icono = document.createElement('span');
    icono.className = 'material-symbols-rounded';
    icono.textContent = 'check';
    check.appendChild(icono);
    check.addEventListener('click', (e) => {
      e.stopPropagation();
      acciones.onAlternar(tarea.id);
    });
    item.appendChild(check);

    const cuerpo = nodo('div', 'cuerpo');
    cuerpo.appendChild(nodo('div', 'titulo', tarea.titulo));
    const meta = nodo('div', 'meta');
    meta.appendChild(materiaSpan);
    meta.appendChild(document.createTextNode(` · ${formatoCorto(tarea.fecha)}`));
    cuerpo.appendChild(meta);
    item.appendChild(cuerpo);

    const u = urgencia(tarea.fecha, hoyIso, tarea.hecha);
    item.appendChild(nodo('span', `urgencia ${u.tipo}`, u.texto));

    contenedor.appendChild(item);
  }
}

/**
 * Pinta la lista de exámenes (futuros primero, pasados atenuados).
 * @param {{ onAbrir(id) }} acciones
 */
export function pintarExamenes(contenedor, estado, hoyIso, acciones) {
  limpiar(contenedor);
  const examenes = examenesOrdenados(estado, hoyIso);

  if (examenes.length === 0) {
    vacio(contenedor, 'Sin exámenes próximos');
    return;
  }

  for (const [i, examen] of examenes.entries()) {
    const pasado = diasHasta(examen.fecha, hoyIso) < 0;
    const item = nodo('div', 'item' + (pasado ? ' pasado' : ''));
    item.style.animationDelay = `${Math.min(i, 10) * 0.035}s`;
    item.addEventListener('click', () => acciones.onAbrir(examen.id));

    const barra = nodo('span', 'barra');
    const { span: materiaSpan, color } = etiquetaMateria(estado, examen.materiaId);
    if (color) barra.style.background = color;
    item.appendChild(barra);

    const cuerpo = nodo('div', 'cuerpo');
    cuerpo.appendChild(nodo('div', 'titulo', examen.titulo));
    const meta = nodo('div', 'meta');
    meta.appendChild(materiaSpan);
    meta.appendChild(document.createTextNode(` · ${formatoCorto(examen.fecha)}`));
    cuerpo.appendChild(meta);
    item.appendChild(cuerpo);

    item.appendChild(nodo('span', 'urgencia', cuentaRegresiva(examen.fecha, hoyIso)));

    contenedor.appendChild(item);
  }
}

/**
 * Pinta la lista de materias (círculo de color + nombre) y el botón "Agregar".
 * @param {{ onAbrir(id), onNueva() }} acciones
 */
export function pintarMaterias(contenedor, estado, acciones) {
  limpiar(contenedor);

  const btn = nodo('button', 'btn-agregar', '＋ Agregar materia');
  btn.type = 'button';
  btn.addEventListener('click', () => acciones.onNueva());
  contenedor.appendChild(btn);

  const lista = nodo('div', 'lista');
  for (const [i, materia] of estado.materias.entries()) {
    const item = nodo('div', 'item materia');
    item.style.animationDelay = `${Math.min(i, 10) * 0.035}s`;
    item.addEventListener('click', () => acciones.onAbrir(materia.id));

    const circulo = nodo('span', 'circulo');
    circulo.style.background = materia.color;
    item.appendChild(circulo);

    const cuerpo = nodo('div', 'cuerpo');
    cuerpo.appendChild(nodo('div', 'titulo', materia.nombre));
    item.appendChild(cuerpo);

    lista.appendChild(item);
  }
  contenedor.appendChild(lista);
}

/** Muestra un aviso temporal abajo (tipo snackbar). */
let avisoTimer = null;
export function mostrarAviso(texto) {
  const el = document.getElementById('aviso');
  if (!el) return;
  el.textContent = texto;
  el.classList.add('visible');
  clearTimeout(avisoTimer);
  avisoTimer = setTimeout(() => el.classList.remove('visible'), 4000);
}
