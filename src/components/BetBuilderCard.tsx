import { ArrowLeftRight, CheckCircle2, XCircle } from "lucide-react"; // Optional icon set

const BetBuilderCard = () => {
  return (
    <div className="bg-white rounded-2xl shadow-2xl p-4 w-80 mx-auto font-sans relative">
      {/* Match Banner */}
      <div className="w-full h-20 bg-gradient-to-r from-red-600 to-blue-700 rounded-lg flex items-center justify-between px-4 relative">
        {/* Team 1 */}
        <div className="flex flex-col items-center text-white text-xs font-bold">
          <img
            src="https://upload.wikimedia.org/wikipedia/en/6/6a/H%C5%A0K_Zrinjski_Mostar_logo.png"
            className="h-8 mb-1"
            alt="Zrinjski"
          />
          <span className="text-[10px] leading-tight text-center">
            HSK Zrinjski Mostar
          </span>
        </div>

        {/* Team 2 */}
        <div className="flex flex-col items-center text-white text-xs font-bold">
          <img
            src="https://upload.wikimedia.org/wikipedia/en/1/1e/Slovan_Bratislava_logo.png"
            className="h-8 mb-1"
            alt="Slovan Bratislava"
          />
          <span className="text-[10px] leading-tight text-center">
            Slovan Bratislava
          </span>
        </div>
      </div>

      {/* Match Info */}
      <div className="text-center mt-3 text-xs text-gray-600">
        UEFA Champions League • 20:00 Tuesday
      </div>

      {/* Bet Type */}
      <div className="text-center mt-1 text-sm font-semibold text-black">
        Away/Away
      </div>
      <div className="text-center text-xs text-gray-400 mb-2">
        Half Time/Full Time
      </div>

      {/* Odds Box */}
      <div className="border border-green-500 text-center rounded-lg py-2 mt-2">
        <p className="text-[10px] text-green-500 uppercase font-medium">odds</p>
        <p className="text-2xl font-bold text-gray-900">4.02</p>
      </div>

      {/* Accept/Reject Buttons */}
      <div className="flex justify-between items-center mt-5 px-2">
        {/* Reject */}
        <button className="flex items-center justify-center w-10 h-10 rounded-full bg-red-600 hover:bg-red-700 text-white">
          <XCircle className="w-5 h-5" />
        </button>

        {/* Refresh */}
        <button className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-700">
          <ArrowLeftRight className="w-5 h-5" />
        </button>

        {/* Accept */}
        <button className="flex items-center justify-center w-10 h-10 rounded-full bg-green-600 hover:bg-green-700 text-white">
          <CheckCircle2 className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default BetBuilderCard;
