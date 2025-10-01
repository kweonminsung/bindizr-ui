import { NextResponse } from 'next/server';
import db, { isSetupComplete } from '@/lib/db';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

export async function POST(req: Request) {
  if (isSetupComplete()) {
    return NextResponse.json(
      { message: 'Setup has already been completed.' },
      { status: 400 }
    );
  }

  const { bindizrUrl, secretKey, username, password } = await req.json();

  if (!bindizrUrl) {
    return NextResponse.json(
      { message: 'Bindizr Server URL is required.' },
      { status: 400 }
    );
  }

  try {
    db.prepare("INSERT INTO settings (key, value) VALUES ('bindizr_url', ?)").run(bindizrUrl);
    if (secretKey) {
      db.prepare("INSERT INTO settings (key, value) VALUES ('secret_key', ?)").run(secretKey);
    }

    if (username && password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      db.prepare(
        "INSERT INTO settings (key, value) VALUES ('username', ?)"
      ).run(username);
      db.prepare(
        "INSERT INTO settings (key, value) VALUES ('password', ?)"
      ).run(hashedPassword);
    }

    db.prepare("INSERT INTO settings (key, value) VALUES ('setup_complete', 'true')").run();

    const secret = crypto.randomBytes(32).toString('hex');
    db.prepare("INSERT INTO settings (key, value) VALUES ('nextauth_secret', ?)").run(secret);

    return NextResponse.json({ message: 'Setup successful.' });
  } catch (error) {
    console.error('Setup error:', error);
    return NextResponse.json(
      { message: 'An error occurred during setup.' },
      { status: 500 }
    );
  }
}
