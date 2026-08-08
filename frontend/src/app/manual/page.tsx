"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Edit2, Trash2, Calendar, Landmark, Tag, AlignLeft, IndianRupee, Activity, Check } from "lucide-react";
import Navbar from "@/components/Navbar";
import AnimatedBackground from "@/components/AnimatedBackground";
import { fmt } from "@/lib/formatters";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { CATEGORIES, BANKS } from "@/lib/constants";

interface ManualTx {
  id: number;
  date: string;
  bank_name: string;
  type: string;
  category: string;
  description: string;
  amount: number;
  source: string;
  transfer_type: string;
  is_transfer: boolean;
}



export default function ManualPage() {
  const [transactions, setTransactions] = useState<ManualTx[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isEditing, setIsEditing] = useState<number | null>(null);
  
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    bank_name: "Manual / Cash",
    type: "DEBIT",
    category: "Others",
    description: "",
    amount: ""
  });

  const fetchTransactions = async () => {
    try {
      const res = await api.get("/transactions/");
      setTransactions(res.data);
    } catch (err) {
      toast.error("Failed to load transactions");
    } finally {
      setLoading(false);
    }
  };

  const handleReclassify = async (id: number, newType: string) => {
    try {
      await api.patch(`/transactions/${id}/reclassify`, { transfer_type: newType });
      toast.success("Transaction reclassified");
      fetchTransactions();
    } catch {
      toast.error("Failed to reclassify");
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const handleEdit = (tx: ManualTx) => {
    setIsEditing(tx.id);
    setFormData({
      date: tx.date,
      bank_name: tx.bank_name,
      type: tx.type,
      category: tx.category,
      description: tx.description,
      amount: tx.amount.toString()
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this transaction?")) return;
    try {
      await api.delete(`/transactions/manual/${id}`);
      toast.success("Transaction deleted");
      fetchTransactions();
    } catch {
      toast.error("Failed to delete");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount || isNaN(Number(formData.amount)) || Number(formData.amount) <= 0) {
      toast.error("Please enter a valid positive amount");
      return;
    }
    
    const payload = {
      ...formData,
      amount: Number(formData.amount)
    };

    try {
      if (isEditing) {
        await api.put(`/transactions/manual/${isEditing}`, payload);
        toast.success("Transaction updated successfully!");
        setIsEditing(null);
      } else {
        await api.post("/transactions/manual", payload);
        toast.success("Transaction added successfully!");
      }
      setFormData({
        ...formData,
        description: "",
        amount: ""
      });
      fetchTransactions();
    } catch {
      toast.error("Failed to save transaction");
    }
  };

  return (
    <div className="min-h-screen transition-colors duration-300" style={{ background: "transparent" }}>
      <AnimatedBackground />
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col lg:flex-row gap-8">
        
        {/* Form Section */}
        <div className="w-full lg:w-1/3">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="card p-6 sticky top-24"
          >
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
              <Activity className="h-5 w-5 text-indigo-500" />
              {isEditing ? "Edit Transaction" : "New Transaction"}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Type Toggle */}
              <div className="flex p-1 rounded-xl" style={{ background: "var(--surface-2)" }}>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, type: "DEBIT" })}
                  className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${formData.type === "DEBIT" ? "bg-rose-500 text-white shadow-sm" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}
                >
                  Expense
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, type: "CREDIT" })}
                  className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${formData.type === "CREDIT" ? "bg-emerald-500 text-white shadow-sm" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}
                >
                  Income
                </button>
              </div>

              {/* Amount */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider mb-1 block" style={{ color: "var(--text-secondary)" }}>Amount</label>
                <div className="relative">
                  <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="number"
                    required
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border bg-transparent outline-none focus:ring-2 focus:ring-indigo-500/50 font-semibold"
                    style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}
                    placeholder="0.00"
                  />
                </div>
              </div>

              {/* Quick Chips */}
              <div className="flex flex-wrap gap-2">
                {[100, 500, 1000, 5000].map(amt => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setFormData({ ...formData, amount: amt.toString() })}
                    className="px-3 py-1 text-xs font-semibold rounded-lg transition-colors border hover:bg-indigo-500/10"
                    style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
                  >
                    +₹{amt}
                  </button>
                ))}
              </div>

              {/* Date & Bank */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider mb-1 block" style={{ color: "var(--text-secondary)" }}>Date</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="date"
                      required
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl border bg-transparent outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm font-medium"
                      style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider mb-1 block" style={{ color: "var(--text-secondary)" }}>Bank</label>
                  <div className="relative">
                    <Landmark className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <select
                      value={formData.bank_name}
                      onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl border bg-transparent outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm font-medium appearance-none"
                      style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}
                    >
                      {BANKS.map(b => <option key={b} value={b} className="bg-white dark:bg-slate-800">{b}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider mb-1 block" style={{ color: "var(--text-secondary)" }}>Category</label>
                <div className="relative">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border bg-transparent outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm font-medium appearance-none"
                    style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}
                  >
                    {CATEGORIES.map(c => <option key={c} value={c} className="bg-white dark:bg-slate-800">{c}</option>)}
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider mb-1 block" style={{ color: "var(--text-secondary)" }}>Description</label>
                <div className="relative">
                  <AlignLeft className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <textarea
                    required
                    rows={2}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border bg-transparent outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm font-medium resize-none"
                    style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}
                    placeholder="What was this for?"
                  />
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                {isEditing && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(null);
                      setFormData({
                        date: new Date().toISOString().split('T')[0],
                        bank_name: "Manual / Cash",
                        type: "DEBIT",
                        category: "Others",
                        description: "",
                        amount: ""
                      });
                    }}
                    className="flex-1 py-3 rounded-xl font-bold transition-all border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                    style={{ color: "var(--text-primary)" }}
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  className="flex-[2] py-3 rounded-xl font-bold text-white transition-all bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  {isEditing ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                  {isEditing ? "Save Changes" : "Add Transaction"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>

        {/* List Section */}
        <div className="w-full lg:w-2/3">
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="card p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>Recent Transactions</h2>
              <span className="px-3 py-1 text-xs font-bold rounded-full bg-indigo-500/10 text-indigo-500">
                {transactions.length} entries
              </span>
            </div>

            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => <div key={i} className="skeleton h-20 rounded-xl w-full" />)}
              </div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-16 border-2 border-dashed rounded-2xl" style={{ borderColor: "var(--border)" }}>
                <Activity className="h-12 w-12 mx-auto text-slate-300 mb-4" />
                <h3 className="text-lg font-bold mb-1" style={{ color: "var(--text-primary)" }}>No transactions yet</h3>
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Your transactions will appear here.</p>
              </div>
            ) : (
              <div className="space-y-3">
                <AnimatePresence>
                  {transactions.map(tx => (
                    <motion.div
                      key={tx.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, height: 0, marginBottom: 0, padding: 0 }}
                      className="group flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border transition-all hover:shadow-md"
                      style={{ background: "var(--surface)", borderColor: "var(--border)" }}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{tx.description}</span>
                          {tx.is_transfer && (
                            <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-amber-500/10 text-amber-500 uppercase">{tx.transfer_type.replace('_', ' ')}</span>
                          )}
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-slate-500/10 text-slate-500 uppercase">{tx.source}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
                          <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {new Date(tx.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                          <span className="flex items-center gap-1"><Tag className="h-3.5 w-3.5" /> {tx.category}</span>
                          <span className="flex items-center gap-1"><Landmark className="h-3.5 w-3.5" /> {tx.bank_name}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 mt-4 sm:mt-0">
                        <div className="flex flex-col items-end gap-1">
                          <span className={`text-lg font-bold ${tx.type === 'CREDIT' ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {tx.type === 'CREDIT' ? '+' : '-'}{fmt(tx.amount)}
                          </span>
                          <select 
                            value={tx.transfer_type || "none"}
                            onChange={(e) => handleReclassify(tx.id, e.target.value)}
                            className="text-[10px] px-1 py-0.5 rounded border outline-none bg-transparent"
                            style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
                          >
                            <option value="none">Not Transfer</option>
                            <option value="internal_transfer">Internal Transfer</option>
                            <option value="possible_transfer">Possible Transfer</option>
                            <option value="incoming_transfer">Incoming Transfer</option>
                            <option value="outgoing_transfer">Outgoing Transfer</option>
                            <option value="auto">Reset to Auto</option>
                          </select>
                        </div>
                        
                        {tx.source === "MANUAL" && (
                          <div className="flex items-center gap-1 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleEdit(tx)}
                              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-500"
                              title="Edit"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(tx.id)}
                              className="p-2 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors text-rose-500"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </motion.div>
        </div>

      </main>
    </div>
  );
}
