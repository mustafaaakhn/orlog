// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createApp, h, nextTick } from 'vue'
import { initialLocale, initializeLocale, LANGUAGES, locale, setLocale, t } from '..'
import messages from '../messages.json'
import ExperienceSettings from '../../ui/ExperienceSettings.vue'
import { FAVOR_CATALOG, describeFavorTier, Game } from '../../core'
import { eventText } from '../../presentation/eventText'
import { inspectableDice } from '../../ui/dieInspection'

afterEach(() => { vi.unstubAllGlobals(); localStorage.clear(); setLocale('tr', false); document.body.innerHTML = '' })
describe('interface languages', () => {
  it('defaults to English independently of the browser, accepts only supported saved choices and handles denied storage', () => {
    expect(initialLocale()).toBe('en')
    expect(initialLocale({ getItem: () => 'de' })).toBe('de')
    expect(initialLocale({ getItem: () => 'German' })).toBe('en')
    expect(initialLocale({ getItem() { throw Error('denied') } })).toBe('en')
    initializeLocale()
    expect(locale.value).toBe('en')
    expect(document.documentElement.lang).toBe('en')
    expect(LANGUAGES.map(l => l.name)).toEqual(['English', 'Türkçe', 'Français', 'Deutsch'])
  })
  it('persists an explicit choice, restores it and updates the document language', () => {
    setLocale('fr')
    expect(localStorage.getItem('orlog-language')).toBe('fr')
    setLocale('en', false)
    initializeLocale()
    expect(locale.value).toBe('fr')
    expect(document.documentElement.lang).toBe('fr')
    vi.stubGlobal('localStorage', { getItem() { throw Error('denied') }, setItem() { throw Error('denied') } })
    expect(() => setLocale('de')).not.toThrow()
    expect(t('Kapat')).toBe('Schließen')
    expect(() => initializeLocale()).not.toThrow()
    expect(locale.value).toBe('en')
  })
  it('keeps every catalog placeholder and never leaves a locale empty', () => {
    const placeholders = (s: string) => [...s.matchAll(/\{\d+\}/g)].map(m => m[0]).sort()
    for (const [key, translations] of Object.entries(messages)) {
      expect(translations).toHaveLength(3)
      for (const translated of translations) {
        expect(translated.trim().length).toBeGreaterThan(0)
        expect(placeholders(translated), key).toEqual(placeholders(key))
      }
    }
  })
  it('covers literal UI messages in every translated catalog', () => {
    const sources = import.meta.glob<string>('/src/**/*.vue', { eager: true, query: '?raw', import: 'default' })
    const brands = new Set(['Orlog', 'ORLOG', 'GitHub'])
    for (const [file, source] of Object.entries(sources)) {
      for (const match of source.matchAll(/\bt\(\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g)) {
        const key = match[1]!.slice(1, -1).replace(/\\'/g, "'").replace(/\s+/g, ' ').trim()
        if (brands.has(key)) continue
        expect(Object.hasOwn(messages, key), `${file}: ${key}`).toBe(true)
      }
    }
  })
  it('renders live language changes without remounting settings or changing volumes', async () => {
    setLocale('en', false)
    const settings = { music: .2, effects: .6, muted: false, motion: 'system', fast: false, quality: 'auto' }
    const root = document.createElement('div'); document.body.append(root)
    const app = createApp({ render: () => h(ExperienceSettings, { settings, audioFailed: false }) }); app.mount(root)
    const input = root.querySelector<HTMLInputElement>('#music-volume')!
    expect(root.textContent).toContain('Music volume')
    setLocale('fr', false); await nextTick()
    expect(root.textContent).toContain('Volume de la musique')
    setLocale('de', false); await nextTick()
    expect(root.textContent).toContain('Musiklautstärke')
    expect(root.querySelector('#music-volume')).toBe(input)
    expect(input.value).toBe('0.2')
    expect(settings.music).toBe(.2)
    app.unmount()
  })
  it('formats authoritative dynamic messages and preserves names and safe text', () => {
    setLocale('en', false)
    expect(t('Oyuncu II')).toBe('Player II')
    expect(t('7 can iyileştir.')).toBe('Restore 7 health.')
    expect(t(' Öncelik ')).toBe(' Priority ')
    expect(t(null)).toBeUndefined()
    expect(t('{0} kazandı.', ['El'])).toBe('El won.')
    expect(t('<img src=x onerror=alert(1)>')).toBe('<img src=x onerror=alert(1)>')
    setLocale('fr', false)
    expect(t('Kod kopyalanamadı. 0427 kodunu seçip kopyalayabilirsin.')).toContain('0427')
    expect(t('{0} tanrısını kaldır', ['Hel'])).toBe('Retirer Hel')
  })
  it.each(['en', 'fr', 'de'] as const)('translates all 20 power descriptions and exact die information in %s without changing game state', target => {
    setLocale(target, false)
    for (const id of Object.keys(FAVOR_CATALOG) as (keyof typeof FAVOR_CATALOG)[]) for (const level of [1, 2, 3] as const) {
      const source = describeFavorTier(id, level), translated = t(source)
      expect(translated, source).not.toBe(source)
      expect(translated).not.toMatch(/\{\d+\}/)
    }
    const g = new Game({ random: () => .4 }); g.dispatch({ type: 'RollDice', playerId: 'player-1' })
    const before = JSON.stringify(g.state)
    const die = g.state.players['player-1'].dice[0]!
    const [info] = inspectableDice(Object.values(g.state.players), [{ id: die.id, x: 50, y: 50 }], 'player-1')
    expect(info!.label).not.toMatch(/Oyuncu|zar|haznede|merkeze al/)
    expect(JSON.stringify(g.state)).toBe(before)
    const damage = eventText({ id: 'e', sequence: 1, revision: 1, round: 1, type: 'DamageDealt', playerId: 'player-1', targetId: 'player-2', symbol: 'arrow', amount: 2, health: 13 })
    expect(damage).not.toMatch(/Oyuncu|vurdu|hasar aldı/)
  })
})
