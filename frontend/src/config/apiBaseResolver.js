/**
 * Centralized API base URL resolver for all environments.
 * - NEVER hardcode localhost/127.0.0.1.
 * - Uses current window protocol/host.
 * - Priority: REACT_APP_API_URL > relative /api > port mapping.
 * - On same-origin (production, reverse-proxy), uses RELATIVE /api so LAN devices always resolve correctly.
 * - On CRA dev server port 3000, resolves to http://<hostname>:5000/api for backend.
 */

export function resolveApiBaseUrl() {
  // ── Step 1: Explicit REACT_APP_API_URL takes highest priority ───────────────
  const explicit = process.env.REACT_APP_API_URL;
  if (explicit && typeof explicit === 'string' && explicit.trim()) {
    const trimmed = explicit.trim();
    return trimmed.endsWith('/api') ? trimmed : `${trimmed.replace(/\/+$/, '')}/api`;
  }

  // ── Step 2: SSR / non-browser guard ─────────────────────────────────────────
  if (typeof window === 'undefined') {
    throw new Error('resolveApiBaseUrl: window is undefined outside the browser. Set REACT_APP_API_URL in your environment to supply the API base URL for SSR/tests.');
  }

  const { protocol, hostname, port } = window.location;

  // ── Step 3: When served from same origin (port 5000, 80, 443, or empty),
  //            use RELATIVE /api — this works on ALL network devices without CORS.
  const isSameOrigin = !port || port === '5000' || port === '80' || port === '443';
  if (isSameOrigin) {
    return '/api';
  }

  // ── Step 4: CRA dev server on port 3000 — resolve backend on port 5000 ──────
  const apiPortOverride = process.env.REACT_APP_API_PORT;
  const apiPort = apiPortOverride && apiPortOverride.trim()
    ? apiPortOverride.trim()
    : '5000';

  const resolved = `${protocol}//${hostname}:${apiPort}/api`;

  

  return resolved;
}

export const API_BASE_URL = (() => {
  try {
    return resolveApiBaseUrl();
  } catch (_e) {
    return '/api';
  }
})();

export function resolveSocketBaseUrl() {
  const apiBase = API_BASE_URL;
  if (apiBase === '/api') return window.location.origin;
  return apiBase.replace(/\/api\/?$/, '');
}
