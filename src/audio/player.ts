import { Howl, Howler } from 'howler'
import { MUSIC_PLAYLIST, SOUND_CATALOG, soundForEvent } from './catalog'
import type { AudioPort, AudioSettings, SoundId } from './catalog'

// Each application owns its Howls; never unload another application's global pool.
export function createAudioPlayer(onError: (failed: boolean) => void = () => {}) {
  const sounds = new Map<SoundId, Howl>()
  const voices: { howl: Howl; id: number }[] = []
  const failures = new Set<SoundId>()
  function report(id: SoundId, failed: boolean) { if (failed) failures.add(id); else failures.delete(id); onError(failures.size > 0) }
  let settings: AudioSettings = { muted: false, music: .35, effects: .65 }
  let unlocked = false, hidden = false, disposed = false
  let musicIndex = 0
  const background = (id: SoundId) => id === 'music-1' || id === 'music-2' || id === 'ambience'
  function loops() {
    for (const id of [...MUSIC_PLAYLIST, 'ambience'] as const) {
      const sound = sounds.get(id)
      if (!sound || sound.state() !== 'loaded') continue
      if (disposed || hidden || settings.muted || !settings.music || (id !== 'ambience' && id !== MUSIC_PLAYLIST[musicIndex])) {
        if (sound.playing()) sound.pause()
      }
      else if (!sound.playing()) sound.play()
    }
  }
  function stopEffects() {
    voices.splice(0).forEach(v => v.howl.stop(v.id))
  }
  function play(id: SoundId, strength = 1, variation?: number) {
    if (!unlocked || disposed || hidden || settings.muted || !settings.effects) return
    const sound = sounds.get(id)
    if (!sound || sound.state() !== 'loaded') return // Never replay a late contact after loading.
    while (voices.length >= 8) { const old = voices.shift()!; old.howl.stop(old.id) }
    const voice = sound.play()
    sound.volume(settings.effects * Math.max(.15, Math.min(1, strength)), voice)
    sound.rate(variation === undefined ? 1 : 1 + (variation % 5 - 2) * .035, voice)
    voices.push({ howl: sound, id: voice })
  }
  return {
    unlock() {
      if (disposed || hidden) return
      if (!unlocked) {
        unlocked = true
        for (const id of Object.keys(SOUND_CATALOG) as SoundId[]) {
          const sound = new Howl({
            src: [`${import.meta.env.BASE_URL}assets/audio/${SOUND_CATALOG[id]}`],
            html5: id === 'music-1' || id === 'music-2',
            loop: id === 'ambience', volume: background(id) ? settings.music * (id === 'ambience' ? .45 : .7) : settings.effects,
            onload: () => { report(id, false); loops() },
            onloaderror: () => report(id, true),
            onplayerror: () => report(id, true),
            onplay: () => report(id, false),
            onend: (voice) => {
              const index = voices.findIndex(v => v.howl === sound && v.id === voice)
              if (index >= 0) voices.splice(index, 1)
              if (!disposed && id === MUSIC_PLAYLIST[musicIndex]) {
                musicIndex = (musicIndex + 1) % MUSIC_PLAYLIST.length
                loops()
              }
            },
          })
          sounds.set(id, sound)
        }
      }
      for (const sound of sounds.values()) if (sound.state() === 'unloaded') sound.load()
      void Howler.ctx?.resume().then(loops).catch(() => onError(true))
      loops()
    },
    configure(value: AudioSettings) {
      settings = { ...value }
      for (const [id, sound] of sounds) {
        sound.mute(settings.muted)
        sound.volume(background(id) ? settings.music * (id === 'ambience' ? .45 : .7) : settings.effects)
      }
      if (settings.muted || !settings.effects) stopEffects()
      if (unlocked) loops()
    },
    visibility(isHidden: boolean) {
      hidden = isHidden
      stopEffects()
      if (unlocked && !hidden) void Howler.ctx?.resume().then(loops).catch(() => onError(true))
      loops()
    },
    event(event) { const id = soundForEvent(event); if (id) play(id, 1, event.sequence) },
    impact(index, strength) { play(`dice-${index % 4}` as SoundId, strength, index) },
    coinFlip() { play('coin-flip') },
    stopEffects,
    dispose() { disposed = true; stopEffects(); sounds.forEach(sound => sound.unload()); sounds.clear() },
  } satisfies AudioPort & Record<string, unknown>
}
