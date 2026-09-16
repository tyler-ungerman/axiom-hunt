import { GROUND_TRUTH } from './groundTruth'
import type { ItemId, RecipeSpec, StationId } from './types'
import { ALL_ITEMS } from './types'

const STATION_ALIASES: Record<string, StationId> = {
  furnace: 'furnace',
  smelt: 'furnace',
  draw: 'draw',
  anvil: 'draw',
  'draw_bench': 'draw',
  insulation: 'insulation',
  insulate: 'insulation',
  'insulation_bench': 'insulation',
  cutter: 'cutter',
  key: 'cutter',
  'key_cutter': 'cutter',
  gate: 'gate',
  exit: 'gate',
  light: 'light',
  light_furnace: 'light',
  ignition: 'light',
}

const ITEM_ALIASES: Record<string, ItemId> = {
  copper_ore: 'copper_ore',
  ore: 'copper_ore',
  copper_ingot: 'copper_ingot',
  ingot: 'copper_ingot',
  wire: 'wire',
  heat: 'heat',
  heat_token: 'heat',
  oil: 'oil',
  insulated_wire: 'insulated_wire',
  insulated: 'insulated_wire',
  key_blank: 'key_blank',
  blank: 'key_blank',
  cut_key: 'cut_key',
  key: 'cut_key',
  gate_open: 'cut_key', // not an item — handled via opensGate
}

function normalizeToken(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, '_').replace(/-+/g, '_')
}

function parseItemList(side: string): { items: Partial<Record<ItemId, number>>; opensGate: boolean; error?: string } {
  const items: Partial<Record<ItemId, number>> = {}
  let opensGate = false
  const parts = side.split('+').map((p) => p.trim()).filter(Boolean)
  if (parts.length === 0) {
    return { items, opensGate, error: 'empty item list' }
  }
  for (const part of parts) {
    const m = part.match(/^(?:(\d+)\s*[x*]?\s*)?(.+)$/i)
    if (!m) return { items, opensGate, error: `cannot parse item "${part}"` }
    const qty = m[1] ? parseInt(m[1], 10) : 1
    const token = normalizeToken(m[2])
    if (token === 'gate_open' || token === 'open' || token === 'exit') {
      opensGate = true
      continue
    }
    const item = ITEM_ALIASES[token]
    if (!item || !ALL_ITEMS.includes(item)) {
      return { items, opensGate, error: `unknown item "${m[2].trim()}"` }
    }
    items[item] = (items[item] ?? 0) + qty
  }
  return { items, opensGate }
}

export interface ParseOk {
  ok: true
  station: StationId
  inputs: Partial<Record<ItemId, number>>
  outputs: Partial<Record<ItemId, number>>
  opensGate: boolean
  normalized: string
}

export interface ParseErr {
  ok: false
  error: string
}

export type ParseResult = ParseOk | ParseErr

/**
 * Constrained DSL:
 *   craft <station>: <inputs> -> <outputs>
 *   action light_furnace: oil -> heat
 *   action open_gate: cut_key -> gate_open
 */
export function parseAxiom(text: string): ParseResult {
  const raw = text.trim()
  if (!raw) return { ok: false, error: 'empty axiom' }

  const m = raw.match(/^(?:craft|action|rule)\s+([a-zA-Z0-9_\-]+)\s*:\s*(.+?)\s*(?:->|→|⇒)\s*(.+)$/i)
  if (!m) {
    return {
      ok: false,
      error: 'expected: craft <station>: <inputs> -> <outputs>',
    }
  }

  const stationToken = normalizeToken(m[1])
  const station = STATION_ALIASES[stationToken]
  if (!station) {
    return { ok: false, error: `unknown station "${m[1].trim()}"` }
  }

  const left = parseItemList(m[2])
  if (left.error) return { ok: false, error: left.error }
  const right = parseItemList(m[3])
  if (right.error) return { ok: false, error: right.error }

  const opensGate = right.opensGate || station === 'gate'
  const normalized = formatNormalized(station, left.items, right.items, opensGate)

  return {
    ok: true,
    station,
    inputs: left.items,
    outputs: right.items,
    opensGate,
    normalized,
  }
}

function formatNormalized(
  station: StationId,
  inputs: Partial<Record<ItemId, number>>,
  outputs: Partial<Record<ItemId, number>>,
  opensGate: boolean,
): string {
  const fmt = (bag: Partial<Record<ItemId, number>>) =>
    Object.entries(bag)
      .filter(([, n]) => (n ?? 0) > 0)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, n]) => (n === 1 ? k : `${n} ${k}`))
      .join(' + ')
  const out = opensGate
    ? [fmt(outputs), 'gate_open'].filter(Boolean).join(' + ') || 'gate_open'
    : fmt(outputs) || '(nothing)'
  const verb = station === 'light' || station === 'gate' ? 'action' : 'craft'
  return `${verb} ${station}: ${fmt(inputs) || '(nothing)'} -> ${out}`
}

function bagsEqual(a: Partial<Record<ItemId, number>>, b: Partial<Record<ItemId, number>>): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]) as Set<ItemId>
  for (const k of keys) {
    if ((a[k] ?? 0) !== (b[k] ?? 0)) return false
  }
  return true
}

/** Match a parsed axiom against hidden ground truth. Returns rule id or null. */
export function matchGroundTruth(parsed: ParseOk): RecipeSpec | null {
  for (const rule of GROUND_TRUTH) {
    if (rule.station !== parsed.station) continue
    if (!bagsEqual(rule.inputs, parsed.inputs)) continue
    if (!bagsEqual(rule.outputs, parsed.outputs)) continue
    if (Boolean(rule.opensGate) !== Boolean(parsed.opensGate)) continue
    return rule
  }
  return null
}
