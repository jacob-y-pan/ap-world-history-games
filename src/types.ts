export type Coordinate = readonly [longitude: number, latitude: number]

export type QuizGroup = 'civilization' | 'place'
export type FeatureType = 'civilization' | 'city' | 'region' | 'coast' | 'route'

export interface AreaGeometry {
  kind: 'area'
  polygons: readonly (readonly Coordinate[])[]
}

export interface PointGeometry {
  kind: 'point'
  coordinate: Coordinate
}

export interface LineGeometry {
  kind: 'line'
  lines: readonly (readonly Coordinate[])[]
}

export type QuizGeometry = AreaGeometry | PointGeometry | LineGeometry

export interface QuizItem {
  id: string
  name: string
  aliases: readonly string[]
  group: QuizGroup
  featureType: FeatureType
  geometry: QuizGeometry
  note: string
}

export interface CompletedAnswer {
  id: string
  attempts: number
}

export type QuizStatus = 'answering' | 'correct' | 'complete'

export interface QuizState {
  order: readonly QuizItem[]
  currentIndex: number
  currentAttempts: number
  totalAttempts: number
  firstTryCorrect: number
  completed: readonly CompletedAnswer[]
  status: QuizStatus
}

export interface SubmissionResult {
  state: QuizState
  isCorrect: boolean
  feedback: 'correct' | 'misspelled' | 'incorrect'
}