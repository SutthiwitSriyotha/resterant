import { AuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { connectDB } from './mongodb';
import { ObjectId } from 'mongodb';

export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          return null;
        }

        const db = await connectDB();
        const store = await db.collection('stores').findOne({ username: credentials.username });

        if (store && store.password === credentials.password) {
          return {
            id: store._id.toString(),
            name: store.name || store.username,
            email: store.username, // ใส่ username เป็น email ให้ next-auth ใช้งานได้
          };
        }

        return null;
      },
    }),
  ],
  pages: {
    signIn: '/store/login',
  },
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token?.id && session.user) {
        // ต้องตรวจสอบว่ามี session.user ก่อน แล้วค่อยเพิ่ม id
        session.user.id = token.id as string;
      }
      return session;
    },
  },
};
