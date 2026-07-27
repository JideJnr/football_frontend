import { IonHeader } from "@ionic/react";

interface HeaderProps {
  wsConnected?: boolean;
  predictionCount?: number | null;
  selectedTab?: number;
}

const tabTitles = ["Matches", "Predictions", "Tournaments", "Settings"];

const CustomHeader = ({ wsConnected = false, predictionCount = null, selectedTab = 0 }: HeaderProps) => (
  <IonHeader className="ion-no-border">
    <div className="flex items-center justify-between px-4 py-3 bg-[#0e0e0e] border-b border-white/[0.06]">
      {/* Left: brand */}
      <div className="flex items-center gap-2">
        <span className="text-white font-bold text-base tracking-tight">SIGNAL</span>
        <span className="text-lg leading-none">👁️</span>
      </div>

      {/* Center: page title */}
      <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
        {tabTitles[selectedTab] ?? ""}
      </span>

      {/* Right: live indicator + prediction badge */}
      <div className="flex items-center gap-2">
        {predictionCount !== null && predictionCount > 0 && (
          <span className="text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 rounded-full px-2 py-0.5">
            {predictionCount} picks
          </span>
        )}
        <span
          className={`w-2 h-2 rounded-full ${wsConnected ? "bg-emerald-400" : "bg-gray-600"}`}
          title={wsConnected ? "Live feed connected" : "Connecting…"}
        />
      </div>
    </div>
  </IonHeader>
);

export default CustomHeader;
