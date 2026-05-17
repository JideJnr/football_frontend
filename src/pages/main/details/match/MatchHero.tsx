import { TABS, Tab, FormDots, LiveDot, fmtTime, fmtDateTime, getMatchTime, isLive, val } from './shared';

interface MatchHeroProps {
  m: any;
  activeTab: Tab;
  setActiveTab: (t: Tab) => void;
}

const MatchHero = ({ m, activeTab, setActiveTab }: MatchHeroProps) => {
  const live = isLive(m);
  const matchTime = getMatchTime(m);
  const score = m?.score;
  const hasScore = score?.home != null && score?.away != null;

  return (
    <div className="bg-[#161616] border-b border-white/[0.07]">
      {/* Tournament */}
      <div className="text-center pt-4 pb-1">
        <span className="text-[10px] text-gray-500 uppercase tracking-widest">{val(m.tournament)}</span>
        {m.venue && <div className="text-[10px] text-gray-700 mt-0.5">{m.venue}</div>}
      </div>

      {/* Teams + score */}
      <div className="flex items-center gap-2 px-4 py-3">
        {/* Home */}
        <div className="flex-1 text-center">
          <div className="text-sm font-semibold text-white leading-tight">{m.home_team}</div>
          {m.home_position && <div className="text-[10px] text-gray-600">#{m.home_position}</div>}
          {m.home_form && <div className="flex justify-center mt-1"><FormDots form={m.home_form} /></div>}
        </div>

        {/* Score / time */}
        <div className="flex flex-col items-center shrink-0 min-w-[88px]">
          {hasScore ? (
            <>
              <div className="flex items-center gap-1.5">
                {live && <LiveDot />}
                <span className="text-2xl font-bold text-white tabular-nums">{score.home} – {score.away}</span>
              </div>
              {matchTime && (
                <span className={`text-xs font-bold mt-0.5 ${
                  m.period === 'HT' ? 'text-orange-400'
                  : m.period === 'FT' || m.period === 'AET' ? 'text-gray-500'
                  : 'text-red-400'
                }`}>
                  {matchTime}
                </span>
              )}
            </>
          ) : (
            <>
              <span className="text-xl font-bold text-emerald-400">{fmtTime(m.start_time)}</span>
              <span className="text-[10px] text-gray-600 mt-0.5">{fmtDateTime(m.start_time)}</span>
            </>
          )}
        </div>

        {/* Away */}
        <div className="flex-1 text-center">
          <div className="text-sm font-semibold text-white leading-tight">{m.away_team}</div>
          {m.away_position && <div className="text-[10px] text-gray-600">#{m.away_position}</div>}
          {m.away_form && <div className="flex justify-center mt-1"><FormDots form={m.away_form} /></div>}
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex overflow-x-auto border-t border-white/[0.06] scrollbar-hide">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`shrink-0 px-4 py-2.5 text-xs font-semibold transition-colors whitespace-nowrap border-b-2 ${
              activeTab === tab
                ? 'text-emerald-400 border-emerald-400'
                : 'text-gray-500 border-transparent hover:text-gray-300'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>
    </div>
  );
};

export default MatchHero;
