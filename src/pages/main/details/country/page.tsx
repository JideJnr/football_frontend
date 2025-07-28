import { IonContent,  useIonRouter } from '@ionic/react';
import { useState } from 'react';
import { useData } from '../../../../contexts/useFootballContext';

const MatchDetails = () => {
  const router = useIonRouter();

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
