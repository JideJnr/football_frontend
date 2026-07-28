import React, { useEffect, useRef, useState } from 'react';
import { IonContent, IonPage, useIonRouter } from '@ionic/react';
import { useFootballContext } from '../../contexts/useFootballContext';

const LINES = [
  'Connecting to PredictX...',
  'Loading match data...',
  'Syncing live scores...',
  'Preparing predictions...',
  'Ready.',
];

// Minimum time each line is visible (ms)
const LINE_INTERVAL = 320;
// Hard cap: never block longer than this regardless of network
const MAX_SPLASH_MS = 4000;

const Splash: React.FC = () => {
  const router = useIonRouter();
  const { prefetchToday } = useFootballContext();
  const [visibleLines, setVisibleLines] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const navigatedRef = useRef(false);

  const navigate = () => {
    if (navigatedRef.current) return;
    navigatedRef.current = true;
    router.push('/home', 'root', 'replace');
  };

  useEffect(() => {
    // Fire data fetch immediately — runs in parallel with animation
    const dataPromise = prefetchToday();

    let lineIndex = 0;
    const lineTimer = setInterval(() => {
      lineIndex += 1;
      setVisibleLines(LINES.slice(0, lineIndex));
      setProgress(Math.round((lineIndex / LINES.length) * 100));
      if (lineIndex >= LINES.length) {
        clearInterval(lineTimer);
        // Animation done — wait for data (already resolved if fast network)
        dataPromise.then(navigate);
      }
    }, LINE_INTERVAL);

    // Safety net: never block longer than MAX_SPLASH_MS
    const maxTimer = setTimeout(navigate, MAX_SPLASH_MS);

    return () => {
      clearInterval(lineTimer);
      clearTimeout(maxTimer);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <IonPage>
      <IonContent fullscreen style={{ '--background': '#0a0a0a' } as any}>
        <div className="flex flex-col items-center justify-center w-full h-full px-8 gap-8">
          {/* Brand */}
          <div className="flex flex-col items-center gap-2">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
              <span className="text-3xl">⚽</span>
            </div>
            <span className="text-white font-bold text-xl tracking-tight">PredictX</span>
          </div>

          {/* Terminal log */}
          <div className="w-full max-w-xs bg-[#111] border border-white/[0.07] rounded-xl p-4 font-mono text-xs min-h-[120px]">
            {visibleLines.map((line, i) => (
              <div
                key={i}
                className={`flex items-center gap-2 py-0.5 ${
                  i === visibleLines.length - 1 ? 'text-emerald-400' : 'text-gray-500'
                }`}
              >
                <span className="text-emerald-600 shrink-0">›</span>
                <span>{line}</span>
                {i === visibleLines.length - 1 && (
                  <span className="inline-block w-1.5 h-3.5 bg-emerald-400 animate-pulse ml-0.5" />
                )}
              </div>
            ))}
          </div>

          {/* Progress bar */}
          <div className="w-full max-w-xs">
            <div className="h-0.5 w-full bg-white/[0.06] rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Splash;
