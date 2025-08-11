const MatchHeader = ({ activeTab, setActiveTab }: { activeTab: string, setActiveTab: (tab: string) => void }) => {
  return (
    <div className="bg-[#121212] text-white rounded-md p-4 w-full max-w-md mx-auto border border-gray-700 shadow-lg">
      {/* Date and Time */}
      <div className="text-sm text-gray-400 text-center mb-2">
        25/07/2025 • 19:45
      </div>

      {/* Match Info */}
      <div className="flex items-center justify-between mb-3">
        {/* Team 1 */}
        <div className="flex flex-col items-center w-1/3">
          <img src="https://upload.wikimedia.org/wikipedia/en/thumb/f/f5/Royal_Antwerp_FC_logo.svg/1200px-Royal_Antwerp_FC_logo.svg.png" alt="Royal Antwerp" className="h-10 mb-1" />
          <span className="text-sm">Royal Antwerp</span>
        </div>

        {/* Score */}
        <div className="text-center w-1/3">
          <div className="text-2xl font-bold">1 - 1</div>
          <div className="text-xs text-gray-400">Finished</div>
        </div>

        {/* Team 2 */}
        <div className="flex flex-col items-center w-1/3">
          <img src="https://upload.wikimedia.org/wikipedia/en/thumb/3/37/Union_Saint-Gilloise_logo_2020.svg/1200px-Union_Saint-Gilloise_logo_2020.svg.png" alt="USG" className="h-10 mb-1" />
          <span className="text-sm">USG</span>
        </div>
      </div>

      {/* Scorers */}
      <div className="flex justify-between text-xs text-gray-300 px-4">
        <div className="text-left">
          Vincent Janssen <span className="text-gray-500">36'</span>
        </div>
        <div className="text-right">
          Raul Florucz <span className="text-gray-500">68'</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex justify-around mt-4 text-[11px] w-full overflow-x-auto gap-2">
        {["Home","Details", "Lineups", "Statistics", "Comparison","Odds","H2H","Predictions"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-1 px-2 w-fit ${activeTab === tab ? 'text-green-400 border-b-2 border-green-400' : 'text-gray-400'}`}
          >
            {tab}
          </button>
        ))}
      </div>
    </div>
  );
};

export default MatchHeader;