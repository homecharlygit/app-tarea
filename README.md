# Mis Tareas

App web para organizar la escuela: **tareas** con fecha de entrega, **exámenes**
con cuenta regresiva y **materias** con color. Funciona desde la compu o el
celular, con modo claro y oscuro automático. No necesita servidor ni cuenta: los
datos se guardan en tu propio navegador.

Hecha con Material 3 Expressive (librería [M3E](https://www.npmjs.com/package/@m3e/web))
y JavaScript puro, sin compilar nada.

## 🔗 Ver la app

GitHub Pages: **https://homecharlygit.github.io/app-tarea/**

> Si el link no abre, falta activar GitHub Pages una vez (ver más abajo).

## ✨ Qué hace

- Crear, editar, borrar y marcar tareas como hechas.
- Exámenes con cuenta regresiva ("Faltan 3 días", "¡Hoy!").
- Materias con color; al borrar una, sus tareas quedan como "Sin materia".
- Selector de color para toda la app (botón 🎨).
- Todo se guarda solo al cerrar y volver a abrir.

## 🖥️ Correr en tu compu

No hace falta instalar nada para usarla; solo sírvela como archivos estáticos:

```bash
python3 -m http.server 8000
```

Luego abre `http://localhost:8000` en el navegador.

## ✅ Correr las pruebas

La lógica de fechas y datos tiene pruebas automáticas (Node 22, sin dependencias):

```bash
npm test
```

## 📁 Qué hace cada archivo

| Archivo | Para qué |
|---|---|
| `index.html` | Estructura, carga de M3E, tema y componentes. |
| `estilos.css` | Ajustes de layout (listas, diálogos, barrita de color). |
| `fechas.js` | Cálculos de fecha (urgencia, días que faltan). Funciones puras. |
| `datos.js` | Modelo y guardado en `localStorage`. Funciones puras. |
| `vista.js` | Genera el HTML de las listas a partir de los datos. |
| `app.js` | Arranque: carga datos, conecta eventos, coordina datos ↔ vista. |
| `tests/` | Pruebas de `fechas.js` y `datos.js`. |

## 🤝 Cómo colaborar

1. Crea una rama para tu cambio: `git checkout -b mi-cambio`
2. Haz tus commits y súbelos: `git push origin mi-cambio`
3. Abre un **Pull Request** en GitHub.
4. El otro lo **revisa** y, si está bien, lo mezcla a `main`.

Antes de abrir el PR, corre `npm test` y prueba la app en el navegador.

## ⚠️ Nota sobre los datos

Los datos viven **solo en el navegador donde los creaste** (`localStorage`). La
compu y el celular no se sincronizan, y no se comparten entre personas. Si
borras los datos del navegador, se pierden.

## 🛠️ Activar GitHub Pages (una vez)

En el repo: **Settings → Pages → Build and deployment → Source: Deploy from a
branch → Branch: `main` / `(root)` → Save.** En uno o dos minutos queda viva en
el link de arriba.
