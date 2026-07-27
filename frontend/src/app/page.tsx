"use client";

import { useAuth } from "@/contexts/AuthContext";
import UploadStatement from "@/components/UploadStatement";
import { LogOut, Download, PieChart as PieChartIcon, LayoutDashboard, ListTodo } from "lucide-react";
import Link from "next/link";
import api from "@/lib/api";
import { useState } from "react";
import SpendingCharts from "@/components/SpendingCharts";

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0); // Used to re-trigger child components

  const handleUploadSuccess = () => {
    setRefreshKey(prev => prev + 1);
  };

  const handleExport = async (format: 'csv' | 'xlsx') => {
    try {
      const response = await api.get(`/export/${format}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `transactions.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error("Export failed", error);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-8">
              <h1 className="text-xl font-bold text-indigo-600 flex items-center">
                <PieChartIcon className="h-6 w-6 mr-2" />
                Finance Tracker
              </h1>
              <div className="hidden md:flex space-x-4">
                <Link href="/" className="px-3 py-2 text-sm font-medium text-gray-900 bg-gray-100 rounded-md">
                  Dashboard
                </Link>
                <Link href="/wishlist" className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md">
                  Wishlist
                </Link>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600 hidden sm:block">{user.email}</span>
              <button
                onClick={logout}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Dashboard Overview</h2>
          <div className="flex space-x-3">
            <button onClick={() => handleExport('csv')} className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
              <Download className="h-4 w-4 mr-2" />
              CSV
            </button>
            <button onClick={() => handleExport('xlsx')} className="inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700">
              <Download className="h-4 w-4 mr-2" />
              Excel
            </button>
          </div>
        </div>

        <UploadStatement onUploadSuccess={handleUploadSuccess} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
          <SpendingCharts refreshKey={refreshKey} />
        </div>
      </main>
    </div>
  );
}
