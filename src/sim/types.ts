/** Inventory item ids — heat is a temporary craft token from lighting the furnace. */
export type ItemId =
  | 'copper_ore'
  | 'copper_ingot'
  | 'wire'
  | 'heat'
  | 'oil'
  | 'insulated_wire'
  | 'key_blank'
  | 'cut_key'

export type StationId = 'furnace' | 'draw' | 'insulation' | 'cutter' | 'gate' | 'light'

export type Inventory = Record<ItemId, number>

export type LogKind = 'observation' | 'axiom' | 'sim'

export interface LogEntry {
  id: string
  kind: LogKind
  message: string
  at: number
}

export type AxiomStatus = 'pending' | 'active' | 'rejected'

export interface AxiomCard {
  id: string
  text: string
  /** Normalized DSL after parse, if parse succeeded */
  normalized?: string
  status: AxiomStatus
  reason?: string
  /** Ground-truth rule id unlocked when active */
  unlocksRuleId?: string
  createdAt: number
}

export interface GameState {
  inventory: Inventory
  gateOpen: boolean
  axioms: AxiomCard[]
  unlockedRuleIds: string[]
  log: LogEntry[]
  won: boolean
}

export interface CraftAttempt {
  station: StationId
  /** Optional explicit inputs for UI; sim validates against unlocked rule */
}

export interface AttemptResult {
  ok: boolean
  state: GameState
  message: string
}

/** Structured recipe used for matching player axioms to ground truth. */
export interface RecipeSpec {
  id: string
  station: StationId
  inputs: Partial<Record<ItemId, number>>
  outputs: Partial<Record<ItemId, number>>
  /** Special: opening the gate */
  opensGate?: boolean
}

export const ITEM_LABELS: Record<ItemId, string> = {
  copper_ore: 'Copper ore',
  copper_ingot: 'Copper ingot',
  wire: 'Wire',
  heat: 'Heat',
  oil: 'Oil',
  insulated_wire: 'Insulated wire',
  key_blank: 'Key blank',
  cut_key: 'Cut key',
}

export const STATION_LABELS: Record<StationId, string> = {
  furnace: 'Furnace',
  draw: 'Draw bench',
  insulation: 'Insulation bench',
  cutter: 'Key cutter',
  gate: 'Exit gate',
  light: 'Furnace ignition',
}

export const ALL_ITEMS: ItemId[] = [
  'copper_ore',
  'copper_ingot',
  'wire',
  'heat',
  'oil',
  'insulated_wire',
  'key_blank',
  'cut_key',
]
