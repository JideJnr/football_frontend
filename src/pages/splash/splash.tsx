import React, { useEffect, useState } from 'react';
import { IonContent, IonPage, useIonRouter } from '@ionic/react';

const lines = [
  'Initializing GODSCRAPR...',
  'Loading modules: brain.js, memory.sys, faith.injector',
  'Bypassing firewalls...',
  'Injecting payload...',
  '🧠 HumanEngine Active',
  '🚨 Entering Heist Mode...',
];

const Splash: React.FC = () => {
  const [output, setOutput] = useState('');
  const [index, setIndex] = useState(0);
  const router = useIonRouter();

  useEffect(() => {
    const interval = setInterval(() => {
      if (index < lines.length) {
        setOutput(prev => prev + `> ${lines[index]}\n`);
        setIndex(prev => prev + 1);
      } else {
        clearInterval(interval);
        setTimeout(() => {
          router.push('/home', 'root');
        }, 1000);
      }
    }, 300);

    return () => clearInterval(interval);
  }, [index, router]);

  return (
    <IonPage>
      <IonContent className="bg-black flex flex-col gap-4 w-full h-full py-8  ">
        <pre className="text-green-400 font-mono text-sm p-4 whitespace-pre-wrap mx-auto h-2/3">
          {output}
        </pre>
        <div className=' mx-auto w-fit h-1/3  '>
          Loading
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Splash;
