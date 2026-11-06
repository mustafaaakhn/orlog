// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createApp, h, nextTick, ref, shallowRef } from 'vue'
import { Group, Scene } from 'three'
import { Game } from '../../core'
import type { GameState } from '../../core'
import type { PresentationBatch } from '../../app/rollSession'
import type { AudioPort } from '../../audio/catalog'

const spies = vi.hoisted(() => ({ invalidate: vi.fn(), syncDice: vi.fn(), dispose: vi.fn(), play: vi.fn(), board: vi.fn() }))
vi.mock('@tresjs/core', () => ({
  isWebGLRenderer: () => false,
  useTres: () => ({ sizes: { width: ref(1200), height: ref(800), aspectRatio: ref(1.5) },
    invalidate: spies.invalidate, renderer: { domElement: document.createElement('canvas') }, scene: shallowRef(new Scene()) }),
}))
vi.mock('../board', () => ({ createBoard: () => {
  const board = { object: new Group(), dice: new Map(), syncDice: spies.syncDice,
    syncResources: vi.fn(), favorTargets: () => [], setNarrow: vi.fn(), setDiceReadability: vi.fn(),
    highlightDie: vi.fn(), highlightFavor: vi.fn(), dispose: spies.dispose }
  spies.board(board)
  return board
} }))
vi.mock('../../presentation/rollRecorder', () => ({ createRollRecorder: () => ({ record: vi.fn(), dispose: vi.fn() }) }))
vi.mock('../../presentation/dicePresenter', () => ({ createDicePresenter: () => ({ play: spies.play, setSpeed: vi.fn(), setPaused: vi.fn(), dispose: vi.fn() }) }))
vi.mock('../../presentation/combatPresenter', () => ({ createCombatPresenter: () => ({ collected: new Set(),
  reset: vi.fn(), title: async () => {}, play: async () => {}, collect: async () => {},
  setSpeed: vi.fn(), setPaused: vi.fn(), dispose: vi.fn() }) }))
import TableScene from '../TableScene.vue'
const unmounts: (() => void)[] = []
afterEach(() => { unmounts.splice(0).forEach(fn => fn()); document.body.innerHTML = ''; vi.clearAllMocks() })
async function mount() {
  const game = new Game({ random: () => .35 })
  const state = shallowRef<GameState>(game.state), background = ref(false), batch = shallowRef<PresentationBatch | null>(null)
  const root = document.createElement('div'); document.body.append(root)
  const app = createApp({ render: () => h(TableScene, { state: state.value, batch: batch.value,
    background: background.value, paused: background.value, viewerId: 'player-1',
    audio: { event: vi.fn() } as unknown as AudioPort, speed: 1, reduced: true, quality: 'low',
    highlightedDie: null, highlightedFavor: null, frameInsets: { top: 0, bottom: 0, left: 0, right: 0 } }) })
  app.config.warnHandler = () => {} // Render the Three primitive host tags without a WebGL context.
  app.mount(root); unmounts.push(() => app.unmount()); await nextTick()
  return { game, state, background, batch }
}
describe('table return from background', () => {
  it('repaints an unchanged idle board without recreating the scene or waiting for a roll', async () => {
    const m = await mount()
    m.background.value = true; await nextTick()
    spies.invalidate.mockClear()
    m.background.value = false; await nextTick()
    expect(spies.invalidate).toHaveBeenCalled()
    expect(spies.board).toHaveBeenCalledTimes(1)
    expect(spies.dispose).not.toHaveBeenCalled()
  })
  it('shows the latest snapshot even if an abandoned animation promise never resolves', async () => {
    const m = await mount()
    spies.play.mockImplementation(() => new Promise<void>(() => {}))
    const result = m.game.dispatch({ type: 'RollDice', playerId: 'player-1' })
    if (!result.ok) throw new Error('expected roll')
    m.batch.value = { id: 1, revision: result.state.revision, state: result.state, events: result.events }
    await nextTick(); await Promise.resolve(); await Promise.resolve(); await Promise.resolve()
    expect(spies.play).toHaveBeenCalled()
    m.background.value = true; await nextTick()
    m.state.value = result.state; m.batch.value = null; await nextTick()
    spies.syncDice.mockClear()
    m.background.value = false; await nextTick()
    expect(spies.syncDice).toHaveBeenCalledWith(result.state)
    expect(spies.invalidate).toHaveBeenCalled()
    expect(spies.board).toHaveBeenCalledTimes(1)
  })
  it('synchronizes dice when the latest network state and focus return in the same render', async () => {
    const m = await mount()
    m.background.value = true; await nextTick()
    const result = m.game.dispatch({ type: 'RollDice', playerId: 'player-1' })
    if (!result.ok) throw new Error('expected roll')
    spies.syncDice.mockClear()
    // A suspended browser can deliver its queued network state together with
    // focus. The background watcher must read the complete new set of props.
    m.state.value = result.state
    m.background.value = false
    await nextTick()
    expect(spies.syncDice).toHaveBeenCalledWith(result.state)
    expect(spies.board).toHaveBeenCalledTimes(1)
  })
  it('does not restart a retired batch when focus and its settled snapshot arrive together', async () => {
    const m = await mount()
    spies.play.mockImplementation(() => new Promise<void>(() => {}))
    const result = m.game.dispatch({ type: 'RollDice', playerId: 'player-1' })
    if (!result.ok) throw new Error('expected roll')
    m.batch.value = { id: 1, revision: result.state.revision, state: result.state, events: result.events }
    await nextTick(); await Promise.resolve(); await Promise.resolve(); await Promise.resolve()
    m.background.value = true; await nextTick()
    spies.play.mockClear(); spies.syncDice.mockClear()
    m.state.value = result.state
    m.batch.value = null
    m.background.value = false
    await nextTick(); await Promise.resolve(); await Promise.resolve(); await Promise.resolve()
    expect(spies.syncDice).toHaveBeenCalledWith(result.state)
    expect(spies.play).not.toHaveBeenCalled()
  })
})
