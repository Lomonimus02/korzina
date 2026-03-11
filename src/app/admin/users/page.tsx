"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Users,
  Search,
  X,
  ArrowLeft,
  CreditCard,
  Mail,
  Calendar,
  Shield,
  Zap,
  MessageSquare,
  Globe,
  DollarSign,
  Filter,
  Eye,
  Crown,
  Hash,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import type { AdminUserRow, AdminUserDetail, UserPlanFilter } from "@/app/actions/admin-stats";
import { getAllUsers, getUserDetail } from "@/app/actions/admin-stats";

function fmt$(v: number) {
  return "$" + v.toFixed(6);
}

const PLAN_COLORS: Record<string, string> = {
  FREE: "bg-zinc-500/10 text-zinc-400",
  STARTER: "bg-blue-500/10 text-blue-300",
  CREATOR: "bg-purple-500/10 text-purple-300",
  PRO: "bg-amber-500/10 text-amber-300",
  STUDIO: "bg-emerald-500/10 text-emerald-300",
  AGENCY: "bg-rose-500/10 text-rose-300",
};

const PLAN_LABELS: Record<string, string> = {
  FREE: "Free",
  STARTER: "Starter",
  CREATOR: "Creator",
  PRO: "Pro",
  STUDIO: "Studio",
  AGENCY: "Agency",
};

const FILTER_OPTIONS: { value: UserPlanFilter; label: string }[] = [
  { value: "ALL", label: "Все" },
  { value: "FREE", label: "Бесплатные" },
  { value: "PAID", label: "Платные" },
  { value: "STARTER", label: "Starter" },
  { value: "CREATOR", label: "Creator" },
  { value: "PRO", label: "Pro" },
  { value: "STUDIO", label: "Studio" },
  { value: "AGENCY", label: "Agency" },
];

export default function AdminUsersPage() {
  // ── State: user list ──
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);

  // ── State: search & filters ──
  const [searchEmail, setSearchEmail] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [planFilter, setPlanFilter] = useState<UserPlanFilter>("ALL");
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  // ── State: user detail view ──
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [userDetail, setUserDetail] = useState<AdminUserDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const handleSearchChange = (value: string) => {
    setSearchEmail(value);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setActiveSearch(value);
    }, 500);
  };

  const clearSearch = () => {
    setSearchEmail("");
    setActiveSearch("");
  };

  const loadUsers = useCallback(async (p: number, email: string, filter: UserPlanFilter) => {
    setLoading(true);
    try {
      const res = await getAllUsers(p, 20, email, filter);
      setUsers(res.data);
      setPage(res.page);
      setTotalPages(res.totalPages);
      setTotalUsers(res.total);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  // Reload when search/filter changes
  useEffect(() => {
    loadUsers(1, activeSearch, planFilter);
  }, [activeSearch, planFilter, loadUsers]);

  const openUserDetail = async (userId: string) => {
    setSelectedUserId(userId);
    setLoadingDetail(true);
    try {
      const detail = await getUserDetail(userId);
      setUserDetail(detail);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingDetail(false);
    }
  };

  const closeDetail = () => {
    setSelectedUserId(null);
    setUserDetail(null);
  };

  // ── User Detail View ──
  if (selectedUserId) {
    return (
      <div className="p-6 md:p-8 space-y-6 max-w-[1440px] mx-auto">
        <button
          onClick={closeDetail}
          className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Назад к списку пользователей
        </button>

        {loadingDetail ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-6 w-6 animate-spin text-zinc-600" />
          </div>
        ) : userDetail ? (
          <UserDetailView user={userDetail} />
        ) : (
          <div className="text-center text-zinc-600 py-16">
            Пользователь не найден
          </div>
        )}
      </div>
    );
  }

  // ── User List View ──
  return (
    <div className="p-6 md:p-8 space-y-6 max-w-[1440px] mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100 tracking-tight flex items-center gap-2">
          <Users className="h-5 w-5 text-indigo-400" />
          Users
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          Все пользователи платформы Moonely.{" "}
          {!loading && <span>{totalUsers.toLocaleString()} пользователей.</span>}
        </p>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <input
            type="text"
            value={searchEmail}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Поиск по email аккаунта..."
            className="w-full pl-9 pr-9 py-2.5 text-sm bg-white/[0.03] border border-white/[0.06] rounded-xl text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-colors"
          />
          {searchEmail && (
            <button
              onClick={clearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Plan Filter */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-zinc-500 shrink-0" />
          <div className="flex flex-wrap gap-1.5">
            {FILTER_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setPlanFilter(opt.value)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  planFilter === opt.value
                    ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/30"
                    : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5 border border-transparent"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between">
          <h2 className="text-sm font-medium text-zinc-400">User List</h2>
          <span className="text-xs text-zinc-600">{totalUsers} total</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-zinc-600" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-white/[0.06] hover:bg-transparent">
                  <TableHead className="text-zinc-500 text-xs font-medium">Email</TableHead>
                  <TableHead className="text-zinc-500 text-xs font-medium">Тариф</TableHead>
                  <TableHead className="text-zinc-500 text-xs font-medium text-right">Кредиты</TableHead>
                  <TableHead className="text-zinc-500 text-xs font-medium text-right">Чаты</TableHead>
                  <TableHead className="text-zinc-500 text-xs font-medium text-right">Стоимость</TableHead>
                  <TableHead className="text-zinc-500 text-xs font-medium">Подписка до</TableHead>
                  <TableHead className="text-zinc-500 text-xs font-medium">Регистрация</TableHead>
                  <TableHead className="text-zinc-500 text-xs font-medium text-center">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id} className="border-white/[0.04] hover:bg-white/[0.02]">
                    <TableCell className="text-xs text-zinc-300 max-w-[200px] truncate font-medium">
                      <div className="flex items-center gap-1.5">
                        {u.role === "ADMIN" && (
                          <Crown className="h-3 w-3 text-amber-400 shrink-0" />
                        )}
                        {u.email}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${PLAN_COLORS[u.plan] || PLAN_COLORS.FREE}`}>
                        {PLAN_LABELS[u.plan] || u.plan}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-zinc-400 text-right tabular-nums">
                      {u.credits + u.lifetimeCredits}
                    </TableCell>
                    <TableCell className="text-xs text-zinc-400 text-right tabular-nums">
                      {u.totalChats}
                    </TableCell>
                    <TableCell className="text-xs text-zinc-300 text-right tabular-nums font-medium">
                      {fmt$(u.totalCost)}
                    </TableCell>
                    <TableCell className="text-xs text-zinc-500">
                      {u.subscriptionEndAt
                        ? new Date(u.subscriptionEndAt).toLocaleDateString()
                        : "—"}
                    </TableCell>
                    <TableCell className="text-xs text-zinc-500">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-center">
                      <button
                        onClick={() => openUserDetail(u.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-indigo-300 hover:text-indigo-200 bg-indigo-500/10 hover:bg-indigo-500/20 rounded-lg transition-colors"
                      >
                        <Eye className="h-3 w-3" />
                        Детали
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
                {users.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-zinc-600 py-8">
                      Пользователи не найдены
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-3 border-t border-white/[0.06]">
            <span className="text-xs text-zinc-600">
              Страница {page} из {totalPages}
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => loadUsers(page - 1, activeSearch, planFilter)}
                disabled={page <= 1}
                className="p-1.5 rounded-md hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed text-zinc-400"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              {/* Page numbers */}
              {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 7) {
                  pageNum = i + 1;
                } else if (page <= 4) {
                  pageNum = i + 1;
                } else if (page >= totalPages - 3) {
                  pageNum = totalPages - 6 + i;
                } else {
                  pageNum = page - 3 + i;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => loadUsers(pageNum, activeSearch, planFilter)}
                    className={`min-w-[28px] h-7 text-xs rounded-md transition-colors ${
                      pageNum === page
                        ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/30"
                        : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                onClick={() => loadUsers(page + 1, activeSearch, planFilter)}
                disabled={page >= totalPages}
                className="p-1.5 rounded-md hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed text-zinc-400"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── User Detail View Component ───────────────────────────────────────────────

function UserDetailView({ user }: { user: AdminUserDetail }) {
  const isPaid = user.plan !== "FREE";
  const isSubActive = user.subscriptionEndAt
    ? new Date(user.subscriptionEndAt) > new Date()
    : false;

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          {/* Avatar */}
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center text-2xl font-bold text-indigo-300 shrink-0">
            {user.image ? (
              <img src={user.image} alt="" className="w-16 h-16 rounded-full object-cover" />
            ) : (
              user.email[0].toUpperCase()
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold text-zinc-100">
                {user.name || user.email}
              </h2>
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${PLAN_COLORS[user.plan] || PLAN_COLORS.FREE}`}>
                {PLAN_LABELS[user.plan] || user.plan}
              </span>
              {user.role === "ADMIN" && (
                <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-amber-500/10 text-amber-300">
                  Admin
                </span>
              )}
              {user.isVerified && (
                <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-emerald-500/10 text-emerald-300">
                  Verified
                </span>
              )}
            </div>
            <p className="text-sm text-zinc-400 mt-1 flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5" />
              {user.email}
            </p>
            <p className="text-xs text-zinc-500 mt-1 flex items-center gap-1.5">
              <Calendar className="h-3 w-3" />
              Зарегистрирован: {new Date(user.createdAt).toLocaleDateString("ru-RU", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          icon={Zap}
          label="Кредиты (подписка)"
          value={String(user.credits)}
          color="text-indigo-400"
        />
        <StatCard
          icon={Shield}
          label="Кредиты (навсегда)"
          value={String(user.lifetimeCredits)}
          color="text-purple-400"
        />
        <StatCard
          icon={Hash}
          label="Генераций сегодня"
          value={String(new Date(user.dailyResetAt) <= new Date() ? 0 : user.dailyGenerations)}
          sub={`Сброс: ${new Date(user.dailyResetAt).toLocaleString("ru-RU")}`}
          color="text-blue-400"
        />
        <StatCard
          icon={Hash}
          label="Генераций за месяц"
          value={String(new Date(user.monthlyResetAt) <= new Date() ? 0 : user.monthlyGenerations)}
          sub={`Сброс: ${new Date(user.monthlyResetAt).toLocaleString("ru-RU")}`}
          color="text-cyan-400"
        />
        <StatCard
          icon={MessageSquare}
          label="Всего чатов"
          value={String(user.totalChats)}
          color="text-emerald-400"
        />
        <StatCard
          icon={MessageSquare}
          label="Всего сообщений"
          value={String(user.totalMessages)}
          color="text-teal-400"
        />
        <StatCard
          icon={DollarSign}
          label="Общая стоимость"
          value={fmt$(user.totalCost)}
          color="text-amber-400"
        />
        <StatCard
          icon={CreditCard}
          label="Подписка"
          value={isPaid ? (isSubActive ? "Активна" : "Истекла") : "Нет"}
          sub={user.subscriptionEndAt
            ? `До: ${new Date(user.subscriptionEndAt).toLocaleDateString("ru-RU")}`
            : undefined}
          color={isPaid && isSubActive ? "text-emerald-400" : "text-zinc-400"}
        />
      </div>

      {/* Token Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-xl p-5">
          <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Токены (входные)</h3>
          <p className="text-2xl font-semibold text-zinc-100 tabular-nums">
            {user.totalPromptTokens.toLocaleString()}
          </p>
        </div>
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-xl p-5">
          <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Токены (выходные)</h3>
          <p className="text-2xl font-semibold text-zinc-100 tabular-nums">
            {user.totalCompletionTokens.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Chats/Projects */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between">
          <h2 className="text-sm font-medium text-zinc-400 flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-indigo-400" />
            Проекты / Чаты ({user.chats.length})
          </h2>
        </div>
        {user.chats.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-white/[0.06] hover:bg-transparent">
                  <TableHead className="text-zinc-500 text-xs font-medium">Название</TableHead>
                  <TableHead className="text-zinc-500 text-xs font-medium text-right">Сообщения</TableHead>
                  <TableHead className="text-zinc-500 text-xs font-medium text-right">In Tokens</TableHead>
                  <TableHead className="text-zinc-500 text-xs font-medium text-right">Out Tokens</TableHead>
                  <TableHead className="text-zinc-500 text-xs font-medium text-right">Стоимость</TableHead>
                  <TableHead className="text-zinc-500 text-xs font-medium">Создан</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {user.chats.map((c) => (
                  <TableRow key={c.id} className="border-white/[0.04] hover:bg-white/[0.02]">
                    <TableCell className="text-xs text-zinc-300 max-w-[200px] truncate font-medium">
                      {c.title}
                    </TableCell>
                    <TableCell className="text-xs text-zinc-400 text-right tabular-nums">
                      {c.messageCount}
                    </TableCell>
                    <TableCell className="text-xs text-zinc-400 text-right tabular-nums">
                      {c.totalPromptTokens.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-xs text-zinc-400 text-right tabular-nums">
                      {c.totalCompletionTokens.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-xs text-zinc-300 text-right tabular-nums font-medium">
                      {fmt$(c.totalCost)}
                    </TableCell>
                    <TableCell className="text-xs text-zinc-500">
                      {new Date(c.createdAt).toLocaleDateString("ru-RU")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center text-zinc-600 py-8 text-sm">
            Нет проектов
          </div>
        )}
      </div>

      {/* Payments */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between">
          <h2 className="text-sm font-medium text-zinc-400 flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-indigo-400" />
            Платежи ({user.payments.length})
          </h2>
        </div>
        {user.payments.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-white/[0.06] hover:bg-transparent">
                  <TableHead className="text-zinc-500 text-xs font-medium">Тип</TableHead>
                  <TableHead className="text-zinc-500 text-xs font-medium">Тариф</TableHead>
                  <TableHead className="text-zinc-500 text-xs font-medium text-right">Сумма</TableHead>
                  <TableHead className="text-zinc-500 text-xs font-medium">Статус</TableHead>
                  <TableHead className="text-zinc-500 text-xs font-medium">Дата</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {user.payments.map((p) => (
                  <TableRow key={p.id} className="border-white/[0.04] hover:bg-white/[0.02]">
                    <TableCell className="text-xs text-zinc-400">
                      {p.purchaseType === "SUBSCRIPTION"
                        ? "Подписка"
                        : p.purchaseType === "LIFETIME_PACK"
                        ? "Копилка"
                        : "Доп. пакет"}
                    </TableCell>
                    <TableCell>
                      {p.plan ? (
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${PLAN_COLORS[p.plan] || PLAN_COLORS.FREE}`}>
                          {PLAN_LABELS[p.plan] || p.plan}
                        </span>
                      ) : (
                        <span className="text-xs text-zinc-600">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-zinc-300 text-right tabular-nums font-medium">
                      {p.amount.toLocaleString()} {p.currency}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          p.status === "SUCCEEDED"
                            ? "bg-emerald-500/10 text-emerald-300"
                            : p.status === "PENDING"
                            ? "bg-amber-500/10 text-amber-300"
                            : "bg-red-500/10 text-red-300"
                        }`}
                      >
                        {p.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-zinc-500">
                      {new Date(p.createdAt).toLocaleDateString("ru-RU")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center text-zinc-600 py-8 text-sm">
            Нет платежей
          </div>
        )}
      </div>

      {/* Deployments */}
      {user.deployments.length > 0 && (
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between">
            <h2 className="text-sm font-medium text-zinc-400 flex items-center gap-2">
              <Globe className="h-4 w-4 text-indigo-400" />
              Деплои ({user.deployments.length})
            </h2>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-white/[0.06] hover:bg-transparent">
                  <TableHead className="text-zinc-500 text-xs font-medium">Проект</TableHead>
                  <TableHead className="text-zinc-500 text-xs font-medium">URL</TableHead>
                  <TableHead className="text-zinc-500 text-xs font-medium">Статус</TableHead>
                  <TableHead className="text-zinc-500 text-xs font-medium">Дата</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {user.deployments.map((d) => (
                  <TableRow key={d.id} className="border-white/[0.04] hover:bg-white/[0.02]">
                    <TableCell className="text-xs text-zinc-300 font-medium">
                      {d.projectName}
                    </TableCell>
                    <TableCell className="text-xs text-zinc-400 max-w-[200px] truncate">
                      {d.url ? (
                        <a
                          href={d.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-400 hover:text-indigo-300 underline"
                        >
                          {d.url}
                        </a>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          d.status === "DEPLOYED"
                            ? "bg-emerald-500/10 text-emerald-300"
                            : d.status === "DEPLOYING"
                            ? "bg-blue-500/10 text-blue-300"
                            : d.status === "FAILED"
                            ? "bg-red-500/10 text-red-300"
                            : "bg-zinc-500/10 text-zinc-400"
                        }`}
                      >
                        {d.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-zinc-500">
                      {new Date(d.createdAt).toLocaleDateString("ru-RU")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  color: string;
}) {
  return (
    <div className="relative group">
      <div className="absolute -inset-px rounded-2xl bg-gradient-to-br from-indigo-500/20 via-transparent to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="relative rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-xl p-4 flex flex-col gap-2">
        <div className={`flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider ${color}`}>
          <Icon className="h-3.5 w-3.5" />
          <span className="text-zinc-500">{label}</span>
        </div>
        <p className="text-xl font-semibold text-zinc-100 tracking-tight tabular-nums">
          {value}
        </p>
        {sub && <p className="text-[10px] text-zinc-600">{sub}</p>}
      </div>
    </div>
  );
}
