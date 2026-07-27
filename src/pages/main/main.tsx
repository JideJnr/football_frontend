import { IonPage, IonContent } from "@ionic/react";
import { Tab, TabGroup } from "@headlessui/react";
import { BarChart3, HomeIcon, Settings as SettingsIcon, Trophy } from "lucide-react";
import { useState } from "react";
import Header from "../../components/templates/header/header";
import Home from "./home/page";
import Settings from "./settings/page";
import Prediction from "./prediction/page";
import Competition from "./competition/page";

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

function Main() {
  const [selectedTab, setSelectedTab] = useState(0);
  // Lifted from Home so Header can show live status without prop drilling through IonContent
  const [wsConnected, setWsConnected] = useState(false);
  const [predictionCount, setPredictionCount] = useState<number | null>(null);

  return (
    <IonPage>
      <IonContent fullscreen scrollY={false}>
        <TabGroup
          as="div"
          selectedIndex={selectedTab}
          onChange={setSelectedTab}
          className="grid h-full w-full grid-rows-[auto_1fr_64px] bg-[#0e0e0e]"
        >
          <Header
            wsConnected={wsConnected}
            predictionCount={predictionCount}
            selectedTab={selectedTab}
          />

          <div className="min-h-0 overflow-hidden">
            <Tab.Panels className="h-full bg-[#0e0e0e] text-white">
              <Tab.Panel className="h-full w-full">
                <Home
                  onWsStatus={setWsConnected}
                  onPredictionCount={setPredictionCount}
                />
              </Tab.Panel>
              <Tab.Panel className="h-full w-full overflow-y-auto">
                <Prediction />
              </Tab.Panel>
              <Tab.Panel className="h-full w-full overflow-y-auto">
                <Competition />
              </Tab.Panel>
              <Tab.Panel className="h-full w-full overflow-y-auto">
                <Settings />
              </Tab.Panel>
            </Tab.Panels>
          </div>

          <Tab.List className="h-full w-full border-t border-white/[0.08] bg-[#111]/95 px-2 backdrop-blur">
            <div className="grid h-full w-full grid-cols-4 gap-1">
              {[
                { label: "Home", icon: HomeIcon },
                { label: "Predictions", icon: BarChart3 },
                { label: "Tournaments", icon: Trophy },
                { label: "Settings", icon: SettingsIcon },
              ].map(({ label, icon: Icon }) => (
                <Tab
                  key={label}
                  className={({ selected }) =>
                    classNames(
                      "flex h-full min-w-0 flex-col items-center justify-center gap-0.5 rounded-md px-1 text-[11px] font-semibold outline-none transition",
                      selected
                        ? "bg-emerald-500/10 text-emerald-400"
                        : "text-gray-500 hover:bg-white/[0.04] hover:text-gray-200"
                    )
                  }
                >
                  <Icon className="h-5 w-5" />
                  <span className="truncate">{label}</span>
                </Tab>
              ))}
            </div>
          </Tab.List>
        </TabGroup>
      </IonContent>
    </IonPage>
  );
}

export default Main;
