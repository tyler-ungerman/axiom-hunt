import { describe, expect, it } from 'vitest'
import {
  describeAxiomRejectDiff,
  describeCraftFail,
  describeHaveVsNeed,
  describeUnlockRequirement,
} from './hints'
import { createInitialInventory } from './engine'
import { ruleForStation } from './groundTruth'
import { parseAxiom } from './parser'

describe('cold-playtest hints', () => {
  it('craft fail names expected I/O and inventory gap', () => {
    const inv = createInitialInventory()
    const truth = ruleForStation('furnace')!
    const msg = describeCraftFail('furnace', truth, inv, true)
    expect(msg).toBe(
      'Attempt at furnace: FAILED — furnace needs copper_ore + heat; you have copper_ore but no heat.',
    )
  })

  it('have-vs-need phrasing', () => {
    const inv = createInitialInventory()
    expect(describeHaveVsNeed(inv, { copper_ore: 1, heat: 1 })).toBe(
      'you have copper_ore but no heat',
    )
  })

  it('reject diff: correct station wrong inputs', () => {
    const parsed = parseAxiom('craft furnace: oil -> wire')
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    const diff = describeAxiomRejectDiff(parsed)
    expect(diff).toMatch(/station furnace correct/)
    expect(diff).toMatch(/inputs differ/)
    expect(diff).toMatch(/expects copper_ore \+ heat/)
    expect(diff).toMatch(/outputs differ/)
  })

  it('reject diff: wrong station with matching I/O', () => {
    const parsed = parseAxiom('craft draw: copper_ore + heat -> copper_ingot')
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    const diff = describeAxiomRejectDiff(parsed)
    expect(diff).toMatch(/wrong station/)
    expect(diff).toMatch(/furnace/)
  })

  it('unlock requirement always names capability', () => {
    expect(describeUnlockRequirement('insulation', false)).toMatch(
      /Needs activated axiom for insulation/,
    )
    expect(describeUnlockRequirement('insulation', true)).toMatch(/Axiom active/)
  })
})
