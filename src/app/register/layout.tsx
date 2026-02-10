import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Регистрация — начните бесплатно",
  description: "Создайте аккаунт Moonely и получите 10 бесплатных сайтов. Регистрация за 30 секунд, без привязки карты.",
  openGraph: {
    title: "Регистрация в Moonely — бесплатный старт",
    description: "Зарегистрируйтесь и создайте первый сайт за 60 секунд. Бесплатно, без карты.",
  },
};

export default function RegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
