/**
 * Optional NL → axiom template via simple keyword heuristics (no API).
 * Suggests DSL text; does not activate or execute anything.
 */
export function suggestAxiomFromNL(text: string): string {
  const t = text.toLowerCase()

  if (/light|ignite|fire|burn/.test(t) && /oil|furnace/.test(t)) {
    return 'action light: oil -> heat'
  }
  if (/smelt|melt|furnace/.test(t) && /(ore|ingot|heat)/.test(t)) {
    return 'craft furnace: copper_ore + heat -> copper_ingot'
  }
  if (/draw|wire|anvil|stretch/.test(t) && /(ingot|wire)/.test(t)) {
    return 'craft draw: copper_ingot -> wire'
  }
  if (/insulat/.test(t) || (/wire/.test(t) && /oil/.test(t))) {
    return 'craft insulation: wire + oil -> insulated_wire'
  }
  if (/cut.*key|key.*cut|cutter/.test(t) || (/insulated/.test(t) && /blank|key/.test(t))) {
    return 'craft cutter: insulated_wire + key_blank -> cut_key'
  }
  if (/gate|exit|unlock|open/.test(t) && /key/.test(t)) {
    return 'action gate: cut_key -> gate_open'
  }

  return 'craft furnace: copper_ore + heat -> copper_ingot'
}
