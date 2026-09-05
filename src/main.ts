import '@fontsource-variable/fraunces'
import '@fontsource-variable/libre-franklin'
import { ArrowRight, Check, RotateCcw, createIcons } from 'lucide'
import './style.css'
import { historicalScopeNote, quizItems } from './data/locations.ts'
import { renderMap } from './map.ts'
import {
  advanceQuiz,
  createQuiz,
  currentItem,
  normalizeAnswer,
  submitAnswer,
} from './quiz.ts'
import type { FeatureType, QuizGroup, QuizItem } from './types.ts'

type FocusTarget = 'answer' | 'next' | 'none'

const app = document.querySelector<HTMLDivElement>('#app')

if (!app) {
  throw new Error('The application root is missing.')
}

const appRoot = app

let quizState = createQuiz(quizItems)

const promptCopy: Record<FeatureType, { eyebrow: string; title: string; instruction: string }> = {
  civilization: {
    eyebrow: 'Civilization area',
    title: 'Name this civilization',
    instruction: 'Type the civilization that occupied the highlighted core region.',
  },
  city: {
    eyebrow: 'City or site',
    title: 'Name this place',
    instruction: 'Type the city or site marked by the target.',
  },
  region: {
    eyebrow: 'Geographic region',
    title: 'Name this region',
    instruction: 'Type the region highlighted on the map.',
  },
  coast: {
    eyebrow: 'Coastal region',
    title: 'Name this coast',
    instruction: 'Type the name of the highlighted coastline.',
  },
  route: {
    eyebrow: 'Historic waterway',
    title: 'Name this route',
    instruction: 'Type the name of the highlighted route.',
  },
}

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>'"]/g,
    (character) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#039;',
        '"': '&quot;',
      })[character]!,
  )
}

function renderIcon(name: 'arrow-right' | 'check' | 'rotate-ccw'): string {
  return `<i data-lucide="${name}" aria-hidden="true"></i>`
}

function initializeIcons(): void {
  createIcons({ icons: { ArrowRight, Check, RotateCcw } })
}

function renderHeader(completed: number): string {
  return `
    <header class="app-header">
      <div class="brand-lockup">
        <span class="brand-mark" aria-hidden="true"><span></span><span></span></span>
        <div>
          <p class="brand-kicker">AP World History</p>
          <h1>Map Recall</h1>
        </div>
      </div>
      <div class="header-progress" aria-label="${completed} of ${quizState.order.length} locations complete">
        <span>Mapped</span>
        <strong>${String(completed).padStart(2, '0')} / ${quizState.order.length}</strong>
      </div>
      <button class="icon-button" type="button" data-action="restart" aria-label="Restart quiz" title="Restart quiz">
        ${renderIcon('rotate-ccw')}
      </button>
    </header>
  `
}

function featureSwatch(featureType: FeatureType): string {
  if (featureType === 'city') {
    return '<span class="feature-swatch feature-swatch--point" aria-hidden="true"></span>'
  }

  if (featureType === 'coast' || featureType === 'route') {
    return '<span class="feature-swatch feature-swatch--line" aria-hidden="true"></span>'
  }

  return '<span class="feature-swatch feature-swatch--area" aria-hidden="true"></span>'
}

function renderWordBankGroup(
  group: QuizGroup,
  title: string,
  completedIds: ReadonlySet<string>,
): string {
  const entries = quizItems
    .filter((item) => item.group === group)
    .map((item) => {
      const isComplete = completedIds.has(item.id)
      return `
        <li class="word-bank__item ${isComplete ? 'is-complete' : ''}" ${
          isComplete ? `aria-label="${escapeHtml(item.name)}, answered"` : ''
        }>
          <span>${escapeHtml(item.name)}</span>
          ${isComplete ? renderIcon('check') : ''}
        </li>
      `
    })
    .join('')

  return `
    <div class="word-bank__group">
      <h3>${title}</h3>
      <ul>${entries}</ul>
    </div>
  `
}

function renderWordBank(completedIds: ReadonlySet<string>): string {
  return `
    <section class="word-bank" aria-labelledby="word-bank-title">
      <div class="section-heading">
        <div>
          <p class="section-kicker">Reference list</p>
          <h2 id="word-bank-title">Word bank</h2>
        </div>
        <p>Answered names stay visible and are marked complete.</p>
      </div>
      <div class="word-bank__columns">
        ${renderWordBankGroup('civilization', 'Civilizations', completedIds)}
        ${renderWordBankGroup('place', 'Places & features', completedIds)}
      </div>
    </section>
  `
}

function renderFeedback(item: QuizItem): string {
  if (quizState.status === 'correct') {
    return `
      <div class="feedback feedback--correct" id="answer-feedback" aria-live="polite">
        <span class="feedback__icon" aria-hidden="true">${renderIcon('check')}</span>
        <div>
          <strong>${escapeHtml(item.name)}</strong>
          <p>${escapeHtml(item.note)}</p>
        </div>
      </div>
    `
  }

  return `
    <div class="feedback feedback--idle" id="answer-feedback" aria-live="polite">
      <span>Use the highlighted shape and the word bank.</span>
    </div>
  `
}

function renderQuizScreen(): string {
  const item = currentItem(quizState)
  const copy = promptCopy[item.featureType]
  const completedIds = new Set(quizState.completed.map(({ id }) => id))
  const completed = quizState.completed.length
  const progress = (completed / quizState.order.length) * 100
  const isCorrect = quizState.status === 'correct'
  const nextLabel = quizState.currentIndex === quizState.order.length - 1 ? 'See results' : 'Next location'

  return `
    <div class="site-shell">
      ${renderHeader(completed)}
      <main>
        <section class="quiz-workspace" aria-labelledby="question-title">
          <div class="map-column">
            <div class="map-toolbar">
              <div class="map-toolbar__type">
                ${featureSwatch(item.featureType)}
                <span>${copy.eyebrow}</span>
              </div>
              <span class="map-toolbar__hint">Approximate historical core</span>
            </div>
            <div class="map-canvas">${renderMap(item, isCorrect)}</div>
            <p class="map-note">${historicalScopeNote}</p>
          </div>

          <div class="response-panel">
            <div class="question-progress">
              <div><span>Question</span><strong>${quizState.currentIndex + 1} / ${quizState.order.length}</strong></div>
              <div
                class="progress-track"
                role="progressbar"
                aria-label="Quiz progress"
                aria-valuemin="0"
                aria-valuemax="${quizState.order.length}"
                aria-valuenow="${completed}"
              ><span style="width: ${progress}%"></span></div>
            </div>

            <div class="question-copy">
              <p class="question-kicker">${copy.eyebrow}</p>
              <h2 id="question-title">${copy.title}</h2>
              <p>${copy.instruction}</p>
            </div>

            <form class="answer-form" id="answer-form" novalidate>
              <label for="answer">Your answer</label>
              <div class="answer-row">
                <input
                  id="answer"
                  name="answer"
                  type="text"
                  autocomplete="off"
                  autocapitalize="words"
                  spellcheck="false"
                  aria-describedby="answer-feedback"
                  placeholder="Type a name..."
                  ${isCorrect ? 'disabled' : ''}
                />
                <button class="primary-button" type="submit" ${isCorrect ? 'disabled' : ''}>
                  <span>Check</span>${renderIcon('arrow-right')}
                </button>
              </div>
            </form>

            ${renderFeedback(item)}

            <div class="response-actions">
              ${
                isCorrect
                  ? `<button class="next-button" type="button" data-action="next">
                      <span>${nextLabel}</span>${renderIcon('arrow-right')}
                    </button>`
                  : '<span class="keyboard-note">Press Enter to check</span>'
              }
            </div>
          </div>
        </section>

        ${renderWordBank(completedIds)}
      </main>
    </div>
  `
}

function renderCompletionScreen(): string {
  const retryAnswers = quizState.completed.filter(({ attempts }) => attempts > 1)
  const retryNames = retryAnswers.map(({ id, attempts }) => {
    const item = quizState.order.find((candidate) => candidate.id === id)
    return `<li><span>${escapeHtml(item?.name ?? id)}</span><strong>${attempts} attempts</strong></li>`
  })
  const accuracy = Math.round((quizState.firstTryCorrect / quizState.order.length) * 100)

  return `
    <div class="site-shell">
      ${renderHeader(quizState.order.length)}
      <main class="completion-main">
        <section class="completion" aria-labelledby="completion-title">
          <p class="completion-kicker">Atlas complete</p>
          <h2 id="completion-title">You mapped all ${quizState.order.length} locations.</h2>
          <p class="completion-intro">Review the places that took another look, then shuffle the map and run it again.</p>

          <dl class="result-metrics">
            <div><dt>First try</dt><dd>${quizState.firstTryCorrect}<span> / ${quizState.order.length}</span></dd></div>
            <div><dt>Accuracy</dt><dd>${accuracy}<span>%</span></dd></div>
            <div><dt>Total attempts</dt><dd>${quizState.totalAttempts}</dd></div>
          </dl>

          <div class="review-list">
            <h3>${retryAnswers.length === 0 ? 'Perfect first pass' : 'Review these again'}</h3>
            ${
              retryAnswers.length === 0
                ? '<p>Every location was correct on the first attempt.</p>'
                : `<ul>${retryNames.join('')}</ul>`
            }
          </div>

          <button class="restart-button" type="button" data-action="restart">
            ${renderIcon('rotate-ccw')}<span>Shuffle and play again</span>
          </button>
        </section>
      </main>
    </div>
  `
}

function setInlineFeedback(kind: 'empty' | 'wrong' | 'misspelled'): void {
  const feedback = document.querySelector<HTMLDivElement>('#answer-feedback')
  const input = document.querySelector<HTMLInputElement>('#answer')

  if (!feedback || !input) {
    return
  }

  feedback.className = `feedback feedback--${kind}`
  feedback.textContent =
    kind === 'empty'
      ? 'Type one of the names from the word bank.'
      : kind === 'misspelled'
        ? `No word-bank name matches that spelling. Check it and try again. Attempt ${quizState.currentAttempts} is recorded.`
        : `Not quite. Attempt ${quizState.currentAttempts} is recorded; look again and retry.`
  input.setAttribute('aria-invalid', 'true')
  input.focus()
  input.select()
}

function restartQuiz(): void {
  quizState = createQuiz(quizItems)
  renderApp('answer')
}

function bindEvents(): void {
  document.querySelectorAll<HTMLButtonElement>('[data-action="restart"]').forEach((button) => {
    button.addEventListener('click', restartQuiz)
  })

  document.querySelector<HTMLButtonElement>('[data-action="next"]')?.addEventListener('click', () => {
    quizState = advanceQuiz(quizState)
    renderApp(quizState.status === 'complete' ? 'none' : 'answer')
  })

  document.querySelector<HTMLFormElement>('#answer-form')?.addEventListener('submit', (event) => {
    event.preventDefault()
    const input = document.querySelector<HTMLInputElement>('#answer')

    if (!input || !normalizeAnswer(input.value)) {
      setInlineFeedback('empty')
      return
    }

    const result = submitAnswer(quizState, input.value)
    quizState = result.state

    if (!result.isCorrect) {
      setInlineFeedback(result.feedback === 'misspelled' ? 'misspelled' : 'wrong')
      return
    }

    renderApp('next')
  })
}

function renderApp(focusTarget: FocusTarget = 'none'): void {
  appRoot.innerHTML = quizState.status === 'complete' ? renderCompletionScreen() : renderQuizScreen()
  initializeIcons()
  bindEvents()

  if (focusTarget === 'answer') {
    document.querySelector<HTMLInputElement>('#answer')?.focus()
  } else if (focusTarget === 'next') {
    document.querySelector<HTMLButtonElement>('[data-action="next"]')?.focus()
  }
}

renderApp('answer')
