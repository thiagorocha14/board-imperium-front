import { InjectionToken } from '@angular/core';

export type CollectionLayoutMode = 'wide' | 'narrow';

export interface CollectionSpot {
  readonly x: string;
  readonly y: string;
}

export interface CollectionLayout {
  readonly spanX: string;
  readonly spanY: string;
  readonly items: readonly CollectionSpot[];
}

export const COLLECTION_SEED = new InjectionToken<() => number>('COLLECTION_SEED', {
  factory: () => () => Math.floor(Math.random() * 0x100000000),
});

interface Point {
  x: number;
  y: number;
}

const MIN_DISTANCE = 1;
const EDGE = 0.02;
const ANGLES_PER_NEIGHBOR = 12;
const SCORE_NOISE = 0.75;

export function placeCollection(
  names: readonly string[],
  mode: CollectionLayoutMode,
  seed: number,
): CollectionLayout {
  if (names.length === 0) {
    return { spanX: formatUnit(1 + EDGE * 2), spanY: formatUnit(1 + EDGE * 2), items: [] };
  }

  const random = mulberry32(seed);
  const order = shuffle(
    names.map((_, index) => index),
    random,
  );
  const stretch = mode === 'wide' ? { x: 1, y: 1 } : { x: 0.75, y: 1.35 };
  const placed: Point[] = [];
  const points: Point[] = new Array(names.length);

  for (const index of order) {
    const point = placed.length === 0 ? { x: 0, y: 0 } : nextPoint(placed, stretch, random);
    placed.push(point);
    points[index] = point;
  }

  let reachX = 0;
  let reachY = 0;
  for (const point of placed) {
    reachX = Math.max(reachX, Math.abs(point.x));
    reachY = Math.max(reachY, Math.abs(point.y));
  }

  return {
    spanX: formatUnit(reachX * 2 + 1 + EDGE * 2),
    spanY: formatUnit(reachY * 2 + 1 + EDGE * 2),
    items: points.map((point) => ({ x: formatUnit(point.x), y: formatUnit(point.y) })),
  };
}

function nextPoint(placed: readonly Point[], stretch: Point, random: () => number): Point {
  let best: Point | null = null;
  let bestScore = Infinity;

  for (const anchor of placed) {
    const offset = random() * Math.PI * 2;
    for (let step = 0; step < ANGLES_PER_NEIGHBOR; step += 1) {
      const angle = offset + (step / ANGLES_PER_NEIGHBOR) * Math.PI * 2;
      const distance = 1.03 + random() * 0.06;
      const candidate = {
        x: anchor.x + Math.cos(angle) * distance,
        y: anchor.y + Math.sin(angle) * distance,
      };
      if (!fits(candidate, placed)) continue;
      const score =
        Math.hypot(candidate.x / stretch.x, candidate.y / stretch.y) + random() * SCORE_NOISE;
      if (score < bestScore) {
        bestScore = score;
        best = candidate;
      }
    }
  }

  return best ?? { x: 0, y: placed.length * 1.1 };
}

function fits(candidate: Point, placed: readonly Point[]): boolean {
  return placed.every(
    (point) => Math.hypot(point.x - candidate.x, point.y - candidate.y) >= MIN_DISTANCE,
  );
}

function shuffle(values: number[], random: () => number): number[] {
  for (let i = values.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    const current = values[i] as number;
    values[i] = values[j] as number;
    values[j] = current;
  }
  return values;
}

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 0x100000000;
  };
}

function formatUnit(value: number): string {
  const rounded = Math.round(value * 10000) / 10000;
  if (Object.is(rounded, -0)) return '0.0000';
  return rounded.toFixed(4);
}
