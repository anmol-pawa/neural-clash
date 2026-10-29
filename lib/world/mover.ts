/**
 * Grid movement for the player: one tile per step, a smooth slide between
 * tiles, turning to face a blocked direction (a "bump"), and warps. The
 * caller feeds elapsed time and the held direction; the mover reports what
 * happened so the game can play sounds, fire triggers and swap areas.
 */
import { DELTA, isWalkable, warpAt, type AreaDef, type Dir } from "./area";

/** Milliseconds to slide one tile (about 5.3 tiles/s). */
export const STEP_MS = 190;

export type MoveEvent = { kind: "arrived"; x: number; y: number } | { kind: "bump"; x: number; y: number } | { kind: "warp"; to: string; tx: number; ty: number; facing: Dir };

export class Mover {
  x: number;
  y: number;
  facing: Dir;
  /** Tile being slid to, with progress 0..1; null when standing. */
  step: { fromX: number; fromY: number; t: number } | null = null;
  /** Total distance walked, in tiles; drives the walk-cycle frame. */
  distance = 0;

  constructor(x: number, y: number, facing: Dir) {
    this.x = x;
    this.y = y;
    this.facing = facing;
  }

  get moving(): boolean {
    return this.step !== null;
  }

  /** Teleports (used after a warp). */
  place(x: number, y: number, facing: Dir): void {
    this.x = x;
    this.y = y;
    this.facing = facing;
    this.step = null;
  }

  /** Render position in tiles, interpolated mid-step. */
  position(): { x: number; y: number } {
    if (!this.step) return { x: this.x, y: this.y };
    const e = this.step.t;
    return { x: this.step.fromX + (this.x - this.step.fromX) * e, y: this.step.fromY + (this.y - this.step.fromY) * e };
  }

  /** Advance by `dtMs` with `held` direction (or null). `locked` freezes input (dialogue). */
  update(dtMs: number, held: Dir | null, area: AreaDef, locked = false): MoveEvent[] {
    const events: MoveEvent[] = [];
    let budget = dtMs;
    // Finish the slide in progress, then chain into a new step if still held.
    for (let guard = 0; guard < 8; guard++) {
      if (this.step) {
        const need = (1 - this.step.t) * STEP_MS;
        if (budget < need) {
          this.step.t += budget / STEP_MS;
          return events;
        }
        budget -= need;
        this.step = null;
        events.push({ kind: "arrived", x: this.x, y: this.y });
        const w = warpAt(area, this.x, this.y);
        if (w) {
          events.push({ kind: "warp", to: w.to, tx: w.tx, ty: w.ty, facing: w.facing });
          return events;
        }
      }
      if (locked || !held) return events;
      this.facing = held;
      const [dx, dy] = DELTA[held];
      const nx = this.x + dx;
      const ny = this.y + dy;
      if (!isWalkable(area, nx, ny)) {
        events.push({ kind: "bump", x: nx, y: ny });
        return events;
      }
      this.step = { fromX: this.x, fromY: this.y, t: 0 };
      this.x = nx;
      this.y = ny;
      this.distance += 1;
    }
    return events;
  }
}
