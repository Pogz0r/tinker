import { NextResponse } from 'next/server';
import { yahooConfig } from '../lib';

export async function GET() {
  if (yahooConfig.clientId === 'placeholder' || !yahooConfig.clientId) {
    return NextResponse.json(
      { error: 'Yahoo API credentials not configured. Set YAHOO_CLIENT_ID and YAHOO_CLIENT_SECRET in .env.local' },
      { status: 400 }
    );
  }

  const params = new URLSearchParams({
    client_id: yahooConfig.clientId,
    redirect_uri: yahooConfig.redirectUri,
    response_type: 'code',
    scope: yahooConfig.scope,
  });

  const authUrl = `${yahooConfig.authUrl}?${params.toString()}`;
  return NextResponse.redirect(authUrl);
}
