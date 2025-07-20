import { IonContent,  useIonRouter } from '@ionic/react';
import { useState } from 'react';
import { useData } from '../../../../contexts/useDataContext';

const MatchDetails = () => {
  const router = useIonRouter();
  const [view, setView] = useState('main');

    const { match, loading, error } = useData()

    //use


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

export default MatchDetails;
