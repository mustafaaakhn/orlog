import {
  BoxGeometry,
  BufferGeometry,
  CylinderGeometry,
  Group,
  LatheGeometry,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  Quaternion,
  SphereGeometry,
  Texture,
  TextureLoader,
  SRGBColorSpace,
  TorusGeometry,
  Vector2,
  Vector3,
} from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { FAVOR_ART_URL, FAVOR_ART_IDS, favorArtIndex } from "./favorArt";
import { DICE_DEFINITIONS, DEFAULT_FAVORS, FAVOR_CATALOG } from "../core";
import type { DieId, GameState, PlayerId, FavorId } from "../core";
import {
  FACE_NORMALS,
  faceUpRotation,
  reserveSlot,
  bowlSlot,
} from "./diceGeometry";
import {
  createClothTexture,
  createFaceTexture,
  createInscriptionTexture,
  createWoodTexture,
  createBowlTexture,
  createSurfaceTexture,
} from "./textures";

export function createBoard(invalidate: () => void = () => {}) {
  const root = new Group();
  root.name = "Orlog table";
  const textures = new Set<Texture>();
  const geometries = new Set<BufferGeometry>();
  const materials = new Set<MeshStandardMaterial>();
  function keepTexture<T extends Texture>(value: T) {
    textures.add(value);
    return value;
  }
  function geometry<T extends BufferGeometry>(value: T) {
    geometries.add(value);
    return value;
  }
  function material(
    options: ConstructorParameters<typeof MeshStandardMaterial>[0],
  ) {
    const value = new MeshStandardMaterial(options);
    materials.add(value);
    return value;
  }
  function mesh(
    parent: Group,
    shape: BufferGeometry,
    surface: MeshStandardMaterial,
    position: [number, number, number],
  ) {
    const value = new Mesh(shape, surface);
    value.position.set(...position);
    value.castShadow = true;
    value.receiveShadow = true;
    parent.add(value);
    return value;
  }

  const wood = material({
    map: keepTexture(createWoodTexture()),
    roughness: 0.7,
    bumpScale: 0.018,
  });
  wood.bumpMap = wood.map;
  const bowlWood = material({
    map: keepTexture(createBowlTexture()),
    roughness: 0.76,
    bumpScale: 0.012,
  });
  bowlWood.bumpMap = bowlWood.map;
  const darkWood = material({ color: "#2e2019", roughness: 0.9 });
  const brass = material({
    color: "#b99856",
    map: keepTexture(createSurfaceTexture("metal")),
    metalness: 0.64,
    roughness: 0.52,
  });
  const cloth = material({
    map: keepTexture(createClothTexture()),
    roughness: 1,
    bumpScale: 0.022,
  });
  cloth.bumpMap = cloth.map;
  const bone = material({
    map: keepTexture(createSurfaceTexture("bone")),
    roughness: 0.72,
  });
  const redStone = material({
    color: "#bf8168",
    map: keepTexture(createSurfaceTexture("stone")),
    roughness: 0.5,
    metalness: 0.15,
  });
  const blueStone = material({
    color: "#8ab9b1",
    map: redStone.map,
    roughness: 0.48,
    metalness: 0.18,
  });
  const inlay = material({ color: "#a69264", roughness: 1 });

  const table = mesh(
    root,
    geometry(new BoxGeometry(18.4, 0.42, 11.9)),
    darkWood,
    [0, -0.3, 0],
  );
  const fabric = mesh(
    root,
    geometry(new BoxGeometry(17.8, 0.12, 11.3)),
    cloth,
    [0, -0.03, 0],
  );

  // Woven borders, corner diamonds and a simple compass inlay.
  const borderLong = geometry(new BoxGeometry(17.25, 0.012, 0.035));
  const borderShort = geometry(new BoxGeometry(0.035, 0.012, 10.7));
  const borders = new Group();
  root.add(borders);
  for (const z of [-5.3, 5.3]) {
    mesh(borders, borderLong, inlay, [0, 0.038, z]);
    mesh(borders, borderLong, inlay, [0, 0.038, z + Math.sign(z) * 0.13]);
  }
  for (const x of [-8.5, 8.5]) mesh(borders, borderShort, inlay, [x, 0.038, 0]);
  const diamond = geometry(new BoxGeometry(0.22, 0.014, 0.22));
  for (const x of [-8, 8])
    for (const z of [-4.85, 4.85])
      mesh(borders, diamond, inlay, [x, 0.04, z]).rotation.y = Math.PI / 4;
  const ring = geometry(new TorusGeometry(3.48, 0.016, 5, 96));
  mesh(root, ring, inlay, [0, 0.045, 0]).rotation.x = -Math.PI / 2;
  const dash = geometry(new BoxGeometry(0.035, 0.015, 0.2));
  for (let i = 0; i < 48; i++) {
    const angle = (i * Math.PI) / 24;
    mesh(root, dash, inlay, [
      Math.sin(angle) * 3.65,
      0.045,
      Math.cos(angle) * 3.65,
    ]).rotation.y = angle;
  }

  const bowlProfile = [
    [0.01, 0.08],
    [2.2, 0.08],
    [2.52, 0.19],
    [2.8, 0.43],
    [3.05, 0.8],
    [3.11, 0.99],
    [3.05, 1.07],
    [2.96, 1.04],
    [2.86, 0.78],
    [2.63, 0.5],
    [2.35, 0.31],
    [0.01, 0.31],
  ].map(([x, y]) => new Vector2(x, y));
  mesh(root, geometry(new LatheGeometry(bowlProfile, 96)), wood, [0, 0, 0]);
  mesh(
    root,
    geometry(new CylinderGeometry(2.35, 2.35, 0.03, 96)),
    bowlWood,
    [0, 0.31, 0],
  );
  const rim = geometry(new TorusGeometry(3.065, 0.035, 8, 96));
  mesh(root, rim, brass, [0, 1.035, 0]).rotation.x = -Math.PI / 2;
  const innerRing = geometry(new TorusGeometry(2.16, 0.012, 6, 96));
  mesh(root, innerRing, darkWood, [0, 0.33, 0]).rotation.x = -Math.PI / 2;

  const dieShape = geometry(new RoundedBoxGeometry(0.88, 0.88, 0.88, 3, 0.075));
  const faceShape = geometry(new PlaneGeometry(0.735, 0.735));
  const faceMaterials = new Map<string, MeshStandardMaterial>();
  const dice = new Map<DieId, Group>();
  for (const player of ["player-1", "player-2"] as const) {
    [...DICE_DEFINITIONS, ...DICE_DEFINITIONS.slice(0, 3)].forEach(
      (definition, index) => {
        const die = new Group();
        const dieId: DieId =
          `${player}/${index < 6 ? definition.id : `bonus-${index - 5}`}` as DieId;
        die.name = dieId;
        die.userData.dieId = dieId;
        dice.set(dieId, die);
        mesh(die, dieShape, bone, [0, 0, 0]);
        definition.faces.forEach((face) => {
          const cacheKey = `${face.symbol}-${face.grantsToken}`;
          let surface = faceMaterials.get(cacheKey);
          if (!surface) {
            surface = material({
              map: keepTexture(createFaceTexture(face)),
              roughness: 0.7,
            });
            faceMaterials.set(cacheKey, surface);
          }
          const normal = new Vector3(...FACE_NORMALS[face.id]);
          const plaque = mesh(
            die,
            faceShape,
            surface,
            normal.clone().multiplyScalar(0.441).toArray(),
          );
          plaque.quaternion.setFromUnitVectors(new Vector3(0, 0, 1), normal);
          plaque.castShadow = false;
        });
        const marker = mesh(
          die,
          geometry(new BoxGeometry(0.98, 0.98, 0.98)),
          material({ color: "#d8b76e", wireframe: true }),
          [0, 0, 0],
        );
        marker.visible = false;
        marker.name = "selection-marker";
        die.visible = false;
        root.add(die);
      },
    );
  }

  const pebble = geometry(new SphereGeometry(0.22, 16, 10));
  const inscriptionShape = geometry(new PlaneGeometry(0.8, 0.8));
  // Six carved relief steles share the atlas image and cached favor materials.
  // Their transforms remain owned by combatPresenter during favor activation.
  let disposed = false;
  const atlas = keepTexture(
    new TextureLoader().load(FAVOR_ART_URL, () => {
      if (!disposed) invalidate();
    }),
  );
  atlas.colorSpace = SRGBColorSpace;
  atlas.anisotropy = 4;
  const portraitSurface = material({
    map: atlas,
    roughness: 0.83,
    metalness: 0,
  });
  const portraitShapes = new Map<FavorId, PlaneGeometry>();
  for (const id of FAVOR_ART_IDS) {
    const index = favorArtIndex(id);
    const shape = geometry(new PlaneGeometry(0.98, 1.27));
    const uv = shape.attributes.uv!;
    for (let vertex = 0; vertex < uv.count; vertex++) {
      uv.setXY(
        vertex,
        (uv.getX(vertex) + (index % 5)) / 5,
        (uv.getY(vertex) + 3 - Math.floor(index / 5)) / 4,
      );
    }
    portraitShapes.set(id, shape);
  }
  const totemBase = geometry(new CylinderGeometry(0.58, 0.64, 0.18, 12));
  const totemBody = geometry(new RoundedBoxGeometry(1.05, 1.4, 0.3, 2, 0.08));
  const nameShape = geometry(new PlaneGeometry(0.95, 0.24));
  const nameSurfaces = new Map<FavorId, MeshStandardMaterial>();
  const stoneGroups: Group[] = [];
  const totemGroups: Group[] = [];
  let loadouts: Record<PlayerId, readonly FavorId[]> = {
    "player-1": DEFAULT_FAVORS,
    "player-2": DEFAULT_FAVORS,
  };
  const valueSurfaces = new Map<number, MeshStandardMaterial>();
  const labels: Mesh[] = [];
  const tokenGroups: Group[] = [];
  const tokenShape = geometry(new CylinderGeometry(0.17, 0.17, 0.08, 12));
  const effect = mesh(
    root,
    geometry(new SphereGeometry(0.18, 12, 8)),
    material({ color: "#ffda7b", emissive: "#e9b746", emissiveIntensity: 1.3 }),
    [0, 0, 0],
  );
  effect.visible = false;
  const tokenEffect = mesh(root, tokenShape, brass, [0, 0, 0]);
  tokenEffect.visible = false;

  for (const side of [-1, 1]) {
    const stones = new Group();
    stones.name = `${side < 0 ? "Left" : "Right"}: 15 life stones`;
    for (let i = 0; i < 15; i++) {
      const stone = mesh(stones, pebble, side < 0 ? blueStone : redStone, [
        ((i % 3) - 1) * 0.5,
        0.17,
        (Math.floor(i / 3) - 2) * 0.47,
      ]);
      stone.scale.set(1, 0.65 + (i % 3) * 0.08, 0.83);
      stone.rotation.y = i * 0.7;
    }
    stones.position.set(side * 6.8, 0, -0.3);
    root.add(stones);
    stoneGroups.push(stones);
    const tokens = new Group();
    root.add(tokens);
    tokenGroups.push(tokens);

    for (let i = 0; i < 3; i++) {
      const totem = new Group();
      totem.name = FAVOR_CATALOG[DEFAULT_FAVORS[i]!].name;
      mesh(totem, totemBase, darkWood, [0, 0.11, 0]);
      const relief = new Group();
      relief.position.y = 1.02;
      relief.rotation.x = -0.38;
      totem.add(relief);
      mesh(relief, totemBody, wood, [0, 0, 0]);
      const portrait = mesh(
        relief,
        portraitShapes.get(DEFAULT_FAVORS[i]!)!,
        portraitSurface,
        [0, 0, 0.155],
      );
      portrait.name = "favor-portrait";
      portrait.castShadow = false;
      const trim = mesh(
        relief,
        geometry(new BoxGeometry(1.08, 0.045, 0.32)),
        brass,
        [0, -0.69, 0],
      );
      trim.castShadow = false;
      const name = mesh(
        totem,
        nameShape,
        material({ transparent: true }),
        [0, 0.29, 0.4],
      );
      name.rotation.x = -0.7;
      name.name = "favor-name";
      name.castShadow = false;
      totem.position.set(side * (4.45 + i * 1.3), 0, -3.55);
      root.add(totem);
      totemGroups.push(totem);
    }
  }

  // Flat woven labels keep the two resource areas grounded in the scene.
  for (const side of [-1, 1]) {
    const labelTexture = keepTexture(
      createInscriptionTexture(side < 0 ? "I" : "II", "#bba77e"),
    );
    const labelSurface = material({
      map: labelTexture,
      transparent: true,
      roughness: 1,
    });
    const label = mesh(
      root,
      geometry(new PlaneGeometry(0.85, 0.85)),
      labelSurface,
      [side * 6.8, 0.055, 3.25],
    );
    label.rotation.x = -Math.PI / 2;
    label.castShadow = false;
    labels.push(label);
  }

  return {
    object: root,
    dice,
    effect,
    tokenEffect,
    totem(playerId: PlayerId, favorId: string) {
      const index = Math.max(0, loadouts[playerId].indexOf(favorId as FavorId));
      return totemGroups[(playerId === "player-1" ? 0 : 3) + index]!;
    },
    resourcePosition(playerId: PlayerId, tokens = false) {
      return (tokens ? tokenGroups : stoneGroups)
        [playerId === "player-1" ? 0 : 1]!.position.clone()
        .add(new Vector3(0, 0.5, 0));
    },
    syncResources(state: GameState) {
      loadouts = {
        "player-1": state.players["player-1"].favors,
        "player-2": state.players["player-2"].favors,
      };
      Object.values(state.players).forEach((player, side) => {
        for (let i = 0; i < 3; i++) {
          const totem = totemGroups[side * 3 + i]!,
            id = player.favors[i];
          totem.visible = !!id;
          if (id && totem.userData.favorId !== id) {
            totem.userData.favorId = id;
            totem.name = FAVOR_CATALOG[id].name;
            const portrait = totem.getObjectByName("favor-portrait") as Mesh<
              PlaneGeometry,
              MeshStandardMaterial
            >;
            portrait.geometry = portraitShapes.get(id)!;
            let label = nameSurfaces.get(id);
            if (!label) {
              label = material({
                map: keepTexture(
                  createInscriptionTexture(
                    FAVOR_CATALOG[id].name.split("'")[0]!,
                    "#eddbb0",
                  ),
                ),
                transparent: true,
                roughness: 1,
              });
              nameSurfaces.set(id, label);
            }
            (totem.getObjectByName("favor-name") as Mesh).material = label;
          }
        }
        for (const value of player.dice) {
          const object = dice.get(value.id)!;
          let badge = object.getObjectByName("value-badge") as Mesh | undefined;
          if (value.value > 1) {
            let surface = valueSurfaces.get(value.value);
            if (!surface) {
              surface = material({
                map: keepTexture(
                  createInscriptionTexture(`×${value.value}`, "#ffe4a0"),
                ),
                transparent: true,
                depthTest: false,
              });
              valueSurfaces.set(value.value, surface);
            }
            if (!badge) {
              badge = mesh(object, inscriptionShape, surface, [0, 0.85, 0]);
              badge.name = "value-badge";
            }
            badge.material = surface;
          }
          if (badge) {
            badge.visible = value.value > 1 && !value.removed;
            // Keep the badge horizontal in world space above the upper face.
            badge.quaternion
              .copy(object.quaternion)
              .invert()
              .multiply(
                new Quaternion().setFromAxisAngle(
                  new Vector3(1, 0, 0),
                  -Math.PI / 2,
                ),
              );
            badge.position
              .set(0, 0.85, 0)
              .applyQuaternion(object.quaternion.clone().invert());
          }
        }
      });
      Object.values(state.players).forEach((player, index) => {
        stoneGroups[index]!.children.forEach((stone, i) => {
          stone.visible = i < player.health;
        });
        const group = tokenGroups[index]!;
        // Stack real token counts; counters remain readable for large reserves.
        while (group.children.length < Math.min(player.tokens, 40)) {
          const i = group.children.length;
          mesh(group, tokenShape, brass, [
            ((i % 5) - 2) * 0.36,
            0.1 + Math.floor(i / 10) * 0.09,
            Math.floor((i % 10) / 5) * 0.36,
          ]);
        }
        group.children.forEach((token, i) => {
          token.visible = i < player.tokens;
        });
      });
    },
    syncDice(state: GameState) {
      dice.forEach((d) => {
        d.visible = false;
      });
      for (const player of Object.values(state.players)) {
        player.dice.forEach((value, index) => {
          const die = dice.get(value.id)!;
          die.visible = value.faceId !== null && !value.removed;
          if (value.faceId) die.quaternion.copy(faceUpRotation(value.faceId));
          const inBowl =
            state.phase.name === "roll" &&
            state.phase.activePlayerId === player.id &&
            !value.kept &&
            !value.selected;
          die.position.set(
            ...(inBowl
              ? bowlSlot(index)
              : reserveSlot(player.id, index, value.selected)),
          );
          die.getObjectByName("selection-marker")!.visible =
            value.selected || value.kept;
          die.userData.kept = value.kept;
        });
      }
    },
    setCompact(compact: boolean) {
      table.scale.set(compact ? 0.49 : 1, 1, compact ? 1.5 : 1);
      fabric.scale.copy(table.scale);
      borders.scale.copy(table.scale);
      stoneGroups.forEach((group, index) => {
        const side = index === 0 ? -1 : 1;
        group.position.set(
          compact ? -0.4 : side * 6.8,
          0,
          compact ? -side * 6.3 : -0.3,
        );
        group.children.forEach((stone, i) => {
          stone.position.x = compact
            ? ((i % 5) - 2) * 0.42
            : ((i % 3) - 1) * 0.5;
          stone.position.z = compact
            ? (Math.floor(i / 5) - 1) * 0.42
            : (Math.floor(i / 3) - 2) * 0.47;
        });
        labels[index]!.position.set(
          compact ? -2.6 : side * 6.8,
          0.055,
          compact ? -side * 6.3 : 3.25,
        );
      });
      tokenGroups.forEach((group, index) => {
        const side = index === 0 ? -1 : 1;
        group.position.set(
          compact ? 1.6 : side * 6.8,
          0,
          compact ? -side * 6.3 : 1.65,
        );
      });
      totemGroups.forEach((totem, index) => {
        const side = index < 3 ? -1 : 1;
        const i = index % 3;
        totem.position.set(
          compact ? (i - 1) * 1.25 : side * (4.45 + i * 1.3),
          0,
          compact ? -side * 7.8 : -3.55,
        );
      });
    },
    dispose() {
      disposed = true;
      geometries.forEach((value) => value.dispose());
      materials.forEach((value) => value.dispose());
      textures.forEach((value) => value.dispose());
      root.clear();
    },
  };
}
