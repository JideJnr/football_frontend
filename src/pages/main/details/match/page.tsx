// pages/Match.tsx
import { IonContent, IonPage, useIonRouter } from '@ionic/react';
import { useParams } from 'react-router';
import CustomHeader from '../../../../components/templates/header/header';
import StandingsTable from '../../../../components/table/table';
import LeagueInfo from '../../../../components/league/league';
import TeamComparison from '../../../../components/comparison/comparison';
import LineupCard from '../../../../components/lineup/lineup';
import MatchOverview from '../../../../components/matchoverview/match';
import OddsBoard from '../../../../components/odds/odds';
import MatchHeader from './header/Header';
import { useEffect, useState } from 'react';
import { useFootballContext } from '../../../../contexts/useFootballContext';

const Match = () => {
  const { id } = useParams<{ id: string }>();
  const router = useIonRouter();
  const [activeTab, setActiveTab] = useState('Home');
  
  const { getMatchById, currentMatch , loading } = useFootballContext();

  useEffect(() => {
    if (id) {
      getMatchById(id);
    }
  }, [id]);
  
  const renderTabContent = () => {
    switch (activeTab) {
      case 'Home':
        return (
          <>
            <MatchOverview />
          </>
        );
      case 'Details':
        return (
          <>
            <TeamComparison />
          </>
        );
      case 'Lineups':
        return <LineupCard />;
      case 'Statistics':
        return (
          <>
            <LeagueInfo />
            <StandingsTable />

          </>
        );
      case 'Odds':
        return <OddsBoard />;
      case 'Comparison':
        return <OddsBoard />;
      case 'H2H':
        return <OddsBoard />;
      case 'Prediction':
        return <OddsBoard />;
      default:
        return <MatchOverview />;
    }
  };

  if (!id) {
    router.push('/main');
    return null;
  }

  return (
    <IonPage>
      <CustomHeader />
      <MatchHeader activeTab={activeTab} setActiveTab={setActiveTab} />
      <IonContent className="w-full h-full text-green-400 bg-black font-mono overflow-y-auto">
        {renderTabContent()}
      </IonContent>
    </IonPage>
  );
};

export default Match;