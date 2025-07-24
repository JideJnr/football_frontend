import { useState } from "react";
import Header from "../../components/templates/header/header";

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState("best");

  const tabList = [
    { id: "bot", label: "All Bot" },
    { id: "win", label: "Win %" },
    { id: "odd", label: "Highest Odd" },
  ];



  return (
    <div className="w-full h-full p-4 text-green-400 bg-black font-mono flex flex-col gap-4">
      <Header/>
      {/* Top Summary Section */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-900 p-4 border border-green-600 rounded shadow-lg">
          <p className="text-sm">✅</p>
          <p className="text-sm">Success Rate</p>
          <h2 className="text-xl font-bold">72%</h2>
        </div>
        <div className="bg-gray-900 p-4 border border-green-600 rounded shadow-lg">
          <p className="text-sm">🤖</p>
          <p className="text-sm">Biggest Combo</p>
          <h2 className="text-xl font-bold">5</h2>
        </div>
        <div className="bg-gray-900 p-4 border border-green-600 rounded shadow-lg">
          <p className="text-sm">📦</p>
          <p className="text-sm"> Total Engines</p>
          <h2 className="text-xl font-bold">12</h2>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-green-600 mb-4 flex space-x-8 w-full">
        {tabList.map((tab) => (
          <button
            key={tab.id}
            className={`pb-1 border-b-2 ${
              activeTab === tab.id
                ? "border-green-400"
                : "border-transparent hover:border-green-600"
            }`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-gray-900 p-4 border border-green-600 rounded">
        {activeTab === "best" && (
          <ul className="space-y-2">
            <li>🔥 3 shots in 20 mins → 72% win rate</li>
            <li>⚡ 1 goal + 5 corners → 65% win</li>
            <li>🚀 High press early + yellow card → 68% win</li>
          </ul>
        )}

        {activeTab === "win" && (
          <ul className="space-y-2">
            <li>Bot A: 78%</li>
            <li>Bot B: 66%</li>
            <li>Bot C: 59%</li>
          </ul>
        )}

        {activeTab === "odd" && (
          <ul className="space-y-2">
            <li>Match A: 3.5 odds</li>
            <li>Match B: 4.2 odds</li>
            <li>Match C: 5.0 odds</li>
          </ul>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
