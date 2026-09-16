import type { GameState, StationId } from '../../sim/types'
import { ITEM_LABELS, STATION_LABELS } from '../../sim/types'
import { STATIONS, isRuleUnlocked, stationUnlockLabel } from '../../sim/engine'
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
  focusedStation: StationId | null
  onFocus: (station: StationId) => void
  onAttempt: (station: StationId) => void
}

export function WorkshopCanvas({ state, focusedStation, onFocus, onAttempt }: Props) {
  return (
    <section className="panel workshop" aria-label="Copper Workshop">
      <header className="panel-header">
        <h2>Copper Workshop</h2>
        <p className="muted">
          Select a station to focus the NL helper, then attempt a craft. Unlock requirements stay
          visible on every locked station.
        </p>
      </header>

      <div className="workshop-floor">
        {STATIONS.map((station) => {
          const rule = ruleForStation(station)
          const unlocked = rule ? isRuleUnlocked(state, rule.id) : false
          const isGate = station === 'gate'
          const focused = focusedStation === station
          const unlockReq = stationUnlockLabel(state, station)
          return (
            <div
              key={station}
              className={`station-card ${unlocked ? 'unlocked' : 'locked'} ${focused ? 'focused' : ''} ${isGate && state.gateOpen ? 'gate-open' : ''}`}
            >
              <button
                type="button"
                className="station-select"
                onClick={() => onFocus(station)}
                aria-pressed={focused}
              >
                <span className="station-glyph" aria-hidden>
                  {STATION_GLYPH[station]}
                </span>
                <span className="station-name">{STATION_LABELS[station]}</span>
                <span className={`badge ${unlocked ? 'ok' : 'warn'}`}>
                  {isGate && state.gateOpen ? 'OPEN' : unlocked ? 'axiom active' : 'locked'}
                </span>
              </button>
              <p className="unlock-req" title={unlockReq}>
                {unlockReq}
              </p>
              <button
                type="button"
                className="station-attempt primary"
                onClick={() => onAttempt(station)}
                disabled={state.won && isGate}
              >
                Attempt
              </button>
            </div>
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
