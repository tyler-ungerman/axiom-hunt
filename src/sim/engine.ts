import { GROUND_TRUTH, getRule, ruleForStation } from './groundTruth'
import { describeAxiomRejectDiff, describeCraftFail, describeUnlockRequirement } from './hints'
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

  const unlocked = isRuleUnlocked(state, truth.id)

  if (!unlocked) {
    return appendLog(state, 'sim', describeCraftFail(station, truth, state.inventory, false))
  }

  // Unlocked: execute deterministic ground truth
  if (!hasItems(state.inventory, truth.inputs)) {
    return appendLog(state, 'sim', describeCraftFail(station, truth, state.inventory, true))
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
    const reason = `Parse/syntax error: ${parsed.error}`
    const card: AxiomCard = {
      ...cardBase,
      status: 'rejected',
      reason,
    }
    let next = { ...state, axioms: [...state.axioms, card] }
    next = appendLog(next, 'axiom', `Rejected axiom "${text.trim()}": ${reason}`)
    return next
  }

  const match = matchGroundTruth(parsed)
  if (!match) {
    const diff = describeAxiomRejectDiff(parsed)
    const card: AxiomCard = {
      ...cardBase,
      normalized: parsed.normalized,
      status: 'rejected',
      reason: diff,
    }
    let next = { ...state, axioms: [...state.axioms, card] }
    next = appendLog(
      next,
      'axiom',
      `Rejected axiom "${parsed.normalized}": ${diff}`,
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

/** Unlock requirement line for a station button (always shown). */
export function stationUnlockLabel(state: GameState, station: StationId): string {
  const rule = ruleForStation(station)
  if (!rule) return 'No process'
  return describeUnlockRequirement(station, isRuleUnlocked(state, rule.id))
}

export { GROUND_TRUTH, getRule, describeUnlockRequirement }
