import { useCallback, useEffect, useState } from 'react'
import {
  attemptStation,
  describeUnlockProgress,
  resetGame,
  submitAxiom,
} from '../sim/engine'
import { clearSaved, loadOrInitial, saveToLocalStorage } from '../sim/persist'
import type { GameState, StationId } from '../sim/types'
import { AxiomTray } from './components/AxiomTray'
import { ExperimentLog } from './components/ExperimentLog'
import { WorkshopCanvas } from './components/WorkshopCanvas'

export default function App() {
  const [state, setState] = useState<GameState>(() => loadOrInitial())

  useEffect(() => {
    saveToLocalStorage(state)
  }, [state])

  const onAttempt = useCallback((station: StationId) => {
    setState((s) => attemptStation(s, station))
  }, [])

  const onSubmitAxiom = useCallback((text: string) => {
    setState((s) => submitAxiom(s, text))
  }, [])

  const onReset = useCallback(() => {
    clearSaved()
    setState(resetGame())
  }, [])

  return (
    <div className="app-shell">
      <header className="top-bar">
        <div>
          <h1>Axiom Hunt</h1>
          <p className="tagline">Fail recipes → write executable axioms → unlock the workshop</p>
        </div>
        <div className="top-actions">
          <span className="progress">{describeUnlockProgress(state)}</span>
          <button type="button" className="secondary" onClick={onReset}>
            New run
          </button>
        </div>
      </header>

      <main className="layout">
        <WorkshopCanvas state={state} onAttempt={onAttempt} />
        <AxiomTray state={state} onSubmit={onSubmitAxiom} />
        <ExperimentLog state={state} />
      </main>

      <footer className="footer muted">
        Local-first · deterministic simulator · axioms are durable composable capabilities · MIT
      </footer>
    </div>
  )
}

