import { useIonRouter } from "@ionic/react";
import { useControl } from "../../../contexts/useControlContext";

const Bots = () => {
  const router = useIonRouter();
  const {  bots, loading } = useControl();
  

  return (
   <>
   
   </>
  );
};

export default Bots;