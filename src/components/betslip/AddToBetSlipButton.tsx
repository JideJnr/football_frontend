import { useState, useEffect } from 'react';
import { Check, Plus, AlertCircle } from 'lucide-react';
import { useBetSlipStore, BetSlipSelection } from '../../stores/betSlipStore/useBetSlipStore';

interface AddToBetSlipButtonProps {
  /** The match prediction data to add */
  prediction: {
    match_id: string;
    match_name: string;
    league_name: string;
    country_name: string;
    best_pick?: {
      type?: string;
      pick_type?: string;
      selection?: string;
      odds?: number;
      confidence?: number;
      reason?: string;
    };
  };
  /** Optional custom label for the button */
  label?: string;
  /** Optional className for positioning */
  className?: string;
}

const AddToBetSlipButton = ({
  prediction,
  label = 'Add to Bet Slip',
  className = '',
}: AddToBetSlipButtonProps) => {
  const [justAdded, setJustAdded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { addSelection, hasSelection, lastError, lastSuccess } = useBetSlipStore();

  const pick = prediction.best_pick || { selection: '' };
  const matchId = prediction.match_id;
  const isAlreadyAdded = hasSelection(matchId);

  // Reset "just added" state after animation
  useEffect(() => {
    if (justAdded) {
      const timer = setTimeout(() => setJustAdded(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [justAdded]);

  // Clear local error when store error changes
  useEffect(() => {
    if (lastError && !justAdded) {
      setError(lastError);
      const timer = setTimeout(() => setError(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [lastError, justAdded]);

  const handleAdd = () => {
    if (isAlreadyAdded || justAdded) return;

    const selection: Omit<BetSlipSelection, 'id' | 'added_at'> = {
      match_id: prediction.match_id,
      match: prediction.match_name,
      league: prediction.league_name || 'Unknown league',
      country: prediction.country_name || 'Unknown',
      selection: pick.selection || 'No selection',
      pick_type: pick.type || pick.pick_type || 'match_result',
      odds: Number(pick.odds || 1.5),
      confidence: Number(pick.confidence || 0),
    } as Omit<BetSlipSelection, 'id' | 'added_at'>;

    const result = addSelection(selection);

    if (result.success) {
      setJustAdded(true);
      setError(null);
    } else {
      setError(result.error || 'Failed to add selection');
    }
  };

  if (!pick.selection) {
    return null; // No pick to add
  }

  return (
    <div className={`${className}`}>
      <button
        type="button"
        onClick={handleAdd}
        disabled={isAlreadyAdded || justAdded}
        className={`
          flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-all
          ${justAdded || isAlreadyAdded
            ? 'border border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
            : 'border border-white/[0.12] bg-white/[0.04] text-slate-300 hover:border-cyan-500/40 hover:bg-cyan-500/10 hover:text-cyan-200 active:scale-[0.97]'
          }
          disabled:opacity-70 disabled:cursor-not-allowed
        `}
        title={isAlreadyAdded ? 'Already in bet slip' : `Add ${pick.selection} to bet slip`}
      >
        {justAdded ? (
          <>
            <Check size={14} className="animate-pulse" />
            Added!
          </>
        ) : isAlreadyAdded ? (
          <>
            <Check size={14} />
            In Slip
          </>
        ) : (
          <>
            <Plus size={14} />
            {label}
          </>
        )}
      </button>

      {/* Error toast */}
      {error && (
        <div className="mt-1.5 flex items-center gap-1.5 text-[10px] text-rose-400">
          <AlertCircle size={12} />
          {error}
        </div>
      )}
    </div>
  );
};

export default AddToBetSlipButton;
