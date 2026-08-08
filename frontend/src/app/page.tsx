"use client";

import { useAuth } from "@/contexts/AuthContext";
import UploadStatement from "@/components/UploadStatement";
import SpendingCharts from "@/components/SpendingCharts";
import Navbar from "@/components/Navbar";
import AnimatedBackground from "@/components/AnimatedBackground";
import { AnimatedCard } from "@/components/LoadingSkeleton";
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Download, TrendingUp, TrendingDown, Wallet, Activity,
  Calendar as CalendarIcon, X, Info
} from "lucide-react";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { fmt } from "@/lib/formatters";

interface KPI {
  label: string;
  value: string;
  change?: string;
  up?: boolean;
  icon: React.ReactNode;
  color: string;
  tooltip?: string;
}

function KPICard({ kpi, delay }: { kpi: KPI; delay: number }) {
  return (
    <AnimatedCard delay={delay} className="card card-hover p-5 relative group">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${kpi.color}`}>
          {kpi.icon}
        </div>
        {kpi.tooltip && (
          <div className="text-slate-400 hover:text-slate-600 transition-colors" title={kpi.tooltip}>
            <Info className="h-4 w-4" />
          </div>
        )}
      </div>
      <p className="text-2xl font-extrabold mb-0.5" style={{ color: "var(--text-primary)" }}>{kpi.value}</p>
      <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>{kpi.label}</p>
    </AnimatedCard>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);
  const [kpis, setKpis] = useState<{ 
    totalDebit: number; 
    numCategories: number; 
    displayIncome: number; 
    incomeLabel: string;
    lastMonthSavings: number;
    hasLastMonthData: boolean;
  } | null>(null);

  // Export filters
  const [showExportOptions, setShowExportOptions] = useState(false);
  const [exportStartDate, setExportStartDate] = useState("");
  const [exportEndDate, setExportEndDate] = useState("");

  const handleUploadSuccess = () => setRefreshKey((k) => k + 1);

  const fetchKpis = useCallback(async () => {
    try {
      const res = await api.get("/analytics/category-summary?months=1");
      const kpiRes = await api.get("/analytics/dashboard-kpis");
      const numCategories = res.data.categories ? res.data.categories.length : 0;
      setKpis({
        totalDebit: res.data.total_spend,
        numCategories: numCategories,
        displayIncome: kpiRes.data.display_income,
        incomeLabel: kpiRes.data.income_label,
        lastMonthSavings: kpiRes.data.last_month_savings,
        hasLastMonthData: kpiRes.data.has_last_month_data,
      });
    } catch {
      // KPIs are optional
    }
  }, [refreshKey]); // Refetch on upload

  useEffect(() => { fetchKpis(); }, [fetchKpis]);

  const handleExport = async (format: "csv" | "xlsx") => {
    try {
      let urlStr = `/export/${format}`;
      const params = new URLSearchParams();
      if (exportStartDate) params.append("start_date", exportStartDate);
      if (exportEndDate) params.append("end_date", exportEndDate);
      if (params.toString()) urlStr += `?${params.toString()}`;

      const res = await api.get(urlStr, { responseType: "blob" });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `transactions_${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success(`Exported as ${format.toUpperCase()}`);
      setShowExportOptions(false);
    } catch {
      toast.error("Export failed. Please try again.");
    }
  };

  if (!user) return null;

  const kpiCards: KPI[] = [
    {
      label: "Total Spend (Last Month)",
      value: kpis ? fmt(kpis.totalDebit) : "—",
      icon: <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-400" />,
      color: "bg-red-100 dark:bg-red-900/30",
      tooltip: "Total expenses excluding internal transfers",
    },
    {
      label: kpis?.incomeLabel || "Avg Income (Last 3 Months)",
      value: kpis ? fmt(kpis.displayIncome) : "—",
      icon: <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />,
      color: "bg-emerald-100 dark:bg-emerald-900/30",
      tooltip: "Actual income credits only (excludes transfers and refunds)",
    },
    {
      label: "Last Month Savings",
      value: kpis ? (kpis.hasLastMonthData ? fmt(kpis.lastMonthSavings) : "No data") : "—",
      icon: <Wallet className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />,
      color: "bg-indigo-100 dark:bg-indigo-900/30",
      tooltip: "last_month_income - last_month_expense",
    },
    {
      label: "Tracked Categories",
      value: kpis ? String(kpis.numCategories) : "—",
      icon: <Activity className="h-5 w-5 text-violet-600 dark:text-violet-400" />,
      color: "bg-violet-100 dark:bg-violet-900/30",
    },
  ];

  return (
    <div className="min-h-screen transition-colors duration-300" style={{ background: "transparent" }}>
      <AnimatedBackground />
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page header */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8"
        >
          <div>
            <h1 className="text-2xl font-extrabold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
              Dashboard Overview
              <span className="text-xs font-semibold px-2 py-1 bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 rounded-lg ml-2">
                All Banks
              </span>
            </h1>
            <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
              Welcome back, <span className="font-semibold text-indigo-500">{user.email.split("@")[0]}</span>
            </p>
          </div>
          
          {/* Export Dropdown */}
          <div className="relative">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setShowExportOptions(!showExportOptions)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border font-semibold text-sm transition-colors"
              style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--text-primary)" }}
            >
              <Download className="h-4 w-4" />
              Export Data
            </motion.button>

            <AnimatePresence>
              {showExportOptions && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-2 w-72 rounded-2xl border p-4 shadow-xl z-10"
                  style={{ background: "var(--surface)", borderColor: "var(--border)" }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>Export Filters</h4>
                    <button onClick={() => setShowExportOptions(false)} className="text-slate-400 hover:text-slate-600">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  
                  <div className="space-y-3 mb-4">
                    <div>
                      <label className="text-xs font-semibold mb-1 block" style={{ color: "var(--text-secondary)" }}>From Date</label>
                      <div className="relative">
                        <CalendarIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                          type="date"
                          value={exportStartDate}
                          onChange={(e) => setExportStartDate(e.target.value)}
                          className="w-full text-sm pl-9 pr-3 py-2 rounded-lg border outline-none focus:border-indigo-500"
                          style={{ background: "var(--surface-2)", borderColor: "var(--border)", color: "var(--text-primary)" }}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-semibold mb-1 block" style={{ color: "var(--text-secondary)" }}>To Date</label>
                      <div className="relative">
                        <CalendarIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                          type="date"
                          value={exportEndDate}
                          onChange={(e) => setExportEndDate(e.target.value)}
                          className="w-full text-sm pl-9 pr-3 py-2 rounded-lg border outline-none focus:border-indigo-500"
                          style={{ background: "var(--surface-2)", borderColor: "var(--border)", color: "var(--text-primary)" }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleExport("csv")}
                      className="flex-1 py-2 text-sm font-semibold border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                      style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}
                    >
                      CSV
                    </button>
                    <button
                      onClick={() => handleExport("xlsx")}
                      className="flex-1 py-2 text-sm font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
                    >
                      Excel
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* KPI row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {kpiCards.map((kpi, i) => (
            <KPICard key={kpi.label} kpi={kpi} delay={i * 0.07} />
          ))}
        </div>

        {/* Upload */}
        <div className="mb-8">
          <UploadStatement onUploadSuccess={handleUploadSuccess} />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SpendingCharts refreshKey={refreshKey} />
        </div>
      </main>
    </div>
  );
}
