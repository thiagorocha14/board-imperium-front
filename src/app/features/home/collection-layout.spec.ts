import { CollectionLayout, placeCollection } from './collection-layout';

describe('placeCollection', () => {
  const names = ['Azul', 'Catan', 'Wingspan', 'Pandemic', 'Splendor', '7 Wonders', 'Carcassonne'];

  it('is stable for the same seed and changes with another seed', () => {
    expect(placeCollection(names, 'wide', 42)).toEqual(placeCollection(names, 'wide', 42));
    expect(placeCollection(names, 'wide', 42).items).not.toEqual(
      placeCollection(names, 'wide', 7).items,
    );
  });

  it('always keeps exactly one game at the center', () => {
    for (const seed of [1, 2, 3, 99, 12345]) {
      for (const count of [1, 2, 8, 30]) {
        const layout = placeCollection(
          Array.from({ length: count }, (_, index) => `jogo ${index}`),
          'wide',
          seed,
        );
        const centered = layout.items.filter((item) => item.x === '0.0000' && item.y === '0.0000');
        expect(centered).toHaveLength(1);
      }
    }
  });

  it('picks a different game for the center depending on the seed', () => {
    const centers = new Set(
      [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((seed) =>
        placeCollection(names, 'wide', seed).items.findIndex(
          (item) => item.x === '0.0000' && item.y === '0.0000',
        ),
      ),
    );
    expect(centers.size).toBeGreaterThan(1);
  });

  it('keeps the circles from hiding each other', () => {
    for (const mode of ['wide', 'narrow'] as const) {
      for (const seed of [1, 77, 2026]) {
        for (const count of [2, 7, 20, 40]) {
          const layout = placeCollection(
            Array.from({ length: count }, (_, index) => `jogo ${index}`),
            mode,
            seed,
          );
          expect(minDistance(layout)).toBeGreaterThanOrEqual(0.9999);
        }
      }
    }
  });

  it('builds a taller cluster on narrow screens', () => {
    const sample = Array.from({ length: 20 }, (_, index) => `jogo ${index}`);
    const narrow = placeCollection(sample, 'narrow', 5);

    expect(Number(narrow.spanY)).toBeGreaterThan(Number(narrow.spanX));
  });
});

function minDistance(layout: CollectionLayout): number {
  const points = layout.items.map((item) => ({ x: Number(item.x), y: Number(item.y) }));
  let min = Infinity;
  for (let i = 0; i < points.length; i += 1) {
    for (let j = i + 1; j < points.length; j += 1) {
      const a = points[i];
      const b = points[j];
      if (!a || !b) continue;
      min = Math.min(min, Math.hypot(a.x - b.x, a.y - b.y));
    }
  }
  return min;
}
