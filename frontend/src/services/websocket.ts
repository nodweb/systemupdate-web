import { io, Socket } from 'socket.io-client';

declare global {
  interface ImportMeta {
    env: {
      VITE_WS_URL?: string;
      VITE_API_URL?: string;
      [key: string]: any;
    };
  }
}

const WS_URL = import.meta.env.VITE_WS_URL || (import.meta.env.VITE_API_URL?.replace(/\/api$/, '') ?? 'http://localhost:5000');

let socket: Socket | null = null;
let connected = false;
let lastHeartbeatTs: string | null = null;

type Handler = (...args: any[]) => void;
const handlers: Record<string, Set<Handler>> = {};

export function connect(token?: string) {
  if (socket && socket.connected) return socket;
  socket = io(WS_URL, {
    transports: ['websocket', 'polling'],
    autoConnect: true,
    timeout: 10000,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });

  socket.on('connect', () => {
    connected = true;
    emitLocal('ws_connected');
    const jwt = token || localStorage.getItem('access_token') || undefined;
    if (jwt) socket?.emit('authenticate', { token: jwt });
  });

  socket.on('disconnect', (reason) => {
    connected = false;
    emitLocal('ws_disconnected', reason);
  });

  socket.on('connect_error', (err) => emitLocal('ws_error', err));
  socket.io.on('reconnect_attempt', (n) => emitLocal('ws_reconnect_attempt', n));
  socket.io.on('reconnect', (n) => emitLocal('ws_reconnected', n));
  socket.io.on('reconnect_error', (err) => emitLocal('ws_reconnect_error', err));

  // Backend events
  socket.on('connected', (data) => emitLocal('connected', data));
  socket.on('authenticated', (data) => emitLocal('authenticated', data));
  socket.on('auth_failed', (data) => emitLocal('auth_failed', data));
  socket.on('heartbeat_ack', (payload) => {
    lastHeartbeatTs = payload?.ts ?? new Date().toISOString();
    emitLocal('heartbeat_ack', payload);
  });
  socket.on('data_received', (payload) => emitLocal('data_received', payload));
  socket.on('command', (payload) => emitLocal('command', payload));
  socket.on('command_result', (payload) => emitLocal('command_result', payload));

  return socket;
}

export function on(event: string, handler: (...args: any[]) => void) {
  if (!handlers[event]) handlers[event] = new Set();
  handlers[event].add(handler);
  socket?.on(event, handler);
}

export function off(event: string, handler?: (...args: any[]) => void) {
  if (handler) {
    handlers[event]?.delete(handler);
    socket?.off(event, handler);
  } else {
    handlers[event]?.forEach((h) => socket?.off(event, h));
    handlers[event]?.clear();
    socket?.off(event);
  }
}

export function emit(event: string, payload?: any) {
  socket?.emit(event, payload);
}

export function disconnect() {
  socket?.disconnect();
  socket = null;
  connected = false;
}

export function isConnected() {
  return connected;
}

export function getLastHeartbeat(): string | null {
  return lastHeartbeatTs;
}

function emitLocal(event: string, ...args: any[]) {
  if (!handlers[event]) return;
  handlers[event].forEach((h) => {
    try { h(...args); } catch {}
  });
}
