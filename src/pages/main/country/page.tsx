import { IonContent, useIonRouter } from '@ionic/react';
import { useState } from 'react';

// Replace this with your context or dynamic data
const country = [
  { id: 'russia', name: 'Russia ' },
  { id: 'england', name: 'England '},
  { id: 'germany', name: 'Germany ' },
];

const Country = () => {
  const router = useIonRouter();
  const [selectedCountry, setSelectedCountry] = useState('');

  const handleClick = (id: string) => {
    setSelectedCountry(id);
    router.push(`/matches/${id}`, 'forward');
  };

  return (
    <div className='flex flex-col w-full'>
      <div className="text-xl font-bold mb-4">Leagues</div>
      <div className="grid grid-cols-1 gap-4">
   
                    
                  {country.map((country:any) => (

                            <div
                              onClick={handleClick}
                              className="cursor-pointer border border-green-700 hover:bg-green-900 hover:text-black p-3 rounded transition-all"
                            >
                                🏆 {country.name || 'Unknown League'}
                            </div>
                  ))}
               
       
      </div>
    </div>
  );
};

export default Country;
