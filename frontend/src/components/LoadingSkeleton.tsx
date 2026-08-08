"use client";

import { motion } from "framer-motion";

export function AnimatedCard({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay }} className={className}>
      {children}
    </motion.div>
  );
}

export function EmptyState({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
      <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-3" style={{ background: "var(--surface-2)", color: "var(--text-muted)" }}>
        {icon}
      </div>
      <h4 className="text-sm font-semibold mb-0.5" style={{ color: "var(--text-primary)" }}>{title}</h4>
      <p className="text-xs max-w-xs" style={{ color: "var(--text-muted)" }}>{description}</p>
    </div>
  );
}

export function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div className={`card p-5 ${className}`}>
      <div className="skeleton h-3 w-1/3 mb-3" />
      <div className="skeleton h-6 w-2/3 mb-2" />
      <div className="skeleton h-3 w-1/2" />
    </div>
  );
}
