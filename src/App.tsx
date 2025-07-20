import React, { Suspense }  from "react";
import { IonApp, setupIonicReact } from "@ionic/react";
import { IonReactRouter } from "@ionic/react-router";



import "@ionic/react/css/core.css";
import "@ionic/react/css/normalize.css";
import "@ionic/react/css/structure.css";
import "@ionic/react/css/typography.css";
import "@ionic/react/css/padding.css";
import "@ionic/react/css/float-elements.css";
import "@ionic/react/css/text-alignment.css";
import "@ionic/react/css/text-transformation.css";
import "@ionic/react/css/flex-utils.css";
import "@ionic/react/css/display.css";
import "@ionic/react/css/palettes/dark.system.css";
import "./index.css";
import { ContextProvider } from "./contexts/useContextProvider";
import Loading from "./components/loading/Loading";
import Routes from "./routes/Routes";

setupIonicReact();

const App: React.FC = () => {
  return (

    <IonApp>
      <IonReactRouter>
        <ContextProvider>
          <Suspense fallback={<Loading />}>
            <Routes />
          </Suspense>
        </ContextProvider>
      </IonReactRouter>
    </IonApp>
  );
};

export default App;
