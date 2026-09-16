import { axiomTemplateForStation } from './hints'
import type { StationId } from './types'

/**
 * Optional NL → axiom template via simple keyword heuristics (no API).
 * Suggests DSL text; does not activate or execute anything.
 * When focusedStation is set, prefers that station's template unless NL
 * clearly names a different process.
 */
export function suggestAxiomFromNL(
  text: string,
  focusedStation?: StationId | null,
): string {
  const t = text.toLowerCase().trim()

  const keywordHit = matchByKeywords(t)

  // Strong keyword match for a station other than focus wins
  if (keywordHit) {
    if (!focusedStation || keywordHit.station === focusedStation || keywordHit.strong) {
      return keywordHit.template
    }
  }

  // Station-aware default: focused station template
  if (focusedStation) {
    return axiomTemplateForStation(focusedStation)
  }

  if (keywordHit) return keywordHit.template

  return 'craft furnace: copper_ore + heat -> copper_ingot'
}

function matchByKeywords(
  t: string,
): { station: StationId; template: string; strong: boolean } | null {
  if (!t) return null

  if (/light|ignite|fire|burn/.test(t) && /oil|furnace/.test(t)) {
    return { station: 'light', template: axiomTemplateForStation('light'), strong: true }
  }
  if (/smelt|melt/.test(t) || (/furnace/.test(t) && /(ore|ingot|heat)/.test(t))) {
    return {
      station: 'furnace',
      template: axiomTemplateForStation('furnace'),
      strong: /smelt|melt|ore|ingot|heat/.test(t),
    }
  }
  if (/draw|anvil|stretch/.test(t) || (/wire/.test(t) && /ingot/.test(t))) {
    return { station: 'draw', template: axiomTemplateForStation('draw'), strong: true }
  }
  if (/insulat/.test(t) || (/wire/.test(t) && /oil/.test(t) && !/blank|key|cut/.test(t))) {
    return {
      station: 'insulation',
      template: axiomTemplateForStation('insulation'),
      strong: /insulat/.test(t),
    }
  }
  if (/cut.*key|key.*cut|cutter/.test(t) || (/insulated/.test(t) && /blank|key/.test(t))) {
    return { station: 'cutter', template: axiomTemplateForStation('cutter'), strong: true }
  }
  if (/gate|exit|unlock|open/.test(t) && /key/.test(t)) {
    return { station: 'gate', template: axiomTemplateForStation('gate'), strong: true }
  }

  // Soft station-name-only mentions
  if (/\bfurnace\b/.test(t)) {
    return { station: 'furnace', template: axiomTemplateForStation('furnace'), strong: false }
  }
  if (/\bdraw\b/.test(t)) {
    return { station: 'draw', template: axiomTemplateForStation('draw'), strong: false }
  }
  if (/\binsulation\b/.test(t)) {
    return {
      station: 'insulation',
      template: axiomTemplateForStation('insulation'),
      strong: false,
    }
  }
  if (/\bcutter\b/.test(t)) {
    return { station: 'cutter', template: axiomTemplateForStation('cutter'), strong: false }
  }
  if (/\bgate\b/.test(t)) {
    return { station: 'gate', template: axiomTemplateForStation('gate'), strong: false }
  }
  if (/\blight\b/.test(t)) {
    return { station: 'light', template: axiomTemplateForStation('light'), strong: false }
  }

  return null
}
