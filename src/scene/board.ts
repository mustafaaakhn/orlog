import {
  BackSide,
  BoxGeometry,
  Color,
  DoubleSide,
  InstancedMesh,
  Matrix4,
  TubeGeometry,
  CatmullRomCurve3,
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
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { createClothGeometry } from "./clothGeometry";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { FAVOR_ART_URL, FAVOR_ART_IDS, favorArtIndex } from "./favorArt";
import { DICE_DEFINITIONS, DEFAULT_FAVORS, FAVOR_CATALOG } from "../core";
import type { DieId, GameState, PlayerId, FavorId } from "../core";
import {
  FACE_NORMALS,
  playerFaceRotation,
  reserveSlot,
  bowlWorldSlot,
} from "./diceGeometry";
import {
  bowlCenter,
  resourceLayout,
  lifeStoneSlot,
  playerAngle,
  seatPosition,
  tokenSlot,
  TABLE_WIDTH, TABLE_NARROW_WIDTH, TABLE_DEPTH,
  CLOTH_WIDTH, CLOTH_NARROW_WIDTH,
} from "./tableLayout";
import {
  createClothTexture,
  createFaceTexture,
  createInscriptionTexture,
  createWoodTexture,
  createBowlTexture,
  createSurfaceTexture,
  createSymbolTexture,
} from "./textures";

export function createBoard(invalidate: () => void = () => {}) {
  const root = new Group();
  root.name = "Orlog table";
  let disposed = false;
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
    roughness: 0.88,
    bumpScale: 0.045,
  });
  wood.bumpMap = wood.map;
  // Keep the procedural surface as a loading/error fallback. The photo-style
  // generated scan is shared by table, tablets and dock, with one GPU texture.
  const walnut = keepTexture(new TextureLoader().load('/assets/art/weathered-walnut.webp', loaded => {
    if (disposed) return;
    wood.map = wood.bumpMap = loaded;
    dockWood.map = dockWood.bumpMap = loaded;
    wood.needsUpdate = dockWood.needsUpdate = true;
    invalidate();
  }, undefined, () => { /* The existing procedural wood stays usable. */ }));
  walnut.colorSpace = SRGBColorSpace;
  walnut.anisotropy = 4;
  const bowlWood = material({
    map: keepTexture(createBowlTexture()),
    roughness: 0.76,
    bumpScale: 0.035,
  });
  bowlWood.bumpMap = bowlWood.map;
  const darkWood = material({ color: "#3d3026", roughness: 0.9 });
  // Exposed lighter wood inside the cut stays legible on the unlit outer wall.
  const carvedWood = material({ color: '#c8a16d', roughness: 0.82, emissive: '#805026', emissiveIntensity: 0.18 });
  const brass = material({
    color: "#b99856",
    map: keepTexture(createSurfaceTexture("metal")),
    metalness: 0.64,
    roughness: 0.52,
  });
  const cloth = material({
    map: keepTexture(createClothTexture()),
    roughness: 0.96,
    side: DoubleSide,
    bumpScale: 0.018,
  });
  cloth.bumpMap = cloth.map;
  const bone = material({
    map: keepTexture(createSurfaceTexture("bone")),
    roughness: 0.6,
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

  const table = mesh(
    root,
    geometry(new RoundedBoxGeometry(TABLE_WIDTH, 0.48, TABLE_DEPTH, 2, 0.12)),
    wood,
    [0, -0.235, 0],
  );
  table.castShadow = false;
  const fabric = mesh(root, geometry(createClothGeometry()), cloth, [0, 0, 0]);
  fabric.name = 'Lichen woven runner with worn border';
  // A finite dock, below the table. Distant scenery is an HTML background;
  // it cannot enter the physics recorder or intercept dice selection.
  const dock = new Group();
  dock.name = 'Fjord dock boards';
  root.add(dock);
  const dockWood = material({ color: '#798078', map: wood.map, roughness: 0.98 });
  dockWood.bumpMap = wood.map;
  dockWood.bumpScale = 0.025;
  const dockParts: BoxGeometry[] = [];
  for (let i = 0; i < 19; i++) {
    const plank = new BoxGeometry(39, 0.22, 1.45);
    const uv = plank.getAttribute('uv');
    for (let vertex = 0; vertex < uv.count; vertex++)
      uv.setY(vertex, (uv.getY(vertex) * 0.88 + (i % 6) + 0.06) / 6);
    plank.translate(0, -1.3, (i - 9) * 1.5);
    dockParts.push(plank);
  }
  mesh(dock, geometry(mergeGeometries(dockParts)!), dockWood, [0, 0, 0]).castShadow = false;
  dockParts.forEach(part => part.dispose());
  const bowlProfile = [
    [0.01, 0.08],
    [2.2, 0.08],
    [2.65, 0.19],
    [2.99, 0.43],
    [3.23, 0.8],
    [3.25, 0.99],
    [3.15, 1.07],
    [2.96, 1.04],
    [2.86, 0.78],
    [2.63, 0.5],
    [2.35, 0.31],
    [0.01, 0.31],
  ].map(([x, y]) => new Vector2(x, y));
  const bowlShape = geometry(new LatheGeometry(bowlProfile, 96));
  const bowlFloor = geometry(new CylinderGeometry(2.35, 2.35, 0.03, 96));
  const rim = geometry(new TorusGeometry(3.09, 0.045, 8, 96));
  const innerRing = geometry(new TorusGeometry(2.16, 0.012, 6, 96));
  // An original continuous wave-and-eye carving follows the outer wood wall.
  const carvingParts: BufferGeometry[] = [];
  for (const strand of [-1, 1]) for (let i = 0; i < 24; i++) {
    const points = Array.from({ length: 13 }, (_, j) => {
      const t = j / 12, angle = (i + t) * Math.PI * 2 / 24;
      // The cut follows the exposed outer shoulder; the lip must not hide it
      // when viewed from the near seat. This is outside the inner collider.
      const radius = 3.09 + Math.sin(t * Math.PI * 2) * 0.09 * strand;
      const top = radius > 3.15 ? 1.07 - (radius - 3.15) * 0.8 : 1.04 + (radius - 2.96) * 0.03 / 0.19;
      const y = top - 0.012;
      return new Vector3(Math.sin(angle) * radius, y, Math.cos(angle) * radius);
    });
    carvingParts.push(new TubeGeometry(new CatmullRomCurve3(points), 8, 0.025, 3, false));
  }
  const carvingShape = geometry(mergeGeometries(carvingParts)!);
  carvingParts.forEach(part => part.dispose());
  for (const player of ["player-1", "player-2"] as const) {
    const bowl = new Group();
    bowl.name = `${player}: personal dice bowl`;
    bowl.position.set(...bowlCenter(player));
    root.add(bowl);
    mesh(bowl, bowlShape, bowlWood, [0, 0, 0]);
    mesh(bowl, carvingShape, carvedWood, [0, 0, 0]);
    mesh(bowl, bowlFloor, bowlWood, [0, 0.31, 0]);
    mesh(bowl, rim, brass, [0, 1.035, 0]).rotation.x = -Math.PI / 2;
    mesh(bowl, innerRing, darkWood, [0, 0.33, 0]).rotation.x = -Math.PI / 2;
  }

  const dieShape = geometry(new RoundedBoxGeometry(0.88, 0.88, 0.88, 3, 0.075));
  const dieContourShape = geometry(new RoundedBoxGeometry(0.99, 0.99, 0.99, 3, 0.085));
  const contourSurface = material({ color: '#f4d899', emissive: '#dbab48', emissiveIntensity: 0.8, side: BackSide });
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
        const contour = mesh(die, dieContourShape, contourSurface, [0, 0, 0]);
        contour.name = 'die-contour';
        contour.castShadow = contour.receiveShadow = false;
        contour.visible = false;
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
        // The shared presenter marker remains an invisible anchor; no wire cage.
        const marker = new Group();
        marker.name = 'selection-marker';
        die.add(marker);
        const activity = mesh(die, geometry(new TorusGeometry(0.53, 0.035, 4, 24)), material({ color: '#ffe4a0', emissive: '#d8b76e', emissiveIntensity: 1 }), [0, -0.39, 0]);
        activity.rotation.x = -Math.PI / 2;
        activity.name = 'activity-marker';
        activity.visible = false;
        die.visible = false;
        root.add(die);
      },
    );
  }

  const pebble = geometry(new SphereGeometry(0.22, 16, 10));
  const inscriptionShape = geometry(new PlaneGeometry(0.8, 0.8));
  // Six carved relief steles share the atlas image and cached favor materials.
  // Their transforms remain owned by combatPresenter during favor activation.
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
    emissive: "#e4c7a1",
    emissiveMap: atlas,
    emissiveIntensity: 0.14,
    metalness: 0,
  });
  const portraitShapes = new Map<FavorId, PlaneGeometry>();
  for (const id of FAVOR_ART_IDS) {
    const index = favorArtIndex(id);
    const shape = geometry(new PlaneGeometry(1.06, 1.4));
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
  const totemBody = geometry(new RoundedBoxGeometry(1.18, 0.24, 1.95, 2, 0.06));
  const nameShape = geometry(new PlaneGeometry(1.04, 0.24));
  const nameSurfaces = new Map<FavorId, MeshStandardMaterial>();
  const stoneGroups: Group[] = [];
  const totemGroups: Group[] = [];
  let loadouts: Record<PlayerId, readonly FavorId[]> = {
    "player-1": DEFAULT_FAVORS,
    "player-2": DEFAULT_FAVORS,
  };
  const valueSurfaces = new Map<number, MeshStandardMaterial>();
  const tokenGroups: Group[] = [];
  const plateParts: BufferGeometry[] = [new RoundedBoxGeometry(0.47, 0.12, 0.47, 1, 0.045)];
  // Raised four-loop maker's mark, built from metal, never a text decal.
  for (const x of [-0.085, 0.085]) for (const z of [-0.085, 0.085]) {
    const loop = new TorusGeometry(0.056, 0.014, 3, 6);
    loop.rotateX(-Math.PI / 2);
    loop.translate(x, 0.071, z);
    plateParts.push(loop);
  }
  for (const z of [-0.085, 0.085]) {
    const bar = new BoxGeometry(0.17, 0.025, 0.025); bar.translate(0, 0.071, z); plateParts.push(bar);
  }
  for (const x of [-0.085, 0.085]) {
    const bar = new BoxGeometry(0.025, 0.025, 0.17); bar.translate(x, 0.071, 0); plateParts.push(bar);
  }
  const flatParts = plateParts.map(part => part.index ? part.toNonIndexed() : part);
  const tokenShape = geometry(mergeGeometries(flatParts)!);
  const gold = material({ color: '#edbd55', metalness: 0.28, roughness: 0.42, map: brass.map, emissive: '#8a5815', emissiveIntensity: 0.14 });
  flatParts.forEach(part => part.dispose());
  plateParts.forEach(part => part.dispose());
  const tokenMeshes: InstancedMesh[] = [];
  const tokenMatrix = new Matrix4();
  const effect = mesh(
    root,
    geometry(new SphereGeometry(0.18, 12, 8)),
    material({ color: "#ffda7b", emissive: "#e9b746", emissiveIntensity: 1.3 }),
    [0, 0, 0],
  );
  effect.visible = false;
  const flyingBrass = gold.clone();
  flyingBrass.emissive.set('#d8b76e');
  flyingBrass.emissiveIntensity = 0.55;
  materials.add(flyingBrass);
  const tokenEffect = mesh(root, tokenShape, flyingBrass, [0, 0, 0]);
  tokenEffect.visible = false;

  for (const [index, player] of (["player-1", "player-2"] as const).entries()) {
    const stones = new Group();
    stones.name = `${player}: five columns, three rows of life stones`;
    stones.position.set(...seatPosition(player, resourceLayout(false).lifeX, 0, resourceLayout(false).lifeZ));
    stones.rotation.y = playerAngle(player);
    for (let i = 0; i < 15; i++) {
      const surface = (index === 0 ? blueStone : redStone).clone();
      materials.add(surface);
      const stone = mesh(
        stones,
        pebble,
        surface,
        lifeStoneSlot(i),
      );
      stone.scale.set(1, 0.65 + (i % 3) * 0.08, 0.83);
      stone.rotation.y = i * 0.7;
    }
    root.add(stones);
    stoneGroups.push(stones);
    const tokens = new Group();
    tokens.position.set(...seatPosition(player, resourceLayout(false).tokenX, 0, resourceLayout(false).tokenZ));
    tokens.rotation.y = playerAngle(player);
    root.add(tokens);
    tokenGroups.push(tokens);
    const plates = new InstancedMesh(tokenShape, gold, 16);
    plates.count = 0;
    plates.castShadow = plates.receiveShadow = true;
    tokens.add(plates);
    tokenMeshes.push(plates);
    for (let i = 0; i < 3; i++) {
      const totem = new Group();
      totem.name = FAVOR_CATALOG[DEFAULT_FAVORS[i]!].name;
      totem.position.set(...seatPosition(player, resourceLayout(false).godX + i * resourceLayout(false).godGap, 0, resourceLayout(false).godZ));
      totem.rotation.y = playerAngle(player);
      totem.userData.playerId = player;
      const contour = mesh(totem, geometry(new RoundedBoxGeometry(1.32, 0.12, 2.09, 2, 0.08)), material({ color: '#f4d899', emissive: '#dbab48', emissiveIntensity: 0.8 }), [0, 0.13, 0]);
      contour.name = 'favor-contour';
      contour.visible = false;
      mesh(totem, totemBody, wood, [0, 0.12, 0]);
      const portrait = mesh(
        totem,
        portraitShapes.get(DEFAULT_FAVORS[i]!)!,
        portraitSurface,
        [0, 0.246, -0.12],
      );
      portrait.rotation.x = -Math.PI / 2;
      portrait.name = "favor-portrait";
      portrait.castShadow = false;
      const name = mesh(
        totem,
        nameShape,
        material({ transparent: true }),
        [0, 0.25, 0.75],
      );
      name.rotation.x = -Math.PI / 2;
      name.name = "favor-name";
      name.castShadow = false;
      mesh(
        totem,
        geometry(new BoxGeometry(1.12, 0.025, 0.035)),
        brass,
        [0, 0.25, 0.94],
      );
      root.add(totem);
      totemGroups.push(totem);
    }
  }

  const attackEffects = Object.fromEntries((['arrow', 'axe'] as const).map(symbol => {
    const object = mesh(root, geometry(new PlaneGeometry(1.15, 1.15)), material({ map: keepTexture(createSymbolTexture(symbol)), transparent: true, emissive: '#d8b76e', emissiveIntensity: 0.5, depthWrite: false }), [0, 0, 0]);
    object.rotation.x = -Math.PI / 2;
    object.visible = false;
    return [symbol, object];
  })) as Record<'arrow' | 'axe', Mesh<PlaneGeometry, MeshStandardMaterial>>;

  // The actual plates travel together; no hand or replacement symbol is drawn.
  const stealObject = new Group();
  stealObject.name = 'glowing stolen gold';
  root.add(stealObject);
  stealObject.visible = false;
  let cargo = new InstancedMesh(tokenShape, flyingBrass, 16);
  cargo.castShadow = true;
  stealObject.add(cargo);
  let stolen: { owner: PlayerId; indices: number[] } | null = null;
  const white = new Color('#ffffff'), selectedGold = new Color(2.6, 2.1, 1.4);
  function tokenScale(playerId: PlayerId, total?: number) {
    if (total === undefined) return tokenGroups[playerId === 'player-1' ? 0 : 1]!.scale.x;
    return Math.min(1, 2 / Math.max(2, Math.ceil(total / 25) * 0.57));
  }
  function tokenPosition(playerId: PlayerId, index: number, total?: number) {
    const group = tokenGroups[playerId === 'player-1' ? 0 : 1]!;
    group.updateMatrixWorld(true);
    return group.localToWorld(new Vector3(...tokenSlot(index)).multiplyScalar(tokenScale(playerId, total) / group.scale.x));
  }
  function clearSteal() {
    stealObject.visible = false;
    if (stolen) {
      const plates = tokenMeshes[stolen.owner === 'player-1' ? 0 : 1]!;
      for (const index of stolen.indices) {
        // Shrinking count keeps the backing color buffer. Reset even hidden
        // source slots so later income cannot resurrect a stale theft glow.
        plates.setColorAt(index, white);
        if (index < plates.count) {
          tokenMatrix.makeTranslation(...tokenSlot(index));
          plates.setMatrixAt(index, tokenMatrix);
        }
      }
      plates.instanceMatrix.needsUpdate = true;
      if (plates.instanceColor) plates.instanceColor.needsUpdate = true;
      plates.computeBoundingSphere();
    }
    stolen = null;
    cargo.visible = false;
    invalidate();
  }
  const steal = {
    object: stealObject,
    prepare(owner: PlayerId, start: number, count: number) {
      clearSteal();
      stolen = { owner, indices: Array.from({ length: count }, (_, i) => start + i) };
      const plates = tokenMeshes[owner === 'player-1' ? 0 : 1]!;
      // Initialize all colors before assigning selected plates, avoiding black instances.
      if (!plates.instanceColor) for (let i = 0; i < plates.count; i++) plates.setColorAt(i, white);
      for (const index of stolen.indices) plates.setColorAt(index, selectedGold);
      if (plates.instanceColor) plates.instanceColor.needsUpdate = true;
      if (cargo.instanceMatrix.count < count) {
        stealObject.remove(cargo); cargo.dispose();
        cargo = new InstancedMesh(tokenShape, flyingBrass, count);
        cargo.castShadow = true;
        stealObject.add(cargo);
      }
      cargo.count = count;
      cargo.visible = false;
      return stolen.indices.map(index => tokenPosition(owner, index));
    },
    cargo(points: Vector3[], scale = 1) {
      for (const [i, point] of points.entries()) {
        tokenMatrix.makeScale(scale, scale, scale);
        tokenMatrix.setPosition(point);
        cargo.setMatrixAt(i, tokenMatrix);
      }
      cargo.instanceMatrix.needsUpdate = true;
      cargo.computeBoundingSphere();
    },
    lift() {
      if (!stolen) return;
      const plates = tokenMeshes[stolen.owner === 'player-1' ? 0 : 1]!;
      for (const index of stolen.indices) {
        tokenMatrix.makeScale(0, 0, 0);
        plates.setMatrixAt(index, tokenMatrix);
      }
      plates.instanceMatrix.needsUpdate = true;
      cargo.visible = true;
      invalidate();
    },
    clear: clearSteal,
  };

  // Income uses the same real plate geometry/material, with one instance per
  // event source. Its transforms belong only to the combat timeline, never physics.
  let income = new InstancedMesh(tokenShape, flyingBrass, 16);
  income.name = 'earned gold group';
  income.castShadow = true;
  income.visible = false;
  root.add(income);
  function moveIncome(points: Vector3[], scale = 1) {
    for (const [i, point] of points.entries()) {
      tokenMatrix.makeScale(scale, scale, scale);
      tokenMatrix.setPosition(point);
      income.setMatrixAt(i, tokenMatrix);
    }
    income.instanceMatrix.needsUpdate = true;
    income.computeBoundingSphere();
  }
  const gain = {
    prepare(points: Vector3[], scale = 1) {
      if (income.instanceMatrix.count < points.length) {
        root.remove(income); income.dispose();
        income = new InstancedMesh(tokenShape, flyingBrass, points.length);
        income.name = 'earned gold group';
        income.castShadow = true;
        root.add(income);
      }
      income.count = points.length;
      income.visible = false;
      moveIncome(points, scale);
    },
    move(points: Vector3[], scale = 1) {
      moveIncome(points, scale);
      income.visible = points.length > 0;
    },
    clear() { income.visible = false; invalidate(); },
  };

  return {
    object: root,
    dice,
    effect,
    tokenEffect,
    steal,
    gain,
    attackEffects,
    lifeStone(playerId: PlayerId, index: number) {
      return stoneGroups[playerId === 'player-1' ? 0 : 1]!.children[Math.max(0, Math.min(index, 14))] as Mesh<SphereGeometry, MeshStandardMaterial>;
    },
    lifePosition(playerId: PlayerId, index: number) {
      const group = stoneGroups[playerId === 'player-1' ? 0 : 1]!;
      group.updateMatrixWorld(true);
      return group.children[Math.max(0, Math.min(index, 14))]!.getWorldPosition(new Vector3());
    },
    tokenPosition,
    tokenScale,
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
        // One instance per real plate, no former forty-token truncation.
        if (group.userData.count !== player.tokens) {
          let plates = tokenMeshes[index]!;
          if (plates.instanceMatrix.count < player.tokens) {
            group.remove(plates);
            plates.dispose();
            plates = new InstancedMesh(tokenShape, gold, Math.max(16, player.tokens * 2));
            plates.castShadow = plates.receiveShadow = true;
            tokenMeshes[index] = plates;
            group.add(plates);
          }
          plates.count = player.tokens;
          for (let i = 0; i < player.tokens; i++) {
            tokenMatrix.makeTranslation(...tokenSlot(i));
            plates.setMatrixAt(i, tokenMatrix);
            if (plates.instanceColor) plates.setColorAt(i, white);
          }
          plates.instanceMatrix.needsUpdate = true;
          if (plates.instanceColor) plates.instanceColor.needsUpdate = true;
          plates.computeBoundingSphere();
          group.userData.count = player.tokens;
          // Very large reserves still fit their assigned area; no rule limit.
          group.scale.setScalar(tokenScale(player.id, player.tokens));
        }
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
          if (value.faceId)
            die.quaternion.copy(playerFaceRotation(value.faceId, player.id));
          const inBowl = !value.kept && !value.selected;
          die.position.set(
            ...(inBowl
              ? bowlWorldSlot(player.id, index)
              : reserveSlot(player.id, index, value.selected)),
          );
          die.getObjectByName("selection-marker")!.visible =
            value.selected || value.kept;
          die.userData.kept = value.kept;
        });
      }
    },
    setNarrow(narrow: boolean) {
      // Keep both players facing each other at every width. Only the table's
      // peripheral resources move inward; physics and battle lines stay fixed.
      table.scale.x = narrow ? TABLE_NARROW_WIDTH / TABLE_WIDTH : 1;
      fabric.scale.x = narrow ? CLOTH_NARROW_WIDTH / CLOTH_WIDTH : 1;
      dock.scale.x = narrow ? 0.6 : 1;
      const layout = resourceLayout(narrow);
      for (const [index, player] of (
        ["player-1", "player-2"] as const
      ).entries()) {
        stoneGroups[index]!.position.set(
          ...seatPosition(player, layout.lifeX, 0, layout.lifeZ),
        );
        tokenGroups[index]!.position.set(...seatPosition(player, layout.tokenX, 0, layout.tokenZ));
        for (let i = 0; i < 3; i++) {
          const totem = totemGroups[index * 3 + i]!;
          const [x, , z] = seatPosition(
            player,
            layout.godX + i * layout.godGap,
            0,
            layout.godZ,
          );
          totem.position.x = x;
          totem.position.z = z;
        }
      }
    },
    highlightDie(id: DieId | null) {
      for (const [dieId, die] of dice) die.getObjectByName('die-contour')!.visible = dieId === id && die.visible;
      invalidate();
    },
    favorTargets() { return totemGroups.filter(totem => totem.visible); },
    highlightFavor(player: PlayerId | null, id: FavorId | null) {
      for (const totem of totemGroups) {
        totem.getObjectByName('favor-contour')!.visible = totem.userData.playerId === player && totem.userData.favorId === id;
      }
      invalidate();
    },
    dispose() {
      disposed = true;
      clearSteal();
      cargo.dispose();
      income.dispose();
      tokenMeshes.forEach(value => value.dispose());
      geometries.forEach((value) => value.dispose());
      materials.forEach((value) => value.dispose());
      textures.forEach((value) => value.dispose());
      root.clear();
    },
  };
}
