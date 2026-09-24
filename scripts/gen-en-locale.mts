// One-off generator: dumps the canonical English menu.json from the live
// data/menu.ts module, so locales/en/menu.json can never drift from what the
// app actually renders. Re-run this any time data/menu.ts changes.
import { writeFileSync } from "node:fs";
import { menu } from "../data/menu";
import { beanOptions, milkOptions, syrupOptions } from "../lib/customization";
import { slugify } from "../lib/slugify";

const categories: Record<string, string> = {};
const categoryTaglines: Record<string, string> = {};
const subcategories: Record<string, string> = {};
const products: Record<string, { name: string; description: string }> = {};

for (const category of menu) {
  categories[category.slug] = category.category;
  categoryTaglines[category.slug] = category.tagline;
  for (const item of category.items) {
    const [name, description, , , , , column, id] = item;
    subcategories[slugify(column)] = column;
    products[id] = { name, description };
  }
}

const customization = {
  beans: Object.fromEntries(beanOptions.map(([name]) => [slugify(name), name])),
  milk: Object.fromEntries(milkOptions.map(([name]) => [slugify(name), name])),
  syrup: Object.fromEntries(syrupOptions.map(([name]) => [slugify(name), name])),
};

const ui = {
  eyebrow: "EAT · DRINK · REPEAT",
  menuHeading: "THE MENU.",
  menuIntro: "Bright plates, bold flavours and coffee worth slowing down for. Browse it your way.",
  menuLabel: "MENU",
  sectionsAriaSuffix: "sections",
  categoriesAll: "All",
  categoriesAriaLabel: "Menu categories",
  categoryPrevAria: "Show previous menu categories",
  categoryNextAria: "Show more menu categories",
  details: "Details",
  detailsAria: "View details for {name}",
  customize: "Customize",
  comment: "Comment",
  currencyPrefix: "AED",
  inCart: "In Cart",
  addToCart: "Add",
  addAria: "Add {name} to cart",
  inCartAria: "{name} is in cart",
  factsSize: "Size",
  factsProtein: "Protein",
  factsCarbohydrates: "Carbohydrates",
  factsCalories: "Calories",
  closeDetailsAria: "Close product details",
  menuEyebrowModal: "PRESS'D MENU",
  whatsInside: "What's inside",
  addToOrder: "Add to Order",
  makeItYours: "MAKE IT YOURS",
  customizeYourDrink: "Customize Your Drink",
  coffeeBeans: "COFFEE BEANS",
  milks: "MILKS",
  syrups: "SYRUPS",
  commentHeading: "COMMENT / SPECIAL INSTRUCTIONS",
  commentHelp: "Tell us what you'd like to reduce, remove, or add to this drink.",
  commentPlaceholder: "Add your comment or special instructions...",
  customizationSaved: "Your drink customization is saved.",
  saveSelection: "SAVE SELECTION",
  closeCustomizeAria: "Close drink customization",
  customiseYourOrder: "CUSTOMISE YOUR ORDER",
  specialInstructions: "Special Instructions",
  instructionsHelp: "Tell us what you'd like to reduce, remove, or add to this product…",
  instructionsPlaceholder: "Tell us what you'd like to reduce, remove, or add to this product…",
  instructionsSaved: "Instructions saved.",
  cancel: "Cancel",
  saveInstructions: "Save Instructions",
  closeInstructionsAria: "Close special instructions",
  cartEyebrow: "YOUR ORDER",
  cart: "CART",
  closeCartAria: "Close cart",
  customizedLabel: "Customized:",
  specialInstructionsLabel: "Special instructions:",
  removeOneAria: "Remove one {name}",
  addOneAria: "Add one {name}",
  emptyCart: "Your cart is empty.",
  exploreMenu: "Explore the menu →",
  total: "Total",
  orderOnWhatsapp: "Order on WhatsApp",
  orderSentTo: "Order will be sent to +971 55 683 8426",
  selectLanguage: "SELECT YOUR LANGUAGE",
  languageButtonAria: "Change menu language",
  changeLanguage: "Change language",
  chooseLanguage: "Choose your preferred language for the menu.",
};

const dictionary = { categories, categoryTaglines, subcategories, products, customization, ui };

writeFileSync(
  new URL("../locales/en/menu.json", import.meta.url),
  JSON.stringify(dictionary, null, 2) + "\n"
);

console.log(
  `Wrote locales/en/menu.json — ${Object.keys(products).length} products, ${Object.keys(categories).length} categories, ${Object.keys(subcategories).length} subcategories.`
);
