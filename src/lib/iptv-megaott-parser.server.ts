// MegaOTT file parser — supports semicolon-delimited CSV (with optional
// `sep=;` prelude and RFC 4180-lite quoting) and XLSX/XLS via SheetJS.
// Returns an array of rows keyed by lower-cased header name.

import * as XLSX from "xlsx";

type Row = Record<string, string>;

function parseCsvSemicolon(text: string): Row[] {
  // Strip BOM
  let src = text.replace(/^\uFEFF/, "");
  // Skip optional `sep=;` prelude
  src = src.replace(/^\s*sep\s*=\s*[;,]\s*\r?\n/i, "");

  const rows: string[][] = [];
  let field = "", row: string[] = [], inQuotes = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ';') { row.push(field); field = ""; }
      else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ""; }
      else if (c === '\r') { /* skip */ }
      else field += c;
    }
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }

  const cleaned = rows.filter((r) => r.some((cell) => cell.trim().length > 0));
  if (cleaned.length === 0) return [];
  const headers = cleaned[0].map((h) => h.trim().toLowerCase());
  return cleaned.slice(1).map((cols) => {
    const o: Row = {};
    headers.forEach((h, i) => { o[h] = (cols[i] ?? "").trim(); });
    return o;
  });
}

function parseXlsx(base64: string): Row[] {
  const buf = Uint8Array.from(atob(base64), (ch) => ch.charCodeAt(0));
  const wb = XLSX.read(buf, { type: "array", cellDates: true });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) return [];
  const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "", raw: false });
  return json.map((r) => {
    const o: Row = {};
    for (const [k, v] of Object.entries(r)) {
      o[String(k).trim().toLowerCase()] = v == null ? "" : String(v).trim();
    }
    return o;
  });
}

export async function parseMegaottFile(content: string, kind: "csv" | "xlsx"): Promise<Row[]> {
  if (kind === "xlsx") return parseXlsx(content);
  return parseCsvSemicolon(content);
}