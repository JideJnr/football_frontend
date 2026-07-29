import { useEffect, useMemo, useState } from 'react';
import { IonContent, IonPage, IonRefresher, IonRefresherContent, useIonRouter } from '@ionic/react';
import { Brain, ChevronRight, Cpu, Trophy } from 'lucide-react';
import { getEnginesDashboard } from '../../../../services/apis/footballApi';

const categoryTone: Record<string, string> = {
  value: 'border-yellow-500/25 text-yellow-300',
  goals: 'border-emerald-500/25 text-emerald-300',
  result: 'border-blue-500/25 text-blue-300',
  special: 'border-violet-500/25 text-violet-300',
  sharp: 'border-red-500/25 text-red-300',
};

const accuracyTone = (value: number | null) =>
  value == null ? 'text-gray-600' : value >= 58 ? 'text-emerald-400' : value >= 48 ? 'text-yellow-400' : 'text-red-400';

const EngineCard = ({ item }: { item: any }) => {
  const router = useIonRouter();
  const engine = item.engine || {};
  const stats = item.stats || {};
  const tone = categoryTone[engine.category] || 'border-white/10 text-gray-300';
  const power = engine.power || [];

  return (
    <button
      onClick={() => router.push(`/engine/${item.engine_id}/details`, 'forward', 'push')}
      className={`w-full rounded-xl border bg-[#161616] p-3 text-left transition hover:bg-white/[0.04] ${tone}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-white">{engine.name}</span>
            {engine.requires_full_match && (
              <span className="rounded-full border border-violet-500/30 px-2 py-0.5 text-[9px] text-violet-300">Full match</span>
            )}
          </div>
          <div className="mt-1 text-xs leading-relaxed text-gray-500">{engine.description}</div>
        </div>
        <ChevronRight size={16} className="mt-1 shrink-0 text-gray-500" />
      </div>

      <div className="mt-3 grid grid-cols-4 gap-2 text-center">
        <div>
          <div className={`text-lg font-black ${accuracyTone(stats.accuracy)}`}>{stats.accuracy == null ? '-' : `${stats.accuracy}%`}</div>
          <div className="text-[9px] text-gray-600">Accuracy</div>
        </div>
        <div>
          <div className="text-lg font-black text-white">{stats.graded || 0}</div>
          <div className="text-[9px] text-gray-600">Graded</div>
        </div>
        <div>
          <div className="text-lg font-black text-emerald-400">{stats.wins || 0}</div>
          <div className="text-[9px] text-gray-600">Wins</div>
        </div>
        <div>
          <div className="text-lg font-black text-yellow-300">{stats.pending || 0}</div>
          <div className="text-[9px] text-gray-600">Prematch</div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {power.map((source: string) => (
          <span key={source} className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-gray-400">
            {source.replace(/_/g, ' ')}
          </span>
        ))}
      </div>
    </button>
  );
};

const Engines = () => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const load = async () => {
    setLoading(true);
    try {
      const data = await getEnginesDashboard();
      setItems(data?.engines || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(
    () => filter === 'all' ? items : items.filter(item => item?.engine?.category === filter),
    [items, filter]
  );
  const totals = useMemo(() => {
    const graded = items.reduce((sum, item) => sum + Number(item?.stats?.graded || 0), 0);
    const wins = items.reduce((sum, item) => sum + Number(item?.stats?.wins || 0), 0);
    const pending = items.reduce((sum, item) => sum + Number(item?.stats?.pending || 0), 0);
    return { graded, wins, pending, accuracy: graded ? Math.round((wins / graded) * 1000) / 10 : null };
  }, [items]);

  const categories = ['all', 'value', 'goals', 'result', 'special', 'sharp'];

  return (
    <IonPage>
      <IonContent style={{ '--background': '#0f0f0f' } as any} fullscreen>
        <IonRefresher slot="fixed" onIonRefresh={async e => { await load(); e.detail.complete(); }}>
          <IonRefresherContent />
        </IonRefresher>

        <div className="min-h-full bg-[#0f0f0f] px-3 py-4 text-white">
          <div className="mb-4">
            <div className="flex items-center gap-2">
              <Cpu size={18} className="text-emerald-400" />
              <h1 className="text-lg font-bold">Engine Workbench</h1>
            </div>
            <p className="mt-1 text-xs text-gray-500">Engines are powered by manual rules and AI context, then graded from prediction history.</p>
          </div>

          <div className="mb-4 grid grid-cols-3 gap-2">
            <div className="rounded-xl border border-white/[0.07] bg-[#161616] p-3 text-center">
              <Trophy size={16} className="mx-auto mb-1 text-emerald-400" />
              <div className={`text-lg font-black ${accuracyTone(totals.accuracy)}`}>{totals.accuracy == null ? '-' : `${totals.accuracy}%`}</div>
              <div className="text-[10px] text-gray-600">Accuracy</div>
            </div>
            <div className="rounded-xl border border-white/[0.07] bg-[#161616] p-3 text-center">
              <div className="text-lg font-black text-white">{totals.graded}</div>
              <div className="text-[10px] text-gray-600">Graded picks</div>
            </div>
            <div className="rounded-xl border border-white/[0.07] bg-[#161616] p-3 text-center">
              <Brain size={16} className="mx-auto mb-1 text-violet-400" />
              <div className="text-lg font-black text-yellow-300">{totals.pending}</div>
              <div className="text-[10px] text-gray-600">Prematch</div>
            </div>
          </div>

          <div className="mb-4 flex gap-1.5 overflow-x-auto pb-1">
            {categories.map(category => (
              <button
                key={category}
                onClick={() => setFilter(category)}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-xs capitalize transition ${
                  filter === category ? 'border-white bg-white text-black' : 'border-white/10 text-gray-500'
                }`}
              >
                {category}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="py-16 text-center text-sm text-gray-500">Loading engines...</div>
          ) : (
            <div className="space-y-3">
              {filtered.map(item => <EngineCard key={item.engine_id} item={item} />)}
            </div>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Engines;
