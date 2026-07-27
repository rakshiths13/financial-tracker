"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2 } from "lucide-react";
import api from "@/lib/api";
import toast from "react-hot-toast";

interface Plan {
  id: number;
  item_name: string;
  estimated_cost: number;
  notes: string;
}

export default function Wishlist() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  // Form state
  const [itemName, setItemName] = useState("");
  const [cost, setCost] = useState("");
  const [notes, setNotes] = useState("");

  const fetchPlans = async () => {
    try {
      const res = await api.get("/wishlist");
      setPlans(res.data);
    } catch (error) {
      toast.error("Failed to load wishlist");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/wishlist", {
        item_name: itemName,
        estimated_cost: parseFloat(cost),
        notes: notes
      });
      toast.success("Plan added to wishlist");
      setIsOpen(false);
      setItemName("");
      setCost("");
      setNotes("");
      fetchPlans();
    } catch (error) {
      toast.error("Failed to add plan");
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/wishlist/${id}`);
      toast.success("Plan removed");
      setPlans(plans.filter(p => p.id !== id));
    } catch (error) {
      toast.error("Failed to remove plan");
    }
  };

  const totalCost = plans.reduce((acc, curr) => acc + curr.estimated_cost, 0);

  if (loading) return <div>Loading...</div>;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-6 border-b border-gray-100 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Future Plans Wishlist</h2>
          <p className="text-sm text-gray-500 mt-1">Running Total: <span className="font-semibold text-indigo-600">₹{totalCost.toFixed(2)}</span></p>
        </div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Item
        </button>
      </div>

      {isOpen && (
        <div className="p-6 bg-gray-50 border-b border-gray-200">
          <form onSubmit={handleAdd} className="space-y-4 max-w-2xl">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">Item Name</label>
                <input required type="text" value={itemName} onChange={e => setItemName(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Estimated Cost (₹)</label>
                <input required type="number" min="0" step="0.01" value={cost} onChange={e => setCost(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Notes (Optional)</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
            </div>
            <div className="flex justify-end space-x-3">
              <button type="button" onClick={() => setIsOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900">Cancel</button>
              <button type="submit" className="px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700">Save Plan</button>
            </div>
          </form>
        </div>
      )}

      <ul className="divide-y divide-gray-200">
        {plans.length === 0 ? (
          <li className="p-6 text-center text-gray-500">No items in your wishlist yet.</li>
        ) : (
          plans.map(plan => (
            <li key={plan.id} className="p-6 hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-lg font-medium text-gray-900">{plan.item_name}</h4>
                  {plan.notes && <p className="text-sm text-gray-500 mt-1">{plan.notes}</p>}
                </div>
                <div className="flex items-center space-x-4">
                  <span className="text-lg font-semibold text-gray-900">₹{plan.estimated_cost.toFixed(2)}</span>
                  <button onClick={() => handleDelete(plan.id)} className="text-gray-400 hover:text-red-500">
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
