import {
  IonPage,
  IonContent,
  IonRefresherContent,
  IonRefresher,
} from "@ionic/react";
import { Tab, TabGroup } from "@headlessui/react";
import { BarChart3, HomeIcon, Settings as SettingsIcon, Trophy } from "lucide-react";
import Header from "../../components/templates/header/header";
import Home from "./home/page";
import Country from "./country/page";
import Settings from "./settings/page";
import Prediction from "./prediction/page";


function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

function Main() {

  const refresh = (e: CustomEvent) => {
    try {
      
      e.detail.complete();
    } catch (err) {
      console.error("Refresh error:", err);
      e.detail.complete();
    }
  };

  const renderTabs = () => (
    <Tab.Panels className="h-full flex-1 overflow-y-auto bg-[#0f0f0f] text-white">

      <Tab.Panel className="h-full w-full overflow-y-auto">
        < Home />
      </Tab.Panel>

      <Tab.Panel className="h-full w-full overflow-y-auto">
        < Country />
      </Tab.Panel>

      <Tab.Panel className="h-full w-full overflow-y-auto">
        <Prediction />
      </Tab.Panel>
      <Tab.Panel className="h-full w-full overflow-y-auto">
        < Settings />
      </Tab.Panel>
      
    </Tab.Panels>
  );

  const renderTabList = () => (
    <Tab.List className="h-full w-full border-t border-white/[0.08] bg-[#111111]/95 px-2 backdrop-blur">
      <div className="grid h-full w-full grid-cols-4 gap-1">
        {[
          {
            label: "Home",
            icon: HomeIcon,
          },
          {
            label: "Country",
            icon: Trophy,
          },

          {
            label: "Predictions",
            icon: BarChart3,
          },
          {
            label: "Settings",
            icon: SettingsIcon,
          },
        ].map(({ label, icon: Icon }) => (
          <Tab
            key={label}
            className={({ selected }) =>
              classNames(
                "flex h-full min-w-0 flex-col items-center justify-center gap-0.5 rounded-md px-1 text-[11px] font-semibold outline-none transition",
                selected
                  ? "bg-emerald-500/10 text-emerald-400"
                  : "text-gray-500 hover:bg-white/[0.04] hover:text-gray-200",
              )
            }
          >
            <Icon className="h-5 w-5" />
            <span className="truncate">{label}</span>
          </Tab>
        ))}
      </div>
    </Tab.List>
  );



  return (
    <IonPage>
      <IonContent fullscreen>
        <IonRefresher slot="fixed" onIonRefresh={refresh}>
          <IonRefresherContent />
        </IonRefresher>

        <TabGroup as="div" className="grid h-full w-full grid-rows-[auto_1fr_64px] bg-[#0f0f0f]">
          <Header/>
          <div className="min-h-0 overflow-hidden">{renderTabs()}</div>
          <div>{renderTabList()}</div>
        </TabGroup>
      </IonContent>
    </IonPage>
  );
}

export default Main;
