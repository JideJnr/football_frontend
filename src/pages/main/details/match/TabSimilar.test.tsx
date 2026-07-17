/**
 * RTL component tests for TabSimilar.
 *
 * Feature: similar-matches
 * Validates: Requirements 7.3–7.9, 10.1, 10.2, 10.9
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TabSimilar from './TabSimilar';
import type { SimilarMatchItem } from './TabSimilar';

// ── Mock footballApi ──────────────────────────────────────────────────────────
vi.mock('../../../../services/apis/footballApi', () => ({
  getSimilarMatches: vi.fn(),
}));

import { getSimilarMatches } from '../../../../services/apis/footballApi';
const mockGetSimilarMatches = getSimilarMatches as ReturnType<typeof vi.fn>;

// ── Fixtures ──────────────────────────────────────────────────────────────────

const MATCH = { sportybet_id: 'test_001', tournament: 'Premier League' };

function makeItem(overrides: Partial<SimilarMatchItem> = {}): SimilarMatchItem {
  return {
    match_id: 'hist_1',
    match_name: 'Arsenal vs Chelsea',
    home_team: 'Arsenal',
    away_team: 'Chelsea',
    league_name: 'Premier League',
    final_score: '2-1',
    match_date: '2026-05-10',
    similarity_score: 0.82,
    odds: { home: 2.1, draw: 3.4, away: 3.8 },
    prediction: {
      pick_type: '1x2',
      selection: 'Home',
      confidence: 74,
      result: 'win',
    },
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('TabSimilar – Loading state (Requirement 7.4)', () => {
  it('shows "Finding similar matches…" while in flight', async () => {
    // Never resolves during this test
    mockGetSimilarMatches.mockReturnValue(new Promise(() => {}));
    render(<TabSimilar m={MATCH} />);
    expect(screen.getByText(/finding similar matches/i)).toBeInTheDocument();
  });
});

describe('TabSimilar – Empty state (Requirement 7.5)', () => {
  it('shows empty message when API returns no matches', async () => {
    mockGetSimilarMatches.mockResolvedValue({ matches: [] });
    render(<TabSimilar m={MATCH} />);
    await waitFor(() =>
      expect(screen.getByText(/no similar historical matches found yet/i)).toBeInTheDocument(),
    );
  });
});

describe('TabSimilar – Error state (Requirement 7.6)', () => {
  it('shows error message and retry button on failure', async () => {
    mockGetSimilarMatches.mockRejectedValue(new Error('network error'));
    render(<TabSimilar m={MATCH} />);
    await waitFor(() =>
      expect(screen.getByText(/failed to load similar matches/i)).toBeInTheDocument(),
    );
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it('retry button re-calls the API', async () => {
    mockGetSimilarMatches
      .mockRejectedValueOnce(new Error('first fail'))
      .mockResolvedValueOnce({ matches: [makeItem()] });

    render(<TabSimilar m={MATCH} />);
    await waitFor(() => screen.getByRole('button', { name: /retry/i }));
    fireEvent.click(screen.getByRole('button', { name: /retry/i }));
    await waitFor(() =>
      expect(screen.getByText('Arsenal vs Chelsea')).toBeInTheDocument(),
    );
    expect(mockGetSimilarMatches).toHaveBeenCalledTimes(2);
  });
});

describe('TabSimilar – Match cards (Requirements 7.7, 7.8, 7.9)', () => {
  beforeEach(() => {
    mockGetSimilarMatches.mockResolvedValue({
      matches: [makeItem()],
    });
  });

  it('renders match name', async () => {
    render(<TabSimilar m={MATCH} />);
    await waitFor(() =>
      expect(screen.getByText('Arsenal vs Chelsea')).toBeInTheDocument(),
    );
  });

  it('renders final score', async () => {
    render(<TabSimilar m={MATCH} />);
    await waitFor(() => expect(screen.getByText('2-1')).toBeInTheDocument());
  });

  it('renders similarity percentage', async () => {
    render(<TabSimilar m={MATCH} />);
    await waitFor(() => expect(screen.getByText('82%')).toBeInTheDocument());
  });

  it('renders odds when present', async () => {
    render(<TabSimilar m={MATCH} />);
    await waitFor(() => expect(screen.getByText('2.10')).toBeInTheDocument());
  });

  it('renders green prediction badge for win', async () => {
    render(<TabSimilar m={MATCH} />);
    await waitFor(() => screen.getByText('Home'));
    const badge = screen.getByText('Home').closest('span');
    expect(badge?.className).toMatch(/emerald/);
  });

  it('renders red prediction badge for loss', async () => {
    mockGetSimilarMatches.mockResolvedValue({
      matches: [makeItem({ prediction: { pick_type: '1x2', selection: 'Away', confidence: 60, result: 'loss' } })],
    });
    render(<TabSimilar m={MATCH} />);
    await waitFor(() => screen.getByText('Away'));
    const badge = screen.getByText('Away').closest('span');
    expect(badge?.className).toMatch(/red/);
  });

  it('renders grey badge for void/null result', async () => {
    mockGetSimilarMatches.mockResolvedValue({
      matches: [makeItem({ prediction: { pick_type: '1x2', selection: 'Draw', confidence: 55, result: null } })],
    });
    render(<TabSimilar m={MATCH} />);
    await waitFor(() => screen.getByText('Draw'));
    const badge = screen.getByText('Draw').closest('span');
    expect(badge?.className).toMatch(/gray/);
  });

  it('renders no prediction badge when prediction is null', async () => {
    mockGetSimilarMatches.mockResolvedValue({
      matches: [makeItem({ prediction: null })],
    });
    render(<TabSimilar m={MATCH} />);
    await waitFor(() => screen.getByText('Arsenal vs Chelsea'));
    // None of the prediction values should appear
    expect(screen.queryByText('Home')).not.toBeInTheDocument();
  });
});

describe('TabSimilar – Sort control (Requirements 10.1, 10.2)', () => {
  const items: SimilarMatchItem[] = [
    makeItem({ match_id: 'a', match_name: 'A vs B', similarity_score: 0.9, match_date: '2026-01-01', prediction: { pick_type: '1x2', selection: 'Home', confidence: 80, result: 'win' } }),
    makeItem({ match_id: 'b', match_name: 'C vs D', similarity_score: 0.5, match_date: '2026-06-01', prediction: { pick_type: '1x2', selection: 'Away', confidence: 60, result: 'loss' } }),
    makeItem({ match_id: 'c', match_name: 'E vs F', similarity_score: 0.7, match_date: '2026-03-15', prediction: null }),
  ];

  beforeEach(() => {
    mockGetSimilarMatches.mockResolvedValue({ matches: items });
  });

  it('renders "Sort by" label associated with select element (Requirement 10.9)', async () => {
    render(<TabSimilar m={MATCH} />);
    await waitFor(() => screen.getByLabelText(/sort by/i));
    const select = screen.getByLabelText(/sort by/i);
    expect(select.tagName).toBe('SELECT');
  });

  it('changes sort without making a new API call', async () => {
    render(<TabSimilar m={MATCH} />);
    await waitFor(() => screen.getByLabelText(/sort by/i));

    const callsBefore = mockGetSimilarMatches.mock.calls.length;
    fireEvent.change(screen.getByLabelText(/sort by/i), { target: { value: 'date' } });
    expect(mockGetSimilarMatches.mock.calls.length).toBe(callsBefore);
  });
});

describe('TabSimilar – Filter chips (Requirements 10.3, 10.4, 10.9)', () => {
  const premierItem = makeItem({ match_id: 'pl_1', match_name: 'Arsenal vs Chelsea', league_name: 'Premier League', prediction: { pick_type: '1x2', selection: 'Home', confidence: 74, result: 'win' } });
  const bundItem   = makeItem({ match_id: 'bl_1', match_name: 'Bayern vs Dortmund', league_name: 'Bundesliga',    prediction: null });

  beforeEach(() => {
    mockGetSimilarMatches.mockResolvedValue({ matches: [premierItem, bundItem] });
  });

  it('filter chips have aria-pressed attribute', async () => {
    render(<TabSimilar m={MATCH} />);
    await waitFor(() => screen.getByText('Same League'));
    const chip = screen.getByText('Same League').closest('button');
    expect(chip).toHaveAttribute('aria-pressed');
  });

  it('toggling "Same League" shows only matching items', async () => {
    render(<TabSimilar m={MATCH} />);
    await waitFor(() => screen.getByText('Same League'));

    // Both visible before filter
    expect(screen.getByText('Arsenal vs Chelsea')).toBeInTheDocument();
    expect(screen.getByText('Bayern vs Dortmund')).toBeInTheDocument();

    // Activate filter
    fireEvent.click(screen.getByText('Same League'));
    await waitFor(() =>
      expect(screen.queryByText('Bayern vs Dortmund')).not.toBeInTheDocument(),
    );
    expect(screen.getByText('Arsenal vs Chelsea')).toBeInTheDocument();
  });

  it('filter chip aria-pressed becomes true when active', async () => {
    render(<TabSimilar m={MATCH} />);
    await waitFor(() => screen.getByText('Same League'));

    const chip = screen.getByText('Same League').closest('button')!;
    expect(chip).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(chip);
    expect(chip).toHaveAttribute('aria-pressed', 'true');
  });

  it('shows empty-filter message when no matches pass active filters', async () => {
    mockGetSimilarMatches.mockResolvedValue({
      matches: [makeItem({ league_name: 'La Liga', prediction: null })],
    });
    render(<TabSimilar m={MATCH} />);
    await waitFor(() => screen.getByText('Same League'));
    fireEvent.click(screen.getByText('Same League'));
    await waitFor(() =>
      expect(screen.getByText(/no matches for current filters/i)).toBeInTheDocument(),
    );
  });

  it('clearing filters restores all items', async () => {
    render(<TabSimilar m={MATCH} />);
    await waitFor(() => screen.getByText('Has Prediction'));

    fireEvent.click(screen.getByText('Has Prediction'));
    await waitFor(() =>
      expect(screen.queryByText('Bayern vs Dortmund')).not.toBeInTheDocument(),
    );

    fireEvent.click(screen.getByText('Clear'));
    await waitFor(() =>
      expect(screen.getByText('Bayern vs Dortmund')).toBeInTheDocument(),
    );
  });
});
