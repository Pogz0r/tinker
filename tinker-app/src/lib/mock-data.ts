export const MOCK_ROSTER_NAMES = [
  'Shai Gilgeous-Alexander',
  'Tyrese Maxey',
  'Anthony Edwards',
  'Trey Murphy III',
  'Kawhi Leonard',
  'Jayson Tatum',
  'Bam Adebayo',
  'Victor Wembanyama',
  'Nikola Jokic',
  'Desmond Bane',
  'Kyle Kuzma',
  'Bogdan Bogdanovic',
  'Isaiah Stewart',
];

export const MOCK_ELIGIBLE_POSITIONS: Record<string, string[]> = {
  'Shai Gilgeous-Alexander': ['PG'],
  'Tyrese Maxey': ['PG'],
  'Anthony Edwards': ['SG', 'SF'],
  'Trey Murphy III': ['SG', 'SF'],
  'Kawhi Leonard': ['SF'],
  'Jayson Tatum': ['SF', 'PF'],
  'Bam Adebayo': ['PF', 'C'],
  'Victor Wembanyama': ['PF', 'C'],
  'Nikola Jokic': ['C'],
  'Desmond Bane': ['PG', 'SG'],
  'Kyle Kuzma': ['SF', 'PF'],
  'Bogdan Bogdanovic': ['SG', 'SF'],
  'Isaiah Stewart': ['PF', 'C'],
};

export const MOCK_INJURY_STATUS: Record<string, string> = {
  'Kawhi Leonard': 'GTD',
  'Jayson Tatum': 'OUT',
};

export const MOCK_MATCHUP = {
  week: 18,
  myTeam: 'Tinker Squad',
  opponent: 'TeamKobe24',
  categories: ['PTS', 'REB', 'AST', 'STL', 'BLK', '3PM', 'FG%', 'FT%', 'TO'] as const,
  myCurrentScores: [487.2, 198.4, 112.8, 38.2, 24.6, 72, 0.476, 0.812, 58],
  oppCurrentScores: [441.8, 221.6, 98.4, 31.6, 38.8, 48, 0.491, 0.778, 44],
  myProjectedScores: [712.4, 289.2, 141.6, 54.8, 35.2, 108, 0.469, 0.771, 88],
  oppProjectedScores: [698.6, 334.8, 144.2, 48.4, 61.6, 88, 0.488, 0.783, 66],
  currentScore: '5-4',
  projectedScore: '4-5',
};

export const MOCK_STANDINGS = [
  { rank: 1, team: 'The Dynasty', manager: 'Alex K.', w: 14, l: 3, t: 1 },
  { rank: 2, team: "Bron's Army", manager: 'Marcus T.', w: 13, l: 4, t: 1 },
  { rank: 3, team: 'Tinker Squad', manager: 'You', w: 12, l: 5, t: 1 },
  { rank: 4, team: "Ball Don't Lie", manager: 'Jordan M.', w: 11, l: 6, t: 1 },
  { rank: 5, team: 'KD Forever', manager: 'Chris P.', w: 10, l: 7, t: 1 },
  { rank: 6, team: 'Splash Bros', manager: 'Tyler W.', w: 9, l: 8, t: 1 },
  { rank: 7, team: 'Triple Double', manager: 'Sam R.', w: 8, l: 9, t: 1 },
  { rank: 8, team: 'Buckets Only', manager: 'Lisa H.', w: 7, l: 10, t: 1 },
  { rank: 9, team: 'Rim Rockers', manager: 'Dave N.', w: 6, l: 11, t: 1 },
  { rank: 10, team: 'Fast Break FC', manager: 'Emma L.', w: 5, l: 12, t: 1 },
  { rank: 11, team: 'Anklebreakers', manager: 'Mike O.', w: 4, l: 13, t: 1 },
  { rank: 12, team: 'Bench Warmers', manager: 'Nina C.', w: 3, l: 14, t: 1 },
];

export const MOCK_SCHEDULE_ADVANTAGE = {
  days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  myGames: [3, 2, 2, 3, 1, 2, 1],
  oppGames: [2, 3, 2, 1, 1, 2, 0],
};
