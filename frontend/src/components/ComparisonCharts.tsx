"use client";

import { useEffect, useState, useCallback } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { ArrowDown, ArrowUp, Activity } from "lucide-react";
import api from "@/lib/api";
import { fmt } from "@/lib/formatters";
import ChartCard from "./ChartCard";
import { useTheme } from "@/contexts/ThemeContext";

interface PeriodData {
  label: string;
  value: number;
}

interface ComparisonData {
  current_month: PeriodData;
  prev_month: PeriodData;
  month_change_pct: number;
  curr_3m: PeriodData;
  prev_3m: PeriodData;
  three_month_change_pct: number;
  curr_6m: PeriodData;
  prev_6m: PeriodData;
  six_month_change_pct: number;
}

export default function ComparisonCharts() {
  const { isDark } = useTheme();
  const [data, setData] = useState<ComparisonData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/analytics/period-comparison");
      setData(res.data);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <ChartCard title="Period Comparisons" delay={0.3}>
        <div className="skeleton h-64 rounded-xl" />
      </ChartCard>
    );
  }

  if (!data) return null;

  const chartData = [
    {
      name: "1 Month",
      Current: data.current_month.value,
      Previous: data.prev_month.value,
    },
    {
      name: "3 Months",
      Current: data.curr_3m.value,
      Previous: data.prev_3m.value,
    },
    {
      name: "6 Months",
      Current: data.curr_6m.value,
      Previous: data.prev_6m.value,
    },
  ];

  const MetricBox = ({ title, current, prev, pct }: { title: string, current: number, prev: number, pct: number }) => (
    <div className="p-4 rounded-xl border flex flex-col justify-between" style={{ background: "var(--surface-2)", borderColor: "var(--border)" }}>
      <p className="text-sm font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--text-muted)" }}>{title}</p>
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>{fmt(current)}</p>
          <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>vs {fmt(prev)} prev</p>
        </div>
        <div className={`flex items-center gap-1 text-sm font-bold px-2 py-1 rounded-full ${
          pct > 0 ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400" :
          pct < 0 ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" :
          "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
        }`}>
          {pct > 0 ? <ArrowUp className="h-3.5 w-3.5" /> : pct < 0 ? <ArrowDown className="h-3.5 w-3.5" /> : null}
          {Math.abs(pct)}%
        </div>
      </div>
    </div>
  );

  return (
    <ChartCard
      title={
        <>
          <Activity className="h-5 w-5 text-indigo-500" />
          Period-over-Period Spending
        </>
      }
      subtitle="Compare your recent spending against previous identical periods"
      delay={0.3}
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <MetricBox title="Current vs Prev Month" current={data.current_month.value} prev={data.prev_month.value} pct={data.month_change_pct} />
        <MetricBox title="Last 3M vs Prev 3M" current={data.curr_3m.value} prev={data.prev_3m.value} pct={data.three_month_change_pct} />
        <MetricBox title="Last 6M vs Prev 6M" current={data.curr_6m.value} prev={data.prev_6m.value} pct={data.six_month_change_pct} />
      </div>

      <div className="h-[250px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "var(--text-muted)" }} dy={10} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "var(--text-muted)" }} tickFormatter={(v) => `₹${v/1000}k`} />
            <Tooltip
              formatter={(v: any) => fmt(Number(v || 0))}
              contentStyle={{
                borderRadius: "12px",
                border: "1px solid var(--tooltip-border)",
                background: "var(--tooltip-bg)",
                boxShadow: "0 10px 25px -3px rgba(0,0,0,0.15)",
                color: "var(--text-primary)",
              }}
              itemStyle={{ color: "var(--text-primary)" }}
              cursor={{ fill: "var(--surface-2)" }}
            />
            <Bar dataKey="Previous" fill={isDark ? "#334155" : "#cbd5e1"} radius={[4, 4, 0, 0]} maxBarSize={40} />
            <Bar dataKey="Current" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={40} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}
