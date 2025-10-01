import { NextResponse } from 'next/server';
import { getSetting } from '@/lib/db';

export async function GET() {
  const bindizrUrl = getSetting('bindizr_url');
  const secretKey = getSetting('secret_key');

  return NextResponse.json({
    bindizrUrl,
    secretKey,
  });
}
