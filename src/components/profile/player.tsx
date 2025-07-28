


const PlayerProfile = () => {
  return (
    <div className="bg-[#0F0F1A] text-white w-full max-w-sm rounded-xl p-4 font-sans shadow-xl">
      {/* Top: Avatar and Basic Info */}
      <div className="flex items-center space-x-4">
        <img
          src="https://upload.wikimedia.org/wikipedia/commons/9/99/Sample_User_Icon.png"
          alt="Gabriel Barbosa"
          className="w-16 h-16 rounded-full border border-gray-600"
        />
        <div className="flex-1">
          <h2 className="text-lg font-semibold">Gabriel Barbosa</h2>
          <button className="mt-1 text-[10px] bg-[#2F2F40] px-2 py-1 rounded text-blue-300">
            #️⃣ Compare
          </button>
        </div>
        <div className="text-gray-400 text-xl">☆</div>
      </div>

      {/* Tabs */}
      <div className="mt-4 flex justify-around text-sm border-b border-gray-600 pb-2 text-gray-400">
        {["Details", "Statistics", "Matches", "Career"].map((tab) => (
          <span
            key={tab}
            className={`cursor-pointer ${
              tab === "Details" ? "text-white border-b-2 border-blue-500 pb-1" : ""
            }`}
          >
            {tab}
          </span>
        ))}
      </div>

      {/* Club Info */}
      <div className="bg-[#1A1A2E] mt-4 p-3 rounded-md">
        <div className="flex items-center space-x-2 mb-1">
          <img
            src="https://upload.wikimedia.org/wikipedia/en/thumb/1/1e/Cruzeiro_Esporte_Clube_logo.svg/1200px-Cruzeiro_Esporte_Clube_logo.svg.png"
            alt="Cruzeiro"
            className="w-6 h-6"
          />
          <span className="text-sm font-medium">Cruzeiro</span>
        </div>
        <p className="text-xs text-gray-400">Contract until 31 Dec 2028</p>
      </div>

      {/* Player Details Grid */}
      <div className="grid grid-cols-3 gap-2 mt-4 text-[12px] text-center text-gray-300">
        <div>
          <div className="text-green-400 font-semibold">🇧🇷 BRA</div>
          <div className="text-[10px]">Nationality</div>
        </div>
        <div>
          <div className="text-white">30 Aug 1996</div>
          <div className="text-[10px]">28 yrs</div>
        </div>
        <div>
          <div className="text-white">178 cm</div>
          <div className="text-[10px]">Height</div>
        </div>
        <div>
          <div className="text-white">Left</div>
          <div className="text-[10px]">Preferred Foot</div>
        </div>
        <div>
          <div className="text-white">F</div>
          <div className="text-[10px]">Position</div>
        </div>
        <div>
          <div className="text-white">9</div>
          <div className="text-[10px]">Shirt Number</div>
        </div>
      </div>

      {/* Market Value */}
      <div className="bg-[#1A1A2E] mt-4 p-3 rounded-md flex flex-col items-center">
        <div className="text-gray-400 text-[10px] uppercase">Market Value</div>
        <div className="text-2xl font-bold text-yellow-400">6.3M €</div>
        <div className="flex items-center gap-2 mt-2 text-[10px] text-gray-400">
          Is market value higher or lower?
          <div className="flex items-center gap-2">
            <button className="bg-green-500 text-white px-2 py-1 rounded">Higher</button>
            <button className="bg-red-500 text-white px-2 py-1 rounded">Lower</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlayerProfile;
