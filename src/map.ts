import { geoGraticule10, geoNaturalEarth1, geoPath } from 'd3-geo'
import { merge } from 'topojson-client'
import type { MultiPolygon, Polygon, Topology } from 'topojson-specification'
import worldData from 'world-atlas/countries-110m.json'
import type { Coordinate, QuizItem } from './types.ts'

const MAP_WIDTH = 1200
const MAP_HEIGHT = 610
const sphere = { type: 'Sphere' } as const

const worldTopology = worldData as unknown as Topology
const countries = worldTopology.objects.countries

if (!countries || countries.type !== 'GeometryCollection') {
  throw new Error('World map data is missing its country geometry.')
}

const countriesWithoutAntarctica = countries.geometries.filter(
    (country) => String(country.id).padStart(3, '0') !== '010',
  ) as unknown as Array<Polygon | MultiPolygon>

const projection = geoNaturalEarth1().fitExtent(
  [
    [24, 22],
    [MAP_WIDTH - 24, MAP_HEIGHT - 22],
  ],
  sphere,
)
const path = geoPath(projection)
const spherePath = path(sphere) ?? ''
const graticulePath = path(geoGraticule10()) ?? ''
const landPath = path(merge(worldTopology, countriesWithoutAntarctica)) ?? ''

function projectCoordinate(coordinate: Coordinate): readonly [number, number] {
  const projected = projection([coordinate[0], coordinate[1]])

  if (!projected) {
    throw new Error(`Could not project coordinate ${coordinate.join(', ')}.`)
  }

  return projected
}

function renderCoordinatePath(coordinates: readonly Coordinate[], close: boolean): string {
  const commands = coordinates.map((coordinate, index) => {
    const [projectedX, projectedY] = projectCoordinate(coordinate)
    return `${index === 0 ? 'M' : 'L'}${projectedX.toFixed(2)},${projectedY.toFixed(2)}`
  })

  return `${commands.join(' ')}${close ? ' Z' : ''}`
}

function renderSmallAreaLocator(polygons: readonly (readonly Coordinate[])[]): string {
  const points = polygons.flatMap((coordinates) => coordinates.map(projectCoordinate))
  const horizontalPositions = points.map(([projectedX]) => projectedX)
  const verticalPositions = points.map(([, projectedY]) => projectedY)
  const left = Math.min(...horizontalPositions)
  const right = Math.max(...horizontalPositions)
  const top = Math.min(...verticalPositions)
  const bottom = Math.max(...verticalPositions)

  if (right - left >= 55 && bottom - top >= 34) {
    return ''
  }

  return `<circle class="target-area__locator" cx="${((left + right) / 2).toFixed(2)}" cy="${(
    (top + bottom) /
    2
  ).toFixed(2)}" r="30"></circle>`
}

function renderTarget(item: QuizItem): string {
  if (item.geometry.kind === 'point') {
    const [projectedX, projectedY] = projectCoordinate(item.geometry.coordinate)

    return `
      <g class="target-point" transform="translate(${projectedX.toFixed(2)} ${projectedY.toFixed(2)})">
        <circle class="target-point__pulse" r="32"></circle>
        <circle class="target-point__ring" r="18"></circle>
        <circle class="target-point__core" r="8"></circle>
      </g>
    `
  }

  if (item.geometry.kind === 'line') {
    return item.geometry.lines
      .map((coordinates) => {
        const targetPath = renderCoordinatePath(coordinates, false)
        return `
          <path class="target-line__halo" d="${targetPath}"></path>
          <path class="target-line" d="${targetPath}"></path>
        `
      })
      .join('')
  }

  const areaPaths = item.geometry.polygons
    .map(
      (coordinates) =>
        `<path class="target-area" d="${renderCoordinatePath(coordinates, true)}"></path>`,
    )
    .join('')

  return `${areaPaths}${renderSmallAreaLocator(item.geometry.polygons)}`
}

function targetDescription(item: QuizItem): string {
  switch (item.featureType) {
    case 'civilization':
      return 'A historical civilization area is highlighted.'
    case 'city':
      return 'A city is marked with a target.'
    case 'region':
      return 'A geographic region is highlighted.'
    case 'coast':
      return 'A coastline is highlighted.'
    case 'route':
      return 'A historic route is highlighted.'
  }
}

export function renderMap(item: QuizItem, isCorrect: boolean): string {
  const description = isCorrect
    ? `Correct: ${item.name}. ${item.note}`
    : `${targetDescription(item)} Identify it using its position on the world map.`

  return `
    <svg
      class="map-svg ${isCorrect ? 'is-correct' : 'is-question'}"
      viewBox="0 0 ${MAP_WIDTH} ${MAP_HEIGHT}"
      role="img"
      aria-labelledby="map-title map-description"
      preserveAspectRatio="xMidYMid meet"
    >
      <title id="map-title">World map quiz target</title>
      <desc id="map-description">${description}</desc>
      <defs>
        <clipPath id="map-sphere-clip">
          <path d="${spherePath}"></path>
        </clipPath>
      </defs>
      <path class="map-sphere" d="${spherePath}"></path>
      <g clip-path="url(#map-sphere-clip)">
        <path class="map-graticule" d="${graticulePath}"></path>
        <path class="map-land" d="${landPath}"></path>
        <g class="map-target" aria-hidden="true">
          ${renderTarget(item)}
        </g>
      </g>
    </svg>
  `
}