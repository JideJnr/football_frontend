import { useIonRouter } from "@ionic/react";
import { useControl } from "../../../../contexts/useControlContext";

const Bots = () => {
  const router = useIonRouter();
  const {  bot, getBotById, loading , startBotById, stopBotById  } = useControl();
  
  return (
   <>
   <p>
    a
   </p>
   </>
  );
};

export default Bots;