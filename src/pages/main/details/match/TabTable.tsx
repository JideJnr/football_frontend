import { Empty, StandingsTable } from './shared';

const TabTable = ({ m }: { m: any }) => {
  const standings: any[] = m?.standings || [];
  if (!standings.length) return <Empty msg="No standings available" />;
  return (
    <div className="px-4 py-4">
      <StandingsTable m={m} standings={standings} full />
    </div>
  );
};

export default TabTable;
