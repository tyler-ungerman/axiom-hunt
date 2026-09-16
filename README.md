# Axiom Hunt

Local-first discovery game: **fail recipes → write executable axiom cards → unlock the Copper Workshop**.

Hidden physics live in a deterministic simulator (not an LLM). Player-authored axioms that match ground truth become **durable composable capabilities** — they stay active, stack with others, and permanently unlock that craft path. Wrong axioms are rejected and never invent new physics.

## Run

```bash
npm install
npm run dev
```

Open the printed local URL (usually `http://localhost:5173`).

```bash
npm test      # acceptance tests (vitest)
npm run build # production build
npm run preview
```

No backend. State persists in `localStorage` (`axiom-hunt-v0`).

## How to play (discovery walkthrough)

You start with **copper ore ×2**, **oil ×2**, **key blank ×1**. The exit gate is locked. Station recipes are unknown until you activate matching axioms.

1. **Probe stations** — click Furnace / Draw / etc. Attempts fail with informative sim messages (`unknown recipe`, materials incomplete, or “rule not yet in the simulator”).
2. **Notice heat** — smelting seems to need a heat source. Try writing:
   ```
   action light: oil -> heat
   ```
   Activate it. Light the furnace (consumes oil, grants heat).
3. **Smelt** — activate:
   ```
   craft furnace: copper_ore + heat -> copper_ingot
   ```
   Then craft at the furnace → copper ingot.
4. **Draw wire** — activate `craft draw: copper_ingot -> wire`, then draw.
5. **Insulate** — `craft insulation: wire + oil -> insulated_wire` (needs remaining oil).
6. **Cut key** — `craft cutter: insulated_wire + key_blank -> cut_key`.
7. **Open gate** — `action gate: cut_key -> gate_open` → win.

Unscripted order still works: you can unlock draw before furnace; crafts fail for missing inputs but axioms stay active. Wrong axioms (e.g. `craft furnace: oil -> wire`) stay in the tray as rejected — physics unchanged.

Optional: open **NL suggest** and type free text; keyword heuristics fill a DSL template (no API call). Execution is always the deterministic sim.

## UI

- **Workshop canvas** — stations + inventory
- **Axiom tray** — draft DSL, active capabilities, rejected cards
- **Experiment log** — badges for `observation` | `axiom` | `sim`

## Architecture

- `src/sim/` — pure deterministic engine, parser, ground truth, persistence, tests
- `src/ui/` — React workshop UI

Axioms matching ground truth append to `unlockedRuleIds` and remain across reloads.

## License

MIT
