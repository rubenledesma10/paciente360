import { useSyncExternalStore } from 'react';
import { containsProfanity } from '../utils/profanity';

// Compartido por todos los asistentes de IA: lo ofensivo en uno cuenta para todos.
export const MAX_STRIKES = 3;
export const BLOCK_MINUTES = 30;

const STORAGE_KEY = 'p360_ai_moderation';
const EMPTY = { strikes: 0, blockedUntil: 0 };

const listeners = new Set();
let unblockTimer = null;

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : EMPTY;
    return {
      strikes: Number(parsed.strikes) || 0,
      blockedUntil: Number(parsed.blockedUntil) || 0,
    };
  } catch {
    return EMPTY;
  }
}

let state = load();

function setState(next) {
  state = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Sin almacenamiento disponible: el bloqueo igual funciona en esta sesion.
  }
  scheduleUnblock();
  listeners.forEach((listener) => listener());
}

// Levanta el bloqueo solo cuando se cumple el tiempo.
function scheduleUnblock() {
  clearTimeout(unblockTimer);
  if (!state.blockedUntil) return;
  const remaining = state.blockedUntil - Date.now();
  if (remaining <= 0) {
    setState(EMPTY);
    return;
  }
  unblockTimer = setTimeout(() => setState(EMPTY), remaining);
}

// Contempla un bloqueo guardado en una visita anterior (vigente o ya vencido).
scheduleUnblock();

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return state;
}

export function useModeration() {
  const { strikes, blockedUntil } = useSyncExternalStore(
    subscribe,
    getSnapshot,
  );
  const blocked = blockedUntil > 0;

  // Devuelve { ok: true } si el texto se puede enviar. Si no, suma la
  // advertencia e informa si el asistente acaba de quedar bloqueado.
  const check = (text) => {
    if (blocked) return { ok: false, blocked: true, strikesLeft: 0 };
    if (!containsProfanity(text)) return { ok: true };

    const newStrikes = state.strikes + 1;
    if (newStrikes >= MAX_STRIKES) {
      setState({
        strikes: 0,
        blockedUntil: Date.now() + BLOCK_MINUTES * 60_000,
      });
      return { ok: false, blocked: true, strikesLeft: 0 };
    }
    setState({ strikes: newStrikes, blockedUntil: 0 });
    return { ok: false, blocked: false, strikesLeft: MAX_STRIKES - newStrikes };
  };

  return { blocked, blockedUntil, strikes, check };
}
