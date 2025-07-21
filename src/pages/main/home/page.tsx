import { IonContent, IonPage, useIonRouter } from '@ionic/react';
import { useEffect, useState } from 'react';
import { useData } from '../../../contexts/useDataContext';

const mockCountries = [
  {
    name: 'International - Copa America, Women',
    matches: [
      {
        date: '21/07',
        time: '22:00',
        home: 'Argentina',
        away: 'Peru',
        odds: ['1.04', '11.50', '33.00']
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
        odds: ['2.40', '3.10', '2.80']
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
        odds: ['1.70', '3.50', '4.20']
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
        odds: ['2.00', '3.00', '3.50']
      },
    ]
  },
];


const Home = () => {
  const router = useIonRouter();
  const {  getAllCountries, loading, error } = useData();

  useEffect(() => {
    getAllCountries(); // fetch countries or matches on mount
  }, []);

  // const { countries, getAllCountries, loading, error } = useData();
  const countries = mockCountries;


  return (
    
      <div className="bg-black text-green-400 font-mono w-full h-full">
        <div className="p-4">
          <h1 className="text-xl mb-4 border-b border-green-700 pb-2">🧠 GODSCRAPR LIVE FEED</h1>

          {loading && <p className="text-green-500">Loading data...</p>}
          {error && <p className="text-red-400">Error: {error}</p>}

          {countries?.length > 0 ? (
            <div className="space-y-6">
              {countries.map((country:any, idx:any) => (
                <div key={idx}>
                  {/* Tournament Name */}
                  <p className="text-green-300 uppercase text-sm mb-1">
                    🏆 {country.name || 'Unknown League'}
                  </p>

                  {/* Matches in that country */}
                  {country.matches?.map((match:any, matchIdx:any) => (
                    <div key={matchIdx} className="mb-4">
                      <p className="text-xs text-green-500">
                        🕓 {match.date} — {match.time}
                      </p>

                      <div className="flex justify-between items-center mt-1">
                        <span>
                          ⚽️ {match.home} vs {match.away}
                        </span>
                      
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-green-500">No live data available.</p>
          )}
        </div>
      </div>
    
  );
};

export default Home;