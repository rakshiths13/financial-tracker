"use client";

import { AnimatedCard } from "./LoadingSkeleton";
import { Download } from "lucide-react";

interface ChartCardProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  delay?: number;
  className?: string;
  onDownload?: () => Promise<void> | void;
  children: React.ReactNode;
}

export default function ChartCard({ title, subtitle, delay = 0, className = "", onDownload, children }: ChartCardProps) {
  return (
    <AnimatedCard delay={delay} className={`card p-5 flex flex-col ${className}`}>
      <div className="mb-4 flex justify-between items-start">
        <div>
          <h3 className="text-sm font-bold flex items-center gap-1.5" style={{ color: "var(--text-primary)" }}>{title}</h3>
          {subtitle && <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{subtitle}</p>}
        </div>
        {onDownload && (
          <button 
            onClick={onDownload}
            className="p-1.5 rounded-md transition-colors hover:bg-black/5 dark:hover:bg-white/10"
            title="Download Chart"
            style={{ color: "var(--text-muted)" }}
          >
            <Download size={14} />
          </button>
        )}
      </div>
      <div className="flex-grow min-h-[280px] flex flex-col">{children}</div>
    </AnimatedCard>
  );
}
