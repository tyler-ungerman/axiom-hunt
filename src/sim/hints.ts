import { GROUND_TRUTH } from './groundTruth'
import type { ParseOk } from './parser'
import type { Inventory, ItemId, RecipeSpec, StationId } from './types'

/** Format an item bag as DSL-ish "a + b". */
export function formatItemBag(bag: Partial<Record<ItemId, number>>): string {
  const parts = Object.entries(bag)
    .filter(([, n]) => (n ?? 0) > 0)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, n]) => ((n ?? 0) === 1 ? k : `${n} ${k}`))
  return parts.length > 0 ? parts.join(' + ') : '(nothing)'
}

/** Format expected outputs including gate_open. */
export function formatExpectedOutputs(rule: RecipeSpec): string {
  const items = formatItemBag(rule.outputs)
  if (rule.opensGate) {
    return items === '(nothing)' ? 'gate_open' : `${items} + gate_open`
  }
  return items
}

/**
 * Compare inventory to a needed bag: "you have copper_ore but no heat".
 */
export function describeHaveVsNeed(
  inv: Inventory,
  need: Partial<Record<ItemId, number>>,
): string {
  const have: string[] = []
  const missing: string[] = []
  for (const [k, n] of Object.entries(need) as [ItemId, number][]) {
    const got = inv[k] ?? 0
    if (got >= n) {
      have.push(k)
    } else if (got > 0) {
      missing.push(`${k} (need ${n}, have ${got})`)
    } else {
      missing.push(`no ${k}`)
    }
  }
  if (have.length === 0 && missing.length === 0) {
    return 'you have nothing relevant'
  }
  if (missing.length === 0) {
    return `you have ${have.join(' + ')}`
  }
  if (have.length === 0) {
    return `you have ${missing.join(', ')}`
  }
  return `you have ${have.join(' + ')} but ${missing.join(', ')}`
}

/**
 * Specific craft-fail message: expected I/O + what the player actually has.
 * Example: "furnace needs copper_ore + heat; you have copper_ore but no heat"
 */
export function describeCraftFail(
  station: StationId,
  truth: RecipeSpec,
  inv: Inventory,
  unlocked: boolean,
): string {
  const need = formatItemBag(truth.inputs)
  const out = formatExpectedOutputs(truth)
  const vs = describeHaveVsNeed(inv, truth.inputs)

  if (!unlocked) {
    return (
      `Attempt at ${station}: FAILED — process locked (needs matching activated axiom). ` +
      `${station} expects ${need} -> ${out}; ${vs}.`
    )
  }

  return `Attempt at ${station}: FAILED — ${station} needs ${need}; ${vs}.`
}

function bagsEqual(
  a: Partial<Record<ItemId, number>>,
  b: Partial<Record<ItemId, number>>,
): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]) as Set<ItemId>
  for (const k of keys) {
    if ((a[k] ?? 0) !== (b[k] ?? 0)) return false
  }
  return true
}

function bagOverlapScore(
  a: Partial<Record<ItemId, number>>,
  b: Partial<Record<ItemId, number>>,
): number {
  let score = 0
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]) as Set<ItemId>
  for (const k of keys) {
    const av = a[k] ?? 0
    const bv = b[k] ?? 0
    if (av > 0 && bv > 0) score += Math.min(av, bv)
    else if (av !== bv) score -= 0.25
  }
  return score
}

/**
 * Targeted reject reason vs ground-truth shape for the relevant station only.
 * Does not dump unrelated station recipes.
 */
export function describeAxiomRejectDiff(parsed: ParseOk): string {
  // Exact I/O match at a different station → wrong station (targeted, no unrelated spoilers)
  const ioExactElsewhere = GROUND_TRUTH.find(
    (r) =>
      r.station !== parsed.station &&
      bagsEqual(r.inputs, parsed.inputs) &&
      bagsEqual(r.outputs, parsed.outputs) &&
      Boolean(r.opensGate) === Boolean(parsed.opensGate),
  )
  if (ioExactElsewhere) {
    return (
      `wrong station: you targeted ${parsed.station}, but that I/O shape fits ${ioExactElsewhere.station} ` +
      `(not ${parsed.station}). Physics unchanged.`
    )
  }

  const sameStation = GROUND_TRUTH.find((r) => r.station === parsed.station)

  if (sameStation) {
    const parts: string[] = []
    const inputsMatch = bagsEqual(sameStation.inputs, parsed.inputs)
    const outputsMatch = bagsEqual(sameStation.outputs, parsed.outputs)
    const gateMatch = Boolean(sameStation.opensGate) === Boolean(parsed.opensGate)

    if (!inputsMatch) {
      parts.push(
        `inputs differ (you wrote ${formatItemBag(parsed.inputs)}; ${parsed.station} expects ${formatItemBag(sameStation.inputs)})`,
      )
    }
    if (!outputsMatch || !gateMatch) {
      const youOut = parsed.opensGate
        ? formatItemBag(parsed.outputs) === '(nothing)'
          ? 'gate_open'
          : `${formatItemBag(parsed.outputs)} + gate_open`
        : formatItemBag(parsed.outputs)
      parts.push(
        `outputs differ (you wrote ${youOut}; ${parsed.station} produces ${formatExpectedOutputs(sameStation)})`,
      )
    }

    if (parts.length === 0) {
      return `station ${parsed.station} shape looks close but does not match world physics`
    }
    return `station ${parsed.station} correct but ${parts.join('; ')}`
  }

  // Unknown station token already rejected at parse; here station is valid but no rule row
  // (should not happen with current ground truth). Closest I/O hint only.
  let best: RecipeSpec | null = null
  let bestScore = -Infinity
  for (const rule of GROUND_TRUTH) {
    const score =
      bagOverlapScore(rule.inputs, parsed.inputs) +
      bagOverlapScore(rule.outputs, parsed.outputs) +
      (Boolean(rule.opensGate) === Boolean(parsed.opensGate) ? 0.5 : 0)
    if (score > bestScore) {
      bestScore = score
      best = rule
    }
  }

  if (best && bestScore > 0) {
    return (
      `wrong station: you targeted ${parsed.station}, but that I/O shape fits ${best.station} ` +
      `(not ${parsed.station}). Physics unchanged.`
    )
  }

  return (
    `no Copper Workshop process at station "${parsed.station}" matches ` +
    `${formatItemBag(parsed.inputs)} -> ${parsed.opensGate ? 'gate_open' : formatItemBag(parsed.outputs)}. ` +
    `Physics unchanged.`
  )
}

/** Always-visible unlock requirement copy for locked stations. */
export function describeUnlockRequirement(station: StationId, unlocked: boolean): string {
  if (unlocked) return 'Axiom active — process executable'
  const templates: Record<StationId, string> = {
    light: 'Needs activated axiom for light (ignition): oil -> heat',
    furnace: 'Needs activated axiom for furnace: copper_ore + heat -> copper_ingot',
    draw: 'Needs activated axiom for draw: copper_ingot -> wire',
    insulation: 'Needs activated axiom for insulation: wire + oil -> insulated_wire',
    cutter: 'Needs activated axiom for cutter: insulated_wire + key_blank -> cut_key',
    gate: 'Needs activated axiom for gate: cut_key -> gate_open',
  }
  return templates[station]
}

/** Canonical DSL template for a station (used by NL helper when focused). */
export function axiomTemplateForStation(station: StationId): string {
  const templates: Record<StationId, string> = {
    light: 'action light: oil -> heat',
    furnace: 'craft furnace: copper_ore + heat -> copper_ingot',
    draw: 'craft draw: copper_ingot -> wire',
    insulation: 'craft insulation: wire + oil -> insulated_wire',
    cutter: 'craft cutter: insulated_wire + key_blank -> cut_key',
    gate: 'action gate: cut_key -> gate_open',
  }
  return templates[station]
}
