import { describe, expect, it } from 'vitest'
import {
  attemptStation,
  createInitialState,
  isRuleUnlocked,
  stationUnlockLabel,
  submitAxiom,
} from './engine'
import { deserializeState, serializeState, STORAGE_KEY } from './persist'
import { suggestAxiomFromNL } from './suggest'
import type { GameState } from './types'

function withMemoryStorage() {
  const store = new Map<string, string>()
  return {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => {
      store.set(k, v)
    },
    removeItem: (k: string) => {
      store.delete(k)
    },
  } as Storage
}

describe('Axiom Hunt discovery loop', () => {
  it('1. without axioms, crafts fail with specific expected I/O hints', () => {
    let state = createInitialState()
    state = attemptStation(state, 'furnace')
    const last = state.log[state.log.length - 1]
    expect(last.kind).toBe('sim')
    expect(last.message).toMatch(/FAILED/i)
    expect(last.message).toMatch(/furnace needs|furnace expects/i)
    expect(last.message).toMatch(/copper_ore/)
    expect(last.message).toMatch(/heat/)
    expect(last.message).toMatch(/you have/i)
    expect(state.inventory.copper_ingot).toBe(0)
    expect(isRuleUnlocked(state, 'smelt_ingot')).toBe(false)

    state = attemptStation(state, 'draw')
    expect(state.log[state.log.length - 1].message).toMatch(/FAILED/i)
    expect(state.log[state.log.length - 1].message).toMatch(/copper_ingot|draw expects|draw needs/i)
    expect(state.inventory.wire).toBe(0)
  })

  it('1b. unlocked craft missing ingredients names what is missing', () => {
    let state = createInitialState()
    state = submitAxiom(state, 'craft furnace: copper_ore + heat -> copper_ingot')
    // no heat yet
    state = attemptStation(state, 'furnace')
    const msg = state.log[state.log.length - 1].message
    expect(msg).toMatch(/FAILED/i)
    expect(msg).toMatch(/furnace needs copper_ore \+ heat/i)
    expect(msg).toMatch(/you have copper_ore but no heat/i)
  })

  it('2. activating correct furnace axiom allows ingot craft', () => {
    let state = createInitialState()
    // Need heat first — unlock light + furnace
    state = submitAxiom(state, 'action light: oil -> heat')
    state = submitAxiom(state, 'craft furnace: copper_ore + heat -> copper_ingot')
    expect(isRuleUnlocked(state, 'light_furnace')).toBe(true)
    expect(isRuleUnlocked(state, 'smelt_ingot')).toBe(true)

    state = attemptStation(state, 'light')
    expect(state.inventory.heat).toBe(1)
    expect(state.inventory.oil).toBe(1)

    state = attemptStation(state, 'furnace')
    expect(state.inventory.copper_ingot).toBe(1)
    expect(state.inventory.copper_ore).toBe(1)
    expect(state.inventory.heat).toBe(0)
    expect(state.log[state.log.length - 1].message).toMatch(/SUCCESS/)
  })

  it('3. compound path to cut_key and gate open works', () => {
    let state = createInitialState()
    const axioms = [
      'action light: oil -> heat',
      'craft furnace: copper_ore + heat -> copper_ingot',
      'craft draw: copper_ingot -> wire',
      'craft insulation: wire + oil -> insulated_wire',
      'craft cutter: insulated_wire + key_blank -> cut_key',
      'action gate: cut_key -> gate_open',
    ]
    for (const a of axioms) {
      state = submitAxiom(state, a)
      expect(state.axioms[state.axioms.length - 1].status).toBe('active')
    }
    // axioms stay active and stack
    expect(state.unlockedRuleIds).toHaveLength(6)

    state = attemptStation(state, 'light')
    state = attemptStation(state, 'furnace')
    state = attemptStation(state, 'draw')
    // insulation needs oil — we used 1 oil for light, have 1 left
    state = attemptStation(state, 'insulation')
    state = attemptStation(state, 'cutter')
    expect(state.inventory.cut_key).toBe(1)
    state = attemptStation(state, 'gate')
    expect(state.gateOpen).toBe(true)
    expect(state.won).toBe(true)
  })

  it('4. wrong axiom does not invent new recipes and gets targeted reject diff', () => {
    let state = createInitialState()
    state = submitAxiom(state, 'craft furnace: oil -> wire')
    expect(state.axioms[0].status).toBe('rejected')
    expect(state.axioms[0].reason).toMatch(/station furnace correct/i)
    expect(state.axioms[0].reason).toMatch(/inputs differ/i)
    expect(state.unlockedRuleIds).toHaveLength(0)
    expect(state.log[state.log.length - 1].message).toMatch(/inputs differ/i)

    state = attemptStation(state, 'furnace')
    expect(state.inventory.wire).toBe(0)
    expect(state.inventory.copper_ingot).toBe(0)

    // Wrong station: I/O that belongs at furnace
    state = submitAxiom(state, 'craft draw: copper_ore + heat -> copper_ingot')
    const card = state.axioms[state.axioms.length - 1]
    expect(card.status).toBe('rejected')
    expect(card.reason).toMatch(/wrong station/i)
    expect(card.reason).toMatch(/furnace/i)
    state = attemptStation(state, 'draw')
    expect(state.inventory.cut_key).toBe(0)
  })

  it('4b. syntax errors are called out as parse/syntax', () => {
    let state = createInitialState()
    state = submitAxiom(state, 'maybe melt stuff somehow')
    expect(state.axioms[0].status).toBe('rejected')
    expect(state.axioms[0].reason).toMatch(/Parse\/syntax error/i)
  })

  it('5. localStorage round-trip restores state', () => {
    let state = createInitialState()
    state = submitAxiom(state, 'action light: oil -> heat')
    state = submitAxiom(state, 'craft furnace: copper_ore + heat -> copper_ingot')
    state = attemptStation(state, 'light')
    state = attemptStation(state, 'furnace')

    const storage = withMemoryStorage()
    storage.setItem(STORAGE_KEY, serializeState(state))
    const restored = deserializeState(storage.getItem(STORAGE_KEY)!)
    expect(restored).not.toBeNull()
    const r = restored as GameState
    expect(r.inventory.copper_ingot).toBe(1)
    expect(r.unlockedRuleIds).toContain('light_furnace')
    expect(r.unlockedRuleIds).toContain('smelt_ingot')
    expect(r.axioms.filter((a) => a.status === 'active')).toHaveLength(2)
    // durable: still unlocked after restore
    expect(isRuleUnlocked(r, 'smelt_ingot')).toBe(true)
  })

  it('axioms are durable composable capabilities (stack permanently)', () => {
    let state = createInitialState()
    state = submitAxiom(state, 'craft draw: copper_ingot -> wire')
    state = submitAxiom(state, 'action light: oil -> heat')
    expect(state.unlockedRuleIds).toEqual(
      expect.arrayContaining(['draw_wire', 'light_furnace']),
    )
    // both remain active cards
    expect(state.axioms.every((a) => a.status === 'active')).toBe(true)
    // draw still fails for missing ingot but rule stays unlocked
    state = attemptStation(state, 'draw')
    expect(isRuleUnlocked(state, 'draw_wire')).toBe(true)
    expect(state.log[state.log.length - 1].message).toMatch(/missing|FAILED|needs|no copper_ingot/i)
  })

  it('unlock requirements stay visible for locked stations', () => {
    const state = createInitialState()
    const label = stationUnlockLabel(state, 'furnace')
    expect(label).toMatch(/Needs activated axiom/i)
    expect(label).toMatch(/furnace/)
    expect(label).toMatch(/copper_ore/)
  })

  it('NL suggest is station-aware when focused', () => {
    expect(suggestAxiomFromNL('', 'draw')).toBe('craft draw: copper_ingot -> wire')
    expect(suggestAxiomFromNL('something vague', 'gate')).toBe(
      'action gate: cut_key -> gate_open',
    )
    // Strong keyword still wins over focus
    expect(suggestAxiomFromNL('ignite furnace with oil', 'draw')).toBe(
      'action light: oil -> heat',
    )
  })
})
