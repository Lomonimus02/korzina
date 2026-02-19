"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  MessageSquare,
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
  ChatAvgRow,
  UserChatTotalRow,
  FirstPromptRow,
} from "@/app/actions/admin-stats";
import {
  getIndividualPrompts,
  getChatAverages,
  getUserChatTotals,
  getFirstPromptStats,
} from "@/app/actions/admin-stats";
import type { PromptRow } from "@/app/actions/admin-stats";

function fmt$(v: number) {
  return "$" + v.toFixed(6);
}

export default function AdminPromptsPage() {
  // ── Individual Prompts ──
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

  // ── Chat Averages ──
  const [chatAvgs, setChatAvgs] = useState<ChatAvgRow[]>([]);
  const [chatAvgPage, setChatAvgPage] = useState(1);
  const [chatAvgPages, setChatAvgPages] = useState(1);
  const [loadingAvgs, setLoadingAvgs] = useState(true);

  const loadChatAvgs = useCallback(async (page: number) => {
    setLoadingAvgs(true);
    try {
      const res = await getChatAverages(page, 50);
      setChatAvgs(res.data);
      setChatAvgPage(res.page);
      setChatAvgPages(res.totalPages);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingAvgs(false);
    }
  }, []);

  // ── User Chat Totals ──
  const [chatTotals, setChatTotals] = useState<UserChatTotalRow[]>([]);
  const [chatTotalPage, setChatTotalPage] = useState(1);
  const [chatTotalPages, setChatTotalPages] = useState(1);
  const [loadingTotals, setLoadingTotals] = useState(true);

  const loadChatTotals = useCallback(async (page: number) => {
    setLoadingTotals(true);
    try {
      const res = await getUserChatTotals(page, 50);
      setChatTotals(res.data);
      setChatTotalPage(res.page);
      setChatTotalPages(res.totalPages);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingTotals(false);
    }
  }, []);

  // ── First Prompt Stats ──
  const [firstPrompts, setFirstPrompts] = useState<FirstPromptRow[]>([]);
  const [loadingFirst, setLoadingFirst] = useState(true);

  useEffect(() => {
    loadPrompts(1);
    loadChatAvgs(1);
    loadChatTotals(1);
    getFirstPromptStats()
      .then(setFirstPrompts)
      .catch(console.error)
      .finally(() => setLoadingFirst(false));
  }, [loadPrompts, loadChatAvgs, loadChatTotals]);

  const [tab, setTab] = useState<"individual" | "averages" | "totals" | "first">("individual");

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-[1440px] mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100 tracking-tight flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-indigo-400" />
          Prompts & Tokens
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          Detailed token and cost data for every prompt, chat, and user.
        </p>
      </div>

      {/* Tab Buttons */}
      <div className="flex flex-wrap gap-2">
        {([
          ["individual", "All Messages"],
          ["averages", "Chat Averages"],
          ["totals", "Chat Totals"],
          ["first", "First Prompts"],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              tab === key
                ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/30"
                : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5 border border-transparent"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ═══ Individual Prompts ═══ */}
      {tab === "individual" && (
        <Section title="Individual Messages" count={promptTotal} loading={loadingPrompts}>
          <Table>
            <TableHeader>
              <TableRow className="border-white/[0.06] hover:bg-transparent">
                <Th>User</Th>
                <Th>Chat</Th>
                <Th>Role</Th>
                <Th right>In Tokens</Th>
                <Th right>Out Tokens</Th>
                <Th right>Cost</Th>
                <Th>Date</Th>
              </TableRow>
            </TableHeader>
            <TableBody>
              {prompts.map((p) => (
                <TableRow key={p.id} className="border-white/[0.04] hover:bg-white/[0.02]">
                  <Td truncate>{p.userEmail}</Td>
                  <Td truncate>{p.chatTitle}</Td>
                  <Td>
                    <RoleBadge role={p.role} />
                  </Td>
                  <Td right mono>{p.promptTokens.toLocaleString()}</Td>
                  <Td right mono>{p.completionTokens.toLocaleString()}</Td>
                  <Td right mono bold>{fmt$(p.cost)}</Td>
                  <Td dim>{new Date(p.createdAt).toLocaleDateString()}</Td>
                </TableRow>
              ))}
              {prompts.length === 0 && <EmptyRow cols={7} />}
            </TableBody>
          </Table>
          <Pagination page={promptPage} total={promptPages} onNavigate={loadPrompts} />
        </Section>
      )}

      {/* ═══ Chat Averages ═══ */}
      {tab === "averages" && (
        <Section title="Average per Prompt (per Chat)" loading={loadingAvgs}>
          <Table>
            <TableHeader>
              <TableRow className="border-white/[0.06] hover:bg-transparent">
                <Th>User</Th>
                <Th>Chat</Th>
                <Th right>Avg In</Th>
                <Th right>Avg Out</Th>
                <Th right>Avg Cost</Th>
                <Th right>Prompts</Th>
              </TableRow>
            </TableHeader>
            <TableBody>
              {chatAvgs.map((c) => (
                <TableRow key={c.chatId} className="border-white/[0.04] hover:bg-white/[0.02]">
                  <Td truncate>{c.userEmail}</Td>
                  <Td truncate>{c.chatTitle}</Td>
                  <Td right mono>{c.avgPromptTokens.toLocaleString()}</Td>
                  <Td right mono>{c.avgCompletionTokens.toLocaleString()}</Td>
                  <Td right mono bold>{fmt$(c.avgCost)}</Td>
                  <Td right mono>{c.messageCount}</Td>
                </TableRow>
              ))}
              {chatAvgs.length === 0 && <EmptyRow cols={6} />}
            </TableBody>
          </Table>
          <Pagination page={chatAvgPage} total={chatAvgPages} onNavigate={loadChatAvgs} />
        </Section>
      )}

      {/* ═══ Chat Totals ═══ */}
      {tab === "totals" && (
        <Section title="Total per Chat" loading={loadingTotals}>
          <Table>
            <TableHeader>
              <TableRow className="border-white/[0.06] hover:bg-transparent">
                <Th>User</Th>
                <Th>Chat</Th>
                <Th right>Total In</Th>
                <Th right>Total Out</Th>
                <Th right>Total Cost</Th>
                <Th right>Messages</Th>
              </TableRow>
            </TableHeader>
            <TableBody>
              {chatTotals.map((c) => (
                <TableRow key={c.chatId} className="border-white/[0.04] hover:bg-white/[0.02]">
                  <Td truncate>{c.userEmail}</Td>
                  <Td truncate>{c.chatTitle}</Td>
                  <Td right mono>{c.totalPromptTokens.toLocaleString()}</Td>
                  <Td right mono>{c.totalCompletionTokens.toLocaleString()}</Td>
                  <Td right mono bold>{fmt$(c.totalCost)}</Td>
                  <Td right mono>{c.messageCount}</Td>
                </TableRow>
              ))}
              {chatTotals.length === 0 && <EmptyRow cols={6} />}
            </TableBody>
          </Table>
          <Pagination page={chatTotalPage} total={chatTotalPages} onNavigate={loadChatTotals} />
        </Section>
      )}

      {/* ═══ First Prompt Stats ═══ */}
      {tab === "first" && (
        <Section title="First Prompt per Chat (Assistant Response)" loading={loadingFirst}>
          <Table>
            <TableHeader>
              <TableRow className="border-white/[0.06] hover:bg-transparent">
                <Th>User</Th>
                <Th>Chat</Th>
                <Th right>In Tokens</Th>
                <Th right>Out Tokens</Th>
                <Th right>Cost</Th>
                <Th>Date</Th>
              </TableRow>
            </TableHeader>
            <TableBody>
              {firstPrompts.map((fp) => (
                <TableRow key={fp.chatId} className="border-white/[0.04] hover:bg-white/[0.02]">
                  <Td truncate>{fp.userEmail}</Td>
                  <Td truncate>{fp.chatTitle}</Td>
                  <Td right mono>{fp.promptTokens.toLocaleString()}</Td>
                  <Td right mono>{fp.completionTokens.toLocaleString()}</Td>
                  <Td right mono bold>{fmt$(fp.cost)}</Td>
                  <Td dim>{new Date(fp.createdAt).toLocaleDateString()}</Td>
                </TableRow>
              ))}
              {firstPrompts.length === 0 && <EmptyRow cols={6} />}
            </TableBody>
          </Table>
        </Section>
      )}
    </div>
  );
}

// ── Utility sub-components ───────────────────────────────────────────────────

function Section({
  title,
  count,
  loading,
  children,
}: {
  title: string;
  count?: number;
  loading: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-xl overflow-hidden">
      <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between">
        <h2 className="text-sm font-medium text-zinc-400">{title}</h2>
        {count !== undefined && (
          <span className="text-xs text-zinc-600">{count} total</span>
        )}
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-5 w-5 animate-spin text-zinc-600" />
        </div>
      ) : (
        <div className="overflow-x-auto">{children}</div>
      )}
    </div>
  );
}

function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return (
    <TableHead
      className={`text-zinc-500 text-xs font-medium ${right ? "text-right" : ""}`}
    >
      {children}
    </TableHead>
  );
}

function Td({
  children,
  right,
  mono,
  bold,
  truncate,
  dim,
}: {
  children: React.ReactNode;
  right?: boolean;
  mono?: boolean;
  bold?: boolean;
  truncate?: boolean;
  dim?: boolean;
}) {
  return (
    <TableCell
      className={`text-xs ${right ? "text-right" : ""} ${
        mono ? "tabular-nums" : ""
      } ${bold ? "text-zinc-300 font-medium" : "text-zinc-400"} ${
        truncate ? "max-w-[140px] truncate" : ""
      } ${dim ? "text-zinc-500" : ""}`}
    >
      {children}
    </TableCell>
  );
}

function RoleBadge({ role }: { role: string }) {
  return (
    <span
      className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
        role === "assistant"
          ? "bg-indigo-500/10 text-indigo-300"
          : "bg-emerald-500/10 text-emerald-300"
      }`}
    >
      {role}
    </span>
  );
}

function EmptyRow({ cols }: { cols: number }) {
  return (
    <TableRow>
      <TableCell colSpan={cols} className="text-center text-zinc-600 py-8">
        No data yet
      </TableCell>
    </TableRow>
  );
}

function Pagination({
  page,
  total,
  onNavigate,
}: {
  page: number;
  total: number;
  onNavigate: (p: number) => void;
}) {
  if (total <= 1) return null;
  return (
    <div className="flex items-center justify-between px-6 py-3 border-t border-white/[0.06]">
      <span className="text-xs text-zinc-600">
        Page {page} of {total}
      </span>
      <div className="flex gap-1">
        <button
          onClick={() => onNavigate(page - 1)}
          disabled={page <= 1}
          className="p-1.5 rounded-md hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed text-zinc-400"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          onClick={() => onNavigate(page + 1)}
          disabled={page >= total}
          className="p-1.5 rounded-md hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed text-zinc-400"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
