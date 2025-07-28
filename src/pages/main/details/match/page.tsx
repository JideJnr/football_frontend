import {  IonContent, IonPage, useIonRouter } from '@ionic/react';
import { useData } from '../../../../contexts/useFootballContext';
import { useParams } from 'react-router';
import Header from '../../../../components/templates/header/header';
import CustomHeader from '../../../../components/templates/header/header';
import { Tab } from '@headlessui/react';
import StandingsTable from '../../../../components/table/table';
import LeagueInfo from '../../../../components/league/league';
import HeadToHead from '../../../../components/head2head/headtohead';
import TeamComparison from '../../../../components/comparison/comparison';
import LineupCard from '../../../../components/lineup/lineup';
import MatchOverview from '../../../../components/matchoverview/match';
import OddsBoard from '../../../../components/odds/odds';


const League = () => {
  const { id } = useParams<{ id: string }>();
  const router = useIonRouter();
  const { league, getLeagueById , loading, error } = useData()

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

  return (
    <IonPage>
      <IonContent className="w-full h-full text-green-400 bg-black font-mono">
        <CustomHeader/>

      <div className="bg-[#121212] text-white rounded-md p-4 w-full max-w-md mx-auto border border-gray-700 shadow-lg">
      {/* Date and Time */}
      <div className="text-sm text-gray-400 text-center mb-2">
        25/07/2025 • 19:45
      </div>

      {/* Match Info */}
      <div className="flex items-center justify-between mb-3">
        {/* Team 1 */}
        <div className="flex flex-col items-center w-1/3">
          <img src="https://upload.wikimedia.org/wikipedia/en/thumb/f/f5/Royal_Antwerp_FC_logo.svg/1200px-Royal_Antwerp_FC_logo.svg.png" alt="Royal Antwerp" className="h-10 mb-1" />
          <span className="text-sm">Royal Antwerp</span>
        </div>

        {/* Score */}
        <div className="text-center w-1/3">
          <div className="text-2xl font-bold">1 - 1</div>
          <div className="text-xs text-gray-400">Finished</div>
        </div>

        {/* Team 2 */}
        <div className="flex flex-col items-center w-1/3">
          <img src="https://upload.wikimedia.org/wikipedia/en/thumb/3/37/Union_Saint-Gilloise_logo_2020.svg/1200px-Union_Saint-Gilloise_logo_2020.svg.png" alt="USG" className="h-10 mb-1" />
          <span className="text-sm">USG</span>
        </div>
      </div>

      {/* Scorers */}
      <div className="flex justify-between text-xs text-gray-300 px-4">
        <div className="text-left">
          Vincent Janssen <span className="text-gray-500">36'</span>
        </div>
        <div className="text-right">
          Raul Florucz <span className="text-gray-500">68'</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex justify-around mt-4 text-[11px] text-gray-400">
        {["Details", "Lineups", "Statistics", "Commentary"].map((tab, idx) => (
          <span key={idx} className="hover:text-green-400 cursor-pointer">
            {tab}
          </span>
        ))}
      </div>
      </div>

      <StandingsTable/>
      <LeagueInfo/>
      <HeadToHead teamA="Millonarios" teamB="Llaneros" history={sampleMatches} />


      <TeamComparison />

      <LineupCard/>

      <MatchOverview/>
      <OddsBoard/>

          

      </IonContent>
    </IonPage>
  );
};

export default League;
