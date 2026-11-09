# App de Tareas v1 — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Página web estática para organizar tareas, exámenes y materias, con Material 3 Expressive (M3E) y publicada en GitHub Pages.

**Architecture:** Módulos ES sin compilar. La lógica pura (`fechas.js`, `datos.js`) no toca el DOM y se prueba con `node --test`. `vista.js` pinta el DOM y `app.js` conecta los eventos. El estado es un objeto plano que se guarda en `localStorage`. Las funciones de `datos.js` no mutan: reciben un estado y devuelven uno nuevo.

**Tech Stack:** HTML, CSS, JavaScript (ES modules), `@m3e/web@2.5.12` + `lit@3` por CDN jsDelivr con import map, Node 22 (`node --test`) solo para pruebas.

**Spec:** `docs/superpowers/specs/2026-11-08-app-tareas-design.md`

## Global Constraints

- Sin servidor, sin bundler y sin dependencias de npm en tiempo de ejecución. `package.json` existe solo para `"type": "module"` y el script `test`.
- Versión de M3E fijada: `@m3e/web@2.5.12`. Lit: `lit@3.3.0`.
- Clave de almacenamiento: `app-tareas:v1`. Forma: `{ version: 1, color, materias, tareas, examenes }`.
- Fechas guardadas como texto `AAAA-MM-DD` e interpretadas en hora **local**. Nunca usar `new Date("AAAA-MM-DD")`, porque eso es UTC y da un día menos en México.
- Color inicial `#1A73E8`. Paleta: azul `#1A73E8`, morado `#6750A4`, verde `#1E8E3E`, rojo `#D93025`, naranja `#F57C00`, rosa `#D81B60`, turquesa `#00897B`, amarillo `#F9AB00`.
- Materias de ejemplo: Matemáticas, Español, Ciencias, Historia, Inglés.
- Todos los textos de la interfaz en español. El texto escrito por el usuario se pinta con `textContent`, nunca con `innerHTML`.
- `<m3e-theme color=… scheme="auto" motion="expressive">` envuelve toda la app.

## Review Focus

1. **Zona horaria:** una tarea con fecha de hoy debe decir "HOY" también en la noche en México (UTC-6). La prueba está en Task 1.
2. **Almacenamiento dañado o bloqueado:** JSON roto en `localStorage`, o `localStorage` que lanza error (modo privado). La app debe arrancar vacía y con aviso, sin caerse. La prueba está en Task 2.
3. **Materia borrada:** las tareas y exámenes que la usaban deben mostrarse como "Sin materia" y no desaparecer. La prueba está en Task 2.
4. **Título vacío o solo con espacios, o fecha vacía:** no se guarda y el campo se marca con error. La prueba está en Task 2.
5. **Texto con HTML** (por ejemplo, un título `<img src=x onerror=alert(1)>`) debe verse literal y no ejecutarse. Hay un paso de verificación manual en Task 3.

---

### Task 1: Cálculos de fechas (`fechas.js`)

**Files:**
- Create: `package.json`, `fechas.js`
- Test: `tests/fechas.test.js`

**Interfaces:**
- Produces:
  - `hoyISO(ahora?: Date) -> string`: fecha local `AAAA-MM-DD`.
  - `diasHasta(fechaISO: string, hoyIso: string) -> number`: días enteros (negativo si ya pasó).
  - `urgencia(fechaISO: string, hoyIso: string, hecha?: boolean) -> { tipo: 'vencida'|'hoy'|'manana'|'futuro'|'hecha', texto: string }`, con textos `"Vencida"`, `"HOY"`, `"MAÑANA"`, `"en N días"` y `"Hecha"`.
  - `cuentaRegresiva(fechaISO: string, hoyIso: string) -> string`: `"¡Hoy!"`, `"Mañana"`, `"Faltan N días"` o `"Ya pasó"`.
  - `formatoCorto(fechaISO: string) -> string`: por ejemplo `"vie 13 nov"` (`es-MX`, sin punto final).

- [ ] **Step 1:** Crear `package.json` con `{"name":"app-tareas","private":true,"type":"module","scripts":{"test":"node --test tests/"}}`.
- [ ] **Step 2: Escribir las pruebas que fallan** en `tests/fechas.test.js` con `node:test` y `node:assert/strict`:
  - `hoyISO(new Date(2026, 10, 8, 23, 30))` → `"2026-11-08"` (las 11:30 pm locales siguen siendo el mismo día).
  - `diasHasta("2026-11-09","2026-11-08")` → `1`; `diasHasta("2026-11-08","2026-11-08")` → `0`; `diasHasta("2026-11-01","2026-11-08")` → `-7`; `diasHasta("2026-12-01","2026-11-30")` → `1` (cambio de mes); `diasHasta("2027-01-01","2026-12-31")` → `1`.
  - `urgencia`: fecha pasada → `vencida`/`"Vencida"`; hoy → `hoy`/`"HOY"`; mañana → `manana`/`"MAÑANA"`; en 6 días → `futuro`/`"en 6 días"`; cualquier fecha con `hecha=true` → `hecha`/`"Hecha"`.
  - `cuentaRegresiva`: 0 → `"¡Hoy!"`, 1 → `"Mañana"`, 3 → `"Faltan 3 días"`, −1 → `"Ya pasó"`.
  - `formatoCorto("2026-11-13")` → `"vie 13 nov"`.
- [ ] **Step 3:** Correr `npm test`. Se espera FAIL (no existe el módulo).
- [ ] **Step 4:** Implementar `fechas.js`. Para convertir una fecha ISO, usar `new Date(a, m-1, d)`. Para contar días, comparar `Date.UTC(a,m-1,d)` entre las dos fechas y dividir entre 86 400 000 (así se evitan los saltos de horario). `formatoCorto` usa `Intl.DateTimeFormat('es-MX',{weekday:'short',day:'numeric',month:'short'})` y quita puntos y comas.
- [ ] **Step 5:** Correr `npm test`. Se espera PASS.
- [ ] **Step 6:** Commit: `git add package.json fechas.js tests/fechas.test.js && git commit -m "Agregar cálculos de fechas con pruebas"`.

### Task 2: Datos y guardado (`datos.js`)

**Files:**
- Create: `datos.js`
- Test: `tests/datos.test.js`

**Interfaces:**
- Consumes: nada de otros módulos (las funciones de orden reciben `hoyIso` como texto).
- Produces (todas puras; las que cambian el estado devuelven uno nuevo):
  - Constantes: `CLAVE = "app-tareas:v1"`, `COLOR_INICIAL = "#1A73E8"`, `PALETA` (arreglo de 8 `{nombre, color}` con los valores de Global Constraints).
  - `estadoInicial() -> Estado`: trae las 5 materias de ejemplo con colores de `PALETA`.
  - `cargar(almacen: Storage) -> { estado: Estado, aviso: string|null }`.
  - `guardar(almacen: Storage, estado: Estado) -> string|null`: devuelve un aviso si falla.
  - `validar({titulo, fecha}) -> { ok: boolean, errores: { titulo?: string, fecha?: string } }`.
  - Tareas: `crearTarea(estado, {titulo, materiaId, fecha, notas})`, `actualizarTarea(estado, id, cambios)`, `borrarTarea(estado, id)`, `alternarHecha(estado, id)`.
  - Exámenes: `crearExamen(estado, {titulo, materiaId, fecha, notas})`, `actualizarExamen(estado, id, cambios)`, `borrarExamen(estado, id)`.
  - Materias: `crearMateria(estado, {nombre, color})`, `actualizarMateria(estado, id, cambios)`, `borrarMateria(estado, id)` (deja `materiaId: null` en lo que la usaba), `contarUsos(estado, materiaId) -> number`, `buscarMateria(estado, id) -> Materia|null`.
  - Listas: `tareasFiltradas(estado, filtro: 'pendientes'|'hechas') -> Tarea[]` (por fecha ascendente), `examenesOrdenados(estado, hoyIso) -> Examen[]` (futuros y de hoy ascendentes, luego pasados descendentes).
  - `cambiarColor(estado, color) -> Estado`.
  - Los `id` se generan con `crypto.randomUUID()`. `titulo` y `nombre` se guardan con `trim()`.

- [ ] **Step 1: Escribir las pruebas que fallan** en `tests/datos.test.js`. Usar un almacén falso `{ getItem, setItem }` sobre un `Map`. Pruebas:
  - `cargar` con almacén vacío → estado con 5 materias, 0 tareas, color `#1A73E8` y `aviso === null`.
  - `cargar` con `"{roto"` en la clave → estado inicial y `aviso` con texto (no lanza).
  - `cargar` con un almacén cuyo `getItem` lanza error → estado inicial y aviso (no lanza).
  - `guardar` y después `cargar` → mismo estado (ida y vuelta).
  - `validar({titulo:"   ", fecha:""})` → `ok:false` con errores en `titulo` y `fecha`; `validar({titulo:"Tarea", fecha:"2026-11-10"})` → `ok:true`.
  - `crearTarea` agrega una tarea con `hecha:false` y `titulo` sin espacios extra, y no modifica el estado original.
  - `alternarHecha` cambia `hecha` dos veces seguidas (true y luego false).
  - `actualizarTarea` y `borrarTarea` afectan solo el `id` indicado.
  - Exámenes: crear, actualizar y borrar, igual que tareas.
  - `borrarMateria` con 2 tareas y 1 examen que la usan → los tres quedan con `materiaId:null` y la materia ya no existe; `contarUsos` antes de borrar → `3`.
  - `buscarMateria(estado, null)` → `null`.
  - `tareasFiltradas(…,'pendientes')` ordena por fecha y excluye las hechas; `'hechas'` devuelve solo las hechas.
  - `examenesOrdenados` con hoy `2026-11-08` y fechas `[11-05, 11-20, 11-08, 11-01]` → `[11-08, 11-20, 11-05, 11-01]`.
  - `cambiarColor` → `estado.color` es el nuevo color.
- [ ] **Step 2:** Correr `npm test`. Se espera FAIL.
- [ ] **Step 3:** Implementar `datos.js`. En `cargar`, poner el `getItem` y el `JSON.parse` dentro de `try/catch` y validar que `version === 1` y que existan los tres arreglos; si no, usar el estado inicial y el aviso `"No se pudieron leer tus datos guardados; empezamos de cero."`. En `guardar`, usar `try/catch` con el aviso `"No se pudo guardar. Revisa que tu navegador permita guardar datos."`.
- [ ] **Step 4:** Correr `npm test`. Se espera PASS (Task 1 y Task 2).
- [ ] **Step 5:** Commit: `git commit -m "Agregar modelo de datos y guardado con pruebas"`.

### Task 3: Página, tema y listas (`index.html`, `estilos.css`, `vista.js`, `app.js`)

**Files:**
- Create: `index.html`, `estilos.css`, `vista.js`, `app.js`

**Interfaces:**
- Consumes: Task 1 (`hoyISO`, `urgencia`, `cuentaRegresiva`, `formatoCorto`) y Task 2 (`cargar`, `guardar`, `alternarHecha`, `tareasFiltradas`, `examenesOrdenados`, `buscarMateria`).
- Produces:
  - `vista.js`: `pintarTareas(contenedor: Element, estado, filtro, hoyIso, { onAlternar(id), onAbrir(id) })`, `pintarExamenes(contenedor, estado, hoyIso, { onAbrir(id) })`, `mostrarAviso(texto)` (snackbar).
  - `app.js`: estado del módulo `estado`, `filtro` y la función `actualizar(nuevoEstado)`, que guarda, vuelve a pintar todo y muestra el aviso si `guardar` devolvió uno. Task 4 a Task 6 la usan.
  - Ids del DOM: `#tema` (m3e-theme), `#btn-color`, `#lista-tareas`, `#lista-examenes`, `#lista-materias`, `#filtro-tareas`, `#btn-nueva`.

- [ ] **Step 1: Confirmar los componentes M3E.** Revisar en `https://cdn.jsdelivr.net/npm/@m3e/web@2.5.12/` la ruta del archivo de entrada de cada componente (y en el README de cada componente los nombres de etiqueta y sus atributos) para: `theme`, `app-bar`, `tabs`, `list`, `checkbox`, `chips`, `fab`, `icon`, `snackbar`. Anotar las rutas en el import map. Si un componente no tiene la forma esperada, usar HTML simple con estilos M3 (`var(--md-sys-color-*)`) y anotarlo en el commit.
- [ ] **Step 2:** Escribir `index.html`: `<html lang="es">`, meta viewport, import map con `lit` → `https://cdn.jsdelivr.net/npm/lit@3.3.0/+esm` y las entradas `@m3e/...` del Step 1. La estructura es `<m3e-theme id="tema" color="#1A73E8" scheme="auto" motion="expressive">` → app bar "Mis Tareas" con `#btn-color` → pestañas Tareas, Exámenes y Materias con sus paneles → `#btn-nueva` (FAB extendido "Nueva"). La pestaña Tareas incluye chips de filtro Pendientes (seleccionado) y Hechas. Cargar `app.js` como `type="module"`.
- [ ] **Step 3:** Escribir `estilos.css`: ancho máximo de 720px centrado, márgenes cómodos en celular, barrita de 6px a la izquierda con el color de la materia, etiqueta de urgencia (vencida y hoy con `--md-sys-color-error`, mañana con naranja `#F57C00`), exámenes pasados con `opacity: .6`, y espacio inferior para que el FAB no tape el último elemento.
- [ ] **Step 4:** Implementar `vista.js` y `app.js` con todo el texto del usuario puesto con `textContent`. Si la lista está vacía, mostrar `"¡Nada pendiente! 🎉"` (Tareas/Pendientes), `"Aún no marcas tareas como hechas"` (Hechas) o `"Sin exámenes próximos"`. Si no hay materia, mostrar `"Sin materia"` en color neutro.
- [ ] **Step 5: Verificar en el navegador.** Servir la carpeta con `python3 -m http.server 8000`. Con datos de ejemplo cargados en la consola (`localStorage`), revisar: el orden de las tareas, las etiquetas HOY/MAÑANA/Vencida, que la casilla mueva la tarea a Hechas, que siga así al recargar, el cambio de pestaña, la cuenta regresiva de exámenes, el modo oscuro del sistema, una vista de 375px de ancho, y que un título `<img src=x onerror=alert(1)>` se vea como texto sin que salga ninguna alerta.
- [ ] **Step 6:** `npm test` sigue en PASS. Commit: `git commit -m "Agregar página con tema M3E y listas de tareas y exámenes"`.

### Task 4: Formulario Nueva/Editar (diálogo)

**Files:**
- Modify: `index.html` (diálogo `#dialogo-elemento`), `app.js`, `vista.js`

**Interfaces:**
- Consumes: Task 2 (`validar`, `crearTarea`, `actualizarTarea`, `borrarTarea`, `crearExamen`, `actualizarExamen`, `borrarExamen`) y `actualizar` de Task 3.
- Produces: `abrirFormulario({ tipo: 'tarea'|'examen', id?: string })` en `app.js`, que Task 3 usa desde `onAbrir` y desde `#btn-nueva`.

- [ ] **Step 1:** Confirmar en jsDelivr la ruta y la API de `dialog`, `segmented-button`, `form-field`, `select`/`option`, `datepicker` y `button`, y agregarlas al import map.
- [ ] **Step 2:** Agregar el diálogo con: selector Tarea/Examen (deshabilitado al editar), Título, Materia (opciones de `estado.materias` más "Sin materia"), Fecha y Notas, y los botones Guardar, Cancelar y Borrar (Borrar solo al editar). El título del diálogo es "Nueva tarea", "Nuevo examen", "Editar tarea" o "Editar examen".
- [ ] **Step 3:** Al guardar, llamar a `validar`. Si falla, mostrar los mensajes en los campos (`"Escribe un título"`, `"Elige una fecha"`) y no cerrar el diálogo. Si pasa, crear o actualizar, llamar a `actualizar(...)` y cerrar. Al borrar, pedir confirmación (`"¿Borrar «título»?"`) y luego borrar.
- [ ] **Step 4: Verificar en el navegador:** crear una tarea y un examen, editar los dos, borrar los dos, intentar guardar con el título en blanco o sin fecha (no debe guardar y debe marcar el error), Cancelar sin guardar cambios, y que todo siga igual al recargar la página.
- [ ] **Step 5:** `npm test` sigue en PASS. Commit: `git commit -m "Agregar formulario para crear, editar y borrar"`.

### Task 5: Pestaña Materias

**Files:**
- Modify: `index.html` (diálogo `#dialogo-materia`), `vista.js`, `app.js`

**Interfaces:**
- Consumes: Task 2 (`crearMateria`, `actualizarMateria`, `borrarMateria`, `contarUsos`, `PALETA`) y `actualizar`.
- Produces: `pintarMaterias(contenedor, estado, { onAbrir(id), onNueva() })` en `vista.js`.

- [ ] **Step 1:** Pintar la lista de materias (círculo de color y nombre) y el botón "Agregar materia".
- [ ] **Step 2:** Agregar el diálogo de materia con Nombre (obligatorio, `"Escribe un nombre"`), los 8 colores de `PALETA` y un `<input type="color">` como "Personalizado". Los botones son Guardar, Cancelar y Borrar (al editar).
- [ ] **Step 3:** Al borrar, si `contarUsos > 0`, confirmar con `"«Nombre» se usa en N elementos. Quedarán como «Sin materia». ¿Borrar?"`.
- [ ] **Step 4: Verificar en el navegador:** agregar, renombrar y cambiar color (la barrita de sus tareas cambia), borrar una materia que se usa (sus tareas quedan como "Sin materia"), y que la lista de materias del formulario de tareas se actualice.
- [ ] **Step 5:** Commit: `git commit -m "Agregar administración de materias"`.

### Task 6: Selector de color de la app

**Files:**
- Modify: `index.html` (menú `#menu-color`), `app.js`

**Interfaces:**
- Consumes: `PALETA` y `cambiarColor` de Task 2, y `actualizar`.
- Produces: `aplicarColor(color)`, que pone el atributo `color` de `#tema`. `actualizar` lo llama siempre, así el color también se aplica al cargar la página.

- [ ] **Step 1:** Confirmar en jsDelivr la API de `menu` e `icon-button`.
- [ ] **Step 2:** Hacer que `#btn-color` abra un menú con los 8 colores de `PALETA` (círculo y nombre, con el actual marcado) y "Personalizado…", que abre un `<input type="color">` oculto.
- [ ] **Step 3: Verificar en el navegador:** cada color recolorea la app completa, el color personalizado funciona, el color sigue igual al recargar, y se ve bien en modo claro y oscuro.
- [ ] **Step 4:** Commit: `git commit -m "Agregar selector de color del tema"`.

### Task 7: README, publicación e issues

**Files:**
- Modify: `README.md`

- [ ] **Step 1:** Escribir el `README.md` con: qué es la app, el link a GitHub Pages, cómo correrla localmente (`python3 -m http.server`), cómo correr las pruebas (`npm test`), qué hace cada archivo, cómo colaborar (rama → pull request → revisión del otro) y la nota de que los datos se guardan solo en el navegador.
- [ ] **Step 2:** Commit y push a `main`.
- [ ] **Step 3:** Activar GitHub Pages (rama `main`, carpeta raíz) con `gh api -X POST repos/{owner}/app-tareas/pages`. Si el proxy no lo permite, darle a Max los pasos en *Settings → Pages*.
- [ ] **Step 4:** Abrir la URL publicada y repetir las verificaciones rápidas: crear una tarea, recargar y cambiar el color.
- [ ] **Step 5:** Crear un issue por cada punto de la sección 6 del spec (calendario, apuntes, horario, recordatorios, Pomodoro, promedio, rachas, respaldo y cuentas compartidas) con `gh api repos/{owner}/app-tareas/issues`. Si no se puede, entregar la lista para que Max la cree.
