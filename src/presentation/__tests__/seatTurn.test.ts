import { afterEach, describe, expect, it, vi } from 'vitest'
import { gsap } from 'gsap'
import { createSeatTurn } from '../seatTurn'

const turns: ReturnType<typeof createSeatTurn>[] = []
afterEach(() => { for (const turn of turns.splice(0)) turn.dispose() })
function setup(player: 'player-1' | 'player-2' = 'player-1') {
  const frame = vi.fn(), active = vi.fn()
  const turn = createSeatTurn(player, { frame, active })
  turns.push(turn)
  return { turn, frame, active }
}
const tween = () => gsap.globalTimeline.getChildren(false, true, false).at(-1) as gsap.core.Tween

describe('local seat presentation', () => {
  it('locks the new seat throughout a continuous half-turn, then releases it at the exact final angle', () => {
    const { turn, frame, active } = setup()
    turn.turn('player-2', false)
    expect(active.mock.calls).toEqual([['player-2']])
    const moving = tween().pause()
    moving.progress(0.5)
    expect(turn.angle).toBeGreaterThan(0)
    expect(turn.angle).toBeLessThan(Math.PI)
    expect(active).toHaveBeenCalledTimes(1)
    moving.progress(1)
    expect(frame).toHaveBeenLastCalledWith(Math.PI)
    expect(active).toHaveBeenLastCalledWith(null)
    turn.turn('player-1', false)
    tween().pause().progress(0.5)
    expect(turn.angle).toBeGreaterThan(Math.PI)
    expect(turn.angle).toBeLessThan(2 * Math.PI)
    tween().progress(1)
    expect(turn.angle).toBe(0)
  })

  it('does not replay the announcement for selection/resource changes on the same seat', () => {
    const { turn, active } = setup('player-2')
    turn.turn('player-2', false)
    expect(active).not.toHaveBeenCalled()
    expect(turn.angle).toBe(Math.PI)
  })

  it('keeps reduced motion stationary while retaining the next-player announcement', () => {
    const { turn, frame, active } = setup()
    turn.turn('player-2', true)
    expect(frame).toHaveBeenLastCalledWith(Math.PI)
    tween().pause().progress(0.5)
    expect(turn.angle).toBe(Math.PI)
    expect(active).toHaveBeenLastCalledWith('player-2')
    tween().progress(1)
    expect(active).toHaveBeenLastCalledWith(null)
    expect(frame.mock.calls.every(([angle]) => angle === Math.PI)).toBe(true)
  })

  it('cancels the old turn and unlocks immediately for background/recovery without replaying it on return', () => {
    const { turn, active } = setup()
    turn.turn('player-2', false)
    const moving = tween().pause()
    moving.progress(0.3)
    turn.snap('player-2')
    expect(moving.parent).toBeNull()
    expect(turn.angle).toBe(Math.PI)
    expect(active).toHaveBeenLastCalledWith(null)
    const count = active.mock.calls.length
    turn.turn('player-2', false)
    expect(active).toHaveBeenCalledTimes(count)
  })

  it('replaces an interrupted destination and disposes without late frames or new turns', () => {
    const { turn, active, frame } = setup()
    turn.turn('player-2', false)
    const previous = tween().pause()
    previous.progress(0.2)
    turn.turn('player-1', false)
    expect(previous.parent).toBeNull()
    expect(active).toHaveBeenLastCalledWith('player-1')
    const current = tween().pause()
    turn.dispose()
    expect(current.parent).toBeNull()
    expect(active).toHaveBeenLastCalledWith(null)
    const frames = frame.mock.calls.length
    turn.turn('player-2', false)
    turn.snap('player-2')
    expect(frame).toHaveBeenCalledTimes(frames)
  })
})
