import { IonContent, IonPage, IonRefresher, IonRefresherContent } from "@ionic/react";
import Header from "../header/header";

const BackTemplate = ( children : any , refresh: any) => {
  return (
    <IonPage >
      <IonContent fullscreen className="" >
        <IonRefresher slot="fixed" onIonRefresh={refresh}>
                  <IonRefresherContent />
        </IonRefresher>
        <Header/>
        <div className="p-4 w-full h-full flex flex-col gap-4 bg-black text-green-400 font-mono">
          {children}
        </div>
      </IonContent>
    </IonPage>
  );
};

export default BackTemplate;
