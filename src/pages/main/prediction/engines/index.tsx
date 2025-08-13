import { useIonRouter } from '@ionic/react';
import { useEffect } from 'react';
import BackTemplate from '../../../../components/templates/back/back';

const navItems = [
  { label: 'Phillip', route: '/philip' },
  { label: 'joshua', route: '/joshua' },
  { label: 'raymond', route: '/raymond' },
  { label: 'tiffany', route: '/tiffany' },
];

const Engines = () => {
  const router = useIonRouter();

  const handleNavigation = (route: string) => {
    router.push(route, 'forward', 'push');
  };

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
            {navItems.map((item, index) => (
              <div
                key={index}
                onClick={() => handleNavigation(item.route)}
                className="cursor-pointer border border-green-700 hover:bg-green-900 hover:text-black p-3 rounded transition-all"
              >
                🚀 {item.label} - 56%
              </div>
            ))}
  </BackTemplate>
     
  );
};

export default Engines;
