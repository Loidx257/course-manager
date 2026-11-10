import * as XLSX from "xlsx";

export function generateExcelExport(
  data: Record<string, unknown>[],
  sheetName: string,
  fileName: string
) {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
}

export function formatExportHeader(columns: { key: string; label: string }[]): string[] {
  return columns.map((c) => c.label);
}

export function formatExportRow(
  item: Record<string, unknown>,
  columns: { key: string; label: string }[]
): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  for (const col of columns) {
    row[col.label] = item[col.key] ?? "";
  }
  return row;
}
