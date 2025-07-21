import { IonContent, useIonRouter } from '@ionic/react';
import { useState } from 'react';

// Replace this with your context or dynamic data
const countryLeagues = [
  { id: 'russia', name: 'Russia - Premier League', flag: '🇷🇺', hot: true },
  { id: 'england', name: 'England - Premier League', flag: '🏴', hot: false },
  { id: 'germany', name: 'Germany - Bundesliga', flag: '🇩🇪', hot: true },
];

const Country = () => {
  const router = useIonRouter();
  const [selectedCountry, setSelectedCountry] = useState('');

  const handleClick = (id: string) => {
    setSelectedCountry(id);
    router.push(`/matches/${id}`, 'forward');
  };

  return (
    <IonContent className="p-4">
      <div className="text-xl font-bold mb-4">Leagues</div>
      <div className="grid grid-cols-1 gap-3">
        {countryLeagues.map((league) => (
          <div
            key={league.id}
            onClick={() => handleClick(league.id)}
            className="bg-zinc-800 text-white rounded-lg p-4 shadow hover:bg-zinc-700 transition cursor-pointer"
          >
            <div className="flex justify-between items-center">
              <span className="text-lg">
                {league.flag} {league.name}
              </span>
              {league.hot && <span className="text-red-500 text-sm font-semibold">🔥 Hot</span>}
            </div>
          </div>
        ))}
      </div>
    </IonContent>
  );
};

export default Country;
