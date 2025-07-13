import { IonContent,  useIonRouter } from '@ionic/react';
import { useState } from 'react';

const Home = () => {
  const router = useIonRouter();
  const [view, setView] = useState('main');

  return (
    <IonContent>  
      
    </IonContent>
  );
};

export default Home;
