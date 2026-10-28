import { beforeEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ sounds: [] as any[], resume: vi.fn(() => Promise.resolve()) }))
vi.mock('howler', () => ({
  Howler: { ctx: { resume: mocks.resume } },
  Howl: class {
    options: any; active = false; next = 0
    state = vi.fn(() => 'loaded')
    load = vi.fn()
    play = vi.fn(() => { this.active = true; return ++this.next })
    playing = vi.fn(() => this.active)
    pause = vi.fn(() => { this.active = false })
    stop = vi.fn()
    mute = vi.fn()
    volume = vi.fn()
    rate = vi.fn()
    unload = vi.fn()
    constructor(options: any) { this.options = options; mocks.sounds.push(this) }
  },
}))
import { createAudioPlayer } from '../player'
import { soundForEvent } from '../catalog'
import { Game, PLAYER_IDS } from '../../core'

beforeEach(() => { mocks.sounds.length = 0; mocks.resume.mockClear() })
function combatEvents() {
  const game = new Game({ random: () => .35 })
  while (game.state.phase.name === 'roll') {
    const phase = game.state.phase
    game.dispatch({ type: phase.step === 'awaiting-roll' ? 'RollDice' : 'ConfirmRoll', playerId: phase.activePlayerId })
  }
  PLAYER_IDS.forEach(playerId => game.dispatch({ type: 'SkipFavor', playerId }))
  const result = game.dispatch({ type: 'ResolveRound', playerId: 'player-1' })
  if (!result.ok) throw new Error(result.error.message)
  return result.events
}
describe('owned audio lifecycle', () => {
  it('creates audio only after interaction, starts each loaded loop once, and caps contact polyphony', () => {
    const player = createAudioPlayer()
    player.impact(0, 1)
    expect(mocks.sounds).toHaveLength(0)
    player.unlock(); player.unlock()
    expect(mocks.sounds).toHaveLength(11)
    mocks.sounds.forEach(sound => sound.options.onload())
    const loops = mocks.sounds.filter(s => s.options.loop)
    expect(loops.every(s => s.play.mock.calls.length === 1)).toBe(true)
    for (let i = 0; i < 20; i++) player.impact(i, .4)
    expect(mocks.sounds.reduce((n,s) => n + s.stop.mock.calls.length, 0)).toBe(12)
    player.dispose()
    expect(mocks.sounds.every(s => s.unload.mock.calls.length === 1)).toBe(true)
    player.unlock()
    expect(mocks.sounds).toHaveLength(11)
  })
  it('applies separate levels, silence and visibility without queuing late contacts', () => {
    const player = createAudioPlayer()
    player.unlock()
    const hit = mocks.sounds[0]
    hit.state.mockReturnValue('loading')
    player.impact(0, 1)
    expect(hit.play).not.toHaveBeenCalled()
    hit.state.mockReturnValue('loaded')
    player.configure({ music: .2, effects: .8, muted: false })
    expect(mocks.sounds.at(-1).volume).toHaveBeenLastCalledWith(.2 * .7)
    player.visibility(true); player.impact(0, 1)
    expect(hit.play).not.toHaveBeenCalled()
    expect(mocks.sounds.at(-1).pause).toHaveBeenCalled()
    player.visibility(false); player.impact(0, 1)
    expect(hit.play).toHaveBeenCalledTimes(1)
    player.configure({ music: .2, effects: .8, muted: true }); player.impact(0, 1)
    expect(hit.play).toHaveBeenCalledTimes(1)
    player.dispose()
  })
  it('keeps a load failure visible until that same sound recovers', () => {
    const failed = vi.fn(), player = createAudioPlayer(failed)
    player.unlock()
    mocks.sounds[0].options.onloaderror()
    mocks.sounds[1].options.onload()
    expect(failed).toHaveBeenLastCalledWith(true)
    mocks.sounds[0].options.onload()
    expect(failed).toHaveBeenLastCalledWith(false)
    player.dispose()
  })
  it('maps real combat events without mutating their authoritative result', () => {
    const events = combatEvents(), snapshot = JSON.stringify(events), player = createAudioPlayer()
    player.unlock()
    events.forEach(event => player.event(event))
    expect(events.some(event => soundForEvent(event) === 'attack')).toBe(true)
    expect(JSON.stringify(events)).toBe(snapshot)
    player.dispose()
  })
})
