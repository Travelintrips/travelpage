import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

export interface CartItem {
  id: string;
  user_id: string;
  product_id?: string;
  item_id?: string;
  item_type: string;
  service_name: string;
  price: number;
  quantity: number;
  details?: any;
  created_at?: string;
  status?: string;
}

interface ShoppingCartContextType {
  cartItems: CartItem[];
  isLoading: boolean;
  totalAmount: number;
  cartCount: number;
  addToCart: (
    item: Omit<CartItem, "id" | "user_id" | "created_at">,
  ) => Promise<{ success: boolean; error?: string }>;
  removeFromCart: (itemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  reloadCart: () => void;
  isTabRecentlyActivated: boolean;
  checkout: () => Promise<void>;
  refetchCartData: () => Promise<void>;
}

const ShoppingCartContext = createContext<ShoppingCartContextType | undefined>(
  undefined,
);

export function ShoppingCartProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = useAuth();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [cartLoaded, setCartLoaded] = useState(false);
  const [isTabRecentlyActivated, setIsTabRecentlyActivated] = useState(false);

  const loadCartItems = async () => {
    if (isLoading || !userId) return;
    setIsLoading(true);

    try {
      const { data, error } = await supabase
        .from("shopping_cart")
        .select("*")
        .eq("user_id", userId)
        .neq("status", "paid");

      if (error) {
        console.error("[ShoppingCart] Error loading cart:", error);
      } else {
        setCartItems(data || []);
        setCartLoaded(true);
        console.log("[ShoppingCart] Cart loaded:", data?.length || 0);
      }
    } catch (err) {
      console.error("[ShoppingCart] Unexpected error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const addToCart = async (
    item: Omit<CartItem, "id" | "user_id" | "created_at">,
  ): Promise<{ success: boolean; error?: string }> => {
    if (!userId) return { success: false, error: "User not authenticated" };

    try {
      const { error } = await supabase.from("shopping_cart").insert({
        user_id: userId,
        ...item,
        status: "pending",
      });

      if (error) {
        console.error("[ShoppingCart] Error adding to cart:", error);
        return { success: false, error: error.message };
      }

      await loadCartItems();
      return { success: true };
    } catch (error) {
      console.error("[ShoppingCart] Failed to add item to cart:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  };

  const removeFromCart = async (itemId: string) => {
    if (!userId) return;

    try {
      const { error } = await supabase
        .from("shopping_cart")
        .delete()
        .eq("id", itemId)
        .eq("user_id", userId);

      if (error) {
        console.error("[ShoppingCart] Error removing from cart:", error);
        throw error;
      }

      await loadCartItems();
    } catch (error) {
      console.error("[ShoppingCart] Failed to remove item from cart:", error);
      throw error;
    }
  };

  const clearCart = async () => {
    if (!userId) return;

    try {
      const { error } = await supabase
        .from("shopping_cart")
        .delete()
        .eq("user_id", userId)
        .neq("status", "paid");

      if (error) {
        console.error("[ShoppingCart] Error clearing cart:", error);
        throw error;
      }

      setCartItems([]);
    } catch (error) {
      console.error("[ShoppingCart] Failed to clear cart:", error);
      throw error;
    }
  };

  const totalAmount = cartItems.reduce(
    (total, item) => total + item.price * item.quantity,
    0,
  );

  // Initial load
  useEffect(() => {
    if (userId && !cartLoaded && !isLoading) {
      loadCartItems();
    }
  }, [userId, cartLoaded, isLoading]);

  // Subscribe to realtime changes
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`cart-updates-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "shopping_cart",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log("[ShoppingCart] Realtime cart update:", payload);
          loadCartItems();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const checkout = async () => {
    // Placeholder checkout function
    console.log("Checkout function called");
  };

  const refetchCartData = async () => {
    await loadCartItems();
  };

  const value: ShoppingCartContextType = {
    cartItems,
    isLoading,
    totalAmount,
    cartCount: cartItems.length,
    addToCart,
    removeFromCart,
    clearCart,
    reloadCart: () => {
      setCartLoaded(false);
    },
    isTabRecentlyActivated,
    checkout,
    refetchCartData,
  };

  return (
    <ShoppingCartContext.Provider value={value}>
      {children}
    </ShoppingCartContext.Provider>
  );
}

export function useShoppingCart() {
  const context = useContext(ShoppingCartContext);
  if (context === undefined) {
    throw new Error(
      "useShoppingCart must be used within a ShoppingCartProvider",
    );
  }
  return context;
}

// Re-export for compatibility
export { useShoppingCart as default };
