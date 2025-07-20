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
    <div className="w-full h-full max-w-screen max-h-screen flex bg-gray-100">
      <div className="w-full h-fit pt-8 gap-8 flex flex-col overflow-x-none overflow-y-auto text-sm">
        <div className="flex-col flex gap-4">
          <div className="w-full flex">
            <div className="mx-auto my-auto border border-white w-24 h-24"></div>
          </div>
          <div className="mx-auto w-fit">
            <p className="font-medium text-lg"></p>
          </div>
        </div>

        <div className="w-full flex flex-col px-4 2xl:px-8">
        
                  {/* Services Button */}
          <div
            onClick={navigateToServices}
            className="flex w-full items-center justify-between border-y rounded-lg p-2 px-3 text-md font-semibold leading-7 text-gray-900 hover:bg-gray-50 cursor-pointer"
          >
            <p>Main</p>
          </div>
          <div
            onClick={navigateToAnalytics}
            className="flex w-full items-center justify-between border-y rounded-lg p-2 px-3 text-md font-semibold leading-7 text-gray-900 hover:bg-gray-50 cursor-pointer"
          >
            <p>Analytics</p>
          </div>



          {/* Dark Mode Toggle */}
          <div
            onClick={toggleDarkMode}
            className="flex w-full items-center justify-between border-y rounded-lg py-2 px-3 text-md font-semibold leading-7 text-gray-900 hover:bg-gray-50 cursor-pointer"
          >
            <p>DarkMode</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;