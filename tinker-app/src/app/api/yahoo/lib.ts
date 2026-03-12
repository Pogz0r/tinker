export const yahooConfig = {
  clientId: process.env.YAHOO_CLIENT_ID!,
  clientSecret: process.env.YAHOO_CLIENT_SECRET!,
  redirectUri: process.env.YAHOO_REDIRECT_URI!,
  authUrl: 'https://api.login.yahoo.com/oauth2/request_auth',
  tokenUrl: 'https://api.login.yahoo.com/oauth2/get_token',
  scope: 'fspt-r',
};

export async function getLeagueInfo(accessToken: string) {
  // TODO: GET https://fantasysports.yahooapis.com/fantasy/v2/league/{leagueKey}
  throw new Error('Yahoo API not yet connected. Set YAHOO_CLIENT_ID and YAHOO_CLIENT_SECRET in .env.local');
}

export async function getMyTeam(accessToken: string) {
  // TODO: GET https://fantasysports.yahooapis.com/fantasy/v2/team/{teamKey}/roster
  throw new Error('Yahoo API not yet connected.');
}

export async function getMatchup(accessToken: string) {
  // TODO: GET https://fantasysports.yahooapis.com/fantasy/v2/team/{teamKey}/matchups
  throw new Error('Yahoo API not yet connected.');
}

export async function getAvailablePlayers(accessToken: string) {
  // TODO: GET https://fantasysports.yahooapis.com/fantasy/v2/league/{leagueKey}/players;status=A
  throw new Error('Yahoo API not yet connected.');
}
