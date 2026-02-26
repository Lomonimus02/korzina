"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Users,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { PromptsPerChatRow } from "@/app/actions/admin-stats";
import { getPromptsPerChat, getUserChatTotals } from "@/app/actions/admin-stats";
import type { UserChatTotalRow } from "@/app/actions/admin-stats";

function fmt$(v: number) {
  return "$" + v.toFixed(6);
}

interface UserSummary {
  email: string;
  totalChats: number;
  totalPrompts: number;
  totalCost: number;
  totalPromptTokens: number;
  totalCompletionTokens: number;
}

export default function AdminUsersPage() {
  const [chatTotals, setChatTotals] = useState<UserChatTotalRow[]>([]);
  const [promptsPerChat, setPromptsPerChat] = useState<PromptsPerChatRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const load = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const [totals, prompts] = await Promise.all([
        getUserChatTotals(p, 100),
        getPromptsPerChat(p, 100),
      ]);
      setChatTotals(totals.data);
      setPromptsPerChat(prompts.data);
      setPage(totals.page);
      setTotalPages(totals.totalPages);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(1);
  }, [load]);

  // Aggregate by user
  const userMap = new Map<string, UserSummary>();
  for (const ct of chatTotals) {
    const existing = userMap.get(ct.userEmail) || {
      email: ct.userEmail,
      totalChats: 0,
      totalPrompts: 0,
      totalCost: 0,
      totalPromptTokens: 0,
      totalCompletionTokens: 0,
    };
    existing.totalChats += 1;
    existing.totalCost += ct.totalCost;
    existing.totalPromptTokens += ct.totalPromptTokens;
    existing.totalCompletionTokens += ct.totalCompletionTokens;
    existing.totalPrompts += ct.messageCount;
    userMap.set(ct.userEmail, existing);
  }
  const users = Array.from(userMap.values()).sort(
    (a, b) => b.totalCost - a.totalCost
  );

  // Prompts per chat map
  const promptMap = new Map<string, number>();
  for (const p of promptsPerChat) {
    promptMap.set(p.chatId, p.promptCount);
  }

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-[1440px] mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100 tracking-tight flex items-center gap-2">
          <Users className="h-5 w-5 text-indigo-400" />
          Users
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          Per-user aggregated analytics — costs, tokens, and chats.
        </p>
      </div>

      {/* User Summary */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/[0.06]">
          <h2 className="text-sm font-medium text-zinc-400">User Summary</h2>
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
                  <TableHead className="text-zinc-500 text-xs font-medium text-right">Chats</TableHead>
                  <TableHead className="text-zinc-500 text-xs font-medium text-right">Messages</TableHead>
                  <TableHead className="text-zinc-500 text-xs font-medium text-right">In Tokens</TableHead>
                  <TableHead className="text-zinc-500 text-xs font-medium text-right">Out Tokens</TableHead>
                  <TableHead className="text-zinc-500 text-xs font-medium text-right">Total Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.email} className="border-white/[0.04] hover:bg-white/[0.02]">
                    <TableCell className="text-xs text-zinc-300 max-w-[200px] truncate font-medium">
                      {u.email}
                    </TableCell>
                    <TableCell className="text-xs text-zinc-400 text-right tabular-nums">
                      {u.totalChats}
                    </TableCell>
                    <TableCell className="text-xs text-zinc-400 text-right tabular-nums">
                      {u.totalPrompts}
                    </TableCell>
                    <TableCell className="text-xs text-zinc-400 text-right tabular-nums">
                      {u.totalPromptTokens.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-xs text-zinc-400 text-right tabular-nums">
                      {u.totalCompletionTokens.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-xs text-zinc-300 text-right tabular-nums font-medium">
                      {fmt$(u.totalCost)}
                    </TableCell>
                  </TableRow>
                ))}
                {users.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-zinc-600 py-8">
                      No user data yet
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Per-chat breakdown */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/[0.06]">
          <h2 className="text-sm font-medium text-zinc-400">
            Chat Breakdown (per User)
          </h2>
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
                  <TableHead className="text-zinc-500 text-xs font-medium">User</TableHead>
                  <TableHead className="text-zinc-500 text-xs font-medium">Chat</TableHead>
                  <TableHead className="text-zinc-500 text-xs font-medium text-right">User Prompts</TableHead>
                  <TableHead className="text-zinc-500 text-xs font-medium text-right">In Tokens</TableHead>
                  <TableHead className="text-zinc-500 text-xs font-medium text-right">Out Tokens</TableHead>
                  <TableHead className="text-zinc-500 text-xs font-medium text-right">Total Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {chatTotals.map((c) => (
                  <TableRow key={c.chatId} className="border-white/[0.04] hover:bg-white/[0.02]">
                    <TableCell className="text-xs text-zinc-400 max-w-[140px] truncate">
                      {c.userEmail}
                    </TableCell>
                    <TableCell className="text-xs text-zinc-400 max-w-[120px] truncate">
                      {c.chatTitle}
                    </TableCell>
                    <TableCell className="text-xs text-zinc-400 text-right tabular-nums">
                      {promptMap.get(c.chatId) ?? "-"}
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
                  </TableRow>
                ))}
                {chatTotals.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-zinc-600 py-8">
                      No data yet
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-3 border-t border-white/[0.06]">
            <span className="text-xs text-zinc-600">
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => load(page - 1)}
                disabled={page <= 1}
                className="p-1.5 rounded-md hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed text-zinc-400"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => load(page + 1)}
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
