import type { RecipeSpec } from './types'

/**
 * Hidden ground-truth rules for the Copper Workshop.
 * NEVER expose these strings in the UI as spoilers.
 */
export const GROUND_TRUTH: RecipeSpec[] = [
  {
    id: 'light_furnace',
    station: 'light',
    inputs: { oil: 1 },
    outputs: { heat: 1 },
  },
  {
    id: 'smelt_ingot',
    station: 'furnace',
    inputs: { copper_ore: 1, heat: 1 },
    outputs: { copper_ingot: 1 },
  },
  {
    id: 'draw_wire',
    station: 'draw',
    inputs: { copper_ingot: 1 },
    outputs: { wire: 1 },
  },
  {
    id: 'insulate_wire',
    station: 'insulation',
    inputs: { wire: 1, oil: 1 },
    outputs: { insulated_wire: 1 },
  },
  {
    id: 'cut_key',
    station: 'cutter',
    inputs: { insulated_wire: 1, key_blank: 1 },
    outputs: { cut_key: 1 },
  },
  {
    id: 'open_gate',
    station: 'gate',
    inputs: { cut_key: 1 },
    outputs: {},
    opensGate: true,
  },
]

export function getRule(id: string): RecipeSpec | undefined {
  return GROUND_TRUTH.find((r) => r.id === id)
}

export function ruleForStation(station: string): RecipeSpec | undefined {
  return GROUND_TRUTH.find((r) => r.station === station)
}
