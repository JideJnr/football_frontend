import {  IonContent, useIonRouter } from '@ionic/react';
import { useData } from '../../../../contexts/useFootballContext';


const League = () => {
  const router = useIonRouter();
  const { league, getLeagueById , loading, error } = useData()

  return (
    <IonContent>

    </IonContent>
  );
};

export default League;
