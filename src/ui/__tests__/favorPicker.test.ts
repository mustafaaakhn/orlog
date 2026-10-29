import { describe, expect, it } from 'vitest'
import { createSSRApp } from 'vue'
import { renderToString } from 'vue/server-renderer'
import FavorPicker from '../FavorPicker.vue'
import { FAVOR_CATALOG, Game, describeFavorTier } from '../../core'
import { favorFailureTitle } from '../../presentation/resolutionPlan'
import type { GameEvent } from '../../core'

describe('favor intention and failure display', () => {
  it('renders every tier without a budget warning or lock at zero tokens', async () => {
    const state = new Game().state
    for (const favorId of Object.keys(FAVOR_CATALOG) as (keyof typeof FAVOR_CATALOG)[]) {
      const html = await renderToString(createSSRApp(FavorPicker, {
        state, player: state.players['player-1'], disabled: false, favorId,
      }))
      for (const tier of [1, 2, 3] as const) {
        expect(html).toContain(`Seviye ${tier}`)
        expect(html).toContain(`${FAVOR_CATALOG[favorId].tiers[tier].cost}<span class="sr-only"> jeton</span>`)
      }
      expect(html).not.toContain('disabled')
      expect(html).not.toMatch(/yetmez|yetersiz|yetecek/i)
    }
  })
  it('uses the actual failure reason and never labels cancellation as missing tokens', () => {
    const base = { type: 'FavorFailed', favorId: 'thors-strike', playerId: 'player-1', cost: 4, id: 'failure', round: 1, sequence: 1, revision: 1 } as const
    expect(favorFailureTitle({ ...base, reason: 'tokens' })).toBe('Yeterli jeton yok · Güç kullanılamadı')
    expect(favorFailureTitle({ ...base, reason: 'cancelled' })).toContain('Seviye sıfıra')
    expect(favorFailureTitle(base)).toBe('Güç kullanılamadı')
    expect(favorFailureTitle({ ...base, type: 'FavorChosen' } as unknown as GameEvent)).toBe('')
  })
})

describe('read-only hover preview', () => {
  it('shows the complete catalog description and token names without selectable tiers', async () => {
    const state = new Game().state
    for (const favorId of Object.keys(FAVOR_CATALOG) as (keyof typeof FAVOR_CATALOG)[]) {
      const html = await renderToString(createSSRApp(FavorPicker, {
        state, player: state.players['player-1'], disabled: false, favorId, preview: true,
      }))
      expect(html).not.toContain('<button')
      expect(html).not.toContain('aria-pressed')
      for (const tier of [1, 2, 3] as const) {
        expect(html).toContain(describeFavorTier(favorId, tier))
        expect(html).toContain(`${FAVOR_CATALOG[favorId].tiers[tier].cost}<span class="sr-only"> jeton</span>`)
      }
    }
  })
})
