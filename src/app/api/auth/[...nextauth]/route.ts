import NextAuth from 'next-auth';
import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { getSetting } from '@/lib/db';
import bcrypt from 'bcrypt';

const getAuthOptions = (): NextAuthOptions => {
  const secret = getSetting('nextauth_secret');

  if (!secret) {
    throw new Error('Missing nextauth_secret setting. Please complete the setup.');
  }

  return {
    providers: [
      CredentialsProvider({
        name: 'Credentials',
        credentials: {
          username: { label: 'Username', type: 'text' },
          password: { label: 'Password', type: 'password' },
        },
        async authorize(credentials) {
          if (!credentials) {
            return null;
          }

          const username = getSetting('username');
          const password = getSetting('password');

          if (
            username &&
            password &&
            credentials.username === username &&
            (await bcrypt.compare(credentials.password, password))
          ) {
            return { id: '1', name: username };
          } else {
            return null;
          }
        },
      }),
    ],
    secret: secret,
    session: {
      strategy: 'jwt',
    },
    pages: {
      signIn: '/login',
    },
  };
};

function handler(req: any, res: any) {
  return NextAuth(req, res, getAuthOptions());
}

export { handler as GET, handler as POST };
