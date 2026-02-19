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
import { Clock, Loader2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { PageTimeRow } from "@/app/actions/admin-stats";
import { getAvgTimeOnPage } from "@/app/actions/admin-stats";

function fmtMs(ms: number) {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export default function AdminPagesPage() {
  const [pageTime, setPageTime] = useState<PageTimeRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAvgTimeOnPage()
      .then(setPageTime)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const totalViews = pageTime.reduce((s, p) => s + p.views, 0);

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-[1440px] mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100 tracking-tight flex items-center gap-2">
          <Clock className="h-5 w-5 text-indigo-400" />
          Page Time
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          Average time spent on each page by users.
          {!loading && ` ${totalViews.toLocaleString()} total page views.`}
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
              Avg Duration per Page
            </h2>
            {pageTime.length > 0 ? (
              <ResponsiveContainer width="100%" height={Math.max(280, pageTime.length * 36)}>
                <BarChart data={pageTime} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: "#71717a" }} tickLine={false} axisLine={false} tickFormatter={(v) => fmtMs(v)} />
                  <YAxis type="category" dataKey="page" tick={{ fontSize: 11, fill: "#71717a" }} tickLine={false} axisLine={false} width={160} />
                  <Tooltip
                    content={({ active, payload, label }: any) => {
                      if (!active || !payload?.length) return null;
                      return (
                        <div className="rounded-lg border border-white/10 bg-zinc-900/95 backdrop-blur-xl px-3 py-2 text-xs shadow-xl">
                          <p className="text-zinc-400 mb-1">{label}</p>
                          <p className="text-indigo-300 font-medium">Avg: {fmtMs(payload[0].value)}</p>
                          <p className="text-zinc-500">{payload[0].payload.views} views</p>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="avgDuration" name="Avg Duration" fill="#6366f1" radius={[0, 6, 6, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[280px] flex items-center justify-center text-zinc-600 text-sm">
                No page view data yet
              </div>
            )}
          </div>

          {/* Table */}
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-white/[0.06]">
              <h2 className="text-sm font-medium text-zinc-400">
                Page Views Detail
              </h2>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="border-white/[0.06] hover:bg-transparent">
                  <TableHead className="text-zinc-500 text-xs font-medium">Page</TableHead>
                  <TableHead className="text-zinc-500 text-xs font-medium text-right">Views</TableHead>
                  <TableHead className="text-zinc-500 text-xs font-medium text-right">Avg Duration</TableHead>
                  <TableHead className="text-zinc-500 text-xs font-medium text-right">% Share</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageTime.map((pt) => (
                  <TableRow key={pt.page} className="border-white/[0.04] hover:bg-white/[0.02]">
                    <TableCell className="text-xs text-zinc-300 font-mono">
                      {pt.page}
                    </TableCell>
                    <TableCell className="text-xs text-zinc-400 text-right tabular-nums">
                      {pt.views.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-xs text-zinc-300 text-right tabular-nums font-medium">
                      {fmtMs(pt.avgDuration)}
                    </TableCell>
                    <TableCell className="text-xs text-zinc-500 text-right tabular-nums">
                      {totalViews > 0 ? ((pt.views / totalViews) * 100).toFixed(1) + "%" : "—"}
                    </TableCell>
                  </TableRow>
                ))}
                {pageTime.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-zinc-600 py-8">
                      No page view data yet
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
