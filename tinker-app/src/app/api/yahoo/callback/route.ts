import { NextRequest, NextResponse } from 'next/server';
import { yahooConfig } from '../lib';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.redirect(
      new URL(`/dashboard?yahoo_error=${encodeURIComponent(error)}`, req.url)
    );
  }

  if (!code) {
    return NextResponse.redirect(new URL('/dashboard?yahoo_error=no_code', req.url));
  }

  try {
    const credentials = Buffer.from(
      `${yahooConfig.clientId}:${yahooConfig.clientSecret}`
    ).toString('base64');

    const tokenRes = await fetch(yahooConfig.tokenUrl, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: yahooConfig.redirectUri,
      }),
    });

    if (!tokenRes.ok) {
      const text = await tokenRes.text();
      console.error('Yahoo token exchange failed:', text);
      return NextResponse.redirect(
        new URL('/dashboard?yahoo_error=token_exchange_failed', req.url)
      );
    }

    const tokens = await tokenRes.json();
    // TODO: Store tokens securely (session, encrypted cookie, or DB)
    // For now, redirect back to dashboard with success indicator
    const response = NextResponse.redirect(new URL('/dashboard?yahoo_connected=true', req.url));
    response.cookies.set('yahoo_access_token', tokens.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: tokens.expires_in,
      path: '/',
    });
    return response;
  } catch (err) {
    console.error('Yahoo OAuth callback error:', err);
    return NextResponse.redirect(
      new URL('/dashboard?yahoo_error=callback_error', req.url)
    );
  }
}
