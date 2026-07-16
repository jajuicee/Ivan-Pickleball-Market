/**
 * Centralized API configuration.
 *
 * With the Vite proxy configured in vite.config.js, both dev and production
 * modes use relative paths (/api/...). Vite's proxy forwards requests from
 * :5173 to the Spring Boot backend on :8080 during development.
 *
 * In production (frontend served by Spring Boot on :8080), requests are
 * already same-origin.
 */

// API base is always empty — Vite proxy handles dev, same-origin handles prod.
export const API_BASE = '';

// WebSocket needs the actual host and port since it's a direct connection.
// In dev, Vite proxy handles /ws/* forwarding too.
const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
export const WS_BASE = `${wsProtocol}//${window.location.host}`;
