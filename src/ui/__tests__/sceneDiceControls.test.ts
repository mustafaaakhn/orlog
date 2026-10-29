import { effectScope, nextTick, ref } from 'vue'
import { describe, expect, it } from 'vitest'
import { createDieHighlight } from '../dieHighlight'
import type { DieId } from '../../core'

const a: DieId = 'player-1/die-1', b: DieId = 'player-1/die-2'
describe('projected die highlight ownership', () => {
  it('gives a new keyboard focus priority over a stationary pointer, and restores it on pointer leave', () => {
    const scope = effectScope()
    const highlight = scope.run(() => createDieHighlight(() => true, () => [a, b]))!
    highlight.aimed.value = a
    expect(highlight.id.value).toBe(a)
    highlight.focus(b)
    expect(highlight.id.value).toBe(b)
    expect(highlight.aimed.value).toBeNull()
    highlight.aimed.value = a
    expect(highlight.id.value).toBe(a)
    highlight.aimed.value = null
    expect(highlight.id.value).toBe(b)
    highlight.focus(null)
    expect(highlight.id.value).toBeNull()
    scope.stop()
  })
  it('clears stale input across a presentation lock and ignores unavailable die identities', async () => {
    const scope = effectScope(), enabled = ref(true), ids = ref<DieId[]>([a, b])
    const highlight = scope.run(() => createDieHighlight(() => enabled.value, () => ids.value))!
    highlight.focus(b)
    enabled.value = false
    await nextTick()
    expect(highlight.id.value).toBeNull()
    enabled.value = true
    expect(highlight.id.value).toBeNull()
    highlight.aimed.value = b
    ids.value = [a]
    expect(highlight.id.value).toBeNull()
    highlight.clear()
    ids.value = [a, b]
    expect(highlight.id.value).toBeNull()
    scope.stop()
  })
})
