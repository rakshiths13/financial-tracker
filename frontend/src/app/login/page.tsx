"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import toast from "react-hot-toast";
import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import { TrendingUp, Mail, Lock, ArrowRight, Eye, EyeOff } from "lucide-react";

const schema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type FormData = z.infer<typeof schema>;

export default function Login() {
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("username", data.email);
      params.append("password", data.password);
      const res = await api.post("/login", params, { headers: { "Content-Type": "application/x-www-form-urlencoded" } });
      localStorage.setItem("access_token", res.data.access_token);
      const userRes = await api.get("/me");
      login(res.data.access_token, userRes.data);
      toast.success("Welcome back!");
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" style={{ background: "var(--bg)" }}>
      <div className="hidden lg:flex flex-col justify-center w-[45%] bg-gradient-to-br from-indigo-600 to-indigo-800 p-12 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-64 h-64 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-80 h-80 bg-indigo-300 rounded-full blur-3xl" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-2.5 mb-12">
            <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center">
              <TrendingUp className="h-4.5 w-4.5" />
            </div>
            <span className="text-lg font-bold">FinTrack</span>
          </div>
          <h2 className="text-3xl font-extrabold leading-tight mb-3">Your finances,<br />under control.</h2>
          <p className="text-indigo-200 text-sm leading-relaxed max-w-sm">
            Upload bank statements, track spending across categories, and get a clear picture of your financial health.
          </p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2 mb-6">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
              <TrendingUp className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>FinTrack</span>
          </div>

          <h1 className="text-2xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>Welcome back</h1>
          <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>Sign in to continue</p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="label">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none" style={{ color: "var(--text-muted)" }} />
                <input {...register("email")} type="email" placeholder="you@example.com" className="input-field pl-10" />
              </div>
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
            </div>
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none" style={{ color: "var(--text-muted)" }} />
                <input {...register("password")} type={showPass ? "text" : "password"} placeholder="••••••••" className="input-field pl-10" style={{ paddingRight: "2.5rem" }} />
                <button type="button" onClick={() => setShowPass(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }}>
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 py-2.5 disabled:opacity-60">
              {loading ? "Signing in…" : <><span>Sign in</span><ArrowRight className="h-4 w-4" /></>}
            </button>
          </form>

          <p className="text-center text-sm mt-5" style={{ color: "var(--text-muted)" }}>
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="font-semibold text-indigo-600 hover:text-indigo-700">Create one</Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
