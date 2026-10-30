import type { GameEvent } from '../core'

export const SOUND_CATALOG = {
  'dice-0': 'elevenlabs/dice-0.mp3', 'dice-1': 'elevenlabs/dice-1.mp3',
  'dice-2': 'elevenlabs/dice-2.mp3', 'dice-3': 'elevenlabs/dice-3.mp3',
  'dice-roll': 'elevenlabs/dice-roll.mp3',
  attack: 'elevenlabs/attack.mp3', block: 'elevenlabs/block.mp3', token: 'elevenlabs/token.mp3',
  favor: 'elevenlabs/favor.mp3', heal: 'elevenlabs/heal.mp3',
  'earn-money': 'elevenlabs/earn-money.mp3',
  'coin-flip': 'elevenlabs/coin-flip.mp3', 'game-start': 'elevenlabs/game-start.mp3',
  victory: 'elevenlabs/victory.mp3', defeat: 'elevenlabs/defeat.mp3',
  ambience: 'elevenlabs/ambience.mp3',
  'music-1': 'background-1.opus', 'music-2': 'background-2.opus',
} as const
export const MUSIC_PLAYLIST = ['music-1', 'music-2'] as const
export type SoundId = keyof typeof SOUND_CATALOG
export interface AudioSettings { muted: boolean; music: number; effects: number }
export interface AudioPort {
  event(event: GameEvent, resourceStep?: number): void
  impact(index: number, strength: number): void
  roll?(): () => void
}
export function soundForEvent(event: GameEvent): SoundId | undefined {
  switch (event.type) {
    case 'AttackBlocked': return 'block'
    case 'DamageDealt': case 'HealthSacrificed': return event.amount ? 'attack' : undefined
    case 'TokensGained': return event.dieIds.length ? 'earn-money' : undefined
    case 'TokensStolen': case 'TokensGranted': return event.amount ? 'earn-money' : undefined
    case 'TokensDestroyed': return event.amount ? 'token' : undefined
    case 'FavorInvoked': case 'FavorEffectApplied': case 'FavorReduced': return 'favor'
    case 'HealthRestored': return event.amount ? 'heal' : undefined
  }
}

// A shared local screen celebrates its winner; a personal seat hears its own outcome.
export function soundForResult(event: Extract<GameEvent, { type: 'GameEnded' }>, listener: import('../core').PlayerId | null): 'victory' | 'defeat' {
  return listener && event.winnerId !== listener ? 'defeat' : 'victory'
}
