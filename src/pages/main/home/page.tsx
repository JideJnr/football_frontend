import { useIonRouter } from '@ionic/react';
import { useEffect } from 'react';
import { useData } from '../../../contexts/useDataContext';



const Home = () => {

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
  return (
  <div className='w-full h-full flex flex-col gap-4'>
          {countries?.length > 0 ? (
            <div className="space-y-4 ">
              {countries.map((country:any, idx:any) => (
                <div key={idx} className='border border-y p-2  '  >
                  {/* Tournament Name */}
                  <p className="text-green-300 uppercase text-sm mb-1 ">
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
  );
};

export default Home;