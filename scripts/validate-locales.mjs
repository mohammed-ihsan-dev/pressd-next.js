#!/usr/bin/env node
// Validates every locales/<code>/menu.json against the English master:
// same product ids, same category/subcategory/customization/ui keys, no
// empty strings, no placeholder text, valid JSON. Run: npm run validate:locales
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const LOCALES_DIR = path.join(ROOT, "locales");

const SUPPORTED_LOCALES = ["en", "it", "ar", "zh-CN", "fr", "es-MX", "ko", "tr", "ja", "ru", "ml", "hi"];
// Deliberately case-sensitive / narrow: many languages have real short words
// ("Todo" = Spanish "All", etc.) that would false-positive on a loose match.
const PLACEHOLDER_PATTERNS = [/^TODO$/, /translate this/i, /coming soon/i, /^lorem ipsum/i, /^TBD$/, /^XXX+$/];

function loadJson(filePath) {
  const raw = readFileSync(filePath, "utf8");
  return JSON.parse(raw);
}

function keySet(obj) {
  return new Set(Object.keys(obj ?? {}));
}

function diffKeys(label, masterKeys, otherKeys, errors) {
  for (const key of masterKeys) {
    if (!otherKeys.has(key)) errors.push(`missing ${label} key: "${key}"`);
  }
  for (const key of otherKeys) {
    if (!masterKeys.has(key)) errors.push(`unexpected ${label} key: "${key}"`);
  }
}

function checkStringValue(label, value, errors) {
  if (typeof value !== "string") {
    errors.push(`${label}: not a string`);
    return;
  }
  if (value.trim().length === 0) {
    errors.push(`${label}: empty string`);
    return;
  }
  for (const pattern of PLACEHOLDER_PATTERNS) {
    if (pattern.test(value.trim())) {
      errors.push(`${label}: looks like placeholder text ("${value}")`);
    }
  }
}

function validateLocale(code, master) {
  const errors = [];
  const filePath = path.join(LOCALES_DIR, code, "menu.json");

  if (!existsSync(filePath)) {
    return { code, errors: [`missing file: locales/${code}/menu.json`] };
  }

  let dict;
  try {
    dict = loadJson(filePath);
  } catch (err) {
    return { code, errors: [`invalid JSON: ${err.message}`] };
  }

  diffKeys("categories", keySet(master.categories), keySet(dict.categories), errors);
  diffKeys("categoryTaglines", keySet(master.categoryTaglines), keySet(dict.categoryTaglines), errors);
  diffKeys("subcategories", keySet(master.subcategories), keySet(dict.subcategories), errors);
  diffKeys("products", keySet(master.products), keySet(dict.products), errors);
  diffKeys("ui", keySet(master.ui), keySet(dict.ui), errors);

  for (const group of ["beans", "milk", "syrup"]) {
    diffKeys(
      `customization.${group}`,
      keySet(master.customization?.[group]),
      keySet(dict.customization?.[group]),
      errors
    );
  }

  for (const [id] of Object.entries(master.products ?? {})) {
    const entry = dict.products?.[id];
    if (!entry) continue; // already reported as missing key above
    checkStringValue(`products.${id}.name`, entry.name, errors);
    checkStringValue(`products.${id}.description`, entry.description, errors);

    const masterIngs = master.products[id]?.ingredients;
    if (masterIngs !== undefined) {
      if (!Array.isArray(entry.ingredients)) {
        errors.push(`products.${id}.ingredients: missing or not an array`);
      } else if (entry.ingredients.length !== masterIngs.length) {
        errors.push(`products.${id}.ingredients: length mismatch (expected ${masterIngs.length}, got ${entry.ingredients.length})`);
      } else {
        entry.ingredients.forEach((ing, idx) => {
          checkStringValue(`products.${id}.ingredients[${idx}]`, ing, errors);
        });
      }
    }
  }

  for (const [key] of Object.entries(master.categories ?? {})) {
    if (dict.categories?.[key] !== undefined) checkStringValue(`categories.${key}`, dict.categories[key], errors);
  }
  for (const [key] of Object.entries(master.categoryTaglines ?? {})) {
    if (dict.categoryTaglines?.[key] !== undefined)
      checkStringValue(`categoryTaglines.${key}`, dict.categoryTaglines[key], errors);
  }
  for (const [key] of Object.entries(master.subcategories ?? {})) {
    if (dict.subcategories?.[key] !== undefined)
      checkStringValue(`subcategories.${key}`, dict.subcategories[key], errors);
  }
  for (const [key] of Object.entries(master.ui ?? {})) {
    if (dict.ui?.[key] !== undefined) checkStringValue(`ui.${key}`, dict.ui[key], errors);
  }
  for (const group of ["beans", "milk", "syrup"]) {
    for (const [key] of Object.entries(master.customization?.[group] ?? {})) {
      const value = dict.customization?.[group]?.[key];
      if (value !== undefined) checkStringValue(`customization.${group}.${key}`, value, errors);
    }
  }

  return { code, errors };
}

function main() {
  const masterPath = path.join(LOCALES_DIR, "en", "menu.json");
  if (!existsSync(masterPath)) {
    console.error("Missing English master: locales/en/menu.json");
    process.exit(1);
  }
  const master = loadJson(masterPath);

  let hasErrors = false;
  const results = [];

  for (const code of SUPPORTED_LOCALES) {
    if (code === "en") continue;
    const { errors } = validateLocale(code, master);
    results.push({ code, errors });
    if (errors.length) hasErrors = true;
  }

  console.log(`English master: ${Object.keys(master.products).length} products, ${Object.keys(master.categories).length} categories, ${Object.keys(master.subcategories).length} subcategories, ${Object.keys(master.ui).length} ui keys.\n`);

  for (const { code, errors } of results) {
    if (errors.length === 0) {
      console.log(`✓ ${code}: OK`);
    } else {
      console.log(`✗ ${code}: ${errors.length} problem(s)`);
      for (const err of errors.slice(0, 20)) console.log(`    - ${err}`);
      if (errors.length > 20) console.log(`    ...and ${errors.length - 20} more`);
    }
  }

  if (hasErrors) {
    console.log("\nValidation FAILED.");
    process.exit(1);
  }
  console.log("\nAll locales valid.");
}

main();
