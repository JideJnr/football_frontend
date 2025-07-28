const LeagueInfo = () => {
  return (
    <div className="bg-[#0d0d0d] text-white rounded-xl p-4 w-full max-w-sm mx-auto font-mono space-y-4 border border-gray-800 shadow-md">
      {/* Header */}
      <h2 className="text-center text-sm text-white font-bold">League info</h2>

      {/* Title holder + Most titles */}
      <div className="flex justify-between items-center bg-[#121212] rounded-lg p-3">
        <div className="flex flex-col items-center text-center text-xs">
          <img
            src="https://upload.wikimedia.org/wikipedia/en/thumb/d/db/Atl%C3%A9tico_Nacional_Logo.svg/1200px-Atl%C3%A9tico_Nacional_Logo.svg.png"
            alt="Atlético Nacional"
            className="w-8 h-8 mb-1"
          />
          <span>Atlético Nacional</span>
          <span className="text-gray-400">(18)</span>
          <span className="text-[10px] text-gray-500 mt-1">Title holder</span>
        </div>
        <div className="flex flex-col items-center text-center text-xs">
          <img
            src="https://upload.wikimedia.org/wikipedia/en/thumb/d/db/Atl%C3%A9tico_Nacional_Logo.svg/1200px-Atl%C3%A9tico_Nacional_Logo.svg.png"
            alt="Atlético Nacional"
            className="w-8 h-8 mb-1"
          />
          <span>Atlético Nacional</span>
          <span className="text-gray-400">(18)</span>
          <span className="text-[10px] text-gray-500 mt-1">Most titles</span>
        </div>
      </div>

      {/* Same division */}
      <div className="bg-[#121212] rounded-lg p-3 flex items-center gap-2 text-xs">
        <img
          src="https://upload.wikimedia.org/wikipedia/commons/3/34/MLS_2023.svg"
          alt="division"
          className="w-6 h-6"
        />
        <span>Primera A, Apertura</span>
      </div>

      {/* Facts */}
      <div className="bg-[#121212] rounded-lg p-3 text-xs space-y-2">
        <div className="flex justify-between">
          <span className="text-gray-400">Goals</span>
          <span className="text-white">58</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Average goals</span>
          <span>2.32</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Home team wins</span>
          <span>36%</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Away team wins</span>
          <span>28%</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Draws</span>
          <span>36%</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Yellow cards</span>
          <span>5.68</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Red cards</span>
          <span>0.8</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Number of competitors</span>
          <span>20</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Division level</span>
          <span>1</span>
        </div>
      </div>
    </div>
  );
};

export default LeagueInfo;
