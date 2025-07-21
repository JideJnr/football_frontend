import {
  IonContent,
  IonPage,
  IonRefresher,
  IonRefresherContent,
  useIonRouter,
} from '@ionic/react';
import { useState, Suspense } from 'react';
import { useData } from '../../../../contexts/useDataContext';
import { Tab } from '@headlessui/react';

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

// Lazy load the tab panels
const MatchMain = () => <div className="p-4">🧠 Match Details Content</div>;
const MatchLineups = () => <div className="p-4">📋 Lineups Info</div>;
const MatchStats = () => <div className="p-4">📊 Stats Coming Soon</div>;
const MatchPrediction = () => <div className="p-4">🔮 Predictions Panel</div>;

const MatchDetails = () => {
  const router = useIonRouter();
  const { currentMatch, loading, error } = useData();

  const refresh = (e: CustomEvent) => {
    e.detail.complete();
  };

  return (
    <IonPage>
      <IonContent className="bg-black text-green-400 font-mono" fullscreen>
        <IonRefresher slot="fixed" onIonRefresh={refresh}>
          <IonRefresherContent />
        </IonRefresher>

        {/* Header */}
        <div className="p-4 border-b border-green-700">
          <p className="text-green-300 text-xs uppercase">🏆 {currentMatch?.league || 'League Name'}</p>
          <h1 className="text-xl font-bold mt-1">
            ⚽ {currentMatch?.homeTeam} vs {currentMatch?.awayTeam}
          </h1>
          <p className="text-sm text-green-500">⏱ {currentMatch?.time} — {currentMatch?.date}</p>
        </div>

        {/* Tabs */}
        <Tab.Group>
          <Tab.List className="flex space-x-2 bg-gray-900 p-2 border-b border-green-800">
            {['Match Details', 'Lineups', 'Statistics', 'Prediction'].map((tab, idx) => (
              <Tab
                key={idx}
                className={({ selected }) =>
                  classNames(
                    'px-3 py-1 text-sm rounded-md focus:outline-none',
                    selected
                      ? 'bg-green-600 text-black'
                      : 'bg-gray-700 text-green-300 hover:bg-green-700'
                  )
                }
              >
                {tab}
              </Tab>
            ))}
          </Tab.List>

          <Tab.Panels className="p-2">
            <Tab.Panel>
              <Suspense fallback={<div>Loading...</div>}>
                <MatchMain />
              </Suspense>
            </Tab.Panel>
            <Tab.Panel>
              <Suspense fallback={<div>Loading...</div>}>
                <MatchLineups />
              </Suspense>
            </Tab.Panel>
            <Tab.Panel>
              <Suspense fallback={<div>Loading...</div>}>
                <MatchStats />
              </Suspense>
            </Tab.Panel>
            <Tab.Panel>
              <Suspense fallback={<div>Loading...</div>}>
                <MatchPrediction />
              </Suspense>
            </Tab.Panel>
          </Tab.Panels>
        </Tab.Group>
      </IonContent>
    </IonPage>
  );
};

export default MatchDetails;
