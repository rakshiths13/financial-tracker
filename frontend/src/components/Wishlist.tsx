"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Heart, ShoppingBag, X } from "lucide-react";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { AnimatedCard, EmptyState } from "./LoadingSkeleton";

interface Plan {
  id: number;
  item_name: string;
  estimated_cost: number;
  notes: string;
}

function fmt(v: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(v);
}

export default function Wishlist() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [itemName, setItemName] = useState("");
  const [cost, setCost] = useState("");
  const [notes, setNotes] = useState("");

  const fetchPlans = async () => {
    try {
      const res = await api.get("/wishlist");
      setPlans(res.data);
    } catch {
      toast.error("Failed to load wishlist");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPlans(); }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post("/wishlist", {
        item_name: itemName,
        estimated_cost: parseFloat(cost),
        notes,
      });
      toast.success("Item added to wishlist!");
      setIsOpen(false);
      setItemName("");
      setCost("");
      setNotes("");
      fetchPlans();
    } catch {
      toast.error("Failed to add item");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/wishlist/${id}`);
      toast.success("Item removed");
      setPlans((p) => p.filter((x) => x.id !== id));
    } catch {
      toast.error("Failed to remove item");
    }
  };

  const totalCost = plans.reduce((acc, p) => acc + p.estimated_cost, 0);

  return (
    <div>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8"
      >
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
            <Heart className="h-6 w-6 text-pink-500" />
            Future Plans Wishlist
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Running total:{" "}
            <span className="font-bold text-indigo-600">{fmt(totalCost)}</span>
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => setIsOpen(true)}
          className="btn-primary flex items-center gap-2 text-sm"
        >
          <Plus className="h-4 w-4" />
          Add Item
        </motion.button>
      </motion.div>

      {/* Add item modal */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(15,23,42,0.5)", backdropFilter: "blur(4px)" }}
            onClick={() => setIsOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 16 }}
              onClick={(e) => e.stopPropagation()}
              className="card p-6 w-full max-w-md"
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-bold text-slate-900">Add Wishlist Item</h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <form onSubmit={handleAdd} className="space-y-4">
                <div>
                  <label className="label">Item Name</label>
                  <input
                    required
                    type="text"
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                    className="input-field"
                    placeholder="e.g. MacBook Pro, Japan Trip"
                  />
                </div>
                <div>
                  <label className="label">Estimated Cost (₹)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-sm">₹</span>
                    <input
                      required
                      type="number"
                      min="0"
                      step="0.01"
                      value={cost}
                      onChange={(e) => setCost(e.target.value)}
                      className="input-field pl-7"
                      placeholder="150000"
                    />
                  </div>
                </div>
                <div>
                  <label className="label">Notes (Optional)</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    className="input-field resize-none"
                    placeholder="Any notes or details..."
                  />
                </div>
                <div className="flex justify-end gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="btn-ghost text-sm"
                  >
                    Cancel
                  </button>
                  <motion.button
                    type="submit"
                    disabled={submitting}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="btn-primary text-sm"
                  >
                    {submitting ? "Saving..." : "Save Plan"}
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card p-5">
              <div className="skeleton h-5 w-1/3 mb-2" />
              <div className="skeleton h-4 w-1/2" />
            </div>
          ))}
        </div>
      ) : plans.length === 0 ? (
        <AnimatedCard delay={0} className="card">
          <EmptyState
            icon={<ShoppingBag className="h-8 w-8" />}
            title="Your wishlist is empty"
            description="Add items you're saving up for — travel, gadgets, courses, and more."
          />
        </AnimatedCard>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {plans.map((plan, i) => (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: 20, scale: 0.97 }}
                transition={{ delay: i * 0.05 }}
                className="card card-hover p-5 flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-pink-100 flex items-center justify-center flex-shrink-0">
                    <Heart className="h-5 w-5 text-pink-500" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-base font-bold text-slate-900">{plan.item_name}</h4>
                    {plan.notes && (
                      <p className="text-sm text-slate-400 truncate">{plan.notes}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4 flex-shrink-0">
                  <span className="text-lg font-extrabold text-slate-900">
                    {fmt(plan.estimated_cost)}
                  </span>
                  <button
                    onClick={() => handleDelete(plan.id)}
                    className="p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all duration-150"
                  >
                    <Trash2 className="h-4.5 w-4.5" />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
