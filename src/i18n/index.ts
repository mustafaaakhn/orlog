import { ref } from 'vue'
import messages from './messages.json'

export const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'tr', name: 'Türkçe' },
  { code: 'fr', name: 'Français' },
  { code: 'de', name: 'Deutsch' },
] as const
export type Locale = typeof LANGUAGES[number]['code']
export const locale = ref<Locale>('en')
const STORAGE_KEY = 'orlog-language'
const translations: Record<string, readonly string[]> = messages
const columns = { en: 0, fr: 1, de: 2 } as const
const normalize = (value: string) => value.replace(/\s+/g, ' ').trim()
const isLocale = (value: unknown): value is Locale => LANGUAGES.some(l => l.code === value)
export function initialLocale(storage?: Pick<Storage, 'getItem'>): Locale {
  try { const saved = storage?.getItem(STORAGE_KEY); return isLocale(saved) ? saved : 'en' } catch { return 'en' }
}
export function setLocale(value: Locale, persist = true) {
  if (!isLocale(value)) return
  locale.value = value
  if (typeof document !== 'undefined') document.documentElement.lang = value
  if (persist) { try { localStorage.setItem(STORAGE_KEY, value) } catch { /* Language works without storage. */ } }
}
export function initializeLocale() {
  try { setLocale(initialLocale(localStorage), false) } catch { setLocale('en', false) }
}
const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
// Source messages from core/network remain locale-independent. Match their
// display strings here; adjacent parameters require the explicit values form.
const patterns = Object.keys(translations).filter(key => /\{\d+\}/.test(key) && !/\}\{/.test(key))
  .sort((a, b) => b.replace(/\{\d+\}/g, '').length - a.replace(/\{\d+\}/g, '').length)
  .map(key => {
    const indices: number[] = []
    const expression = key.split(/(\{\d+\})/).map(part => {
      if (!/^\{\d+\}$/.test(part)) return escape(part)
      indices.push(Number(part.slice(1, -1)))
      return '(.*?)'
    }).join('')
    return { key, indices, expression: new RegExp(`^${expression}$`, 'u') }
  })
function format(message: string, values: readonly unknown[]) {
  return message.replace(/\{(\d+)\}/g, (part, index: string) => values[Number(index)] == null ? part : String(values[Number(index)]))
}
export function t(source: string | number, values?: readonly unknown[], language?: Locale): string
export function t(source: unknown, values?: readonly unknown[], language?: Locale): string | undefined
export function t(source: unknown, values?: readonly unknown[], language: Locale = locale.value): string | undefined {
  if (source == null) return undefined
  const raw = String(source), key = normalize(raw)
  const target = language
  if (target === 'tr') return values ? format(raw, values) : raw
  const translate = (id: string) => translations[id]?.[columns[target]]
  const exact = translate(key)
  if (exact !== undefined) {
    const text = values ? format(exact, values) : exact
    return raw.match(/^\s*/u)![0] + text + raw.match(/\s*$/u)![0]
  }
  if (!values) for (const pattern of patterns) {
    const match = pattern.expression.exec(key)
    if (!match) continue
    const params: string[] = []
    pattern.indices.forEach((index, i) => { params[index] = match[i + 1]! })
    return format(translate(pattern.key)!, params)
  }
  return values ? format(raw, values) : raw
}
