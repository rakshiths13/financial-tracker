"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, Sector,
} from "recharts";
import { Calculator, TrendingDown, PieChart as PieIcon, Download } from "lucide-react";
import api from "@/lib/api";
import { AnimatedCard, EmptyState } from "./LoadingSkeleton";
import { fmt, getColorForCategory } from "@/lib/formatters";
import { useTheme } from "@/contexts/ThemeContext";

interface ActiveShapeProps {
  cx: number; cy: number; innerRadius: number; outerRadius: number;
  startAngle: number; endAngle: number; fill: string;
  payload: { name: string }; value: number;
}

const renderActiveShape = (props: ActiveShapeProps) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, value } = props;
  return (
    <g>
      <text x={cx} y={cy - 12} textAnchor="middle" className="text-base font-bold" style={{ fill: "var(--text-primary)" }}>
        {payload.name}
      </text>
      <text x={cx} y={cy + 14} textAnchor="middle" className="text-sm font-semibold" style={{ fill: "var(--primary)" }}>
        {fmt(value)}
      </text>
      <Sector
        cx={cx} cy={cy}
        innerRadius={innerRadius - 4}
        outerRadius={outerRadius + 6}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
    </g>
  );
};

interface SpendingChartsProps {
  refreshKey: number;
}

interface SavingsCalcResult {
  target_amount: number;
  months_to_save: number;
  avg_monthly_income: number;
  required_monthly_savings: number;
  max_monthly_spend: number;
  feasible: boolean;
}

export default function SpendingCharts({ refreshKey }: SpendingChartsProps) {
  const { isDark } = useTheme();
  const [data, setData] = useState<{ name: string; value: number }[]>([]);
  const [months, setMonths] = useState<number>(1);
  const [loading, setLoading] = useState(true);
  const [totalSpend, setTotalSpend] = useState(0);
  const [activeIndex, setActiveIndex] = useState<number>(0);

  // Savings calculator state
  const [targetAmount, setTargetAmount] = useState("300000");
  const [monthsToSave, setMonthsToSave] = useState("6");
  const [calcData, setCalcData] = useState<SavingsCalcResult | null>(null);
  const [calcLoading, setCalcLoading] = useState(false);

  const fetchChart = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/analytics/spending-by-category?months=${months}`);
      setData(res.data);
      setTotalSpend(res.data.reduce((acc: number, row: { value: number }) => acc + row.value, 0));
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [months, refreshKey]);

  useEffect(() => { fetchChart(); }, [fetchChart]);

  const fetchCalc = useCallback(async () => {
    const t = parseFloat(targetAmount);
    const m = parseInt(monthsToSave);
    if (!t || !m || m < 1) return;
    setCalcLoading(true);
    try {
      const res = await api.get(
        `/analytics/savings-calculator?target_amount=${t}&months_to_save=${m}`
      );
      setCalcData(res.data);
    } catch {
      setCalcData(null);
    } finally {
      setCalcLoading(false);
    }
  }, [targetAmount, monthsToSave, refreshKey]);

  useEffect(() => { fetchCalc(); }, [fetchCalc]);

  return (
    <>
      {/* ── Spending Analysis Card ── */}
      <AnimatedCard delay={0.1} className="card p-6 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
              <PieIcon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h3 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>Spending Analysis</h3>
              {totalSpend > 0 && (
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  Total: <span className="font-semibold text-indigo-500">{fmt(totalSpend)}</span>
                </p>
              )}
            </div>
          </div>
          <select
            value={months}
            onChange={(e) => setMonths(Number(e.target.value))}
            style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--text-primary)" }}
            className="text-sm font-semibold rounded-xl px-3 py-2 border-2 focus:outline-none focus:border-indigo-500 cursor-pointer transition-colors"
          >
            <option value={1}>Last 1 Month</option>
            <option value={3}>Last 3 Months</option>
            <option value={6}>Last 6 Months</option>
          </select>
        </div>

        {/* Chart area */}
        <div className="flex-grow min-h-[300px] flex items-center justify-center">
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-3"
              >
                <div className="w-32 h-32 rounded-full skeleton" />
                <div className="space-y-2 w-48">
                  <div className="skeleton h-3 rounded" />
                  <div className="skeleton h-3 w-3/4 rounded" />
                </div>
              </motion.div>
            ) : data.length > 0 ? (
              <motion.div
                key="chart"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.4 }}
                className="w-full"
              >
                <ResponsiveContainer width="100%" height={320}>
                  <PieChart>
                    <Pie
                      {...({ activeIndex, activeShape: renderActiveShape } as any)}
                      data={data}
                      cx="50%"
                      cy="50%"
                      innerRadius={72}
                      outerRadius={110}
                      paddingAngle={3}
                      dataKey="value"
                      onMouseEnter={(_, index) => setActiveIndex(index)}
                    >
                      {data.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={getColorForCategory(entry.name, index)}
                          stroke={isDark ? "#141926" : "#ffffff"}
                          strokeWidth={2}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v: any, name: any) => {
                        const val = Number(v || 0);
                        const pct = ((val / totalSpend) * 100).toFixed(1);
                        return [`${fmt(val)} (${pct}%)`, name as string];
                      }}
                      contentStyle={{
                        borderRadius: "12px",
                        border: "1px solid var(--tooltip-border)",
                        background: "var(--tooltip-bg)",
                        boxShadow: "0 10px 25px -3px rgba(0,0,0,0.15)",
                        fontSize: "0.875rem",
                        color: "var(--text-primary)",
                      }}
                      itemStyle={{ color: "var(--text-primary)" }}
                    />
                    <Legend
                      iconType="circle"
                      iconSize={8}
                      formatter={(value, entry: any) => (
                        <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: 500 }}>
                          {value} • {fmt(entry.payload?.value || 0)}
                        </span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </motion.div>
            ) : (
              <EmptyState
                icon={<TrendingDown className="h-8 w-8" />}
                title="No spending data"
                description="Upload a bank statement to see your spending breakdown by category."
              />
            )}
          </AnimatePresence>
        </div>
      </AnimatedCard>

      {/* ── Savings Calculator Card ── */}
      <AnimatedCard delay={0.2} className="card p-6 flex flex-col">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-9 h-9 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
            <Calculator className="h-5 w-5 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <h3 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>Savings Calculator</h3>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>Plan your financial goals</p>
          </div>
        </div>

        <div className="space-y-4 mb-6">
          <div>
            <label className="label">Target Amount to Save (₹)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-sm">₹</span>
              {/* Fix for padding overlap: use pl-9 (36px) instead of pl-7 */}
              <input
                type="number"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                className="input-field pl-9"
                placeholder="e.g. 300000"
              />
            </div>
          </div>
          <div>
            <label className="label">Timeframe (Months)</label>
            <input
              type="number"
              value={monthsToSave}
              onChange={(e) => setMonthsToSave(e.target.value)}
              min="1"
              max="60"
              className="input-field"
              placeholder="e.g. 6"
            />
          </div>
        </div>

        {calcLoading && (
          <div className="space-y-3">
            <div className="skeleton h-16 rounded-xl" />
            <div className="skeleton h-16 rounded-xl" />
          </div>
        )}

        {calcData && !calcLoading && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="mt-auto space-y-3"
          >
            <div className="grid grid-cols-2 gap-3">
              <div
                className="rounded-xl p-4 border"
                style={{ background: "var(--surface-2)", borderColor: "var(--border)" }}
              >
                <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--text-muted)" }}>
                  Avg Monthly Income
                </p>
                <p className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
                  {fmt(calcData.avg_monthly_income)}
                </p>
              </div>
              <div className="rounded-xl p-4 border border-indigo-200 bg-indigo-50 dark:bg-indigo-900/20 dark:border-indigo-800">
                <p className="text-xs font-semibold uppercase tracking-wide mb-1 text-indigo-600 dark:text-indigo-400">
                  Monthly Saving Needed
                </p>
                <p className="text-xl font-bold text-indigo-700 dark:text-indigo-300">
                  {fmt(calcData.required_monthly_savings)}
                </p>
              </div>
            </div>

            <div
              className={`rounded-xl p-4 border ${
                calcData.feasible
                  ? "bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800"
                  : "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800"
              }`}
            >
              <p
                className={`text-xs font-semibold uppercase tracking-wide mb-1 ${
                  calcData.feasible ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"
                }`}
              >
                Max Allowed Monthly Spend
              </p>
              <p
                className={`text-2xl font-900 font-extrabold ${
                  calcData.feasible ? "text-emerald-700 dark:text-emerald-300" : "text-red-600 dark:text-red-400"
                }`}
              >
                {fmt(calcData.max_monthly_spend)}
              </p>
              {!calcData.feasible && (
                <p className="text-xs text-red-500 mt-1 font-medium">
                  ⚠ Goal not feasible based on current income. Adjust target or timeframe.
                </p>
              )}
              {calcData.feasible && (
                <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 font-medium">
                  ✓ Goal is achievable! Stay within this monthly budget.
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatedCard>
    </>
  );
}
