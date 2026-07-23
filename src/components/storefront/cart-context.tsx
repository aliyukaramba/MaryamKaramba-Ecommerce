"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export interface CartItem {
  productId: string;
  variantId: string | null;
  name: string;
  slug: string;
  sku: string;
  image: string;
  color: string | null;
  size: string | null;
  quantity: number;
  // Display-only — the actual charge always comes from a fresh
  // server-side price lookup at checkout, never from this stored value.
  unitPrice: number;
}

interface CartContextValue {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (productId: string, variantId: string | null) => void;
  updateQuantity: (productId: string, variantId: string | null, quantity: number) => void;
  clearCart: () => void;
  itemCount: number;
  subtotal: number;
}

const CartContext = createContext<CartContextValue | null>(null);

const STORAGE_KEY = "whatsapp-commerce-cart";

function sameLine(a: CartItem, productId: string, variantId: string | null) {
  return a.productId === productId && a.variantId === variantId;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Load from localStorage once, on mount only (client-side).
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch (error) {
      console.error("Failed to read cart from storage:", error);
    } finally {
      setHydrated(true);
    }
  }, []);

  // Persist on every change, but only after the initial load above has
  // happened — otherwise this would immediately overwrite saved cart
  // data with an empty array before it's had a chance to load.
  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (error) {
      console.error("Failed to save cart to storage:", error);
    }
  }, [items, hydrated]);

  function addItem(newItem: CartItem) {
    setItems((current) => {
      const existing = current.find((i) => sameLine(i, newItem.productId, newItem.variantId));
      if (existing) {
        return current.map((i) =>
          sameLine(i, newItem.productId, newItem.variantId)
            ? { ...i, quantity: i.quantity + newItem.quantity }
            : i
        );
      }
      return [...current, newItem];
    });
  }

  function removeItem(productId: string, variantId: string | null) {
    setItems((current) => current.filter((i) => !sameLine(i, productId, variantId)));
  }

  function updateQuantity(productId: string, variantId: string | null, quantity: number) {
    if (quantity < 1) {
      removeItem(productId, variantId);
      return;
    }
    setItems((current) =>
      current.map((i) => (sameLine(i, productId, variantId) ? { ...i, quantity } : i))
    );
  }

  function clearCart() {
    setItems([]);
  }

  const itemCount = useMemo(() => items.reduce((sum, i) => sum + i.quantity, 0), [items]);
  const subtotal = useMemo(
    () => items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0),
    [items]
  );

  return (
    <CartContext.Provider
      value={{ items, addItem, removeItem, updateQuantity, clearCart, itemCount, subtotal }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}
