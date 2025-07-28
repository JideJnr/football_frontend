// HeadToHead.tsx
import React from 'react';

interface Match {
  date: string;
  teamA: string;
  teamB: string;
  scoreA: number;
  scoreB: number;
  competition: string;
}

interface HeadToHeadProps {
  teamA: string;
  teamB: string;
  history: Match[];
}

const HeadToHead: React.FC<HeadToHeadProps> = ({ teamA, teamB, history }) => {
  const filteredMatches = history.filter(
    match =>
      (match.teamA === teamA && match.teamB === teamB) ||
      (match.teamA === teamB && match.teamB === teamA)
  );

  return (
    <div className=" shadow p-4 rounded-md">
      <h2 className="text-xl font-semibold mb-2">
        {teamA} vs {teamB} - Head to Head
      </h2>
      {filteredMatches.length > 0 ? (
        <ul className="space-y-2">
          {filteredMatches.map((match, index) => (
            <li key={index} className="border-b pb-2">
              <div>{match.date} - {match.competition}</div>
              <div>
                {match.teamA} {match.scoreA} - {match.scoreB} {match.teamB}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p>No previous matches found between these teams.</p>
      )}
    </div>
  );
};

export default HeadToHead;
