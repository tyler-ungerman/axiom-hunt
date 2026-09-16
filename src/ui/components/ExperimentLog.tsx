import type { GameState, LogKind } from '../../sim/types'

interface Props {
  state: GameState
}

const KIND_LABEL: Record<LogKind, string> = {
  observation: 'observation',
  axiom: 'axiom',
  sim: 'sim',
}

export function ExperimentLog({ state }: Props) {
  const entries = [...state.log].reverse()
  return (
    <section className="panel experiment-log" aria-label="Experiment log">
      <header className="panel-header">
        <h2>Experiment log</h2>
        <p className="muted">
          Distinguishes <span className="badge obs">observation</span>{' '}
          <span className="badge ax">axiom</span>{' '}
          <span className="badge sim">sim</span>
        </p>
      </header>
      <ul className="log-list">
        {entries.map((e) => (
          <li key={e.id} className={`log-entry kind-${e.kind}`}>
            <span className={`badge ${e.kind === 'observation' ? 'obs' : e.kind === 'axiom' ? 'ax' : 'sim'}`}>
              {KIND_LABEL[e.kind]}
            </span>
            <span className="log-msg">{e.message}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
