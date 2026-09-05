import { describe, expect, it } from 'vitest'
import {
  advanceQuiz,
  createQuiz,
  currentItem,
  isAcceptedAnswer,
  normalizeAnswer,
  submitAnswer,
} from './quiz.ts'
import type { QuizItem } from './types.ts'

const delhi: QuizItem = {
  id: 'delhi',
  name: 'Delhi',
  aliases: [],
  group: 'place',
  featureType: 'city',
  geometry: { kind: 'point', coordinate: [77.21, 28.61] },
  note: 'Northern India.',
}

const delhiSultanate: QuizItem = {
  ...delhi,
  id: 'delhi-sultanate',
  name: 'Delhi Sultanate',
  group: 'civilization',
  featureType: 'civilization',
  geometry: {
    kind: 'area',
    polygons: [[[68, 31], [79, 31], [87, 24], [78, 18], [70, 22], [68, 31]]],
  },
}

const cuzco: QuizItem = {
  ...delhi,
  id: 'cuzco',
  name: 'Cuzco',
  aliases: ['Cusco'],
  geometry: { kind: 'point', coordinate: [-71.97, -13.53] },
}

describe('answer matching', () => {
  it('normalizes case, accents, punctuation, and repeated spaces', () => {
    expect(normalizeAnswer('  ÁL--Andalus!  ')).toBe('al andalus')
  })

  it('accepts declared aliases without fuzzy matching', () => {
    expect(isAcceptedAnswer(cuzco, 'CUSCO')).toBe(true)
    expect(isAcceptedAnswer(cuzco, 'Cuzko')).toBe(false)
  })

  it('keeps the city of Delhi distinct from the Delhi Sultanate', () => {
    expect(isAcceptedAnswer(delhi, 'Delhi Sultanate')).toBe(false)
    expect(isAcceptedAnswer(delhiSultanate, 'Delhi')).toBe(false)
  })
})

describe('quiz state', () => {
  it('keeps a wrong answer active and records its attempt', () => {
    const initial = createQuiz([delhi, cuzco], () => 0.99)
    const result = submitAnswer(initial, 'Cuzco')

    expect(result.isCorrect).toBe(false)
    expect(result.feedback).toBe('incorrect')
    expect(result.state.status).toBe('answering')
    expect(result.state.currentAttempts).toBe(1)
    expect(result.state.totalAttempts).toBe(1)
  })

  it('records first-try answers and completes after advancing', () => {
    const initial = createQuiz([delhi], () => 0)
    const result = submitAnswer(initial, 'delhi')
    const complete = advanceQuiz(result.state)

    expect(result.isCorrect).toBe(true)
    expect(result.state.firstTryCorrect).toBe(1)
    expect(result.state.completed).toEqual([{ id: 'delhi', attempts: 1 }])
    expect(complete.status).toBe('complete')
  })

  it('tracks retries without awarding first-try credit', () => {
    const initial = createQuiz([cuzco], () => 0)
    const misspelledResult = submitAnswer(initial, 'Cuzko')
    const afterWrongAnswer = misspelledResult.state
    const afterCorrectAnswer = submitAnswer(afterWrongAnswer, 'Cusco').state

    expect(misspelledResult.feedback).toBe('misspelled')
    expect(afterCorrectAnswer.firstTryCorrect).toBe(0)
    expect(afterCorrectAnswer.totalAttempts).toBe(2)
    expect(afterCorrectAnswer.completed).toEqual([{ id: 'cuzco', attempts: 2 }])
  })

  it('reports any answer absent from the word bank as misspelled', () => {
    const initial = createQuiz([cuzco, delhi], () => 0.99)

    expect(submitAnswer(initial, 'Cuzko').feedback).toBe('misspelled')
    expect(submitAnswer(initial, 'Completely unrelated').feedback).toBe('misspelled')
  })

  it('moves to the next item while preserving cumulative scores', () => {
    const initial = createQuiz([delhi, cuzco], () => 0.99)
    const first = submitAnswer(initial, currentItem(initial).name).state
    const secondQuestion = advanceQuiz(first)

    expect(secondQuestion.currentIndex).toBe(1)
    expect(secondQuestion.currentAttempts).toBe(0)
    expect(secondQuestion.firstTryCorrect).toBe(1)
    expect(secondQuestion.status).toBe('answering')
  })

  it('does not call another word-bank answer a spelling error', () => {
    const initial = createQuiz([delhiSultanate, delhi], () => 0.99)
    const result = submitAnswer(initial, 'Delhi')

    expect(currentItem(initial).name).toBe('Delhi Sultanate')
    expect(result.feedback).toBe('incorrect')
  })
})