import { useEffect } from 'react';
import BackTemplate from '../../../../../components/templates/back/back';



const Engines = () => {
  useEffect(() => {
    // Placeholder for future data fetching or side effects
  }, []);

    const refresh = (e: CustomEvent) => {
    try {
      e.detail.complete();
    } catch (err) {
      console.error("Refresh error:", err);
      e.detail.complete();
    }
  };

  return (  
  <BackTemplate refresh={refresh}>
    // name predictions 
    // highest predicted odds
    // best league 
    // upcoming predictions per game

  </BackTemplate>
     
  );
};

export default Engines;