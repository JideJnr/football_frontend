import { IonButton, IonHeader } from "@ionic/react";
import { useIonRouter } from "@ionic/react";
import { arrowBackOutline } from "ionicons/icons";

const CustomHeader = () => {
  const router = useIonRouter();

  return (
    <IonHeader className="bg-black text-purple-400 font-mono w-full p-4 flex justify-between items-center">
        <div className="w-6 ">
            <IonButton 
          onClick={() => router.goBack()} 
          fill="clear"
          className="text-purple-400 hover:text-purple-300 -ml-2"
          aria-label="Go back"
        >
          {/* Using Ionicons for consistent icon styling */}
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-6 w-6" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M10 19l-7-7m0 0l7-7m-7 7h18" 
            />
          </svg>
        </IonButton>
        </div>

            <div className="text-xl mx-auto w-fit pb-2 font-bold">
              GOD'S EYE 👁️‍🗨️ 
            </div>
        <div className="w-6 opacity-0"></div>
    </IonHeader>
  );
};

export default CustomHeader;