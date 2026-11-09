# App de Tareas — Diseño (versión 1)

Fecha: 2026-11-08
Autores: Max (y su amigo) · diseño escrito con Claude

## 1. Objetivo

Una página web para organizar la escuela: tareas con fecha de entrega, exámenes
con cuenta regresiva y materias con color. Se usa desde la compu o el celular y
se publica gratis en GitHub Pages.

El proyecto también sirve para que Max y su amigo practiquen trabajo en equipo
con GitHub (ramas, issues y pull requests).

**Éxito de la versión 1:**
- Se puede crear, editar, borrar y marcar como hecha una tarea.
- Se pueden crear, editar y borrar exámenes, y se ve cuántos días faltan.
- Se pueden crear, renombrar, borrar y colorear materias.
- Los datos siguen ahí al cerrar y volver a abrir el navegador.
- Se ve bien en celular y en compu, en modo claro y oscuro.
- Está publicada en GitHub Pages.

## 2. Decisiones tomadas

| Tema | Decisión |
|---|---|
| Plataforma | Página web estática (HTML + CSS + JavaScript), sin servidor |
| Diseño | Material 3 Expressive con la librería de la comunidad **M3E** (`@m3e/web`), versión fijada (2.5.x) |
| Carga de la librería | Desde CDN (jsDelivr) con un *import map*, sin instalar nada ni compilar |
| Color | Azul por defecto + selector de color dentro de la app |
| Modo oscuro | Automático según el sistema (`scheme="auto"`) |
| Guardado | `localStorage` del navegador; sin cuentas |
| Publicación | GitHub Pages, repo público `app-tareas` |
| Quién programa | Claude escribe el código; Max y su amigo manejan GitHub y revisan |

**Lo que se acepta como limitación:** los datos viven en cada navegador. La compu
y el celular no se sincronizan, y Max y su amigo no comparten la misma lista.

**Riesgo conocido:** M3E no es de Google y la mantiene una sola persona. Por eso
se fija la versión, para que una actualización no rompa la app. Cambiar de
versión es editar una línea del import map.

## 3. Pantallas

Una sola página con:

- **Barra superior:** título "Mis Tareas" y botón 🎨 para el selector de color.
- **Pestañas:** Tareas · Exámenes · Materias.
- **Botón flotante (FAB) "+ Nueva":** abre el formulario.

### 3.1 Pestaña Tareas
- Chips de filtro: **Pendientes** (por defecto) / **Hechas**.
- Lista ordenada por fecha de entrega, la más próxima primero.
- Cada elemento muestra: barrita con el color de la materia, casilla, título,
  materia, fecha y una etiqueta de urgencia:
  - fecha pasada y sin hacer → **Vencida** (rojo)
  - hoy → **HOY** (rojo)
  - mañana → **MAÑANA** (naranja)
  - otro día → "en N días"
- Al tocar la casilla, la tarea cambia entre pendiente y hecha.
- Al tocar la tarea, se abre el formulario para editarla o borrarla.
- Si la lista está vacía, aparece un mensaje amable ("¡Nada pendiente! 🎉").

### 3.2 Pestaña Exámenes
- Lista ordenada por fecha, con los exámenes futuros primero.
- Cada examen muestra materia, título, fecha y cuenta regresiva
  ("Faltan 3 días", "¡Hoy!", "Mañana").
- Los exámenes pasados se ven atenuados al final.
- Al tocar un examen se puede editar o borrar.

### 3.3 Pestaña Materias
- Lista de materias con su color.
- Se puede agregar, renombrar, cambiar el color y borrar.
- Al borrar una materia que tiene tareas o exámenes, se pide confirmación y
  esos elementos quedan como "Sin materia" (no se borran).
- La primera vez trae materias de ejemplo: Matemáticas, Español, Ciencias,
  Historia e Inglés.

### 3.4 Formulario "+ Nueva" (diálogo)
- Tipo: Tarea / Examen (botones segmentados).
- Título (obligatorio).
- Materia (menú con las materias).
- Fecha (selector de fecha, obligatorio).
- Notas (opcional).
- Botones: Guardar · Cancelar · y Borrar si se está editando.
- Si falta título o fecha, se marca el campo con error y no se guarda.

### 3.5 Selector de color
- El botón 🎨 abre un menú con 8 colores: azul `#1A73E8`, morado `#6750A4`,
  verde `#1E8E3E`, rojo `#D93025`, naranja `#F57C00`, rosa `#D81B60`,
  turquesa `#00897B` y amarillo `#F9AB00`.
- La opción **Personalizado** abre el selector de color del navegador.
- Al elegir, cambia el atributo `color` de `<m3e-theme>` y toda la app se
  recolorea.
- El color se guarda en el navegador.

## 4. Arquitectura

```
app-tareas/
├── index.html   → estructura, import map, <m3e-theme> y componentes
├── estilos.css  → ajustes de layout (márgenes, ancho máximo, barrita de color)
├── app.js       → arranque: carga datos, conecta eventos, coordina datos ↔ vista
├── datos.js     → modelo y guardado (sin nada de pantalla)
├── fechas.js    → cálculos de fecha (urgencia, días que faltan), funciones puras
├── vista.js     → genera el HTML de las listas a partir de los datos
├── tests/       → pruebas de datos.js y fechas.js
└── README.md
```

Cada módulo tiene una sola tarea:

- **`fechas.js`**: funciones puras como `diasHasta(fecha, hoy)` y
  `urgencia(fecha, hoy)`. No toca la pantalla ni el almacenamiento, así que es
  fácil de probar.
- **`datos.js`**: guarda y lee `{ materias, tareas, examenes, color }` en
  `localStorage` bajo la clave `app-tareas:v1`. Expone funciones como
  `crearTarea`, `actualizarTarea`, `borrarTarea`, `alternarHecha`, lo mismo
  para exámenes y materias, y `obtenerColor` / `guardarColor`. Recibe el
  almacenamiento como parámetro para poder probarlo sin navegador.
- **`vista.js`**: recibe datos y devuelve o pinta elementos. No guarda nada.
- **`app.js`**: escucha clics y formularios, llama a `datos.js` y después
  vuelve a pintar con `vista.js`.

### 4.1 Modelo de datos

```js
{
  version: 1,
  color: "#1A73E8",
  materias: [{ id, nombre, color }],
  tareas:   [{ id, titulo, materiaId, fecha: "AAAA-MM-DD", notas, hecha }],
  examenes: [{ id, titulo, materiaId, fecha: "AAAA-MM-DD", notas }]
}
```
- `id`: texto único generado con `crypto.randomUUID()`.
- Las fechas se guardan como texto `AAAA-MM-DD` y se comparan en hora local,
  para evitar errores de zona horaria.

### 4.2 Errores
- Si `localStorage` trae datos dañados o no está disponible, la app arranca con
  datos vacíos y muestra un aviso (snackbar). No se cae.
- Si la librería M3E no carga (sin internet), el contenido se sigue viendo como
  HTML básico.

## 5. Pruebas
- Pruebas automáticas con el corredor de pruebas integrado de Node
  (`node --test`) para `fechas.js` y `datos.js`, sin dependencias extra.
- Revisión manual en el navegador antes de cada pull request: crear, editar,
  borrar, marcar como hecha, recargar la página, cambiar el color y probar el
  modo oscuro y el tamaño de celular.

## 6. Fuera de la versión 1 (se vuelven issues)
- Vista de calendario
- Apuntes por materia
- Horario de clases
- Recordatorios (notificaciones del navegador)
- Temporizador Pomodoro
- Calculadora de promedio
- Rachas y puntos
- Exportar e importar respaldo
- Cuentas y listas compartidas (necesita servidor)
