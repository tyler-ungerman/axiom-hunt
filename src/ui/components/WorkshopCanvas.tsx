import type { GameState, StationId } from '../../sim/types'
import { ITEM_LABELS, STATION_LABELS } from '../../sim/types'
import { STATIONS, isRuleUnlocked } from '../../sim/engine'
import { ruleForStation } from '../../sim/groundTruth'

const STATION_GLYPH: Record<StationId, string> = {
  light: '🔥',
  furnace: '♨️',
  draw: '⚒️',
  insulation: '🧴',
  cutter: '🗝️',
  gate: '🚪',
}

interface Props {
  state: GameState
  onAttempt: (station: StationId) => void
}

export function WorkshopCanvas({ state, onAttempt }: Props) {
  return (
    <section className="panel workshop" aria-label="Copper Workshop">
      <header className="panel-header">
        <h2>Copper Workshop</h2>
        <p className="muted">Click a station to attempt a craft. Locked processes need an activated axiom.</p>
      </header>

      <div className="workshop-floor">
        {STATIONS.map((station) => {
          const rule = ruleForStation(station)
          const unlocked = rule ? isRuleUnlocked(state, rule.id) : false
          const isGate = station === 'gate'
          return (
            <button
              key={station}
              type="button"
              className={`station ${unlocked ? 'unlocked' : 'locked'} ${isGate && state.gateOpen ? 'gate-open' : ''}`}
              onClick={() => onAttempt(station)}
              disabled={state.won && isGate}
            >
              <span className="station-glyph" aria-hidden>
                {STATION_GLYPH[station]}
              </span>
              <span className="station-name">{STATION_LABELS[station]}</span>
              <span className={`badge ${unlocked ? 'ok' : 'warn'}`}>
                {isGate && state.gateOpen ? 'OPEN' : unlocked ? 'axiom active' : 'unknown recipe'}
              </span>
            </button>
          )
        })}
      </div>

      <div className="inventory" aria-label="Inventory">
        <h3>Inventory</h3>
        <ul className="inv-grid">
          {(
            [
              'copper_ore',
              'copper_ingot',
              'wire',
              'heat',
              'oil',
              'insulated_wire',
              'key_blank',
              'cut_key',
            ] as const
          ).map((id) => {
            const n = state.inventory[id]
            if (n <= 0 && id !== 'heat') {
              // still show starting-relevant empties lightly
            }
            return (
              <li key={id} className={n > 0 ? 'has' : 'empty'}>
                <span className="inv-label">{ITEM_LABELS[id]}</span>
                <span className="inv-count">{n}</span>
              </li>
            )
          })}
        </ul>
        {state.won && <div className="win-banner">Exit open — discovery complete.</div>}
      </div>
    </section>
  )
}
