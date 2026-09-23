"use client";

import { createContext, useContext, useState } from "react";
import type { MenuCategory, MenuItem } from "@/data/menu";
import type { CustomizeMode } from "@/lib/customization";

export interface ProductRef {
  category: MenuCategory;
  item: MenuItem;
}

interface MenuModalsValue {
  detailsProduct: ProductRef | null;
  openDetails: (ref: ProductRef) => void;
  closeDetails: () => void;

  instructionsProduct: string | null;
  openInstructions: (name: string) => void;
  closeInstructions: () => void;

  customizeProduct: string | null;
  customizeMode: CustomizeMode;
  openCustomize: (name: string, mode: CustomizeMode) => void;
  closeCustomize: () => void;
}

const MenuModalsContext = createContext<MenuModalsValue | null>(null);

export function MenuModalsProvider({ children }: { children: React.ReactNode }) {
  const [detailsProduct, setDetailsProduct] = useState<ProductRef | null>(null);
  const [instructionsProduct, setInstructionsProduct] = useState<string | null>(null);
  const [customizeProduct, setCustomizeProduct] = useState<string | null>(null);
  const [customizeMode, setCustomizeMode] = useState<CustomizeMode>("");

  const value: MenuModalsValue = {
    detailsProduct,
    openDetails: setDetailsProduct,
    closeDetails: () => setDetailsProduct(null),
    instructionsProduct,
    openInstructions: setInstructionsProduct,
    closeInstructions: () => setInstructionsProduct(null),
    customizeProduct,
    customizeMode,
    openCustomize: (name, mode) => {
      setCustomizeProduct(name);
      setCustomizeMode(mode);
    },
    closeCustomize: () => setCustomizeProduct(null),
  };

  return <MenuModalsContext.Provider value={value}>{children}</MenuModalsContext.Provider>;
}

export function useMenuModals() {
  const ctx = useContext(MenuModalsContext);
  if (!ctx) throw new Error("useMenuModals must be used within MenuModalsProvider");
  return ctx;
}
