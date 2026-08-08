import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { Toaster } from "react-hot-toast";

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "FinTrack — Personal Finance Tracker",
  description:
    "Track your personal finances with ease. Upload bank statements, analyze spending patterns, compare banks, and plan your savings.",
  keywords: "finance tracker, budget, spending analysis, bank statements, savings, India, INR",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider>
          <AuthProvider>
            {children}
            <Toaster
              position="top-right"
              toastOptions={{
                style: {
                  background: "var(--surface)",
                  color: "var(--text-primary)",
                  borderRadius: "12px",
                  border: "1px solid var(--border)",
                  boxShadow: "0 10px 25px -3px rgba(0,0,0,0.15)",
                  fontSize: "0.875rem",
                  fontWeight: "500",
                },
                success: {
                  iconTheme: { primary: "#10b981", secondary: "#fff" },
                },
                error: {
                  iconTheme: { primary: "#ef4444", secondary: "#fff" },
                },
              }}
            />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
