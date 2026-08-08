import {
  ShoppingBag,
  Utensils,
  Zap,
  Car,
  Phone,
  CreditCard,
  Banknote,
  MoreHorizontal,
} from "lucide-react";
import React from "react";

export const CATEGORIES = [
  "Groceries",
  "Income / Transfers",
  "Online Shopping",
  "Recharge",
  "Travel & Transport",
  "Food & Dining",
  "Bills & Utilities",
  "Entertainment",
  "Healthcare",
  "Personal",
  "ATM / Cash",
  "EMI / Loans",
  "Others"
];

export const BANKS = [
  "HDFC", "SBI", "Axis", "ICICI", "Kotak", "PNB", 
  "Canara", "Union", "BOB", "IndusInd", "Yes", "Manual / Cash"
];

export const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  "Online Shopping":    <ShoppingBag className="h-4 w-4" />,
  "Groceries":          <ShoppingBag className="h-4 w-4" />,
  "Food & Dining":      <Utensils className="h-4 w-4" />,
  "Recharge":           <Phone className="h-4 w-4" />,
  "Bills & Utilities":  <Zap className="h-4 w-4" />,
  "Travel & Transport": <Car className="h-4 w-4" />,
  "ATM / Cash":         <Banknote className="h-4 w-4" />,
  "Income / Transfers": <CreditCard className="h-4 w-4" />,
  "Entertainment":      <MoreHorizontal className="h-4 w-4" />,
  "Healthcare":         <MoreHorizontal className="h-4 w-4" />,
  "Personal":           <MoreHorizontal className="h-4 w-4" />,
  "EMI / Loans":        <Banknote className="h-4 w-4" />,
  "Others":             <MoreHorizontal className="h-4 w-4" />,
};
