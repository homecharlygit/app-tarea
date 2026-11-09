// nube.js — sincronización con Google Drive (carpeta oculta appDataFolder).
//
// Usa Google Identity Services (GIS) para el login y la API REST de Drive para
// guardar/leer un solo archivo JSON con todo el estado. No necesita servidor:
// todo pasa en el navegador y los datos viven en el Drive del propio usuario.
//
// Estrategia simple (v1): al conectar, si Drive ya tiene datos, mandan los de
// Drive; si está vacío, se sube lo local. Después, cada cambio local se sube.
// Es "el último que guarda, gana" entre dispositivos; suficiente para un uso
// personal. No puedo probar OAuth desde aquí, así que esto se verifica en vivo.

import { CLIENT_ID } from './config.js';

const SCOPE = 'https://www.googleapis.com/auth/drive.appdata openid email profile';
const ARCHIVO = 'app-tarea.json';
const CLAVE_SESION = 'app-tarea:sesion';

let tokenClient = null;
let accessToken = null;
let archivoId = null;
let usuario = null;
let cbs = {};

/** ¿Ya pegaron un Client ID real (y bien formado) en config.js? */
export function nubeConfigurada() {
  return (
    !!CLIENT_ID &&
    !CLIENT_ID.startsWith('TU_') &&
    CLIENT_ID.endsWith('.apps.googleusercontent.com')
  );
}

export function estaConectado() {
  return !!accessToken;
}

export function usuarioActual() {
  return usuario;
}

/**
 * Inicializa la nube.
 * @param {{ onSesion(usuario|null), onDatos(estado), estadoActual():object }} callbacks
 */
export function initNube(callbacks) {
  cbs = callbacks;
  if (!nubeConfigurada()) return;
  esperarGIS().then(() => {
    tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPE,
      callback: async (resp) => {
        if (resp.error || !resp.access_token) return;
        accessToken = resp.access_token;
        localStorage.setItem(CLAVE_SESION, '1');
        await trasConectar();
      },
    });
    // Si ya había sesión, intenta reconectar en silencio (sin popup).
    if (localStorage.getItem(CLAVE_SESION) === '1') {
      tokenClient.requestAccessToken({ prompt: '' });
    }
  });
}

/** Lanza el popup de inicio de sesión de Google. */
export function iniciarSesion() {
  if (!tokenClient) return;
  tokenClient.requestAccessToken({ prompt: accessToken ? '' : 'consent' });
}

/** Cierra sesión y revoca el token. */
export function cerrarSesion() {
  const t = accessToken;
  accessToken = null;
  archivoId = null;
  usuario = null;
  localStorage.removeItem(CLAVE_SESION);
  if (t && window.google?.accounts?.oauth2) {
    google.accounts.oauth2.revoke(t, () => {});
  }
  cbs.onSesion?.(null);
}

/** Sube el estado a Drive (silencioso; no rompe si falla). */
export async function guardarEnNube(estado) {
  if (!accessToken) return;
  try {
    if (archivoId === null) await buscarArchivo();
    const cuerpo = JSON.stringify(estado);
    if (archivoId) {
      await fetch(`https://www.googleapis.com/upload/drive/v3/files/${archivoId}?uploadType=media`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: cuerpo,
      });
    } else {
      const meta = { name: ARCHIVO, parents: ['appDataFolder'] };
      const limite = 'limite' + Date.now();
      const body =
        `--${limite}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(meta)}\r\n` +
        `--${limite}\r\nContent-Type: application/json\r\n\r\n${cuerpo}\r\n--${limite}--`;
      const r = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': `multipart/related; boundary=${limite}` },
        body,
      });
      const data = await r.json();
      archivoId = data.id ?? null;
    }
  } catch {
    // Silencioso: los datos ya están guardados en local de todos modos.
  }
}

// --- Internos ---

function esperarGIS() {
  return new Promise((res) => {
    if (window.google?.accounts?.oauth2) return res();
    const t = setInterval(() => {
      if (window.google?.accounts?.oauth2) {
        clearInterval(t);
        res();
      }
    }, 100);
  });
}

async function trasConectar() {
  usuario = await obtenerPerfil();
  cbs.onSesion?.(usuario);
  const datos = await descargar();
  if (datos) {
    cbs.onDatos?.(datos); // Drive manda si ya tenía algo
  } else {
    await guardarEnNube(cbs.estadoActual?.()); // sube lo local si Drive está vacío
  }
}

async function obtenerPerfil() {
  try {
    const r = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return r.ok ? await r.json() : null; // { name, email, picture }
  } catch {
    return null;
  }
}

async function buscarArchivo() {
  try {
    const r = await fetch(
      'https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&fields=files(id,name)',
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    const files = (await r.json()).files || [];
    archivoId = files.find((f) => f.name === ARCHIVO)?.id ?? null;
  } catch {
    archivoId = null;
  }
  return archivoId;
}

async function descargar() {
  await buscarArchivo();
  if (!archivoId) return null;
  try {
    const r = await fetch(`https://www.googleapis.com/drive/v3/files/${archivoId}?alt=media`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return r.ok ? await r.json() : null;
  } catch {
    return null;
  }
}
