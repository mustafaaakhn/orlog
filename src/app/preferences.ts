import { onUnmounted, reactive, watch } from 'vue'

export interface Preferences { muted: boolean; music: number; effects: number; motion: string; fast: boolean; quality: string }

export function usePreferences() {
  const media = window.matchMedia('(prefers-reduced-motion: reduce)')
  const settings = reactive<Preferences>({ muted: false, music: .35, effects: .65, motion: 'system', fast: false, quality: 'auto' })
  try {
    const saved = JSON.parse(localStorage.getItem('orlog-preferences') ?? '{}')
    for (const key of ['music', 'effects'] as const) if (typeof saved[key] === 'number' && Number.isFinite(saved[key])) settings[key] = Math.max(0, Math.min(1, saved[key]))
    if (saved.muted === true) { settings.music = 0; settings.effects = 0 }
  } catch { /* Storage can be unavailable; in-memory controls still work. */ }
  const system = reactive({ reduced: media.matches })
  const changed = () => { system.reduced = media.matches }
  media.addEventListener('change', changed)
  watch(settings, value => { try { localStorage.setItem('orlog-preferences', JSON.stringify(value)) } catch { /* Optional persistence. */ } })
  onUnmounted(() => media.removeEventListener('change', changed))
  return { settings, system }
}
