import MatchupScoreboard from '@/components/dashboard/MatchupScoreboard';
import AIInsightCard from '@/components/dashboard/AIInsightCard';
import ScheduleAdvantage from '@/components/dashboard/ScheduleAdvantage';
import LeagueStandings from '@/components/dashboard/LeagueStandings';
import WaiverTargets from '@/components/dashboard/WaiverTargets';
import TeamCategoryProfile from '@/components/dashboard/TeamCategoryProfile';

export const metadata = {
  title: 'Dashboard — Tinker',
};

export default function DashboardPage() {
  return (
    <div className="p-6 space-y-5">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-bold" style={{ color: '#f4f4f5' }}>
          Dashboard
        </h1>
        <p className="text-sm mt-0.5" style={{ color: '#71717a' }}>
          Week 18 · Tinker Squad
        </p>
      </div>

      {/* Matchup scoreboard — full width */}
      <MatchupScoreboard />

      {/* AI Insight + Schedule Advantage */}
      <div className="grid gap-5" style={{ gridTemplateColumns: '5fr 7fr' }}>
        <AIInsightCard />
        <ScheduleAdvantage />
      </div>

      {/* League Standings + Waiver Targets */}
      <div className="grid gap-5" style={{ gridTemplateColumns: '5fr 7fr' }}>
        <LeagueStandings />
        <WaiverTargets />
      </div>

      {/* Team Category Profile — full width */}
      <TeamCategoryProfile />
    </div>
  );
}
