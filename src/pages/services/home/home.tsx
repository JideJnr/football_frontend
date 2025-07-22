import { useEffect, useRef, useState } from 'react';
import { IonButton } from '@ionic/react';
import { useControl } from '../../../contexts/useControlContext';

interface LogMessage {
  id: string;
  text: string;
  timestamp: Date;
  type: 'system' | 'bot' | 'warning' | 'error';
}

const Home = () => {
  const { engineStatus, loading, error, toggleEngine } = useControl();
  const [logs, setLogs] = useState<LogMessage[]>([]);
  const logEndRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Auto-scroll logs
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // WebSocket connection management
  useEffect(() => {
    if (!engineStatus) {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      return;
    }

    wsRef.current = new WebSocket('wss://bot-football.onrender.com');

    wsRef.current.onopen = () => {
      addLog('Connected to GODSCRAPR engine');
    };

    wsRef.current.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        setLogs((prev) => [
          ...prev,
          {
            id: message.id || Date.now().toString(),
            text: message.text,
            timestamp: new Date(message.timestamp || Date.now()),
            type: message.type || 'system',
          },
        ]);
      } catch {
        addLog('Failed to parse message', 'error');
      }
    };

    wsRef.current.onerror = () => {
      addLog('WebSocket error', 'error');
    };

    wsRef.current.onclose = () => {
      if (engineStatus) addLog('Connection closed', 'warning');
    };

    return () => {
      wsRef.current?.close();
    };
  }, [engineStatus]);

  const addLog = (text: string, type: LogMessage['type'] = 'system') => {
    setLogs((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        text,
        timestamp: new Date(),
        type,
      },
    ]);
  };

  const getLogClass = (type: LogMessage['type']) => {
    switch (type) {
      case 'error':
        return 'text-red-400';
      case 'warning':
        return 'text-yellow-400';
      case 'bot':
        return 'text-purple-400';
      default:
        return 'text-slate-300';
    }
  };

  return (
    <div className="bg-black text-green-400 font-mono w-full h-full p-4">

      {/* Activate / Terminate Button */}
      <div className="flex justify-center mb-6">
        <IonButton
          shape="round"
          size="large"
          disabled={loading}
          className={`w-32 h-32 rounded-full text-xl font-mono shadow-lg transition-all 
            ${engineStatus
              ? 'bg-gradient-to-br from-red-500 to-red-700 shadow-red-500/30'
              : 'bg-gradient-to-br from-purple-500 to-indigo-700 shadow-purple-500/30'
            }`}
          onClick={toggleEngine}
        >
          {loading ? '...' : engineStatus ? 'TERMINATE' : 'ACTIVATE'}
        </IonButton>
      </div>

      {/* Live Logs */}
      <div className="bg-slate-900 rounded-xl p-4 h-96 overflow-y-auto text-sm">
        <div className="mb-2 text-green-400">// LIVE FEED</div>

        {logs.length > 0 ? (
          <div className="space-y-1">
            {logs.map((log) => (
              <div key={log.id} className="border-l-2 border-green-500 pl-3 py-1">
                <span className="text-slate-500 mr-2">
                  [{log.timestamp.toLocaleTimeString()}]
                </span>
                <span className={getLogClass(log.type)}>{log.text}</span>
              </div>
            ))}
            <div ref={logEndRef} />
          </div>
        ) : (
          <div className="text-slate-600 italic">
            {engineStatus ? 'Establishing connection...' : 'System offline'}
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div className="mt-4 flex justify-between text-xs text-slate-500">
        <div>
          STATUS:{' '}
          {engineStatus ? (
            <span className="text-green-400">OPERATIONAL</span>
          ) : (
            <span className="text-red-400">OFFLINE</span>
          )}
          {loading && <span className="ml-2 text-yellow-400">CONNECTING...</span>}
        </div>
        <div>v2.4.0 | {new Date().toLocaleTimeString()}</div>
      </div>
    </div>
  );
};

export default Home;
