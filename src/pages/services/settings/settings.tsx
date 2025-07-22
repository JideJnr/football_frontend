import { useIonRouter } from "@ionic/react";
import Button from "../../../components/button/button";

const Settings = () => {
  const router = useIonRouter();

  // Navigate to different pages
  const navigateToAnalytics = () => {
    router.push("/analytics", "forward", "push");
  };

  const navigateToServices = () => {
    router.push("/", "forward", "push");
  };

  const toggleDarkMode = () => {
    // Logic for dark mode toggle (if needed)
    console.log("Dark mode toggled");
  };

  return (
        <div className="bg-black text-green-400 font-mono w-full h-full px-4 py-8 flex flex-col gap-4">

      {/* Profile Avatar Placeholder */}
      <div className="flex justify-center mb-4">
        <div className="w-24 h-24 border-2 border-green-400 rounded-full" />
      </div>

      {/* Options */}
      <div className="space-y-4">
        

        <div
          onClick={navigateToServices}
          className="cursor-pointer border border-green-700 hover:bg-green-900 hover:text-black p-3 rounded transition-all"
        >
          🛠 Services
        </div>


        <div
          onClick={toggleDarkMode}
          className="cursor-pointer border border-green-700 hover:bg-green-900 hover:text-black p-3 rounded transition-all"
        >
          🌙 Toggle Dark Mode
        </div>
      </div>

    </div>
  );
};

export default Settings;