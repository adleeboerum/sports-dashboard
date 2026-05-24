import { useState } from 'react'
import Dashboard from './pages/Dashboard'
import Predictions from './pages/Predictions'
import Backtest from './pages/Backtest'

type Page = 'dashboard' | 'predictions' | 'backtest'

export default function App() {
  const [page, setPage] = useState<Page>('dashboard')

  if (page === 'predictions') {
    return <Predictions onBack={() => setPage('dashboard')} onOpenBacktest={() => setPage('backtest')} />
  }

  if (page === 'backtest') {
    return <Backtest onBack={() => setPage('predictions')} />
  }

  return <Dashboard onOpenPredictions={() => setPage('predictions')} />
}
