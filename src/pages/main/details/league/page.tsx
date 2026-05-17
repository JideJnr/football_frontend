import {  IonContent, useIonRouter } from '@ionic/react';
import { useFootballContext } from '../../../../contexts/useFootballContext';


const League = () => {
  const router = useIonRouter();
  const { loading, error } = useFootballContext()

  return (
    <IonContent>

    </IonContent>
  );
};

export default League;
