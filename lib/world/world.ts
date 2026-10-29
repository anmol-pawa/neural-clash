/**
 * Tile-grid overworld simulation. Pure and deterministic: the renderer owns
 * pixels and input; this owns where everyone is, what blocks, what a button
 * press does, and when a warp fires. One tile step takes `STEP_SECONDS`.
 */

export type Dir = "up" | "down" | "left" | "right";
export const DIRS: readonly Dir[] = ["up", "down", "left", "right"];
export const DELTA: Readonly<Record<Dir, readonly [number, number]>> = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
export const OPPOSITE: Readonly<Record<Dir, Dir>> = { up: "down", down: "up", left: "right", right: "left" };
export const STEP_SECONDS = 0.18;

export interface Warp {
  x: number;
  y: number;
  to: string;
  toX: number;
  toY: number;
  face: Dir;
}

export interface Npc {
  id: string;
  sprite: string;
  portrait?: string;
  name: string;
  x: number;
  y: number;
  face: Dir;
  /** Dialogue script id started on interaction. */
  script: string;
}

export interface Prop {
  x: number;
  y: number;
  /** Dialogue script id started when the player faces it and interacts. */
  script: string;
}

export interface MapDef {
  id: string;
  name: string;
  tileset: string;
  grid: readonly string[];
  legend: Readonly<Record<string, string>>;
  /** Tile names the player cannot enter. */
  solid: ReadonlySet<string>;
  warps: readonly Warp[];
  npcs: readonly Npc[];
  props: readonly Prop[];
  spawn: { x: number; y: number; face: Dir };
}

export interface Walker {
  x: number;
  y: number;
  face: Dir;
  /** In-flight step: progress 0..1 toward (x,y)+delta; null when standing. */
  step: { dir: Dir; t: number } | null;
}

export interface WorldState {
  map: MapDef;
  player: Walker;
  /** NPC facing overrides (they turn toward the player when spoken to). */
  npcFace: Readonly<Record<string, Dir>>;
  /** Total steps taken, for walk-cycle phase and stats. */
  steps: number;
}

export type Interaction = { kind: "npc"; npc: Npc; script: string } | { kind: "prop"; prop: Prop; script: string };

export const mapSize = (m: MapDef) => ({ w: m.grid[0].length, h: m.grid.length });

export function tileName(m: MapDef, x: number, y: number): string | undefined {
  const ch = m.grid[y]?.[x];
  return ch === undefined ? undefined : m.legend[ch];
}

export function npcAt(m: MapDef, x: number, y: number): Npc | undefined {
  return m.npcs.find((n) => n.x === x && n.y === y);
}

/** True when a walker may stand on (x,y): in bounds, not solid, no NPC or prop on it. */
export function canStand(m: MapDef, x: number, y: number): boolean {
  const name = tileName(m, x, y);
  if (name === undefined || m.solid.has(name)) return false;
  if (npcAt(m, x, y)) return false;
  return !m.props.some((p) => p.x === x && p.y === y);
}

export function createWorld(map: MapDef, at: { x: number; y: number; face: Dir } = map.spawn): WorldState {
  return { map, player: { x: at.x, y: at.y, face: at.face, step: null }, npcFace: {}, steps: 0 };
}

export const facingTile = (w: Walker): [number, number] => [w.x + DELTA[w.face][0], w.y + DELTA[w.face][1]];

/**
 * Advance by `dt` seconds while `held` is the direction being pressed (or
 * null). A held key walks immediately; into a wall it only turns the player.
 * Returns the new state, and `warped` when a warp fired on arrival.
 */
export function update(w: WorldState, dt: number, held: Dir | null, maps: Readonly<Record<string, MapDef>>): { world: WorldState; warped: boolean } {
  let p = w.player;
  let steps = w.steps;
  let left = dt;
  while (left > 0) {
    if (p.step) {
      const need = (1 - p.step.t) * STEP_SECONDS;
      if (left < need) {
        p = { ...p, step: { dir: p.step.dir, t: p.step.t + left / STEP_SECONDS } };
        left = 0;
      } else {
        left -= need;
        const [dx, dy] = DELTA[p.step.dir];
        p = { x: p.x + dx, y: p.y + dy, face: p.step.dir, step: null };
        steps++;
        const warp = w.map.warps.find((wp) => wp.x === p.x && wp.y === p.y);
        const dest = warp && maps[warp.to];
        if (warp && dest) {
          return { world: createWorld(dest, { x: warp.toX, y: warp.toY, face: warp.face }), warped: true };
        }
      }
    } else if (held) {
      const [dx, dy] = DELTA[held];
      const blocked = !canStand(w.map, p.x + dx, p.y + dy) && !w.map.warps.some((wp) => wp.x === p.x + dx && wp.y === p.y + dy);
      p = { ...p, face: held, step: blocked ? null : { dir: held, t: 0 } };
      if (blocked) left = 0; // bumped: turn only, wait for the next frame
    } else {
      left = 0;
    }
  }
  return { world: { ...w, player: p, steps }, warped: false };
}

/** What pressing the action button does right now (only while standing still). */
export function interact(w: WorldState): Interaction | null {
  if (w.player.step) return null;
  const [fx, fy] = facingTile(w.player);
  const npc = npcAt(w.map, fx, fy);
  if (npc) return { kind: "npc", npc, script: npc.script };
  const prop = w.map.props.find((p) => p.x === fx && p.y === fy);
  return prop ? { kind: "prop", prop, script: prop.script } : null;
}

/** Make an NPC turn to look at the player (called when a dialogue opens). */
export function faceNpcToPlayer(w: WorldState, npcId: string): WorldState {
  const n = w.map.npcs.find((x) => x.id === npcId);
  if (!n) return w;
  return { ...w, npcFace: { ...w.npcFace, [npcId]: OPPOSITE[w.player.face] } };
}

export const npcFacing = (w: WorldState, n: Npc): Dir => w.npcFace[n.id] ?? n.face;

/** Pixel position of the player in tile units, interpolated mid-step. */
export function playerPos(w: Walker): [number, number] {
  if (!w.step) return [w.x, w.y];
  const [dx, dy] = DELTA[w.step.dir];
  return [w.x + dx * w.step.t, w.y + dy * w.step.t];
}

/** Camera origin in tile units: centred on the player, clamped so no void shows (maps smaller than the view are centred). */
export function camera(m: MapDef, pos: readonly [number, number], viewW: number, viewH: number): [number, number] {
  const { w, h } = mapSize(m);
  const axis = (p: number, view: number, size: number) => (size <= view ? (size - view) / 2 : Math.min(Math.max(p + 0.5 - view / 2, 0), size - view));
  return [axis(pos[0], viewW, w), axis(pos[1], viewH, h)];
}
