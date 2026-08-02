import { IonContent } from '@ionic/react';
import { useIonRouter } from '@ionic/react';
import { BarChart3, Brain, ShieldCheck, TrendingUp, Zap, Star, Settings2 } from 'lucide-react';

const features = [
  {
    icon: Brain,
    label: 'Decision Board',
    description: 'AI-ranked picks with confidence bands & learned signals',
    route: '/prediction/dashboard',
    accent: 'emerald',
    badge: null,
  },
  {
    icon: TrendingUp,
    label: 'Value Bets',
    description: 'Matches where model probability beats bookmaker odds',
    route: '/prediction/value-bets',
    accent: 'yellow',
    badge: 'Edge',
  },
  {
    icon: ShieldCheck,
    label: 'Team Watchers',
    description: 'Open the long-term team memory for filtered league analysis',
    route: '/team-watchers',
    accent: 'green',
    badge: 'New',
  },
  {
    icon: Zap,
    label: 'Suggestions',
    description: 'Accept or skip today\'s signals from all engines',
    route: '/suggestions',
    accent: 'blue',
    badge: null,
  },
  {
    icon: Settings2,
    label: 'Engines',
    description: 'Configure prediction engines and rule thresholds',
    route: '/engines',
    accent: 'purple',
    badge: null,
  },
  {
    icon: BarChart3,
    label: 'Bet Builder',
    description: 'Combine selections into a custom multi-bet',
    route: '/builder',
    accent: 'orange',
    badge: 'New',
  },
  {
    icon: Star,
    label: 'User Rating',
    description: 'Track your personal pick accuracy over time',
    route: '/rating',
    accent: 'pink',
    badge: null,
  },
];

const accentMap: Record<string, { text: string; bg: string; border: string; iconBg: string }> = {
  emerald: { text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', iconBg: 'bg-emerald-500/15' },
  yellow:  { text: 'text-yellow-400',  bg: 'bg-yellow-500/10',  border: 'border-yellow-500/30',  iconBg: 'bg-yellow-500/15' },
  blue:    { text: 'text-blue-400',    bg: 'bg-blue-500/10',    border: 'border-blue-500/30',    iconBg: 'bg-blue-500/15' },
  green:   { text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', iconBg: 'bg-emerald-500/15' },
  purple:  { text: 'text-purple-400',  bg: 'bg-purple-500/10',  border: 'border-purple-500/30',  iconBg: 'bg-purple-500/15' },
  orange:  { text: 'text-orange-400',  bg: 'bg-orange-500/10',  border: 'border-orange-500/30',  iconBg: 'bg-orange-500/15' },
  pink:    { text: 'text-pink-400',    bg: 'bg-pink-500/10',    border: 'border-pink-500/30',    iconBg: 'bg-pink-500/15' },
};

const Prediction = () => {
  const router = useIonRouter();

  return (
    <IonContent style={{ '--background': '#0e0e0e' } as any}>
      <div className="px-4 pt-5 pb-8 space-y-5">
        {/* Header */}
        <div>
          <h1 className="text-lg font-bold text-white">Predictions</h1>
          <p className="text-xs text-gray-500 mt-0.5">AI-powered tools to find and manage your picks</p>
        </div>

        {/* Primary CTA — Decision Board */}
        {(() => {
          const f = features[0];
          const a = accentMap[f.accent];
          const Icon = f.icon;
          return (
            <button
              onClick={() => router.push(f.route, 'forward', 'push')}
              className={`w-full rounded-2xl border ${a.border} ${a.bg} p-4 text-left transition active:scale-[0.98]`}
            >
              <div className="flex items-center gap-3">
                <div className={`rounded-xl p-2.5 ${a.iconBg}`}>
                  <Icon size={22} className={a.text} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-bold ${a.text}`}>{f.label}</div>
                  <div className="text-xs text-gray-400 mt-0.5 leading-snug">{f.description}</div>
                </div>
                <svg className="w-4 h-4 text-gray-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          );
        })()}

        {/* Grid of remaining features */}
        <div className="grid grid-cols-2 gap-3">
          {features.slice(1).map((f) => {
            const a = accentMap[f.accent];
            const Icon = f.icon;
            return (
              <button
                key={f.route}
                onClick={() => router.push(f.route, 'forward', 'push')}
                className="relative rounded-2xl border border-white/[0.07] bg-[#161616] p-4 text-left transition active:scale-[0.97] hover:border-white/[0.14]"
              >
                {f.badge && (
                  <span className={`absolute top-3 right-3 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${a.bg} ${a.text} border ${a.border}`}>
                    {f.badge}
                  </span>
                )}
                <div className={`rounded-xl p-2 w-fit ${a.iconBg} mb-3`}>
                  <Icon size={18} className={a.text} />
                </div>
                <div className="text-sm font-semibold text-white leading-tight">{f.label}</div>
                <div className="text-[11px] text-gray-500 mt-1 leading-snug">{f.description}</div>
              </button>
            );
          })}
        </div>
      </div>
    </IonContent>
  );
};

export default Prediction;
