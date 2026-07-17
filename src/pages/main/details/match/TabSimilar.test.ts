/**
 * Property-based tests for TabSimilar pure helpers: applySort and applyFilters.
 *
 * Feature: similar-matches
 * Properties 7, 8, 9 — client-side sort correctness, filter completeness, filter round-trip.
 *
 * We use randomised example generation (vitest) instead of a PBT library
 * to keep the dependency footprint minimal.
 */

import { describe, it, expect } from 'vitest';
import { applySort, applyFilters } from './TabSimilar';
import type { SimilarMatchItem, SortKey, FilterKey } from './TabSimilar';

// ── Arbitrary generators ───────────────────────────────────────────────────────

function randFloat(min = 0, max = 1): number {
  return min + Math.random() * (max - min);
}

function randInt(min = 0, max = 100): number {
  return Math.floor(min + Math.random() * (max - min + 1));
}

function randChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function arbitrarySimilarMatchItem(
  overrides: Partial<SimilarMatchItem> = {},
): SimilarMatchItem {
  const hasPrediction = Math.random() > 0.4;
  const resultOpts = ['win', 'loss', 'void', null] as const;
  return {
    match_id: `m_${randInt(1, 99999)}`,
    match_name: `Team A${randInt()} vs Team B${randInt()}`,
    home_team: `Team A${randInt()}`,
    away_team: `Team B${randInt()}`,
    league_name: randChoice(['Premier League', 'La Liga', 'Bundesliga', 'Serie A', '']),
    final_score: `${randInt(0, 5)}-${randInt(0, 5)}`,
    match_date: Math.random() > 0.2
      ? `2026-${String(randInt(1, 12)).padStart(2, '0')}-${String(randInt(1, 28)).padStart(2, '0')}`
      : null,
    similarity_score: randFloat(0, 1),
    odds: Math.random() > 0.4
      ? { home: randFloat(1.1, 5.0), draw: randFloat(1.1, 5.0), away: randFloat(1.1, 5.0) }
      : null,
    prediction: hasPrediction
      ? {
          pick_type: '1x2',
          selection: randChoice(['Home', 'Draw', 'Away']),
          confidence: randInt(50, 99),
          result: randChoice(resultOpts),
        }
      : null,
    ...overrides,
  };
}

function arbitraryArray(n = 20): SimilarMatchItem[] {
  return Array.from({ length: n }, () => arbitrarySimilarMatchItem());
}

// ── Property 7: Client-Side Sort Correctness ──────────────────────────────────
// Feature: similar-matches, Property 7: client_sort_correctness
// Validates: Requirements 10.2

describe('applySort – Property 7: Client-Side Sort Correctness', () => {
  const RUNS = 50;

  it('sorts by similarity descending', () => {
    for (let i = 0; i < RUNS; i++) {
      const items = arbitraryArray(randInt(1, 30));
      const sorted = applySort(items, 'similarity');
      for (let j = 0; j < sorted.length - 1; j++) {
        expect(sorted[j].similarity_score).toBeGreaterThanOrEqual(sorted[j + 1].similarity_score);
      }
    }
  });

  it('sorts by date descending (null last)', () => {
    for (let i = 0; i < RUNS; i++) {
      const items = arbitraryArray(randInt(1, 30));
      const sorted = applySort(items, 'date');
      for (let j = 0; j < sorted.length - 1; j++) {
        const a = sorted[j].match_date;
        const b = sorted[j + 1].match_date;
        if (a === null) {
          // null should only appear at the end
          expect(b).toBeNull();
        } else if (b !== null) {
          expect(a.localeCompare(b)).toBeGreaterThanOrEqual(0);
        }
      }
    }
  });

  it('sorts by confidence descending (null prediction last)', () => {
    for (let i = 0; i < RUNS; i++) {
      const items = arbitraryArray(randInt(1, 30));
      const sorted = applySort(items, 'confidence');
      for (let j = 0; j < sorted.length - 1; j++) {
        const ac = sorted[j].prediction?.confidence ?? -1;
        const bc = sorted[j + 1].prediction?.confidence ?? -1;
        expect(ac).toBeGreaterThanOrEqual(bc);
      }
    }
  });

  it('does not mutate the input array', () => {
    const items = arbitraryArray(10);
    const original = items.map(x => x.match_id);
    applySort(items, 'similarity');
    expect(items.map(x => x.match_id)).toEqual(original);
  });

  it('handles empty array without throwing', () => {
    expect(() => applySort([], 'similarity')).not.toThrow();
    expect(applySort([], 'date')).toHaveLength(0);
  });
});

// ── Property 8: Client-Side Filter Completeness ───────────────────────────────
// Feature: similar-matches, Property 8: client_filter_completeness
// Validates: Requirements 10.4, 10.6

describe('applyFilters – Property 8: Client-Side Filter Completeness', () => {
  const RUNS = 50;
  const currentMatch = { tournament: 'Premier League' };

  it('every returned item satisfies ALL active filters (AND logic)', () => {
    const filterCombinations: FilterKey[][] = [
      ['has_prediction'],
      ['win'],
      ['loss'],
      ['no_prediction'],
      ['same_league'],
      ['has_prediction', 'win'],
      ['same_league', 'has_prediction'],
    ];

    for (let i = 0; i < RUNS; i++) {
      const items = arbitraryArray(randInt(5, 40));
      const activeFilters = randChoice(filterCombinations);
      const filterSet = new Set<FilterKey>(activeFilters);
      const result = applyFilters(items, filterSet, currentMatch);

      for (const item of result) {
        if (filterSet.has('same_league')) {
          expect(item.league_name.toLowerCase()).toBe('premier league');
        }
        if (filterSet.has('has_prediction')) {
          expect(item.prediction).not.toBeNull();
        }
        if (filterSet.has('win')) {
          expect(item.prediction?.result).toBe('win');
        }
        if (filterSet.has('loss')) {
          expect(item.prediction?.result).toBe('loss');
        }
        if (filterSet.has('no_prediction')) {
          expect(item.prediction == null).toBe(true);
        }
      }
    }
  });

  it('empty filter set returns all items unchanged', () => {
    for (let i = 0; i < RUNS; i++) {
      const items = arbitraryArray(randInt(0, 30));
      const result = applyFilters(items, new Set(), currentMatch);
      expect(result).toHaveLength(items.length);
      expect(result).toEqual(items);
    }
  });
});

// ── Property 9: Filter Round-Trip (Idempotence) ────────────────────────────────
// Feature: similar-matches, Property 9: filter_round_trip_idempotence
// Validates: Requirements 10.5

describe('applyFilters – Property 9: Filter Round-Trip (Idempotence)', () => {
  const RUNS = 50;
  const currentMatch = { tournament: 'Premier League' };

  it('applying filters then clearing returns all original items', () => {
    const filterSets: FilterKey[][] = [
      ['has_prediction'],
      ['win'],
      ['same_league'],
      ['same_league', 'has_prediction'],
    ];

    for (let i = 0; i < RUNS; i++) {
      const items = arbitraryArray(randInt(5, 40));
      const active = new Set<FilterKey>(randChoice(filterSets));

      // Apply filter
      applyFilters(items, active, currentMatch);

      // Clear filters — should return all original items
      const cleared = applyFilters(items, new Set(), currentMatch);
      expect(cleared).toHaveLength(items.length);
      // Every original item should appear in the cleared result
      for (const item of items) {
        expect(cleared.some(r => r.match_id === item.match_id)).toBe(true);
      }
    }
  });
});
