import type { EstimateLine, EstimateMeta } from "@/types";
import type { EstimateTotals } from "@/lib/estimateTotals";
import { thaiDate, titleOf, whenOf } from "@/lib/estimateLabels";

export function exportEstimateCsv(
  lines: EstimateLine[],
  meta: EstimateMeta,
  totals: EstimateTotals,
  anyDemo: boolean,
  date?: string,
) {
  const head = [
    "วัสดุ",
    "ชื่อเต็ม",
    "รหัส",
    "ซื้อเมื่อ",
    "จำนวน",
    "หน่วย",
    "ราคาต่อหน่วย (บาท)",
    "รวม (บาท)",
  ];
  const top: (string | number)[][] = [
    ["ใบประมาณราคาวัสดุ THAI TAY"],
    ["โครงการ", meta.project],
    ["ลูกค้า", meta.customer],
    ["วันที่", thaiDate(date)],
    [],
  ];
  const rows: (string | number)[][] = lines.map((l) => [
    titleOf(l),
    l.name,
    l.materialId,
    whenOf(l),
    l.qty,
    l.unit,
    l.price,
    (l.price * l.qty).toFixed(2),
  ]);
  const total = (label: string, value: number) => [label, "", "", "", "", "", "", value.toFixed(2)];
  rows.push(
    [],
    total("รวมค่าวัสดุ", totals.expected.base),
    total(`เงินสำรอง ${meta.contingency}%`, totals.expected.cont),
    total(meta.vat ? "ภาษีมูลค่าเพิ่ม 7%" : "ไม่รวมภาษีมูลค่าเพิ่ม", totals.expected.vat),
    total("รวมทั้งสิ้น", totals.expected.total),
  );
  if (anyDemo) rows.push([], ["หมายเหตุ: คำนวณจากข้อมูลตัวอย่าง ยังไม่ใช่ราคาจริง"]);
  const csv =
    "﻿" +
    [...top, head, ...rows]
      .map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n");
  const downloadLink = document.createElement("a");
  downloadLink.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  downloadLink.download = `ใบประมาณราคา-${meta.project.trim() || "THAI-TAY"}.csv`;
  downloadLink.click();
  URL.revokeObjectURL(downloadLink.href);
}
