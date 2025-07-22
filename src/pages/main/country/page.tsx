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
    <IonContent className="p-4">
      <div className="text-xl font-bold mb-4">Leagues</div>
      <div className="grid grid-cols-1 gap-3">
   
                    
                  {country.map((country:any) => (
                    <div key={country.id} className="mb-4">
                    <p className="text-green-300 uppercase text-sm mb-1 ">
                    🏆 {country.name || 'Unknown League'}
                    </p>

                    
                    </div>
                  ))}
               
       
      </div>
    </IonContent>
  );
};

export default Country;
