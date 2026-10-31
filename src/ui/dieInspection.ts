import { t } from '../i18n'
import { getDieFace } from "../core";
import type { PlayerState, PlayerId, DieId } from "../core";
import type { SceneDieTarget } from "../scene/dieTargets";
import { SYMBOL_GUIDE } from "../scene/symbols";

// Inspect only faces already visible in the presentation. Selection has its own
// ownership check, so inspecting an opponent or a kept die cannot emit a move.
export function inspectableDice(
  players: readonly PlayerState[],
  targets: readonly SceneDieTarget[],
  selectablePlayer: PlayerId | null,
  collected: readonly DieId[] = [],
) {
  return players.flatMap(player => player.dice.flatMap((die, index) => {
    const target = targets.find(value => value.id === die.id);
    if (!target || !die.faceId || die.removed) return [];
    const face = getDieFace(die.definitionId, die.faceId);
    const guide = SYMBOL_GUIDE.find(value => value.id === face.symbol)!;
    const canSelect = player.id === selectablePlayer && !die.kept && !collected.includes(die.id);
    const owner = player.id === "player-1" ? "Oyuncu I" : "Oyuncu II";
    const location = collected.includes(die.id) ? "Kullanıldı" : die.kept ? "Kilitli" : die.selected ? "Seçili" : "Haznede";
    return [{
      ...target, face, name: guide.name, description: guide.description,
      value: die.value, selected: die.selected, canSelect, owner, location,
      label: t('{0}, zar {1}: {2}{3}{4}, {5}; {6}', [t(owner), index + 1, t(guide.name),
        face.grantsToken ? t(', jeton getirir') : '', die.value > 1 ? t(', etki {0}', [die.value]) : '',
        t(location.toLocaleLowerCase('tr')), t(canSelect ? die.selected ? 'geri al' : 'merkeze al' : 'incele')]),
    }];
  }));
}
