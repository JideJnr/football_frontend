import { IonContent,  useIonRouter } from '@ionic/react';
import { useState } from 'react';
import { useData } from '../../../contexts/useDataContext';

const Home = () => {
  const router = useIonRouter();
  const [view, setView] = useState('main');

  const country = []

    const { countries, getAllCountries, loading, error } = useData()
  
  return (
    <IonContent>  
      
    </IonContent>
  );
};

export default Home;
