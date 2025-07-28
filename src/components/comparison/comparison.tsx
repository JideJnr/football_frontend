
const TeamComparison = () => {
  return (
    <div className="bg-gray-900 text-white max-w-md mx-auto rounded-xl shadow-lg p-4 space-y-4">
      <div className="text-center text-sm text-gray-400 font-semibold">Team comparison</div>

      <div className="flex justify-between bg-gray-800 rounded-lg p-3">
        {[{
          name: 'Botafogo',
          country: 'Brazil',
          year: '2025',
          bg: 'bg-gray-900',
          border: 'border-white',
          logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/b/be/Botafogo_de_Futebol_e_Regatas_logo.svg/1200px-Botafogo_de_Futebol_e_Regatas_logo.svg.png'
        }, {
          name: 'Corinthians',
          country: 'Brazil',
          year: '2025',
          bg: 'bg-red-900',
          border: 'border-red-400',
          logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/1/1f/SC_Corinthians_Paulista_logo.svg/800px-SC_Corinthians_Paulista_logo.svg.png'
        }].map(team => (
          <div key={team.name} className={`w-1/2 flex flex-col items-center ${team.bg} p-2 rounded-lg`}>
            <img src={team.logo} alt={team.name} className="w-10 h-10 mb-1" />
            <span className="text-sm font-semibold">{team.name}</span>
            <span className="text-xs text-green-400">{team.country}</span>
            <select className="text-xs text-white bg-transparent mt-1">
              <option>{team.year}</option>
            </select>
          </div>
        ))}
      </div>

      {/* General Stats */}
      <div className="bg-black rounded-lg p-3 space-y-3">
        <div className="text-center text-sm text-gray-400">General</div>

        <div className="flex justify-between items-center text-xs font-semibold">
          <span className="text-green-500">7.04</span>
          <span className="text-gray-300">Avg. Sofascore Rating</span>
          <span className="text-yellow-400">6.88</span>
        </div>

        <div className="space-y-2 text-sm">
          {[
            { label: 'Matches', left: 14, right: 16 },
            { label: 'Goals scored', left: 17, right: 15 },
            { label: 'Goals conceded', left: 7, right: 19 },
            { label: 'Assists', left: 12, right: 9 }
          ].map(stat => (
            <div key={stat.label} className="flex justify-between text-gray-200">
              <span className="text-indigo-300">{stat.left}</span>
              <span className="text-gray-400">{stat.label}</span>
              <span className="text-indigo-300">{stat.right}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Attacking Stats */}
      <div className="bg-black rounded-lg p-3 space-y-2">
        <div className="text-center text-sm text-gray-400">Attacking</div>
        <div className="flex justify-between text-gray-200 text-sm">
          <span className="text-indigo-300">1.2</span>
          <span className="text-gray-400">Goals per game</span>
          <span className="text-indigo-300">0.9</span>
        </div>
      </div>
    </div>
  )
}

export default TeamComparison
