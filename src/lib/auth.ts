import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { getNextAuthSecret, getSetting } from '@/lib/db';
import bcrypt from 'bcrypt';

export const getAuthOptions = (): NextAuthOptions => {
  const secret = getNextAuthSecret();

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
