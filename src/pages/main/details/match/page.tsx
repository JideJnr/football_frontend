// pages/Match.tsx
import { IonContent, IonPage, useIonRouter } from '@ionic/react';
import { useData } from '../../../../contexts/useFootballContext';
import { useParams } from 'react-router';
import CustomHeader from '../../../../components/templates/header/header';
import StandingsTable from '../../../../components/table/table';
import LeagueInfo from '../../../../components/league/league';
import HeadToHead from '../../../../components/head2head/headtohead';
import TeamComparison from '../../../../components/comparison/comparison';
import LineupCard from '../../../../components/lineup/lineup';
import MatchOverview from '../../../../components/matchoverview/match';
import OddsBoard from '../../../../components/odds/odds';
import MatchHeader from './header/Header';
import { useState } from 'react';

const Match = () => {
  const { id } = useParams<{ id: string }>();
  const router = useIonRouter();
  const { league, getLeagueById, loading, error } = useData();
  const [activeTab, setActiveTab] = useState('Details');

  const sampleMatches = [
    {
      date: '2024-03-12',
      teamA: 'Millonarios',
      teamB: 'Llaneros',
      scoreA: 2,
      scoreB: 1,
      competition: 'Primera A'
    },
    {
      date: '2023-08-05',
      teamA: 'Llaneros',
      teamB: 'Millonarios',
      scoreA: 1,
      scoreB: 3,
      competition: 'Primera B'
    },
  ];

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