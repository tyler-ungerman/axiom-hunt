import type { GameState, Inventory } from './types'
import { ALL_ITEMS } from './types'
import { createInitialState, emptyInventory } from './engine'

export const STORAGE_KEY = 'axiom-hunt-v0'

export function serializeState(state: GameState): string {
  return JSON.stringify(state)
}

export function deserializeState(raw: string): GameState | null {
  try {
    const data = JSON.parse(raw) as Partial<GameState>
    if (!data || typeof data !== 'object') return null
    if (!data.inventory || typeof data.inventory !== 'object') return null
    const inv = emptyInventory()
    for (const id of ALL_ITEMS) {
      const n = (data.inventory as Inventory)[id]
      inv[id] = typeof n === 'number' && n >= 0 ? n : 0
    }
    return {
      inventory: inv,
      gateOpen: Boolean(data.gateOpen),
      axioms: Array.isArray(data.axioms) ? data.axioms : [],
      unlockedRuleIds: Array.isArray(data.unlockedRuleIds) ? data.unlockedRuleIds : [],
      log: Array.isArray(data.log) ? data.log : [],
      won: Boolean(data.won),
    }
  } catch {
    return null
  }
}

export function saveToLocalStorage(state: GameState, storage: Storage = localStorage): void {
  storage.setItem(STORAGE_KEY, serializeState(state))
}

export function loadFromLocalStorage(storage: Storage = localStorage): GameState | null {
  const raw = storage.getItem(STORAGE_KEY)
  if (!raw) return null
  return deserializeState(raw)
}

export function loadOrInitial(storage?: Storage): GameState {
  if (typeof storage === 'undefined' && typeof localStorage === 'undefined') {
    return createInitialState()
  }
  const s = storage ?? localStorage
  return loadFromLocalStorage(s) ?? createInitialState()
}

export function clearSaved(storage: Storage = localStorage): void {
  storage.removeItem(STORAGE_KEY)
}
