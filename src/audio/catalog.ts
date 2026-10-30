import type { GameEvent } from '../core'

export const SOUND_CATALOG = {
  'dice-0': 'dice-0.wav', 'dice-1': 'dice-1.wav', 'dice-2': 'dice-2.wav', 'dice-3': 'dice-3.wav',
  attack: 'attack.wav', block: 'block.wav', token: 'token.wav', favor: 'favor.wav', heal: 'heal.wav',
  'coin-flip': 'coin-flip.wav', 'game-start': 'game-start.wav',
  ambience: 'ambience.wav',
  'music-1': 'background-1.opus', 'music-2': 'background-2.opus',
} as const
export const MUSIC_PLAYLIST = ['music-1', 'music-2'] as const
export type SoundId = keyof typeof SOUND_CATALOG
export interface AudioSettings { muted: boolean; music: number; effects: number }
export interface AudioPort {
  event(event: GameEvent): void
  impact(index: number, strength: number): void
}
export function soundForEvent(event: GameEvent): SoundId | undefined {
  switch (event.type) {
    case 'AttackBlocked': return 'block'
    case 'DamageDealt': case 'HealthSacrificed': return event.amount ? 'attack' : undefined
    case 'TokensGained': return event.dieIds.length ? 'token' : undefined
    case 'TokensStolen': case 'TokensGranted': case 'TokensDestroyed': return event.amount ? 'token' : undefined
    case 'FavorInvoked': case 'FavorEffectApplied': case 'FavorReduced': return 'favor'
    case 'HealthRestored': return event.amount ? 'heal' : undefined
  }
}
