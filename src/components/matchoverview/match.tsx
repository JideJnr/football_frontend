import React from "react";
import { useFootballContext } from "../../contexts/useFootballContext";

const stats = [
  {
    label: "Ball possession",
    teamA: 48,
    teamB: 52,
    isPercentage: true,
  },
  {
    label: "Expected goals",
    teamA: 2.75,
    teamB: 0.34,
    hint: true,
  },
  { label: "Big chances", teamA: 4, teamB: 0 },
  { label: "Total shots", teamA: 16, teamB: 6 },
  { label: "Goalkeeper saves", teamA: 1, teamB: 3 },
  { label: "Corner kicks", teamA: 8, teamB: 3 },
  { label: "Fouls", teamA: 15, teamB: 10 },
  { label: "Passes", teamA: 317, teamB: 362 },
  { label: "Tackles", teamA: 18, teamB: 12 },
  { label: "Free kicks", teamA: 9, teamB: 15 },
  { label: "Yellow cards", teamA: 1, teamB: 2 },
];

const StatBar = ({ teamA, teamB }: { teamA: number; teamB: number }) => {
  const total = teamA + teamB || 1;
  const widthA = (teamA / total) * 100;
  const widthB = (teamB / total) * 100;
  return (
    <div className="w-full h-2 bg-gray-700 rounded overflow-hidden flex">
      <div className="bg-green-500" style={{ width: `${widthA}%` }} />
      <div className="bg-indigo-400" style={{ width: `${widthB}%` }} />
    </div>
  );
};

const MatchOverview = () => {

    const { currentMatch , loading } = useFootballContext();

  return (
    <div className="bg-[#0F0F1A] text-white w-full max-w-sm mx-auto rounded-xl p-4 font-sans">
      <h2 className="text-center text-sm font-bold mb-4">Match overview</h2>

      {/* Ball Possession Row */}
      <div className="flex justify-between items-center text-xs mb-1 px-1">
        <span className="bg-green-600 px-2 py-0.5 rounded-full text-white font-semibold">
          48%
        </span>
        <span className="text-gray-400 text-[11px]">Ball possession</span>
        <span className="bg-indigo-500 px-2 py-0.5 rounded-full text-white font-semibold">
          52%
        </span>
      </div>
      <StatBar teamA={48} teamB={52} />

      {/* Other Stats */}
      <div className="mt-4 space-y-4">
        {stats.slice(1).map((stat, i) => (
          <div key={i}>
            <div className="flex justify-between items-center text-xs mb-1 px-1">
              <span className="text-white">{stat.teamA}</span>
              <span className="text-gray-400 text-[11px]">
                {stat.label}
                {stat.hint && <span className="text-blue-300 ml-1 cursor-pointer">ⓘ</span>}
              </span>
              <span className="text-white">{stat.teamB}</span>
            </div>
            <StatBar teamA={stat.teamA} teamB={stat.teamB} />
          </div>
        ))}
      </div>
    </div>
  );
};

export default MatchOverview;
