"use client";

import { useAuth } from "@/contexts/AuthContext";
import WishlistComponent from "@/components/Wishlist";
import { LogOut, PieChart as PieChartIcon } from "lucide-react";
import Link from "next/link";

export default function WishlistPage() {
  const { user, logout } = useAuth();

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
                <Link href="/" className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md">
                  Dashboard
                </Link>
                <Link href="/wishlist" className="px-3 py-2 text-sm font-medium text-gray-900 bg-gray-100 rounded-md">
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
        <WishlistComponent />
      </main>
    </div>
  );
}
