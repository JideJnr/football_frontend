import { IonContent, IonPage, useIonRouter } from '@ionic/react'
import Button from '../../../components/button/button'

const Welcome = () => {
    const { user } = []
    const router = useIonRouter();

  return (
    <IonPage>
      <IonContent fullscreen>
        <div className="flex flex-col w-full h-full bg-white ">
          <div className="flex-col mx-auto my-auto ">
            <div className="flex mx-auto flex-col gap-4">
              <img
                src="assets/images/bjimage.png"
                alt="logo"
                className="h-12 w-fit px-5 mx-auto"
              />
            </div>
          </div>

          <div className="h-fit mt-auto flex flex-col gap-4 mb-8 p-4">
            <Button
              className="!w-full !rounded-3xl !bg-emerald-500"
              onClick={() => router.push(!user ? "/sign-in" : "/main")}
              text="Continue"
            />
          </div>
        </div>
      </IonContent>
    </IonPage>
  )
}

export default Welcome