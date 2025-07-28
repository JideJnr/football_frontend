import { useIonRouter } from "@ionic/react";
import Button from "../../../components/button/button";

const Settings = () => {
  const router = useIonRouter();

  const navigateToAnalytics = () => {
    router.push("/analytics", "forward", "push");
  };


    const navigateToNotification = () => {
    router.push("/services", "forward", "push");
  };


  const toggleDarkMode = () => {
    console.log("🌓 Dark mode toggled");
  };

  const handleSignOut = () => {
    console.log("👤 Signed out");
    router.push("/login", "root", "replace");
  };

  return (
    <div className="w-full h-full py-4 flex flex-col gap-4">

      {/* Profile Avatar Placeholder */}
      <div className="flex justify-center mb-4">
        <div className="w-32 h-32 border-2 border-green-400 rounded-full" />
      </div>

      {/* Options */}
      <div className="space-y-4">
        <div
          onClick={navigateToAnalytics}
          className="cursor-pointer border border-green-700 hover:bg-green-900 hover:text-black p-3 rounded transition-all"
        >
          📊 Analytics
        </div>

        <div
          onClick={navigateToNotification}
          className="cursor-pointer border border-green-700 hover:bg-green-900 hover:text-black p-3 rounded transition-all"
        >
          🛠 Notification
        </div>

        <div
          onClick={toggleDarkMode}
          className="cursor-pointer border border-green-700 hover:bg-green-900 hover:text-black p-3 rounded transition-all"
        >
          🌙 Toggle Dark Mode
        </div>
      </div>

      {/* Sign Out Button */}
      <div className="mt-12">
        <Button
          className="w-full bg-red-600 text-white font-semibold hover:bg-red-800"
          text="🚪 Sign Out"
          onClick={handleSignOut}
        />
      </div>
    </div>
  );
};

export default Settings;
