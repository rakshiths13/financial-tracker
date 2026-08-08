"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import api from "@/lib/api";
import toast from "react-hot-toast";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { TrendingUp, Mail, Lock, Eye, EyeOff, UserPlus } from "lucide-react";

const schema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type FormData = z.infer<typeof schema>;

export default function Signup() {
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const router = useRouter();
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      await api.post("/signup", data);
      toast.success("Account created! Please sign in.");
      router.push("/login");
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to create account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12" style={{ background: "var(--bg)" }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
            <TrendingUp className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>FinTrack</span>
        </div>

        <h1 className="text-2xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>Create your account</h1>
        <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>Start tracking your finances — free forever.</p>

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
              <input {...register("password")} type={showPass ? "text" : "password"} placeholder="Min 6 characters" className="input-field pl-10" style={{ paddingRight: "2.5rem" }} />
              <button type="button" onClick={() => setShowPass(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }}>
                {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 py-2.5 disabled:opacity-60">
            <UserPlus className="h-4 w-4" />
            {loading ? "Creating..." : "Create account"}
          </button>
        </form>

        <p className="text-center text-sm mt-5" style={{ color: "var(--text-muted)" }}>
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-indigo-600 hover:text-indigo-700">Sign in</Link>
        </p>
      </motion.div>
    </div>
  );
}
