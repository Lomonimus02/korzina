import { redirect } from "next/navigation";
import Link from "next/link";
import { User, CreditCard, History, ChevronLeft } from "lucide-react";
import { getAuthSession } from "@/lib/auth";
import prisma from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function AccountPage() {
  const session = await getAuthSession();

  if (!session?.user?.email) {
    return redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: {
      transactions: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  // Calculate remaining free generations for FREE plan users
  const FREE_DAILY_LIMIT = 3;
  const FREE_MONTHLY_LIMIT = 15;
  const now = new Date();
  const dailyUsed = user && (!user.dailyResetAt || now >= user.dailyResetAt) ? 0 : (user?.dailyGenerations || 0);
  const monthlyUsed = user && (!user.monthlyResetAt || now >= user.monthlyResetAt) ? 0 : (user?.monthlyGenerations || 0);
  const remainingDaily = Math.max(0, FREE_DAILY_LIMIT - dailyUsed);
  const remainingMonthly = Math.max(0, FREE_MONTHLY_LIMIT - monthlyUsed);

  if (!user) {
    return redirect("/login");
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Mobile Header */}
      <div className="md:hidden h-14 border-b flex items-center px-4 shrink-0 bg-background">
        <Link href="/" className="active:scale-95 transition-transform p-1 hover:bg-muted rounded-full mr-2">
          <ChevronLeft className="h-6 w-6" />
        </Link>
        <span className="font-semibold">Аккаунт</span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth">
        <div className="max-w-4xl mx-auto space-y-8 pb-12">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Настройки аккаунта</h1>
            <p className="text-muted-foreground">Управление профилем и подпиской.</p>
          </div>

          <div className="grid gap-8 md:grid-cols-2">
            {/* Profile Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Профиль
                </CardTitle>
              </CardHeader>
              <CardContent className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={session.user.image || ""} />
                  <AvatarFallback className="text-lg bg-primary/10">
                    {session.user.email[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-lg">{session.user.name || "Пользователь"}</p>
                  <p className="text-muted-foreground">{session.user.email}</p>
                </div>
              </CardContent>
            </Card>

            {/* Credits Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  {user.plan === 'FREE' ? 'Бесплатный план' : 'Кредиты'}
                </CardTitle>
                <CardDescription>
                  {user.plan === 'FREE'
                    ? '3 генерации в день, максимум 15 в месяц'
                    : 'Ваши доступные кредиты для генераций'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {user.plan === 'FREE' ? (
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div>
                        <span className="text-4xl font-bold">{remainingMonthly}</span>
                        <span className="text-muted-foreground ml-2">ген. осталось в месяце</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Сегодня: {remainingDaily} из {FREE_DAILY_LIMIT} доступно
                      </p>
                    </div>
                    <Button asChild>
                      <Link href="/pricing">Upgrade</Link>
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-4xl font-bold">{user.credits}</span>
                      <span className="text-muted-foreground ml-2">кредитов</span>
                    </div>
                    <Button asChild>
                      <Link href="/pricing">Пополнить</Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Transaction History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                История транзакций
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                {user.transactions.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">
                    Транзакций не найдено.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Дата</TableHead>
                        <TableHead>Сумма</TableHead>
                        <TableHead>Кредиты</TableHead>
                        <TableHead className="text-right">Статус</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {user.transactions.map((tx) => (
                        <TableRow key={tx.id}>
                          <TableCell>
                            {new Date(tx.createdAt).toLocaleDateString("ru-RU", {
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                            })}
                          </TableCell>
                          <TableCell>{tx.amount} ₽</TableCell>
                          <TableCell>+100</TableCell>
                          <TableCell className="text-right">
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                tx.status === "PAID"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-yellow-100 text-yellow-800"
                              }`}
                            >
                              {tx.status === "PAID" ? "Оплачено" : "Ожидание"}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
