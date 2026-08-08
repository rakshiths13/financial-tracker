"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp, LayoutDashboard, BarChart2, Heart, LogOut,
  Clock, User as UserIcon, Menu, X, Sun, Moon, Home, PieChart, PlusCircle, Target,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";

const NAV_LINKS = [
  { label: "Dashboard", href: "/", icon: Home },
  { label: "Analysis", href: "/analysis", icon: PieChart },
  { label: "Manual Entries", href: "/manual", icon: PlusCircle },
  { label: "Future Plans", href: "/wishlist", icon: Target },
];

function LiveClock() {
  const [time, setTime] = useState("");
  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString("en-US", {
      timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
    }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium" style={{ background: "var(--surface-2)", color: "var(--text-secondary)" }}>
      <Clock className="h-3.5 w-3.5" />
      <span className="tabular-nums">{time}</span>
      <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>IST</span>
    </div>
  );
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (!user) return null;

  return (
    <nav className="sticky top-0 z-40 border-b" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
              <TrendingUp className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
              Fin<span className="text-indigo-600">Track</span>
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-0.5">
            {NAV_LINKS.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href} className={`nav-link flex items-center gap-1.5 ${pathname === href ? "active" : ""}`}>
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <LiveClock />
            <button
              onClick={toggleTheme}
              title={isDark ? "Light mode" : "Dark mode"}
              className="p-1.5 rounded-lg border transition-colors"
              style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium" style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}>
              <UserIcon className="h-3 w-3" />
              <span className="max-w-[120px] truncate">{user.email}</span>
            </div>
            <button onClick={logout} title="Logout" className="p-1.5 rounded-lg hover:text-red-500 transition-colors" style={{ color: "var(--text-muted)" }}>
              <LogOut className="h-4 w-4" />
            </button>
            <button className="md:hidden p-1.5" style={{ color: "var(--text-secondary)" }} onClick={() => setMobileOpen(p => !p)}>
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden overflow-hidden border-t"
            style={{ background: "var(--surface)", borderColor: "var(--border)" }}
          >
            <div className="px-4 py-2 space-y-0.5">
              {NAV_LINKS.map(({ href, label, icon: Icon }) => (
                <Link key={href} href={href} onClick={() => setMobileOpen(false)} className={`nav-link flex items-center gap-2 py-2 ${pathname === href ? "active" : ""}`}>
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
