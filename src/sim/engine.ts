import { GROUND_TRUTH, getRule, ruleForStation } from './groundTruth'
import { matchGroundTruth, parseAxiom } from './parser'
import type {
  AxiomCard,
  GameState,
  Inventory,
  ItemId,
  LogEntry,
  LogKind,
  StationId,
} from './types'
import { ALL_ITEMS } from './types'

let idCounter = 0
function uid(prefix: string): string {
  idCounter += 1
  return `${prefix}_${Date.now()}_${idCounter}`
}

export function createInitialInventory(): Inventory {
  const inv = emptyInventory()
  inv.copper_ore = 2
  inv.oil = 2
  inv.key_blank = 1
  return inv
}

export function emptyInventory(): Inventory {
  const inv = {} as Inventory
  for (const id of ALL_ITEMS) inv[id] = 0
  return inv
}

export function createInitialState(): GameState {
  return {
    inventory: createInitialInventory(),
    gateOpen: false,
    axioms: [],
    unlockedRuleIds: [],
    log: [
      logLine(
        'observation',
        'You enter the Copper Workshop. Ore, oil, and a key blank sit on the bench. The exit gate is locked. Stations await — but recipes are unknown.',
      ),
    ],
    won: false,
  }
}

function logLine(kind: LogKind, message: string): LogEntry {
  return { id: uid('log'), kind, message, at: Date.now() }
}

function appendLog(state: GameState, kind: LogKind, message: string): GameState {
  return { ...state, log: [...state.log, logLine(kind, message)] }
}

function hasItems(inv: Inventory, need: Partial<Record<ItemId, number>>): boolean {
  for (const [k, n] of Object.entries(need) as [ItemId, number][]) {
    if ((inv[k] ?? 0) < n) return false
  }
  return true
}

function missingItems(inv: Inventory, need: Partial<Record<ItemId, number>>): string[] {
  const missing: string[] = []
  for (const [k, n] of Object.entries(need) as [ItemId, number][]) {
    const have = inv[k] ?? 0
    if (have < n) missing.push(`${k} (need ${n}, have ${have})`)
  }
  return missing
}

function consumeAndProduce(
  inv: Inventory,
  inputs: Partial<Record<ItemId, number>>,
  outputs: Partial<Record<ItemId, number>>,
): Inventory {
  const next = { ...inv }
  for (const [k, n] of Object.entries(inputs) as [ItemId, number][]) {
    next[k] = (next[k] ?? 0) - n
  }
  for (const [k, n] of Object.entries(outputs) as [ItemId, number][]) {
    next[k] = (next[k] ?? 0) + n
  }
  return next
}

export function isRuleUnlocked(state: GameState, ruleId: string): boolean {
  return state.unlockedRuleIds.includes(ruleId)
}

/**
 * Attempt a station action. Without a matching unlocked axiom, fails informatively.
 * Wrong/unlocked axioms never invent new physics — only ground-truth unlocks apply.
 */
export function attemptStation(state: GameState, station: StationId): GameState {
  const truth = ruleForStation(station)
  if (!truth) {
    return appendLog(state, 'sim', `No known process at station "${station}".`)
  }

  if (!isRuleUnlocked(state, truth.id)) {
    const hint =
      station === 'light'
        ? 'Ignition procedure unknown. Write an axiom describing how to light the furnace.'
        : station === 'gate'
          ? 'Gate mechanism locked. You need an activated axiom for how the gate opens.'
          : `Unknown recipe at ${station}. Experiment, then write an axiom card matching what you observe.`
    let msg = `Attempt at ${station}: FAILED — ${hint}`
    // Informative failure: if player has partial materials, say so without revealing full recipe
    const missing = missingItems(state.inventory, truth.inputs)
    if (missing.length > 0 && missing.length < Object.keys(truth.inputs).length) {
      msg += ` Observation: some materials present, but the process still refuses — something is incomplete or unlearned.`
    } else if (Object.keys(truth.inputs).length > 0 && !hasItems(state.inventory, truth.inputs)) {
      msg += ` Observation: the station does not react — ingredients or conditions seem wrong.`
    } else if (hasItems(state.inventory, truth.inputs)) {
      msg += ` Observation: materials seem ready, yet the craft will not run — the rule is not yet in the simulator.`
    }
    return appendLog(state, 'sim', msg)
  }

  // Unlocked: execute deterministic ground truth
  if (!hasItems(state.inventory, truth.inputs)) {
    const missing = missingItems(state.inventory, truth.inputs)
    return appendLog(
      state,
      'sim',
      `Attempt at ${station}: FAILED — missing ${missing.join(', ')}.`,
    )
  }

  const nextInv = consumeAndProduce(state.inventory, truth.inputs, truth.outputs)
  let next: GameState = {
    ...state,
    inventory: nextInv,
    gateOpen: truth.opensGate ? true : state.gateOpen,
    won: truth.opensGate ? true : state.won,
  }

  const produced = Object.entries(truth.outputs)
    .filter(([, n]) => (n ?? 0) > 0)
    .map(([k, n]) => `${n}× ${k}`)
    .join(', ')

  if (truth.opensGate) {
    next = appendLog(
      next,
      'sim',
      `Gate: SUCCESS — cut key turns. The exit opens. You win.`,
    )
  } else {
    next = appendLog(
      next,
      'sim',
      `${station}: SUCCESS — produced ${produced || 'effect'}.`,
    )
  }
  return next
}

/**
 * Submit a player-authored axiom. Only matching ground truth activates and unlocks.
 * Non-matching axioms stay rejected and never change physics.
 */
export function submitAxiom(state: GameState, text: string): GameState {
  const parsed = parseAxiom(text)
  const cardBase: Omit<AxiomCard, 'status' | 'reason' | 'unlocksRuleId' | 'normalized'> = {
    id: uid('ax'),
    text: text.trim(),
    createdAt: Date.now(),
  }

  if (!parsed.ok) {
    const card: AxiomCard = {
      ...cardBase,
      status: 'rejected',
      reason: `Parse error: ${parsed.error}`,
    }
    let next = { ...state, axioms: [...state.axioms, card] }
    next = appendLog(next, 'axiom', `Rejected axiom "${text.trim()}": ${parsed.error}`)
    return next
  }

  const match = matchGroundTruth(parsed)
  if (!match) {
    const card: AxiomCard = {
      ...cardBase,
      normalized: parsed.normalized,
      status: 'rejected',
      reason: 'Does not match world — false physics will not execute.',
    }
    let next = { ...state, axioms: [...state.axioms, card] }
    next = appendLog(
      next,
      'axiom',
      `Rejected axiom "${parsed.normalized}": does not match the Copper Workshop. Physics unchanged.`,
    )
    return next
  }

  if (state.unlockedRuleIds.includes(match.id)) {
    const card: AxiomCard = {
      ...cardBase,
      normalized: parsed.normalized,
      status: 'active',
      unlocksRuleId: match.id,
      reason: 'Already unlocked (duplicate).',
    }
    let next = { ...state, axioms: [...state.axioms, card] }
    next = appendLog(next, 'axiom', `Axiom already active for this process: ${parsed.normalized}`)
    return next
  }

  const card: AxiomCard = {
    ...cardBase,
    normalized: parsed.normalized,
    status: 'active',
    unlocksRuleId: match.id,
    reason: 'Matches world — process unlocked in the simulator.',
  }
  let next: GameState = {
    ...state,
    axioms: [...state.axioms, card],
    unlockedRuleIds: [...state.unlockedRuleIds, match.id],
  }
  next = appendLog(
    next,
    'axiom',
    `Activated axiom "${parsed.normalized}" — process now executable in the simulator.`,
  )
  return next
}

export function addObservation(state: GameState, message: string): GameState {
  return appendLog(state, 'observation', message)
}

export function resetGame(): GameState {
  return createInitialState()
}

/** Expose station list for UI (not the recipes). */
export const STATIONS: StationId[] = ['light', 'furnace', 'draw', 'insulation', 'cutter', 'gate']

export function describeUnlockProgress(state: GameState): string {
  return `${state.unlockedRuleIds.length} / ${GROUND_TRUTH.length} processes unlocked`
}

export { GROUND_TRUTH, getRule }
