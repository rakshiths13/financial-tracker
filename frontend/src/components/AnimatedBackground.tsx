"use client";

import { motion } from "framer-motion";
import { useTheme } from "@/contexts/ThemeContext";

export default function AnimatedBackground() {
  const { isDark } = useTheme();

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
      {/* Base background color */}
      <div 
        className="absolute inset-0 transition-colors duration-700" 
        style={{ background: isDark ? "#0f172a" : "#f8fafc" }} 
      />
      
      {/* Animated blob 1 */}
      <motion.div
        className="absolute w-[600px] h-[600px] rounded-full mix-blend-multiply blur-3xl opacity-10"
        style={{ 
          background: isDark ? "#6366f1" : "#818cf8",
          top: "-10%", left: "-10%" 
        }}
        animate={{
          x: [0, 100, 0],
          y: [0, 50, 0],
          scale: [1, 1.1, 1]
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "linear"
        }}
      />
      
      {/* Animated blob 2 */}
      <motion.div
        className="absolute w-[500px] h-[500px] rounded-full mix-blend-multiply blur-3xl opacity-10"
        style={{ 
          background: isDark ? "#10b981" : "#34d399",
          bottom: "-10%", right: "-5%" 
        }}
        animate={{
          x: [0, -80, 0],
          y: [0, -60, 0],
          scale: [1, 1.2, 1]
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "linear"
        }}
      />

      {/* Animated blob 3 (Subtle accent) */}
      <motion.div
        className="absolute w-[400px] h-[400px] rounded-full mix-blend-multiply blur-3xl opacity-5"
        style={{ 
          background: isDark ? "#f43f5e" : "#fb7185",
          top: "40%", left: "50%" 
        }}
        animate={{
          x: [0, 50, -50, 0],
          y: [0, -50, 50, 0],
          scale: [1, 1.3, 1]
        }}
        transition={{
          duration: 30,
          repeat: Infinity,
          ease: "linear"
        }}
      />
    </div>
  );
}
