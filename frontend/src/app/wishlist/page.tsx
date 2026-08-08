"use client";

import { useAuth } from "@/contexts/AuthContext";
import WishlistComponent from "@/components/Wishlist";
import Navbar from "@/components/Navbar";

export default function WishlistPage() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <WishlistComponent />
      </main>
    </div>
  );
}
