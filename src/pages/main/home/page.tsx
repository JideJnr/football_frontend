import { useIonRouter } from "@ionic/react";
import { useState } from "react";


const Home = () => {

    const router = useIonRouter();

  const mockCountries = [
  {
    country: 'Spain',
    name: 'International - Copa America, Women',

    matches: [
      {
        date: '21/07',
        time: '22:00',
        home: 'Argentina',
        away: 'Peru',
        odds: ['1.04', '11.50', '33.00'],
        id: 0
      },
    ]
  },
  {
    name: 'Argentina - Primera LPF',
    matches: [
      {
        date: '21/07',
        time: '18:00',
        home: 'Boca Juniors',
        away: 'River Plate',
        odds: ['2.40', '3.10', '2.80'],
        id: 1
      },
      
    ]
  },
  {
    name: 'Sweden - Allsvenskan',
    matches: [
      {
        date: '21/07',
        time: '20:30',
        home: 'Malmo',
        away: 'AIK',
        odds: ['1.70', '3.50', '4.20'],
        id: 2
      },
    ]
  },
  {
    name: 'Finland - Veikkausliiga',
    matches: [
      {
        date: '21/07',
        time: '17:00',
        home: 'HJK',
        away: 'KuPS',
        odds: ['2.00', '3.00', '3.50'],
        id: 3
      },
    ]
  },
  ];
  const countries = mockCountries;

  const [activeTab, setActiveTab] = useState('all');

    const tabList = [
    { id: "all", label: "All" },
    { id: "live", label: " Live (38)" },
    
    { id: "upcoming", label: "Upcoming" },
    { id: "finished", label: "Finished" }
  ];


  return (
    <div className="w-full h-full bg-black text-green-400 font-mono flex flex-col gap-6 p-4">
      {/* — Header with date picker — */}
      <header className="flex items-center justify-center space-x-4">
        <button className="p-2 hover:text-green-200">
        
        </button>
        <div className="px-4 py-2 border border-green-600 rounded">
          <span className="text-sm">25/07</span>
        </div>
        <button className="p-2 hover:text-green-200">
          
        </button>
      </header>

 
                {/* Tabs */}
          <div className=" mb-4 flex space-x-4">
            {tabList.map((tab) => (
              <button
                key={tab.id}
                className={`px-3 py-1 text-xs rounded-full border transition duration-200 ${
                  activeTab === tab.id
                    ? "border-green-600 bg-green-800"
                    : ""
                }`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>


      {activeTab === "all" && (
      <div className="space-y-4 overflow-y-auto">
        {countries.map((country, idx) => (
          <section
            key={idx}
            className="border border-green-700 p-3 rounded hover:border-green-500 transition"
          >
            <h2 className="uppercase text-xs mb-2 flex items-center">
              <span className="mr-1">🏆</span>
              {country.name}
            </h2>

            {country.matches.map((match, mIdx) => (
              <div
                key={mIdx}
                className="mb-4 last:mb-0 animate-fade-in"
                style={{ animationDelay: `${mIdx * 100}ms` }}
                  onClick={() => router.push(`/match/${match.id}`, 'forward', 'push')}
              >
                <div className="text-xxs text-green-600 mb-1">
                  🕓 {match.date} — {match.time}
                </div>
                <div className="flex justify-between items-center">
                  <div>
                    ⚽️ {match.home} <span className="mx-1">vs</span> {match.away}
                  </div>
                </div>
              </div>
            ))}
          </section>
        ))}
      </div>)}

      
      {activeTab === "live" && (
      <div className="space-y-4 overflow-y-auto">
        {countries.map((country, idx) => (
          <section
            key={idx}
            className="border border-green-700 p-3 rounded hover:border-green-500 transition"
          >
            <h2 className="uppercase text-xs mb-2 flex items-center">
              <span className="mr-1">🏆</span>
              {country.name}
            </h2>

            {country.matches.map((match, mIdx) => (
              <div
                key={mIdx}
                className="mb-4 last:mb-0 animate-fade-in"
                style={{ animationDelay: `${mIdx * 100}ms` }}
              >
                <div className="text-xxs text-green-600 mb-1">
                  🕓 {match.date} — {match.time}
                </div>
                <div className="flex justify-between items-center">
                  <div>
                    ⚽️ {match.home} <span className="mx-1">vs</span> {match.away}
                  </div>
                </div>
              </div>
            ))}
          </section>
        ))}
      </div>)}

            {activeTab === "upcoming" && (
      <div className="space-y-4 overflow-y-auto">
        {countries.map((country, idx) => (
          <section
            key={idx}
            className="border border-green-700 p-3 rounded hover:border-green-500 transition"
          >
            <h2 className="uppercase text-xs mb-2 flex items-center">
              <span className="mr-1">🏆</span>
              {country.name}
            </h2>

            {country.matches.map((match, mIdx) => (
              <div
                key={mIdx}
                className="mb-4 last:mb-0 animate-fade-in"
                style={{ animationDelay: `${mIdx * 100}ms` }}
              >
                <div className="text-xxs text-green-600 mb-1">
                  🕓 {match.date} — {match.time}
                </div>
                <div className="flex justify-between items-center">
                  <div>
                    ⚽️ {match.home} <span className="mx-1">vs</span> {match.away}
                  </div>
                </div>
              </div>
            ))}
          </section>
        ))}
      </div>)}

      
      {activeTab === "finished" && (
      <div className="space-y-4 overflow-y-auto">
        {countries.map((country, idx) => (
          <section
            key={idx}
            className="border border-green-700 p-3 rounded hover:border-green-500 transition"
          >
            <h2 className="uppercase text-xs mb-2 flex items-center">
              <span className="mr-1">🏆</span>
              {country.name}
            </h2>

            {country.matches.map((match, mIdx) => (
              <div
                key={mIdx}
                className="mb-4 last:mb-0 animate-fade-in"
                style={{ animationDelay: `${mIdx * 100}ms` }}
              >
                <div className="text-xxs text-green-600 mb-1">
                  🕓 {match.date} — {match.time}
                </div>
                <div className="flex justify-between items-center">
                  <div>
                    ⚽️ {match.home} <span className="mx-1">vs</span> {match.away}
                  </div>
                </div>
              </div>
            ))}
          </section>
        ))}

        
  
  
      </div>)}
    </div>
  );
};



export default Home;