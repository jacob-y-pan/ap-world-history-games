import { describe, expect, it } from 'vitest'
import { normalizeAnswer } from '../quiz.ts'
import type { Coordinate } from '../types.ts'
import { quizItems } from './locations.ts'

const requiredNames = [
  'Song China',
  'Seljuk Sultanate',
  'Mamluk Sultanate of Egypt',
  'Delhi Sultanate',
  'al-Andalus',
  'Srivijaya',
  'Khmer Empire',
  'Maya city-states',
  'Mexica (Aztec) Empire',
  'Inca Empire',
  'Great Zimbabwe',
  'Ethiopia',
  'Hausa city-states',
  'Kingdom of Mali',
  'Timbuktu',
  'Cahokia',
  'Tenochtitlan',
  'Delhi',
  'Angkor Wat',
  'Cuzco',
  'Baghdad',
  'Hangzhou',
  'Gujarat',
  'Swahili Coast',
  'Grand Canal',
]

function expectValidCoordinate([longitude, latitude]: Coordinate): void {
  expect(longitude).toBeGreaterThanOrEqual(-180)
  expect(longitude).toBeLessThanOrEqual(180)
  expect(latitude).toBeGreaterThanOrEqual(-90)
  expect(latitude).toBeLessThanOrEqual(90)
}

describe('location data', () => {
  it('contains every worksheet prompt exactly once', () => {
    expect(quizItems).toHaveLength(25)
    expect(quizItems.map(({ name }) => name).sort()).toEqual([...requiredNames].sort())
    expect(new Set(quizItems.map(({ id }) => id)).size).toBe(25)
  })

  it('contains fourteen civilizations and eleven places', () => {
    expect(quizItems.filter(({ group }) => group === 'civilization')).toHaveLength(14)
    expect(quizItems.filter(({ group }) => group === 'place')).toHaveLength(11)
  })

  it('uses valid, renderable geometry for every prompt', () => {
    for (const item of quizItems) {
      if (item.geometry.kind === 'point') {
        expectValidCoordinate(item.geometry.coordinate)
        continue
      }

      const paths = item.geometry.kind === 'area' ? item.geometry.polygons : item.geometry.lines
      const minimumLength = item.geometry.kind === 'area' ? 4 : 2

      expect(paths.length).toBeGreaterThan(0)
      for (const path of paths) {
        expect(path.length).toBeGreaterThanOrEqual(minimumLength)
        path.forEach(expectValidCoordinate)

        if (item.geometry.kind === 'area') {
          expect(path[0]).toEqual(path.at(-1))
        }
      }
    }
  })

  it('does not reuse any normalized canonical name or alias', () => {
    const seen = new Map<string, string>()

    for (const item of quizItems) {
      for (const answer of [item.name, ...item.aliases]) {
        const normalized = normalizeAnswer(answer)
        expect(seen.get(normalized), `${answer} conflicts with ${seen.get(normalized)}`).toBeUndefined()
        seen.set(normalized, item.id)
      }
    }
  })
})