import {  useIonRouter } from '@ionic/react';

const navItems = [
  { label: 'Bet Builder', route: '/builder' },
  { label: 'Engines', route: '/engines' },
  { label: 'Upcoming Suggestions', route: '/suggestions' },
  { label: 'User Rating', route: '/rating' },
];  

const Prediction = () => {
  const router = useIonRouter();

  const handleNavigation = (route: string) => {
    router.push(route, 'forward', 'push');
  };



  return (
  <div className='w-full h-full flex flex-col gap-4'>
            {navItems.map((item, index) => (
              <div
                key={index}
                onClick={() => handleNavigation(item.route)}
                className="cursor-pointer border border-green-700 hover:bg-green-900 hover:text-black p-3 rounded transition-all"
              >
                🚀 {item.label}
              </div>
            ))}
  </div>  
     
  );
};

export default Prediction;
