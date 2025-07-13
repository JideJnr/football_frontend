import { IonContent,  useIonRouter } from '@ionic/react';
import { useState } from 'react';

const Home = () => {
  const router = useIonRouter();
  const [view, setView] = useState('main');

  return (
    <IonContent>
        <div>
            // Score Line
            // League
            /Country

        </div>
        <div>
            //match details
            //Lineup 
            //Statistic
            //Prediction
            //Similar matches
            //Head To Head
        </div>
      
    </IonContent>
  );
};

export default Home;
