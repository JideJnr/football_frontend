
import {  IonContent, IonHeader, IonPage } from '@ionic/react';
import { useAnalytic } from '../../contexts/useAnalyticContext';


const Analytics = () => {
  
  const {  loading, error } = useAnalytic();

  return (
  <IonPage>
    <IonContent fullscreen>
      <IonHeader className="bg-black text-green-400 font-mono w-full h-full p-4 border ">
        <div className="text-xl mb-4 border-green-700 pb-2">
                                  🧠 SIGNAL
        </div>
      </IonHeader>
    </IonContent>
  </IonPage>
  );
};

export default Analytics;
