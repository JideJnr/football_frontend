import { useIonRouter } from "@ionic/react";
import { useControl } from "../../../../contexts/useControlContext";

const Bots = () => {
  const router = useIonRouter();
  const {  bot, getBotById, loading , startBot, stopBot  } = useControl();
  
  return (
   <>
   
   </>
  );
};

export default Bots;