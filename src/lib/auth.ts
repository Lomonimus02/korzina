import { NextAuthOptions, getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import prisma from "@/lib/db";
import bcrypt from "bcryptjs";
import type { Adapter } from "next-auth/adapters";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as Adapter,
  session: {
    strategy: "jwt",
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true, // Автоматическое связывание аккаунтов по email
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "email@example.com" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: {
            email: credentials.email,
          },
        });

        if (!user) {
          return null;
        }

        // OAuth пользователи без пароля не могут входить через credentials
        if (!user.password) {
          throw new Error("Используйте вход через Google");
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isPasswordValid) {
          return null;
        }

        // Check if email is verified
        if (!user.isVerified) {
          throw new Error("Пожалуйста, подтвердите ваш email");
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name || user.email,
          image: user.image,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ account }) {
      // OAuth пользователи автоматически верифицированы
      // Верификация происходит в events.createUser и events.linkAccount,
      // а не здесь — чтобы избежать гонки с адаптером, который ещё не создал пользователя
      if (account?.provider && account.provider !== "credentials") {
        return true;
      }
      return true;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        session.user.image = token.picture as string;
        (session.user as any).id = token.id as string;
        (session.user as any).role = token.role as string; 
      }
      return session;
    },
    async jwt({ token, user, account, trigger, session }) {
      // КРИТИЧНО: Для OAuth пользователей user.id может быть ID от провайдера (Google),
      // а не UUID из нашей базы данных. Поэтому всегда берём ID из БД по email.
      if (account && account.provider !== "credentials" && user?.email) {
        // Даём адаптеру время завершить создание пользователя (для новых OAuth юзеров)
        let dbUser = await prisma.user.findUnique({
          where: { email: user.email },
          select: { id: true, name: true, image: true, role: true }
        });
        
        // Если пользователь не найден (гонка при создании), ждём и пробуем ещё раз
        if (!dbUser) {
          await new Promise(resolve => setTimeout(resolve, 500));
          dbUser = await prisma.user.findUnique({
            where: { email: user.email },
            select: { id: true, name: true, image: true, role: true }
          });
        }
        
        if (dbUser) {
          token.id = dbUser.id;  // Правильный UUID из БД
          token.name = dbUser.name || user.name;
          token.picture = dbUser.image || user.image;
          token.role = dbUser.role; // Include role for admin check
        } else {
          // Фолбэк: используем данные от провайдера
          token.id = user.id;
          token.name = user.name;
          token.picture = user.image;
          token.role = "USER";
        }
        token.email = user.email;
      } else if (user) {
        // Credentials provider - user.id уже правильный UUID из authorize()
        // Fetch role from DB for credentials users
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { role: true }
        });
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.picture = user.image;
        token.role = dbUser?.role || 'USER';
      }
      
      // Обновляем токен при изменении сессии
      if (trigger === "update" && session) {
        token.name = session.name;
        token.picture = session.image;
      }
      
      return token;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  events: {
    // Для НОВЫХ OAuth пользователей - только верификация
    // НЕ трогаем credits! FREE-план работает через счётчики dailyGenerations/monthlyGenerations (3/день, 15/месяц)
    // credits @default(0) в схеме — используется только для платных планов
    async createUser({ user }) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          isVerified: true,
          emailVerified: new Date(),
          // credits: 10 — УБРАНО! Иначе перезапишет существующие кредиты при связывании
        },
      });
    },
    // При связывании OAuth аккаунта с существующим пользователем
    async linkAccount({ user }) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          isVerified: true,
          emailVerified: new Date(),
        },
      });
    },
  },
};

export const getAuthSession = () => getServerSession(authOptions);
