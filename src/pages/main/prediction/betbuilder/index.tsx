import { useEffect } from 'react';
import BackTemplate from '../../../../components/templates/back/back';
import BetBuilderCard from '../../../../components/BetBuilderCard';
import { IonContent, IonPage } from '@ionic/react';
import { BackFormContainer } from '../../../../components/form/BackFormContainer';



const Builder = () => {
  useEffect(() => {
    // Placeholder for future data fetching or side effects
  }, []);

  const refresh = (e: CustomEvent) => {
    try {
      e.detail.complete();
    } catch (err) {
      console.error("Refresh error:", err);
      e.detail.complete();
    }
  };

  return (
    <IonPage>
      <BackFormContainer>
        <BetBuilderCard/>
      </BackFormContainer>
    </IonPage> 
  );
};

export default Builder;