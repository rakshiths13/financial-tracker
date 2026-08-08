"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area,
} from "recharts";
import {
  BarChart2, TrendingUp, PieChart as PieIcon,
  Landmark, Filter, MoreHorizontal
} from "lucide-react";
import api from "@/lib/api";
import Navbar from "@/components/Navbar";
import AnimatedBackground from "@/components/AnimatedBackground";
import { AnimatedCard, EmptyState } from "@/components/LoadingSkeleton";
import ChartCard from "@/components/ChartCard";
import ComparisonCharts from "@/components/ComparisonCharts";
import { fmt, fmtShort, getColorForCategory } from "@/lib/formatters";
import { useTheme } from "@/contexts/ThemeContext";
import toast from "react-hot-toast";
import { CATEGORY_ICONS } from "@/lib/constants";

interface CategoryRow { name: string; value: number; pct: number }
interface MonthRow { month: string; debit: number; credit: number }
interface BankRow { bank: string; spending: number }
interface CategorySummary { total_spend: number; categories: CategoryRow[] }

const MONTHS_OPTIONS = [
  { label: "1 Month",  value: 1 },
  { label: "3 Months", value: 3 },
  { label: "6 Months", value: 6 },
  { label: "1 Year",   value: 12 },
];



// ─── Custom Tooltip ────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-xl border px-4 py-3 text-sm shadow-xl"
      style={{ background: "var(--tooltip-bg)", borderColor: "var(--tooltip-border)" }}
    >
      <p className="font-semibold mb-2" style={{ color: "var(--text-primary)" }}>{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span style={{ color: "var(--text-secondary)" }}>{p.name}:</span>
          <span className="font-bold" style={{ color: "var(--text-primary)" }}>{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

export default function AnalysisPage() {
  const { isDark } = useTheme();
  const [months, setMonths] = useState(3);
  const [banks, setBanks] = useState<string[]>([]);
  const [selectedBank, setSelectedBank] = useState<string>("All");
  const [source, setSource] = useState<string>("All");
  const [transferType, setTransferType] = useState<string>("All");

  const [catSummary, setCatSummary] = useState<CategorySummary | null>(null);
  const [monthlyData, setMonthlyData] = useState<MonthRow[]>([]);
  const [bankData, setBankData] = useState<BankRow[]>([]);

  const [catLoading, setCatLoading] = useState(true);
  const [monthLoading, setMonthLoading] = useState(true);
  const [bankLoading, setBankLoading] = useState(true);

  // Download chart functionality — dynamic import avoids Next.js build-time resolution
  const downloadChart = async (elementId: string, filename: string) => {
    const el = document.getElementById(elementId);
    if (!el) return;
    toast.loading("Generating image...", { id: "dl" });
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(el, { background: isDark ? "#141926" : "#ffffff", scale: 2 } as any);
      const link = document.createElement("a");
      link.download = `${filename}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      toast.success("Chart downloaded!", { id: "dl" });
    } catch {
      toast.error("Failed to download chart", { id: "dl" });
    }
  };

  const fetchBanks = useCallback(async () => {
    try {
      const res = await api.get("/analytics/bank-list");
      setBanks(res.data.banks || []);
    } catch {
      setBanks([]);
    }
  }, []);

  const fetchCategory = useCallback(async () => {
    setCatLoading(true);
    try {
      const bankParam = selectedBank !== "All" ? `&bank_name=${encodeURIComponent(selectedBank)}` : "";
      const sourceParam = source !== "All" ? `&source=${source}` : "";
      const transferParam = transferType !== "All" ? `&transfer_type=${transferType}` : "";
      const res = await api.get(`/analytics/category-summary?months=${months}${bankParam}${sourceParam}${transferParam}`);
      setCatSummary(res.data);
    } catch {
      setCatSummary(null);
    } finally {
      setCatLoading(false);
    }
  }, [months, selectedBank, source, transferType]);

  const fetchMonthly = useCallback(async () => {
    setMonthLoading(true);
    try {
      const bankParam = selectedBank !== "All" ? `&bank_name=${encodeURIComponent(selectedBank)}` : "";
      const sourceParam = source !== "All" ? `&source=${source}` : "";
      const transferParam = transferType !== "All" ? `&transfer_type=${transferType}` : "";
      const res = await api.get(`/analytics/monthly-totals?months=${months}${bankParam}${sourceParam}${transferParam}`);
      setMonthlyData(res.data);
    } catch {
      setMonthlyData([]);
    } finally {
      setMonthLoading(false);
    }
  }, [months, selectedBank, source, transferType]);

  const fetchBankComparison = useCallback(async () => {
    if (selectedBank !== "All") return; // Only fetch if looking at all banks
    setBankLoading(true);
    try {
      const res = await api.get(`/analytics/bank-comparison?months=${months}`);
      setBankData(res.data);
    } catch {
      setBankData([]);
    } finally {
      setBankLoading(false);
    }
  }, [months, selectedBank]);

  useEffect(() => { fetchBanks(); }, [fetchBanks]);
  useEffect(() => {
    fetchCategory();
    fetchMonthly();
    fetchBankComparison();
  }, [fetchCategory, fetchMonthly, fetchBankComparison]);

  const categories = catSummary?.categories ?? [];
  const totalSpend = catSummary?.total_spend ?? 0;

  // Process pie chart data for readability (group <3% slices)
  const processedPieCategories = categories.reduce((acc: any[], curr) => {
    if (curr.pct >= 3) {
      acc.push(curr);
    } else {
      let others = acc.find(x => x.name === "Minor Categories");
      if (!others) {
        others = { name: "Minor Categories", value: 0, pct: 0 };
        acc.push(others);
      }
      others.value += curr.value;
      others.pct += curr.pct;
    }
    return acc;
  }, []);
  // format minor pct nicely
  if (processedPieCategories.length) {
    const minor = processedPieCategories.find(x => x.name === "Minor Categories");
    if (minor) minor.pct = Number(minor.pct.toFixed(1));
  }

  return (
    <div className="min-h-screen transition-colors duration-300" style={{ background: "transparent" }}>
      <AnimatedBackground />
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header & Filters */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8"
        >
          <div>
            <h1 className="text-2xl font-extrabold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
              <BarChart2 className="h-6 w-6 text-indigo-500" />
              Advanced Analytics
            </h1>
            <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
              Deep-dive into your financial patterns across {selectedBank === "All" ? "all accounts" : `${selectedBank} only`}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Bank Filter */}
            {banks.length > 0 && (
              <div
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl border"
                style={{ background: "var(--surface)", borderColor: "var(--border)" }}
              >
                <Landmark className="h-4 w-4 text-slate-400" />
                <select
                  value={selectedBank}
                  onChange={(e) => setSelectedBank(e.target.value)}
                  className="bg-transparent text-sm font-semibold outline-none cursor-pointer"
                  style={{ color: "var(--text-primary)" }}
                >
                  <option value="All" className="bg-white dark:bg-slate-800">All Banks</option>
                  {banks.map(b => <option key={b} value={b} className="bg-white dark:bg-slate-800">{b}</option>)}
                </select>
              </div>
            )}

            {/* Source Filter */}
            <div
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl border"
              style={{ background: "var(--surface)", borderColor: "var(--border)" }}
            >
              <Filter className="h-4 w-4 text-slate-400" />
              <select
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="bg-transparent text-sm font-semibold outline-none cursor-pointer"
                style={{ color: "var(--text-primary)" }}
              >
                <option value="All" className="bg-white dark:bg-slate-800">All Sources</option>
                <option value="STATEMENT" className="bg-white dark:bg-slate-800">Statement Only</option>
                <option value="MANUAL" className="bg-white dark:bg-slate-800">Manual Only</option>
              </select>
            </div>

            {/* Transfer Type Filter */}
            <div
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl border"
              style={{ background: "var(--surface)", borderColor: "var(--border)" }}
            >
              <Filter className="h-4 w-4 text-slate-400" />
              <select
                value={transferType}
                onChange={(e) => setTransferType(e.target.value)}
                className="bg-transparent text-sm font-semibold outline-none cursor-pointer"
                style={{ color: "var(--text-primary)" }}
              >
                <option value="All" className="bg-white dark:bg-slate-800">No Transfers (KPI Default)</option>
                <option value="none" className="bg-white dark:bg-slate-800">Strict Non-Transfers</option>
                <option value="internal_transfer" className="bg-white dark:bg-slate-800">Internal Transfers</option>
                <option value="possible_transfer" className="bg-white dark:bg-slate-800">Possible Transfers</option>
              </select>
            </div>

            {/* Time Filter */}
            <div className="flex items-center gap-1 p-1 rounded-xl border" style={{ background: "var(--surface-2)", borderColor: "var(--border)" }}>
              {MONTHS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setMonths(opt.value)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                    months === opt.value
                      ? "bg-indigo-500 text-white shadow-sm"
                      : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Top KPIs */}
        <AnimatedCard delay={0} className="mb-6">
          <div className="card p-6 flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1">
              <p className="text-sm font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
                Total Spending · {selectedBank === "All" ? "All Banks" : selectedBank} · Last {months} Month{months > 1 ? "s" : ""}
              </p>
              <AnimatePresence mode="wait">
                <motion.p
                  key={totalSpend}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="text-4xl font-extrabold mt-1"
                  style={{ color: "var(--text-primary)" }}
                >
                  {catLoading ? <span className="skeleton inline-block w-48 h-9 rounded-xl" /> : fmt(totalSpend)}
                </motion.p>
              </AnimatePresence>
            </div>
            {totalSpend > 0 && categories.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {categories.slice(0, 3).map((c, i) => (
                  <div
                    key={c.name}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold"
                    style={{
                      background: isDark ? "rgba(255,255,255,0.05)" : getColorForCategory(c.name, i) + "18",
                      color: getColorForCategory(c.name, i),
                      border: isDark ? `1px solid ${getColorForCategory(c.name, i)}40` : "none"
                    }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: getColorForCategory(c.name, i) }} />
                    {c.name}: {fmt(c.value)}
                  </div>
                ))}
              </div>
            )}
          </div>
        </AnimatedCard>

        {/* Row 1: Bar chart + Pie chart */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-6">
          <ChartCard
            title={<><BarChart2 className="h-4.5 w-4.5 text-indigo-500" /> Category Breakdown</>}
            delay={0.1}
            className="lg:col-span-3"
            onDownload={() => downloadChart("cat-bar", "Category_Breakdown")}
          >
            <div id="cat-bar" className="h-full w-full">
              <AnimatePresence mode="wait">
                {catLoading ? (
                  <div className="skeleton h-64 rounded-xl" />
                ) : categories.length > 0 ? (
                  <motion.div key="bar" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full w-full pt-4">
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={categories} layout="vertical" margin={{ left: 12, right: 24 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
                        <XAxis type="number" tickFormatter={fmtShort} tick={{ fontSize: 11, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
                        <YAxis dataKey="name" type="category" tick={{ fontSize: 12, fill: "var(--text-secondary)", fontWeight: 500 }} width={130} axisLine={false} tickLine={false} />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: "var(--surface-2)" }} />
                        <Bar dataKey="value" name="Spending" radius={[0, 6, 6, 0]} maxBarSize={32}>
                          {categories.map((entry, i) => (
                            <Cell key={entry.name} fill={getColorForCategory(entry.name, i)} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </motion.div>
                ) : (
                  <EmptyState icon={<BarChart2 className="h-8 w-8" />} title="No data yet" description="Upload bank statements to see your breakdown." />
                )}
              </AnimatePresence>
            </div>
          </ChartCard>

          <ChartCard
            title={<><PieIcon className="h-4.5 w-4.5 text-violet-500" /> Spend Distribution</>}
            delay={0.15}
            className="lg:col-span-2"
            onDownload={() => downloadChart("cat-pie", "Spend_Distribution")}
          >
            <div id="cat-pie" className="h-full w-full flex items-center justify-center">
              {catLoading ? (
                <div className="skeleton h-64 rounded-xl w-full" />
              ) : categories.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={processedPieCategories} cx="50%" cy="45%" outerRadius={90} innerRadius={52} dataKey="value" paddingAngle={3}>
                      {processedPieCategories.map((entry, i) => (
                        <Cell key={entry.name} fill={getColorForCategory(entry.name, i)} stroke={isDark ? "#141926" : "#ffffff"} strokeWidth={2} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: any, name: any, props: any) => [fmt(Number(v || 0)) + ` (${props.payload.pct}%)`, "Amount"]} contentStyle={{ borderRadius: "12px", border: "1px solid var(--tooltip-border)", background: "var(--tooltip-bg)", color: "var(--text-primary)" }} itemStyle={{ color: "var(--text-primary)" }} />
                    <Legend iconType="circle" iconSize={7} formatter={(v) => <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>{v}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState icon={<PieIcon className="h-8 w-8" />} title="No data yet" description="Upload statements to see distribution." />
              )}
            </div>
          </ChartCard>
        </div>

        {/* Row 2: Period Comparisons & Bank Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <ComparisonCharts />

          {selectedBank === "All" && (
            <ChartCard
              title={<><Landmark className="h-4.5 w-4.5 text-amber-500" /> Bank-wise Spending</>}
              delay={0.35}
              onDownload={() => downloadChart("bank-bar", "Bank_Comparison")}
            >
              <div id="bank-bar" className="h-full w-full pt-4">
                {bankLoading ? (
                  <div className="skeleton h-64 rounded-xl" />
                ) : bankData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={bankData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                      <XAxis dataKey="bank" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "var(--text-muted)" }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "var(--text-muted)" }} tickFormatter={(v) => `₹${v/1000}k`} />
                      <Tooltip formatter={(v: any) => fmt(Number(v || 0))} contentStyle={{ borderRadius: "12px", border: "1px solid var(--tooltip-border)", background: "var(--tooltip-bg)", color: "var(--text-primary)" }} itemStyle={{ color: "var(--text-primary)" }} cursor={{ fill: "var(--surface-2)" }} />
                      <Bar dataKey="spending" name="Spending" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={50} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyState icon={<Landmark className="h-8 w-8" />} title="No multi-bank data" description="Upload statements from different banks to compare." />
                )}
              </div>
            </ChartCard>
          )}
        </div>

        {/* Row 3: Monthly trend */}
        <ChartCard
          title={<><TrendingUp className="h-4.5 w-4.5 text-emerald-500" /> Monthly Trend — Income vs. Spending</>}
          delay={0.2}
          className="mb-6"
          onDownload={() => downloadChart("trend-area", "Monthly_Trend")}
        >
          <div id="trend-area" className="h-full w-full pt-4">
            {monthLoading ? (
              <div className="skeleton h-64 rounded-xl w-full" />
            ) : monthlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={monthlyData} margin={{ top: 4, right: 24, left: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="debitGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="creditGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={fmtShort} tick={{ fontSize: 11, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend iconType="circle" formatter={(v) => <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: 500 }}>{v}</span>} />
                  <Area type="monotone" dataKey="debit" name="Spending" stroke="#6366f1" strokeWidth={3} fill="url(#debitGrad)" dot={{ fill: "#6366f1", r: 4, strokeWidth: 2, stroke: "var(--surface)" }} activeDot={{ r: 6 }} />
                  <Area type="monotone" dataKey="credit" name="Income" stroke="#10b981" strokeWidth={3} fill="url(#creditGrad)" dot={{ fill: "#10b981", r: 4, strokeWidth: 2, stroke: "var(--surface)" }} activeDot={{ r: 6 }} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState icon={<TrendingUp className="h-8 w-8" />} title="No trend data" description="Upload multiple months of statements to see spending trends." />
            )}
          </div>
        </ChartCard>

        {/* Row 4: Category cards */}
        {categories.length > 0 && (
          <AnimatedCard delay={0.25}>
            <h3 className="text-base font-bold mb-4" style={{ color: "var(--text-primary)" }}>Category Details</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {categories.map((cat, i) => {
                const color = getColorForCategory(cat.name, i);
                const icon = CATEGORY_ICONS[cat.name] ?? <MoreHorizontal className="h-4 w-4" />;
                return (
                  <motion.div
                    key={cat.name}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + i * 0.05 }}
                    className="card card-hover p-4"
                  >
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center mb-3"
                      style={{ background: isDark ? `${color}20` : `${color}18`, color }}
                    >
                      {icon}
                    </div>
                    <p className="text-base font-bold" style={{ color: "var(--text-primary)" }}>{fmt(cat.value)}</p>
                    <p className="text-xs font-medium mt-0.5" style={{ color: "var(--text-secondary)" }}>{cat.name}</p>
                    <div className="mt-3 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--surface-2)" }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${cat.pct}%` }}
                        transition={{ duration: 0.8, delay: 0.4 + i * 0.05, ease: "easeOut" }}
                        className="h-full rounded-full"
                        style={{ background: color }}
                      />
                    </div>
                    <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{cat.pct}% of total</p>
                  </motion.div>
                );
              })}
            </div>
          </AnimatedCard>
        )}
      </main>
    </div>
  );
}
