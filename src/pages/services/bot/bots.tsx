import { useIonRouter } from "@ionic/react";
import { useControl } from "../../../contexts/useControlContext";


const Bots = () => {
  const router = useIonRouter();
  const {  getAllBot , bots , loading   } = useControl();
  
  return (
   <>
   <p>a</p>
   </>
  );
};

export default Bots;