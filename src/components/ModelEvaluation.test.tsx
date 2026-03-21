import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import ModelEvaluation from './ModelEvaluation'

const predictionsCsv = `"Date","Home","Away","ML Rec","Vegas H ML","Vegas A ML","Vegas Spread","Spread Home Odds","Spread Away Odds","Vegas O/U","Over Odds","Under Odds","Spread Rec","O/U Rec","LookupKey"
"2026-03-20","BOS Celtics","LAL Lakers","BOS ML","-150","+130","-4.5","-110","-110","224.5","-105","-115","BOS -4.5","OVER","20260320BOSLAL"`

const resultsCsv = `"Date","Home","Away","Home Score","Away Score","LookupKey"
"2026-03-20","BOS","LAL","118","110","20260320BOSLAL"`

describe('ModelEvaluation', () => {
  it('grades recommended bets from pasted CSV input', () => {
    render(<ModelEvaluation card={{}} />)

    const textareas = screen.getAllByRole('textbox')
    const predictionsInput = textareas[0]
    const resultsInput = textareas[1]

    expect(predictionsInput).toBeDefined()
    expect(resultsInput).toBeDefined()

    fireEvent.change(predictionsInput!, { target: { value: predictionsCsv } })
    fireEvent.change(resultsInput!, { target: { value: resultsCsv } })

    fireEvent.click(screen.getAllByRole('button', { name: /evaluate model/i })[0]!)

    expect(screen.getByText(/evaluated 3 recommended bets across 1 predictions/i)).toBeInTheDocument()
    expect(screen.getAllByText('1-0')).toHaveLength(3)
    expect(screen.getByText(/BET LOG \| 3 bets \| 3 settled/i)).toBeInTheDocument()
    expect(screen.getByText('BOS ML')).toBeInTheDocument()
    expect(screen.getByText('BOS -4.5')).toBeInTheDocument()
    expect(screen.getByText('OVER')).toBeInTheDocument()
  })

  it('shows a friendly error for malformed CSV input', () => {
    render(<ModelEvaluation card={{}} />)

    const textareas = screen.getAllByRole('textbox')
    fireEvent.change(textareas[0]!, { target: { value: 'bad csv' } })
    fireEvent.change(textareas[1]!, { target: { value: 'also bad' } })

    fireEvent.click(screen.getAllByRole('button', { name: /evaluate model/i })[0]!)

    expect(screen.getByText(/predictions csv needs a header row and at least one data row/i)).toBeInTheDocument()
  })
})
