import type { QuizItem, QuizState, SubmissionResult } from './types.ts'

type RandomSource = () => number

export function normalizeAnswer(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('en-US')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

export function isAcceptedAnswer(item: QuizItem, answer: string): boolean {
  const normalized = normalizeAnswer(answer)

  if (!normalized) {
    return false
  }

  return [item.name, ...item.aliases].some(
    (acceptedAnswer) => normalizeAnswer(acceptedAnswer) === normalized,
  )
}

export function shuffleItems(
  items: readonly QuizItem[],
  random: RandomSource = Math.random,
): QuizItem[] {
  const shuffled = [...items]

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1))
    ;[shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex]!, shuffled[index]!]
  }

  return shuffled
}

export function createQuiz(
  items: readonly QuizItem[],
  random: RandomSource = Math.random,
): QuizState {
  if (items.length === 0) {
    throw new Error('A quiz needs at least one item.')
  }

  return {
    order: shuffleItems(items, random),
    currentIndex: 0,
    currentAttempts: 0,
    totalAttempts: 0,
    firstTryCorrect: 0,
    completed: [],
    status: 'answering',
  }
}

export function currentItem(state: QuizState): QuizItem {
  const item = state.order[state.currentIndex]

  if (!item) {
    throw new Error('The quiz has no current item.')
  }

  return item
}

export function submitAnswer(state: QuizState, answer: string): SubmissionResult {
  if (state.status !== 'answering') {
    return { state, isCorrect: false, feedback: 'incorrect' }
  }

  const item = currentItem(state)
  const attempts = state.currentAttempts + 1
  const totalAttempts = state.totalAttempts + 1

  if (!isAcceptedAnswer(item, answer)) {
    const matchesAnotherItem = state.order.some(
      (candidate) => candidate.id !== item.id && isAcceptedAnswer(candidate, answer),
    )

    return {
      isCorrect: false,
      feedback: matchesAnotherItem ? 'incorrect' : 'misspelled',
      state: {
        ...state,
        currentAttempts: attempts,
        totalAttempts,
      },
    }
  }

  return {
    isCorrect: true,
    feedback: 'correct',
    state: {
      ...state,
      currentAttempts: attempts,
      totalAttempts,
      firstTryCorrect: state.firstTryCorrect + (attempts === 1 ? 1 : 0),
      completed: [...state.completed, { id: item.id, attempts }],
      status: 'correct',
    },
  }
}

export function advanceQuiz(state: QuizState): QuizState {
  if (state.status !== 'correct') {
    return state
  }

  if (state.currentIndex === state.order.length - 1) {
    return { ...state, status: 'complete' }
  }

  return {
    ...state,
    currentIndex: state.currentIndex + 1,
    currentAttempts: 0,
    status: 'answering',
  }
}