import { useState, useEffect, useRef } from 'react';
import { IonButton } from '@ionic/react';

interface LogMessage {
  id: string;
  text: string;
  timestamp: Date;
  type: 'system' | 'bot' | 'warning' | 'error';
}

const ControlCenter = () => {
  const [isActive, setIsActive] = useState(false);
  const [logs, setLogs] = useState<LogMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const logEndRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Auto-scroll logs
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // WebSocket connection management
  useEffect(() => {
    if (!isActive) {
      // Clean up connection when deactivated
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      return;
    }

    setIsLoading(true);
    setError(null);

    // Connect to WebSocket endpoint
    wsRef.current = new WebSocket('wss://your-backend.com/godcomplex/stream');

    wsRef.current.onopen = () => {
      setIsLoading(false);
      addSystemLog('Connected to God Complex engine');
    };

    wsRef.current.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        setLogs(prev => [...prev, {
          id: message.id || Date.now().toString(),
          text: message.text,
          timestamp: new Date(message.timestamp || Date.now()),
          type: message.type || 'system'
        }]);
      } catch (err) {
        addSystemLog('Failed to parse message', 'error');
      }
    };

    wsRef.current.onerror = (error) => {
      setError('Connection error');
      addSystemLog('WebSocket error', 'error');
      setIsLoading(false);
    };

    wsRef.current.onclose = () => {
      if (isActive) {
        addSystemLog('Connection closed', 'warning');
      }
      setIsLoading(false);
    };

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [isActive]);

  const addSystemLog = (text: string, type: LogMessage['type'] = 'system') => {
    setLogs(prev => [...prev, {
      id: Date.now().toString(),
      text,
      timestamp: new Date(),
      type
    }]);
  };

  const toggleSystem = async () => {
    if (isActive) {
      // Send shutdown command
      try {
        const response = await fetch('https://your-backend.com/godcomplex/control', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ command: 'shutdown' })
        });
        
        if (!response.ok) throw new Error('Shutdown failed');
        
        addSystemLog('Shutdown command sent');
        setIsActive(false);
      } catch (err) {
        addSystemLog('Failed to send shutdown command', 'error');
      }
    } else {
      // Send activation command
      try {
        const response = await fetch('https://your-backend.com/godcomplex/control', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ command: 'activate' })
        });
        
        if (!response.ok) throw new Error('Activation failed');
        
        addSystemLog('Activation command sent');
        setIsActive(true);
      } catch (err) {
        addSystemLog('Failed to activate system', 'error');
      }
    }
  };

  const getLogClass = (type: LogMessage['type']) => {
    switch (type) {
      case 'error': return 'text-red-400';
      case 'warning': return 'text-yellow-400';
      case 'bot': return 'text-purple-400';
      default: return 'text-gray-100';
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      {/* Activation Button */}
      <div className="flex justify-center mb-8">
        <IonButton 
          shape="round" 
          size="large"
          disabled={isLoading}
          className={`w-32 h-32 rounded-full text-xl font-mono shadow-lg transition-all 
            ${isActive 
              ? 'bg-gradient-to-br from-red-500 to-red-700 shadow-red-500/30' 
              : 'bg-gradient-to-br from-purple-500 to-indigo-700 shadow-purple-500/30'
            }`}
          onClick={toggleSystem}
        >
          {isLoading ? '...' : isActive ? 'TERMINATE' : 'ACTIVATE'}
        </IonButton>
      </div>

      {/* Status Indicators */}
      {error && (
        <div className="mb-4 p-2 bg-red-900/50 text-red-200 rounded text-center">
          {error}
        </div>
      )}

      {/* Console Log */}
      <div className="bg-slate-800 rounded-xl p-4 h-96 overflow-y-auto font-mono text-sm">
        <div className="mb-2 text-purple-400">// SYSTEM CONSOLE [v2.4.0]</div>
        
        {logs.length > 0 ? (
          <div className="space-y-1">
            {logs.map((log) => (
              <div key={log.id} className="border-l-2 border-purple-500 pl-3 py-1">
                <span className="text-slate-500 mr-2">
                  [{log.timestamp.toLocaleTimeString()}]
                </span>
                <span className={`${getLogClass(log.type)}`}>
                  {log.text}
                </span>
              </div>
            ))}
            <div ref={logEndRef} />
          </div>
        ) : (
          <div className="text-slate-600 italic">
            {isActive ? 'Establishing connection...' : 'System offline'}
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div className="mt-4 flex justify-between text-xs text-slate-500">
        <div>
          STATUS: {isActive ? 
            <span className="text-green-400">OPERATIONAL</span> : 
            <span className="text-red-400">OFFLINE</span>}
          {isLoading && <span className="ml-2 text-yellow-400">CONNECTING...</span>}
        </div>
        <div>v2.4.0 | {new Date().toLocaleTimeString()}</div>
      </div>
    </div>
  );
};

export default ControlCenter;