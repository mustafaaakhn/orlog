import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createSSRApp } from 'vue'
import { renderToString } from 'vue/server-renderer'
import MatchSetup from '../MatchSetup.vue'
import { createOnlineClient } from '../../network/client'
import type { RematchSetup } from '../../app/rematchSetup'
import type { FavorId } from '../../core'

beforeEach(() => {
  vi.stubGlobal('window', { matchMedia: () => ({ matches: true, addEventListener() {}, removeEventListener() {} }) })
  vi.stubGlobal('document', { querySelector: () => null })
})
afterEach(() => vi.unstubAllGlobals())
const favors: FavorId[] = ['baldrs-invulnerability', 'bragis-verve', 'skadis-hunt']
const other: FavorId[] = ['thors-strike', 'iduns-rejuvenation', 'vidars-might']
function verifyChoices(html: string) {
  expect(html).toContain('Baldr, Savunmayı artır, kuşanıldı; kaldır')
  expect(html).toContain('Bragi, Ellerden ek jeton, kuşanıldı; kaldır')
  expect(html).toContain('Skaði, Okları güçlendir, kuşanıldı; kaldır')
  expect(html).toContain('Hazırım')
  expect(html).not.toContain('İlk hamle kaderden.')
  expect(html).not.toContain('Oyuna Başla')
}

describe('rematch loadout review', () => {
  it.each(['computer', 'local'] as const)('preselects the previous %s loadout and opens directly at gods without marking either human ready', async mode => {
    const online = createOnlineClient({ snapshot() {}, batch() {}, closed() {} })
    const rematch: RematchSetup = {
      options: { firstPlayerId: 'player-2', loadouts: { 'player-1': favors, 'player-2': other } },
      names: { 'player-1': 'Eivor', 'player-2': 'Sigurd' }, opponent: { mode, difficulty: 'normal' },
    }
    try {
      const html = await renderToString(createSSRApp(MatchSetup, { rematch, online, reduced: false, paused: false, muted: true, volume: 0 }))
      verifyChoices(html)
      expect(html).toContain('Eivor')
      expect(rematch.options.loadouts?.['player-1']).toEqual(favors)
    } finally { online.dispose() }
  })

  it('prefills an unready online guest from the retained seat on first mount, including reconnect', async () => {
    const online = createOnlineClient({ snapshot() {}, batch() {}, closed() {} })
    online.identity.value = { code: '0007', playerId: 'player-2', token: 'test-seat' }
    online.room.value = {
      code: '0007', stage: 'gods', firstPlayerId: 'player-1', revision: 42, waiting: false,
      players: [
        { id: 'player-1', name: 'Eivor', favors: other, ready: false, connected: true },
        { id: 'player-2', name: 'Sigurd', favors, ready: false, connected: true },
      ],
    }
    const ready = vi.spyOn(online, 'ready')
    try {
      const html = await renderToString(createSSRApp(MatchSetup, { online, reduced: false, paused: false, muted: true, volume: 0 }))
      verifyChoices(html)
      expect(html).toContain('value="Sigurd"')
      expect(ready).not.toHaveBeenCalled()
      expect(online.room.value.players.every(player => !player.ready)).toBe(true)
    } finally { online.dispose() }
  })
})
