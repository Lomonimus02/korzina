"use client";

import { useState, useEffect, useCallback } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import {
  DollarSign,
  MessageSquare,
  TrendingUp,
  Hash,
  MousePointerClick,
  Clock,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  KeyMetrics,
  CostOverTimeRow,
  ButtonClickRow,
  PageTimeRow,
  PromptRow,
} from "@/app/actions/admin-stats";
import { getIndividualPrompts } from "@/app/actions/admin-stats";

// ── Types ────────────────────────────────────────────────────────────────────

interface Props {
  metrics: KeyMetrics;
  costOverTime: CostOverTimeRow[];
  buttonClicks: ButtonClickRow[];
  pageTime: PageTimeRow[];
}

// ── Small helpers ────────────────────────────────────────────────────────────

function fmt$(v: number) {
  return "$" + v.toFixed(6);
}

function fmtMs(ms: number) {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

// ── Metric Card ──────────────────────────────────────────────────────────────

function MetricCard({
  label,
  value,
  sub,
  icon: Icon,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
}) {
  return (
    <div className="relative group">
      <div className="absolute -inset-px rounded-2xl bg-gradient-to-br from-indigo-500/20 via-transparent to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="relative rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-xl p-5 flex flex-col gap-3">
        <div className="flex items-center gap-2 text-zinc-500 text-xs font-medium uppercase tracking-wider">
          <Icon className="h-3.5 w-3.5" />
          {label}
        </div>
        <p className="text-2xl font-semibold text-zinc-100 tracking-tight">
          {value}
        </p>
        {sub && <p className="text-xs text-zinc-500">{sub}</p>}
      </div>
    </div>
  );
}

// ── Tab Button ───────────────────────────────────────────────────────────────

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
        active
          ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/30"
          : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5 border border-transparent"
      }`}
    >
      {children}
    </button>
  );
}

// ── Custom Recharts Tooltip ──────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-white/10 bg-zinc-900/95 backdrop-blur-xl px-3 py-2 text-xs shadow-xl">
      <p className="text-zinc-400 mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }} className="font-medium">
          {p.name}: {typeof p.value === "number" && p.name?.toLowerCase().includes("cost")
            ? fmt$(p.value)
            : p.value}
        </p>
      ))}
    </div>
  );
}

// ── Main Dashboard ───────────────────────────────────────────────────────────

export function AdminDashboardClient({
  metrics,
  costOverTime,
  buttonClicks,
  pageTime,
}: Props) {
  const [tab, setTab] = useState<"financials" | "behavior">("financials");

  // ── Prompts table (client-side pagination via server action) ──
  const [prompts, setPrompts] = useState<PromptRow[]>([]);
  const [promptPage, setPromptPage] = useState(1);
  const [promptTotal, setPromptTotal] = useState(0);
  const [promptPages, setPromptPages] = useState(1);
  const [loadingPrompts, setLoadingPrompts] = useState(true);

  const loadPrompts = useCallback(async (page: number) => {
    setLoadingPrompts(true);
    try {
      const res = await getIndividualPrompts(page, 20);
      setPrompts(res.data);
      setPromptTotal(res.total);
      setPromptPages(res.totalPages);
      setPromptPage(res.page);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingPrompts(false);
    }
  }, []);

  useEffect(() => {
    loadPrompts(1);
  }, [loadPrompts]);

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-[1440px] mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-100 tracking-tight">
          Analytics Dashboard
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          LLM costs, token usage, and user behavior at a glance.
        </p>
      </div>

      {/* Key Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={DollarSign}
          label="Avg First Prompt Cost"
          value={fmt$(metrics.avgFirstPromptCost)}
          sub={`~${Math.round(metrics.avgFirstPromptTokens)} total tokens`}
        />
        <MetricCard
          icon={TrendingUp}
          label="Avg Chat Cost"
          value={fmt$(metrics.avgChatCost)}
          sub={`~${Math.round(metrics.avgChatTokens ?? 0)} tokens · ${metrics.totalChats} chats`}
        />
        <MetricCard
          icon={MessageSquare}
          label="Avg Prompt Cost"
          value={fmt$(metrics.avgPromptCost)}
          sub={`~${Math.round(metrics.avgPromptTokens ?? 0)} tokens · ${metrics.totalMessages} msgs`}
        />
        <MetricCard
          icon={Hash}
          label="Avg Prompts / Chat"
          value={metrics.avgPromptsPerChat.toFixed(1)}
          sub={`Total cost: ${fmt$(metrics.totalCost)}`}
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <TabButton
          active={tab === "financials"}
          onClick={() => setTab("financials")}
        >
          <span className="flex items-center gap-1.5">
            <DollarSign className="h-3.5 w-3.5" />
            Financials
          </span>
        </TabButton>
        <TabButton
          active={tab === "behavior"}
          onClick={() => setTab("behavior")}
        >
          <span className="flex items-center gap-1.5">
            <MousePointerClick className="h-3.5 w-3.5" />
            Behavior
          </span>
        </TabButton>
      </div>

      {/* ═══════════════ FINANCIALS TAB ═══════════════ */}
      {tab === "financials" && (
        <div className="space-y-8">
          {/* Cost Over Time Line Chart */}
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-xl p-6">
            <h2 className="text-sm font-medium text-zinc-400 mb-4">
              Cost Over Time
            </h2>
            {costOverTime.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={costOverTime}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(255,255,255,0.04)"
                  />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: "#71717a" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#71717a" }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `$${v}`}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="totalCost"
                    name="Cost"
                    stroke="#818cf8"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, fill: "#818cf8" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="messageCount"
                    name="Messages"
                    stroke="#6366f1"
                    strokeWidth={1.5}
                    strokeDasharray="4 3"
                    dot={false}
                    yAxisId={0}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[280px] flex items-center justify-center text-zinc-600 text-sm">
                No cost data yet
              </div>
            )}
          </div>

          {/* Individual Prompts Table */}
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between">
              <h2 className="text-sm font-medium text-zinc-400">
                Individual Prompts
              </h2>
              <span className="text-xs text-zinc-600">
                {promptTotal} total
              </span>
            </div>

            {loadingPrompts ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-5 w-5 animate-spin text-zinc-600" />
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/[0.06] hover:bg-transparent">
                        <TableHead className="text-zinc-500 text-xs font-medium">
                          User
                        </TableHead>
                        <TableHead className="text-zinc-500 text-xs font-medium">
                          Chat
                        </TableHead>
                        <TableHead className="text-zinc-500 text-xs font-medium">
                          Role
                        </TableHead>
                        <TableHead className="text-zinc-500 text-xs font-medium text-right">
                          In Tokens
                        </TableHead>
                        <TableHead className="text-zinc-500 text-xs font-medium text-right">
                          Out Tokens
                        </TableHead>
                        <TableHead className="text-zinc-500 text-xs font-medium text-right">
                          Cost
                        </TableHead>
                        <TableHead className="text-zinc-500 text-xs font-medium">
                          Date
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {prompts.map((p) => (
                        <TableRow
                          key={p.id}
                          className="border-white/[0.04] hover:bg-white/[0.02]"
                        >
                          <TableCell className="text-xs text-zinc-400 max-w-[140px] truncate">
                            {p.userEmail}
                          </TableCell>
                          <TableCell className="text-xs text-zinc-400 max-w-[120px] truncate">
                            {p.chatTitle}
                          </TableCell>
                          <TableCell>
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                                p.role === "assistant"
                                  ? "bg-indigo-500/10 text-indigo-300"
                                  : "bg-emerald-500/10 text-emerald-300"
                              }`}
                            >
                              {p.role}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs text-zinc-400 text-right tabular-nums">
                            {p.promptTokens.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-xs text-zinc-400 text-right tabular-nums">
                            {p.completionTokens.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-xs text-zinc-300 text-right tabular-nums font-medium">
                            {fmt$(p.cost)}
                          </TableCell>
                          <TableCell className="text-xs text-zinc-500">
                            {new Date(p.createdAt).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      ))}
                      {prompts.length === 0 && (
                        <TableRow>
                          <TableCell
                            colSpan={7}
                            className="text-center text-zinc-600 py-8"
                          >
                            No prompts recorded yet
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {promptPages > 1 && (
                  <div className="flex items-center justify-between px-6 py-3 border-t border-white/[0.06]">
                    <span className="text-xs text-zinc-600">
                      Page {promptPage} of {promptPages}
                    </span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => loadPrompts(promptPage - 1)}
                        disabled={promptPage <= 1}
                        className="p-1.5 rounded-md hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed text-zinc-400"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => loadPrompts(promptPage + 1)}
                        disabled={promptPage >= promptPages}
                        className="p-1.5 rounded-md hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed text-zinc-400"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════ BEHAVIOR TAB ═══════════════ */}
      {tab === "behavior" && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Button Clicks Bar Chart */}
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <MousePointerClick className="h-4 w-4 text-indigo-400" />
                <h2 className="text-sm font-medium text-zinc-400">
                  Button Clicks
                </h2>
              </div>
              {buttonClicks.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={buttonClicks} layout="vertical">
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgba(255,255,255,0.04)"
                      horizontal={false}
                    />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 11, fill: "#71717a" }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="buttonId"
                      tick={{ fontSize: 11, fill: "#71717a" }}
                      tickLine={false}
                      axisLine={false}
                      width={120}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar
                      dataKey="count"
                      name="Clicks"
                      fill="#818cf8"
                      radius={[0, 6, 6, 0]}
                      barSize={24}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[280px] flex items-center justify-center text-zinc-600 text-sm">
                  No click data yet
                </div>
              )}
            </div>

            {/* Avg Time on Page */}
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Clock className="h-4 w-4 text-indigo-400" />
                <h2 className="text-sm font-medium text-zinc-400">
                  Avg Time on Page
                </h2>
              </div>
              {pageTime.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={pageTime} layout="vertical">
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgba(255,255,255,0.04)"
                      horizontal={false}
                    />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 11, fill: "#71717a" }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => fmtMs(v)}
                    />
                    <YAxis
                      type="category"
                      dataKey="page"
                      tick={{ fontSize: 11, fill: "#71717a" }}
                      tickLine={false}
                      axisLine={false}
                      width={140}
                    />
                    <Tooltip
                      content={({ active, payload, label }: any) => {
                        if (!active || !payload?.length) return null;
                        return (
                          <div className="rounded-lg border border-white/10 bg-zinc-900/95 backdrop-blur-xl px-3 py-2 text-xs shadow-xl">
                            <p className="text-zinc-400 mb-1">{label}</p>
                            <p className="text-indigo-300 font-medium">
                              Avg: {fmtMs(payload[0].value)}
                            </p>
                            <p className="text-zinc-500">
                              {payload[0].payload.views} views
                            </p>
                          </div>
                        );
                      }}
                    />
                    <Bar
                      dataKey="avgDuration"
                      name="Avg Duration"
                      fill="#6366f1"
                      radius={[0, 6, 6, 0]}
                      barSize={24}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[280px] flex items-center justify-center text-zinc-600 text-sm">
                  No page view data yet
                </div>
              )}
            </div>
          </div>

          {/* Page Time Table */}
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-white/[0.06]">
              <h2 className="text-sm font-medium text-zinc-400">
                Page Views Detail
              </h2>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="border-white/[0.06] hover:bg-transparent">
                  <TableHead className="text-zinc-500 text-xs font-medium">
                    Page
                  </TableHead>
                  <TableHead className="text-zinc-500 text-xs font-medium text-right">
                    Views
                  </TableHead>
                  <TableHead className="text-zinc-500 text-xs font-medium text-right">
                    Avg Duration
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageTime.map((pt) => (
                  <TableRow
                    key={pt.page}
                    className="border-white/[0.04] hover:bg-white/[0.02]"
                  >
                    <TableCell className="text-xs text-zinc-300 font-mono">
                      {pt.page}
                    </TableCell>
                    <TableCell className="text-xs text-zinc-400 text-right tabular-nums">
                      {pt.views.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-xs text-zinc-300 text-right tabular-nums font-medium">
                      {fmtMs(pt.avgDuration)}
                    </TableCell>
                  </TableRow>
                ))}
                {pageTime.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className="text-center text-zinc-600 py-8"
                    >
                      No page view data yet
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
