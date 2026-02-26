import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Вход в аккаунт",
  description: "Войдите в Moonely и продолжите создавать профессиональные сайты за 60 секунд. Ваши проекты ждут вас.",
  robots: "noindex, nofollow",
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
