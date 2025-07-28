import React from "react";

const playersTop = {
  formation: "4-2-3-1",
  team: "Cruzeiro",
  lineup: [
    [{ number: 12, name: "William", rating: 7.4, img: "/avatars/player1.png" }, { number: 15, name: "F. Bruno", rating: 7.1, img: "/avatars/player2.png" }, { number: 25, name: "Villalba", rating: 6.9, img: "/avatars/player3.png" }, { number: 6, name: "Kaiki", rating: 7.0, img: "/avatars/player4.png" }],
    [{ number: 29, name: "L. Romero", rating: 6.8, img: "/avatars/player5.png" }, { number: 21, name: "Eduardo", rating: 7.5, img: "/avatars/player6.png" }],
    [{ number: 88, name: "Christian", rating: 7.3, img: "/avatars/player7.png" }, { number: 9, name: "G. Barbosa", rating: 8.7, img: "/avatars/player8.png" }, { number: 7, name: "Marquinhos", rating: 7.8, img: "/avatars/player9.png" }],
    [{ number: 19, name: "K. Jorge", rating: 8.4, img: "/avatars/player10.png" }]
  ]
};

const playersBottom = {
  formation: "4-3-3",
  team: "Opponent",
  lineup: [
    [{ number: 19, name: "G. Taliari", rating: 6.7, img: "/avatars/player11.png" }, { number: 9, name: "Gilberto", rating: 6.6, img: "/avatars/player12.png" }],
    [{ number: 44, name: "L. Mandaca", rating: 6.4, img: "/avatars/player13.png" }, { number: 95, name: "Caique", rating: 7.0, img: "/avatars/player14.png" }, { number: 5, name: "Hudson", rating: 6.2, img: "/avatars/player15.png" }],
    [{ number: 22, name: "M. Hermes", rating: 6.1, img: "/avatars/player16.png" }, { number: 47, name: "M. Paulo", rating: 5.7, img: "/avatars/player17.png" }, { number: 20, name: "W. Ángel", rating: 6.5, img: "/avatars/player18.png" }, { number: 93, name: "Reginaldo", rating: 6.5, img: "/avatars/player19.png" }],
  ]
};

const Player = ({ player }: { player: any }) => (
  <div className="flex flex-col items-center text-center text-white text-[11px] w-20">
    <img src={player.img} alt={player.name} className="w-10 h-10 rounded-full border-2 border-white" />
    <div className="mt-1">
      <span className="bg-[#1E1E2F] text-green-300 px-1 py-0.5 text-[10px] rounded">{player.rating}</span>
    </div>
    <div className="font-semibold mt-1">{player.number}</div>
    <div className="truncate">{player.name}</div>
  </div>
);

const FormationRow = ({ row }: { row: any[] }) => (
  <div className="flex justify-center gap-4 mb-4">
    {row.map((player, idx) => (
      <Player player={player} key={idx} />
    ))}
  </div>
);

const LineupCard = () => {
  return (
    <div className="bg-[#0F0F1A] text-white max-w-lg mx-auto rounded-lg p-4 shadow-lg">
      {/* Tabs */}
      <div className="flex justify-around text-sm border-b border-gray-600 pb-2 text-gray-400 mb-4">
        {["Details", "Lineups", "Statistics", "Commentary"].map((tab) => (
          <span
            key={tab}
            className={`cursor-pointer ${
              tab === "Lineups" ? "text-white border-b-2 border-blue-500 pb-1" : ""
            }`}
          >
            {tab}
          </span>
        ))}
      </div>

      {/* Top Team */}
      {playersTop.lineup.map((row, idx) => (
        <FormationRow row={row} key={idx} />
      ))}

      {/* Pitch Divider */}
      <div className="w-full h-16 flex items-center justify-center relative mb-4">
        <div className="w-20 h-20 border border-gray-700 rounded-full absolute"></div>
        <div className="w-px h-full bg-gray-600"></div>
      </div>

      {/* Bottom Team */}
      {playersBottom.lineup.map((row, idx) => (
        <FormationRow row={row} key={idx} />
      ))}
    </div>
  );
};

export default LineupCard;
