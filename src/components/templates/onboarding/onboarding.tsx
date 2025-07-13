import { IonContent, IonImg, IonPage } from "@ionic/react";
import { ReactNode } from "react";

interface OnboardingPageProp {
  titleOne: string;
  children: ReactNode;
}

const OnboardingTemplate = ({
  children,
  titleOne,
}: OnboardingPageProp) => {
  return (
    <IonPage className="!overflow-hidden ">
      <IonContent fullscreen className="ion-padding ">
        <div className="w-[90%] mx-auto pt-12 pb-5 !overflow-hidden">
          <div className="flex flex-col gap-2 items-center mt-2 mb-10">
            <IonImg
              src="assets/images/bjimage.png"
              alt="logo"
              className="w-32 h-auto"
            />

            <div className="mt-2 text-center px-4">
              <h1 className="text-2xl font-bold text-[#3c3c3c] leading-snug tracking-wide font-serif">
                {titleOne}
              </h1>
            </div>
          </div>

          {children}
        </div>
      </IonContent>
    </IonPage>
  );
};

export default OnboardingTemplate;
