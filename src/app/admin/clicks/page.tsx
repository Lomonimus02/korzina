"use client";

import { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { MousePointerClick, Loader2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ButtonClickRow } from "@/app/actions/admin-stats";
import { getButtonClicks } from "@/app/actions/admin-stats";

export default function AdminClicksPage() {
  const [clicks, setClicks] = useState<ButtonClickRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getButtonClicks()
      .then(setClicks)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const total = clicks.reduce((s, c) => s + c.count, 0);

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-[1440px] mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100 tracking-tight flex items-center gap-2">
          <MousePointerClick className="h-5 w-5 text-indigo-400" />
          Button Clicks
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          Every tracked button interaction across the site.
          {!loading && ` ${total.toLocaleString()} total clicks.`}
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-5 w-5 animate-spin text-zinc-600" />
        </div>
      ) : (
        <>
          {/* Chart */}
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-xl p-6">
            <h2 className="text-sm font-medium text-zinc-400 mb-4">
              Clicks by Button
            </h2>
            {clicks.length > 0 ? (
              <ResponsiveContainer width="100%" height={Math.max(280, clicks.length * 36)}>
                <BarChart data={clicks} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: "#71717a" }} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="buttonId" tick={{ fontSize: 11, fill: "#71717a" }} tickLine={false} axisLine={false} width={160} />
                  <Tooltip
                    content={({ active, payload, label }: any) => {
                      if (!active || !payload?.length) return null;
                      return (
                        <div className="rounded-lg border border-white/10 bg-zinc-900/95 backdrop-blur-xl px-3 py-2 text-xs shadow-xl">
                          <p className="text-zinc-400 mb-1">{label}</p>
                          <p className="text-indigo-300 font-medium">{payload[0].value} clicks</p>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="count" name="Clicks" fill="#818cf8" radius={[0, 6, 6, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[280px] flex items-center justify-center text-zinc-600 text-sm">
                No click data yet
              </div>
            )}
          </div>

          {/* Table */}
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-white/[0.06]">
              <h2 className="text-sm font-medium text-zinc-400">
                All Buttons
              </h2>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="border-white/[0.06] hover:bg-transparent">
                  <TableHead className="text-zinc-500 text-xs font-medium">Button ID</TableHead>
                  <TableHead className="text-zinc-500 text-xs font-medium text-right">Clicks</TableHead>
                  <TableHead className="text-zinc-500 text-xs font-medium text-right">% Share</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clicks.map((c) => (
                  <TableRow key={c.buttonId} className="border-white/[0.04] hover:bg-white/[0.02]">
                    <TableCell className="text-xs text-zinc-300 font-mono font-medium">
                      {c.buttonId}
                    </TableCell>
                    <TableCell className="text-xs text-zinc-400 text-right tabular-nums">
                      {c.count.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-xs text-zinc-500 text-right tabular-nums">
                      {total > 0 ? ((c.count / total) * 100).toFixed(1) + "%" : "—"}
                    </TableCell>
                  </TableRow>
                ))}
                {clicks.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-zinc-600 py-8">
                      No click data yet
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}
