import { useState } from 'react'
import type { AxiomCard, GameState } from '../../sim/types'
import { suggestAxiomFromNL } from '../../sim/suggest'

interface Props {
  state: GameState
  onSubmit: (text: string) => void
}

export function AxiomTray({ state, onSubmit }: Props) {
  const [draft, setDraft] = useState('craft furnace: copper_ore + heat -> copper_ingot')
  const [nl, setNl] = useState('')

  const active = state.axioms.filter((a) => a.status === 'active')
  const rejected = state.axioms.filter((a) => a.status === 'rejected')

  return (
    <section className="panel axiom-tray" aria-label="Axiom tray">
      <header className="panel-header">
        <h2>Axiom tray</h2>
        <p className="muted">
          Write a rule in the DSL. Matching axioms become <strong>durable capabilities</strong> in
          the simulator — they stay active and stack.
        </p>
      </header>

      <label className="field">
        <span>Axiom DSL</span>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={2}
          spellCheck={false}
          placeholder="craft furnace: copper_ore + heat -> copper_ingot"
        />
      </label>
      <div className="row">
        <button type="button" className="primary" onClick={() => onSubmit(draft)}>
          Activate axiom
        </button>
      </div>

      <details className="nl-suggest">
        <summary>NL suggest (heuristic template only)</summary>
        <textarea
          value={nl}
          onChange={(e) => setNl(e.target.value)}
          rows={2}
          placeholder="maybe lighting the furnace needs oil…"
        />
        <button
          type="button"
          className="secondary"
          onClick={() => setDraft(suggestAxiomFromNL(nl))}
        >
          Fill DSL from text
        </button>
      </details>

      <div className="axiom-lists">
        <h3>Active capabilities ({active.length})</h3>
        <ul className="card-list">
          {active.length === 0 && <li className="muted">None yet — failed crafts teach the shape of a rule.</li>}
          {active.map((a) => (
            <AxiomCardView key={a.id} card={a} />
          ))}
        </ul>
        <h3>Rejected ({rejected.length})</h3>
        <ul className="card-list">
          {rejected.length === 0 && <li className="muted">Wrong axioms land here — physics unchanged.</li>}
          {rejected.map((a) => (
            <AxiomCardView key={a.id} card={a} />
          ))}
        </ul>
      </div>

      <p className="dsl-help muted">
        DSL: <code>craft|action &lt;station&gt;: &lt;items&gt; -&gt; &lt;items&gt;</code>
        <br />
        Stations: light, furnace, draw, insulation, cutter, gate
      </p>
    </section>
  )
}

function AxiomCardView({ card }: { card: AxiomCard }) {
  return (
    <li className={`axiom-card ${card.status}`}>
      <div className="axiom-text">{card.normalized ?? card.text}</div>
      <div className="axiom-meta">
        <span className={`badge ${card.status === 'active' ? 'ok' : 'bad'}`}>{card.status}</span>
        {card.reason && <span className="reason">{card.reason}</span>}
      </div>
    </li>
  )
}
