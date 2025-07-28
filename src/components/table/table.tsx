const teams = [
  {
    rank: 1,
    logo: "https://upload.wikimedia.org/wikipedia/en/thumb/b/bf/Atl%C3%A9tico_Junior_logo.svg/1200px-Atl%C3%A9tico_Junior_logo.svg.png",
    name: "Junior Barranquilla",
    played: 3,
    diff: "+6",
    points: 9,
  },
  {
    rank: 2,
    logo: "https://upload.wikimedia.org/wikipedia/en/thumb/e/e2/Fortaleza_CEIF_logo.svg/1200px-Fortaleza_CEIF_logo.svg.png",
    name: "Fortaleza",
    played: 3,
    diff: "+2",
    points: 7,
  },
  {
    rank: 3,
    logo: "https://upload.wikimedia.org/wikipedia/en/thumb/d/db/Atl%C3%A9tico_Nacional_Logo.svg/1200px-Atl%C3%A9tico_Nacional_Logo.svg.png",
    name: "Atl. Nacional",
    played: 3,
    diff: "+3",
    points: 6,
  },
  {
    rank: 4,
    logo: "https://upload.wikimedia.org/wikipedia/en/thumb/1/16/Independiente_Santa_Fe_logo.svg/1200px-Independiente_Santa_Fe_logo.svg.png",
    name: "Santa Fe",
    played: 3,
    diff: "+1",
    points: 5,
  },
  {
    rank: 5,
    logo: "https://upload.wikimedia.org/wikipedia/en/thumb/4/47/Llaneros_F.C._logo.svg/1200px-Llaneros_F.C._logo.svg.png",
    name: "Llaneros",
    played: 3,
    diff: "+1",
    points: 5,
  },
  {
    rank: 6,
    logo: "https://upload.wikimedia.org/wikipedia/en/thumb/3/37/Boyac%C3%A1_Chic%C3%B3_F.C._logo.svg/1200px-Boyac%C3%A1_Chic%C3%B3_F.C._logo.svg.png",
    name: "Boyacá Chicó",
    played: 3,
    diff: "+1",
    points: 4,
  },
  {
    rank: 7,
    logo: "https://upload.wikimedia.org/wikipedia/en/thumb/7/79/Envigado_FC_logo.svg/1200px-Envigado_FC_logo.svg.png",
    name: "Envigado",
    played: 3,
    diff: "0",
    points: 4,
  },
  {
    rank: 8,
    logo: "https://upload.wikimedia.org/wikipedia/en/thumb/d/dd/Deportivo_Pereira_logo.svg/1200px-Deportivo_Pereira_logo.svg.png",
    name: "Deportivo Pereira",
    played: 3,
    diff: "0",
    points: 4,
  },
  {
    rank: 9,
    logo: "https://upload.wikimedia.org/wikipedia/en/thumb/2/28/Alianza_Valledupar_logo.svg/1200px-Alianza_Valledupar_logo.svg.png",
    name: "Alianza Valledupar",
    played: 3,
    diff: "0",
    points: 4,
  },
  {
    rank: 10,
    logo: "https://upload.wikimedia.org/wikipedia/en/thumb/2/2c/La_Equidad_logo.svg/1200px-La_Equidad_logo.svg.png",
    name: "La Equidad",
    played: 3,
    diff: "-1",
    points: 4,
  },
  {
    rank: 11,
    logo: "https://upload.wikimedia.org/wikipedia/en/thumb/e/e0/Deportivo_Pasto_logo.svg/1200px-Deportivo_Pasto_logo.svg.png",
    name: "Dep. Pasto",
    played: 1,
    diff: "-3",
    points: 0,
  },
];

const StandingsTable = () => {
  return (
    <div className="bg-[#0d0d0d] rounded-xl p-4 w-full max-w-md mx-auto text-white font-mono">
      {/* Tabs */}
      <div className="flex justify-start gap-2 mb-4">
        {["ALL", "HOME", "AWAY"].map((tab, i) => (
          <button
            key={i}
            className={`px-3 py-1 text-xs rounded-full ${
              tab === "ALL"
                ? "bg-white text-black"
                : "bg-black border border-white text-white"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Table Headers */}
      <div className="grid grid-cols-5 text-xs text-gray-400 px-2 mb-2">
        <div className="col-span-2">Team</div>
        <div className="text-center">P</div>
        <div className="text-center">DIFF</div>
        <div className="text-center">PTS</div>
      </div>

      {/* Teams */}
      <div className="space-y-2">
        {teams.map((team) => (
          <div
            key={team.rank}
            className="grid grid-cols-5 items-center text-sm px-2 py-1 hover:bg-[#1a1a1a] rounded"
          >
            {/* Team info */}
            <div className="flex items-center gap-2 col-span-2">
              <span className="text-green-400 text-xs w-4">{team.rank}</span>
              <img src={team.logo} alt={team.name} className="w-5 h-5" />
              <span className="truncate">{team.name}</span>
            </div>
            <div className="text-center">{team.played}</div>
            <div className="text-center">{team.diff}</div>
            <div className="text-center font-bold">{team.points}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StandingsTable;
