import { useIonRouter } from "@ionic/react";
import { useEffect, useState } from "react";
import { useFootballContext } from "../../../contexts/useFootballContext";


const Home = () => {
  const router = useIonRouter();

  const { fetchLiveMatches, liveMatches, loading } = useFootballContext();
  const [activeTab, setActiveTab] = useState("all");

  const tabList = [
    { id: "all", label: "All" },
    { id: "live", label: "Live" },
    { id: "upcoming", label: "Upcoming" },
    { id: "finished", label: "Finished" },
  ];

  useEffect(() => {
    
      fetchLiveMatches(); // call the API only when needed
    
  }, []);

  const renderMatches = (matchList: any[]) => (
    <div className="space-y-4 overflow-y-auto">
      {matchList.map((match, idx) => (
        <section
          key={idx}
          className="border border-green-700 p-3 rounded hover:border-green-500 transition"
          onClick={() =>
            router.push(`/match/${match.id}`, "forward", "push")
          }
        >
          <h2 className="uppercase text-xs mb-2 flex items-center">
            <span className="mr-1">🏆</span>
            {match.leagueName || "Unknown League"}
          </h2>
          <div className="text-xxs text-green-600 mb-1">
            🕓 {match.date} — {match.time} 
          </div>
          <div className="flex justify-between items-center">
            <div>
              ⚽️ {match.homeTeam} {"-"}{" "}
              {match.score ?? "--"}{" "}{"-"}
              {match.awayTeam ?? "-"}
            </div>
          </div>
        </section>
      ))}
    </div>
  );

  return (
    <div className="w-full h-full bg-black text-green-400 font-mono flex flex-col gap-6 p-4">
      {/* Tabs */}
      <div className="mb-4 flex space-x-4">
        {tabList.map((tab) => (
          <button
            key={tab.id}
            className={`px-3 py-1 text-xs rounded-full border transition duration-200 ${
              activeTab === tab.id
                ? "border-green-600 bg-green-800"
                : ""
            }`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center text-green-500">Loading...</div>
      ) : activeTab === "live" ? (
        renderMatches(liveMatches || [])
      ) : activeTab === "upcoming" ? (
        renderMatches( [])
      ) : activeTab === "finished" ? (
        renderMatches( [])
      ) : (
        renderMatches( [])
      )}
    </div>
  );
};

export default Home;
