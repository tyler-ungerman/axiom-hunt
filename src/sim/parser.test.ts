import { describe, expect, it } from 'vitest'
import { matchGroundTruth, parseAxiom } from './parser'

describe('axiom DSL parser', () => {
  it('parses craft and action forms', () => {
    const a = parseAxiom('craft furnace: copper_ore + heat -> copper_ingot')
    expect(a.ok).toBe(true)
    if (a.ok) {
      expect(a.station).toBe('furnace')
      expect(a.inputs).toEqual({ copper_ore: 1, heat: 1 })
      expect(a.outputs).toEqual({ copper_ingot: 1 })
      expect(matchGroundTruth(a)?.id).toBe('smelt_ingot')
    }
  })

  it('rejects garbage', () => {
    const a = parseAxiom('maybe melt stuff somehow')
    expect(a.ok).toBe(false)
  })
})
