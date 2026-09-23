// Ported verbatim from the original script.js customize-modal logic.

export type BeanOption = [name: string, price: number];
export type MilkOption = [name: string, price: number];
export type SyrupOption = [name: string, price: number];

export const beanOptions: BeanOption[] = [
  ["Brazil", 0],
  ["Honduras", 2],
  ["El Salvador", 3],
  ["Hamasho", 4],
  ["Decaf (Colombia)", 4],
];

export const milkOptions: MilkOption[] = [
  ["Fresh Milk", 0],
  ["Oat Milk", 5],
  ["Almond Milk", 5],
  ["Coconut Milk", 5],
];

export const syrupOptions: SyrupOption[] = [
  ["None", 0],
  ["Caramel", 5],
  ["Hazelnut", 5],
  ["Vanilla", 5],
  ["Pistachio", 5],
];

export type CustomizeMode = "full" | "milk-only" | "";

export interface FullCustomization {
  beans: string;
  milk: string;
  syrup: string;
  extraPrice: number;
}

export interface MilkOnlyCustomization {
  mode: "milk-only";
  milk: string;
  extraPrice: number;
}

export type Customization = FullCustomization | MilkOnlyCustomization | undefined;

const optionPrice = (options: [string, number][], selected: string | undefined) =>
  options.find(([name]) => name === selected)?.[1] || 0;

export function customizationExtra(customization: Customization): number {
  if (!customization) return 0;
  if ("mode" in customization && customization.mode === "milk-only") {
    return optionPrice(milkOptions, customization.milk);
  }
  if ("beans" in customization && customization.beans) {
    return (
      optionPrice(beanOptions, customization.beans) +
      optionPrice(milkOptions, customization.milk) +
      optionPrice(syrupOptions, customization.syrup)
    );
  }
  return 0;
}

export function sanitizeCustomization(customization: Customization): Customization {
  if (!customization) return customization;
  if ("mode" in customization && customization.mode === "milk-only") {
    return {
      mode: "milk-only",
      milk: customization.milk,
      extraPrice: customizationExtra(customization),
    };
  }
  if ("beans" in customization && customization.beans) {
    return {
      beans: customization.beans,
      milk: customization.milk,
      syrup: customization.syrup,
      extraPrice: customizationExtra(customization),
    };
  }
  return customization;
}

export function customizationText(customization: Customization): string {
  if (!customization) return "";
  if ("mode" in customization && customization.mode === "milk-only") {
    const extra = customizationExtra(customization);
    return `Milk: ${customization.milk}${extra ? `; Addition: + AED ${extra.toFixed(2)}` : ""}`;
  }
  if ("beans" in customization && customization.beans) {
    const extra = customizationExtra(customization);
    return `Beans: ${customization.beans}; Milk: ${customization.milk}; Syrup: ${customization.syrup}${
      extra ? `; Additions: + AED ${extra.toFixed(2)}` : ""
    }`;
  }
  return "";
}
