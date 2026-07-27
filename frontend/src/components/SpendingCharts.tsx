"use client";

import { useEffect, useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import api from "@/lib/api";
import { Calculator } from "lucide-react";

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#10b981', '#06b6d4'];

interface SpendingChartsProps {
  refreshKey: number;
}

export default function SpendingCharts({ refreshKey }: SpendingChartsProps) {
  const [data, setData] = useState<any[]>([]);
  const [months, setMonths] = useState<number>(1);
  const [loading, setLoading] = useState(true);

  // Calculator State
  const [targetAmount, setTargetAmount] = useState<string>('300000');
  const [monthsToSave, setMonthsToSave] = useState<string>('3');
  const [calcData, setCalcData] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/analytics/spending-by-category?months=${months}`);
        setData(res.data);
      } catch (error) {
        console.error("Failed to fetch chart data", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [months, refreshKey]);

  useEffect(() => {
    const fetchCalc = async () => {
      try {
        const tAmount = parseFloat(targetAmount) || 0;
        const mSave = parseInt(monthsToSave) || 1;
        const res = await api.get(`/analytics/savings-calculator?target_amount=${tAmount}&months_to_save=${mSave}`);
        setCalcData(res.data);
      } catch (error) {
        console.error("Failed to fetch calculator data", error);
      }
    };
    if (targetAmount && monthsToSave) {
        fetchCalc();
    }
  }, [targetAmount, monthsToSave, refreshKey]);

  return (
    <>
      {/* Charts */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 min-h-[400px] flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold text-gray-800">Spending Analysis</h3>
          <select
            value={months}
            onChange={(e) => setMonths(Number(e.target.value))}
            className="block pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
          >
            <option value={1}>Last 1 Month</option>
            <option value={3}>Last 3 Months</option>
            <option value={6}>Last 6 Months</option>
          </select>
        </div>

        <div className="flex-grow">
          {loading ? (
            <div className="flex justify-center items-center h-full">Loading...</div>
          ) : data.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => `₹${value.toFixed(2)}`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex justify-center items-center h-full text-gray-500">
              No data available for this period. Upload statements to see charts.
            </div>
          )}
        </div>
      </div>

      {/* Calculator */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col">
        <h3 className="text-lg font-semibold text-gray-800 mb-6 flex items-center">
          <Calculator className="h-5 w-5 mr-2 text-indigo-500" />
          Savings Calculator
        </h3>

        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">Target Amount to Save (₹)</label>
            <input
              type="number"
              value={targetAmount}
              onChange={(e) => setTargetAmount(e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Timeframe (Months)</label>
            <input
              type="number"
              value={monthsToSave}
              onChange={(e) => setMonthsToSave(e.target.value)}
              min="1"
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
        </div>

        {calcData && (
          <div className="mt-auto bg-gray-50 rounded-lg p-4 border border-gray-200">
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-xs font-medium text-gray-500 uppercase">Avg Monthly Income</dt>
                <dd className="mt-1 text-lg font-semibold text-gray-900">₹{calcData.avg_monthly_income}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500 uppercase">Required Monthly Save</dt>
                <dd className="mt-1 text-lg font-semibold text-indigo-600">₹{calcData.required_monthly_savings}</dd>
              </div>
              <div className="col-span-2 pt-3 border-t border-gray-200">
                <dt className="text-xs font-medium text-gray-500 uppercase">Max Allowed Monthly Spend</dt>
                <dd className={`mt-1 text-2xl font-bold ${calcData.feasible ? 'text-green-600' : 'text-red-600'}`}>
                  ₹{calcData.max_monthly_spend}
                </dd>
                {!calcData.feasible && (
                  <p className="text-xs text-red-500 mt-1">Target is not feasible based on average income.</p>
                )}
              </div>
            </dl>
          </div>
        )}
      </div>
    </>
  );
}
