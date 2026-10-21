// RFC 4180 CSV with spreadsheet formula-injection protection. Pure module.

export type CsvValue = string | number | boolean | null | undefined | Date;

export function csvCell(value: CsvValue): string {
  if (value === null || value === undefined) return "";
  let s = value instanceof Date ? value.toISOString() : String(value);
  // A leading = + - @ (or tab/CR) makes Excel/Sheets evaluate the cell as a formula.
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return /[",\r\n]/.test(s) || s !== s.trim() ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(headers: string[], rows: CsvValue[][]): string {
  const lines = [headers.map(csvCell).join(","), ...rows.map((r) => r.map(csvCell).join(","))];
  // BOM so Excel opens UTF-8 (Arabic product names, AED, accents) correctly.
  return "﻿" + lines.join("\r\n") + "\r\n";
}
