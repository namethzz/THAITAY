import React, { useEffect, useMemo, useRef, useState } from "react";

import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Building2,
  Calculator,
  CalendarRange,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Copy,
  Download,
  FileJson,
  FileSpreadsheet,
  Info,
  MapPin,
  Plus,
  RotateCcw,
  Save,
  Search,
  Settings2,
  Trash2,
  TrendingUp,
  Upload,
} from "lucide-react";

import { materialUnits, materials } from "../data.js";
import MaterialPicker from "../components/MaterialPicker.jsx";
import { PageHeader } from "../components/Shared.jsx";

const SCHEMA_VERSION = 2;
const DRAFT_STORAGE_KEY = "thai-the-complete-boq-v2";
const IMPORT_ACCEPT = ".json,.csv,.tsv,.xlsx,.xls,.pdf,.jpg,.jpeg,.png,.webp,application/json,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/pdf,image/jpeg,image/png,image/webp";
const MAX_IMPORT_ROWS = 2000;
const OFFICIAL_PRICE_URL = "https://index.tpso.go.th/construction-material-prices/prices-building-materials";
const OFFICIAL_PRICE_NOTE = "ราคาวัสดุที่แสดงเป็นราคากลางหรือข้อมูลอ้างอิงจากภาครัฐ ไม่ใช่ราคาขายปลีก ใบเสนอราคา หรือราคาที่ผู้รับเหมาซื้อได้จริง ราคาหน้าร้านอาจแตกต่างตามพื้นที่ ยี่ห้อ ปริมาณซื้อ ค่าขนส่ง และเงื่อนไขการค้า กรุณาขอใบเสนอราคาจากร้านค้าก่อนจัดซื้อหรือยื่นราคา";

const COST_TYPES = { material: "วัสดุ", labor: "ค่าแรง", equipment: "เครื่องจักร/ขนส่ง" };
const DISCIPLINES = {
  structure: "หมวดงานโครงสร้าง",
  architecture: "หมวดงานสถาปัตย์",
  system: "หมวดงานระบบ",
};

const SECTION_DEFINITIONS = [
  { id: "earthwork", code: "A", discipline: "structure", title: "งานดิน" },
  { id: "foundation", code: "B", discipline: "structure", title: "งานเสาเข็มและฐานราก" },
  { id: "concrete_formwork", code: "C", discipline: "structure", title: "งานคอนกรีตและแบบหล่อ" },
  { id: "rebar", code: "D", discipline: "structure", title: "งานเหล็กเสริม" },
  { id: "precast", code: "E", discipline: "structure", title: "งานแผ่นพื้นสำเร็จรูป" },
  { id: "structural_steel", code: "F", discipline: "structure", title: "งานเหล็กรูปพรรณ" },
  { id: "roof", code: "G", discipline: "architecture", title: "งานหลังคาและวัสดุหลังคา" },
  { id: "wall", code: "H", discipline: "architecture", title: "งานผนังก่อและฉาบ" },
  { id: "ceiling", code: "I", discipline: "architecture", title: "งานฝ้าเพดาน" },
  { id: "finish", code: "J", discipline: "architecture", title: "งานผิวตกแต่งพื้นและผนัง" },
  { id: "sanitary_fixture", code: "K", discipline: "architecture", title: "งานสุขภัณฑ์" },
  { id: "opening", code: "L", discipline: "architecture", title: "งานประตูหน้าต่าง" },
  { id: "paint", code: "M", discipline: "architecture", title: "งานสี" },
  { id: "architectural_other", code: "N", discipline: "architecture", title: "งานตกแต่งทางสถาปัตยกรรมอื่นๆ" },
  { id: "electrical", code: "O", discipline: "system", title: "งานไฟฟ้า" },
  { id: "plumbing", code: "P", discipline: "system", title: "งานประปา" },
  { id: "sanitary_drainage", code: "Q", discipline: "system", title: "งานสุขาภิบาลและระบายน้ำ" },
];

const UNIT_OPTIONS = [...new Set([
  "ลบ.ม.", "ตร.ม.", "ม.", "กก.", "ตัน", "ลบ.ฟ.", "แผ่น", "เส้น", "ท่อน",
  "ต้น", "จุด", "ชุด", "อัน", "ใบ", "ถัง", "บ่อ", "เครื่อง", "งาน", "Lot",
  ...materialUnits,
])];
const IMPORT_UNIT_KEYS = new Set(UNIT_OPTIONS.map((unit) => canonicalUnit(unit)).filter(Boolean));

const EMPTY_PROJECT = {
  name: "บ้านพักอาศัย",
  owner: "",
  location: "กรุงเทพมหานคร (อ้างอิงราคาส่วนกลาง)",
  drawingNo: "",
  estimator: "",
  estimateDate: new Date().toISOString().slice(0, 10),
  buildingArea: "",
  exclusions: "งานเครื่องปรับอากาศ\nงานรั้วและประตูรั้ว\nงานภูมิทัศน์และสนามหญ้า\nงานถนนหรือทางเข้าภายนอก",
};

const DEFAULT_RATES = { overhead: 0, profit: 0, contingency: 0, vat: 7 };
const IMPORT_COLUMN_FIELDS = [
  { key: "name", label: "รายการวัสดุ/งาน", required: true, aliases: ["รายการ", "รายการวัสดุ", "ชื่อวัสดุ", "ชื่องาน", "รายละเอียดงาน", "description", "item description", "material name", "item", "name"] },
  { key: "quantity", label: "ปริมาณ", required: true, aliases: ["ปริมาณ", "จำนวน", "qty", "quantity", "volume"] },
  { key: "unit", label: "หน่วย", required: true, aliases: ["หน่วย", "หน่วยนับ", "unit", "uom"] },
  { key: "code", label: "รหัส/ลำดับ", aliases: ["รหัส", "รหัสรายการ", "ลำดับ", "เลขที่", "code", "item code", "item no", "no"] },
  { key: "spec", label: "ขนาด/Specification", aliases: ["สเปก", "รายละเอียด/สเปก", "รายละเอียดสเปก", "ขนาด", "รุ่น", "spec", "specification", "size", "model"] },
  { key: "materialRate", label: "ราคาเดิมในเอกสาร", aliases: ["ราคาวัสดุ", "ราคาต่อหน่วย", "ราคา/หน่วย", "ราคาหน่วย", "unit price", "material rate", "rate", "price"] },
  { key: "section", label: "หมวดงาน", aliases: ["หมวดงาน", "หมวด", "ประเภทงาน", "work section", "section", "work category"] },
  { key: "category", label: "หมวดวัสดุ", aliases: ["หมวดวัสดุ", "ประเภทวัสดุ", "material category", "category"] },
  { key: "note", label: "หมายเหตุ", aliases: ["หมายเหตุ", "เงื่อนไข", "note", "notes", "remark", "remarks"] },
];
const IMPORT_PROJECT_FIELDS = {
  name: ["ชื่อโครงการ", "โครงการ", "project name", "project"],
  owner: ["เจ้าของโครงการ", "ผู้ว่าจ้าง", "owner", "client"],
  location: ["สถานที่ก่อสร้าง", "สถานที่", "location", "site"],
  drawingNo: ["เลขที่แบบ", "drawing no", "drawing number"],
  estimator: ["ผู้ประมาณราคา", "ผู้จัดทำ", "estimator", "prepared by"],
  estimateDate: ["วันที่ประมาณราคา", "วันที่", "estimate date", "date"],
  buildingArea: ["พื้นที่อาคาร", "พื้นที่ใช้สอย", "building area", "floor area"],
};
const IMPORT_STOP_WORDS = new Set([
  "งาน", "วัสดุ", "พร้อม", "และ", "ระบบ", "ชนิด", "ทั่วไป", "อื่นๆ", "ระบุ", "ติดตั้ง",
  "ราคา", "หน่วย", "ขนาด", "ตรา", "รุ่น", "สำหรับ", "ด้วย", "ของ", "the", "and", "for", "with",
]);
const number = (value) => Math.max(0, Number(value) || 0);
const optionalNumber = (value) => value === "" || value === null || value === undefined ? "" : number(value);

function templateItem(sectionId, code, name, unit, options = {}) {
  return {
    sectionId,
    code,
    name,
    unit,
    spec: options.spec || "",
    cost: options.cost || "ml",
    wastePct: options.wastePct ?? 0,
    keywords: options.keywords || [],
    note: options.note || "",
  };
}

const BASE_HOUSE_ITEMS = [
  templateItem("earthwork", "A01", "เคลียร์พื้นที่และปรับระดับ", "ตร.ม.", { cost: "le" }),
  templateItem("earthwork", "A02", "ขุดดินฐานรากและคานคอดิน", "ลบ.ม.", { cost: "le" }),
  templateItem("earthwork", "A03", "ขนทิ้งดินส่วนเกิน", "ลบ.ม.", { cost: "le" }),
  templateItem("earthwork", "A04", "ถมดินและบดอัดเป็นชั้น", "ลบ.ม.", { cost: "mle", wastePct: 10, keywords: ["ดินถม"] }),
  templateItem("earthwork", "A05", "ทรายถมรดน้ำอัดแน่น", "ลบ.ม.", { cost: "mle", wastePct: 15, keywords: ["ทรายถม", "ทราย"] }),
  templateItem("earthwork", "A06", "หินคลุกหรือหินรองพื้นบดอัด", "ลบ.ม.", { cost: "mle", wastePct: 12, keywords: ["หินคลุก", "หิน"] }),
  templateItem("earthwork", "A07", "ปรับแต่งก้นหลุมและระดับดินเดิม", "ตร.ม.", { cost: "le" }),

  templateItem("concrete_formwork", "C01", "คอนกรีตหยาบรองฐาน", "ลบ.ม.", { cost: "ml", wastePct: 5, spec: "Lean concrete ตามแบบ", keywords: ["คอนกรีตหยาบ", "คอนกรีต"] }),
  templateItem("concrete_formwork", "C02", "คอนกรีตฐานราก/ฐานหัวเข็ม", "ลบ.ม.", { cost: "mle", wastePct: 3, spec: "กำลังอัดตามแบบโครงสร้าง", keywords: ["คอนกรีตผสมเสร็จ", "คอนกรีต"] }),
  templateItem("concrete_formwork", "C03", "คอนกรีตตอม่อ", "ลบ.ม.", { cost: "mle", wastePct: 3, keywords: ["คอนกรีตผสมเสร็จ", "คอนกรีต"] }),
  templateItem("concrete_formwork", "C04", "คอนกรีตคานคอดิน", "ลบ.ม.", { cost: "mle", wastePct: 3, keywords: ["คอนกรีตผสมเสร็จ", "คอนกรีต"] }),
  templateItem("concrete_formwork", "C05", "คอนกรีตเสา", "ลบ.ม.", { cost: "mle", wastePct: 3, keywords: ["คอนกรีตผสมเสร็จ", "คอนกรีต"] }),
  templateItem("concrete_formwork", "C06", "คอนกรีตคาน", "ลบ.ม.", { cost: "mle", wastePct: 3, keywords: ["คอนกรีตผสมเสร็จ", "คอนกรีต"] }),
  templateItem("concrete_formwork", "C07", "คอนกรีตพื้นบนดิน", "ลบ.ม.", { cost: "mle", wastePct: 3, keywords: ["คอนกรีตผสมเสร็จ", "คอนกรีต"] }),
  templateItem("concrete_formwork", "C08", "คอนกรีตพื้นยกระดับ", "ลบ.ม.", { cost: "mle", wastePct: 3, keywords: ["คอนกรีตผสมเสร็จ", "คอนกรีต"] }),
  templateItem("concrete_formwork", "C09", "คอนกรีตบันไดและชานพัก", "ลบ.ม.", { cost: "mle", wastePct: 3, keywords: ["คอนกรีตผสมเสร็จ", "คอนกรีต"] }),
  templateItem("concrete_formwork", "C10", "คอนกรีตเอ็น ทับหลัง กันสาด และงานย่อย", "ลบ.ม.", { cost: "ml", wastePct: 5, keywords: ["คอนกรีตผสมเสร็จ", "คอนกรีต"] }),
  templateItem("concrete_formwork", "C11", "คอนกรีตผสมน้ำยากันซึม", "ลบ.ม.", { cost: "ml", wastePct: 3, keywords: ["คอนกรีต", "กันซึม"] }),
  templateItem("concrete_formwork", "C12", "แบบหล่อฐานรากและตอม่อ", "ตร.ม.", { cost: "ml", wastePct: 10, keywords: ["ไม้อัด", "แบบหล่อ"] }),
  templateItem("concrete_formwork", "C13", "แบบหล่อเสา", "ตร.ม.", { cost: "ml", wastePct: 10, keywords: ["ไม้อัด", "แบบหล่อ"] }),
  templateItem("concrete_formwork", "C14", "แบบหล่อคานและพื้น", "ตร.ม.", { cost: "ml", wastePct: 10, keywords: ["ไม้อัด", "แบบหล่อ"] }),
  templateItem("concrete_formwork", "C15", "แบบหล่อบันไดและงาน ค.ส.ล. ย่อย", "ตร.ม.", { cost: "ml", wastePct: 10, keywords: ["ไม้อัด", "แบบหล่อ"] }),
  templateItem("concrete_formwork", "C16", "ค้ำยันและเสาค้ำแบบหล่อ", "ตร.ม.", { cost: "le" }),
  templateItem("concrete_formwork", "C17", "ตะปูสำหรับงานแบบ", "กก.", { cost: "m", wastePct: 5, keywords: ["ตะปู"] }),

  templateItem("rebar", "D01", "เหล็กเส้นกลม SR24 Ø 6 มม.", "กก.", { cost: "ml", wastePct: 5, keywords: ["เหล็กเส้นกลม", "6 มม", "SR24"] }),
  templateItem("rebar", "D02", "เหล็กเส้นกลม SR24 Ø 9 มม.", "กก.", { cost: "ml", wastePct: 5, keywords: ["เหล็กเส้นกลม", "9 มม", "SR24"] }),
  templateItem("rebar", "D03", "เหล็กข้ออ้อย SD40 Ø 12 มม.", "กก.", { cost: "ml", wastePct: 5, keywords: ["เหล็กข้ออ้อย", "12 มม", "SD40"] }),
  templateItem("rebar", "D04", "เหล็กข้ออ้อย SD40 Ø 16 มม.", "กก.", { cost: "ml", wastePct: 5, keywords: ["เหล็กข้ออ้อย", "16 มม", "SD40"] }),
  templateItem("rebar", "D05", "เหล็กข้ออ้อย SD40 Ø 20 มม.", "กก.", { cost: "ml", wastePct: 5, keywords: ["เหล็กข้ออ้อย", "20 มม", "SD40"] }),
  templateItem("rebar", "D06", "เหล็กข้ออ้อย SD40 Ø 25 มม.", "กก.", { cost: "ml", wastePct: 5, keywords: ["เหล็กข้ออ้อย", "25 มม", "SD40"] }),
  templateItem("rebar", "D07", "เหล็กข้ออ้อย SD40 Ø 28 มม.", "กก.", { cost: "ml", wastePct: 5, keywords: ["เหล็กข้ออ้อย", "28 มม", "SD40"] }),
  templateItem("rebar", "D08", "ลวดผูกเหล็ก", "กก.", { cost: "m", wastePct: 5, keywords: ["ลวดผูกเหล็ก"] }),
  templateItem("rebar", "D09", "ตะแกรงเหล็กไวร์เมช", "ตร.ม.", { cost: "ml", wastePct: 5, spec: "ระบุขนาดลวดและระยะห่าง", keywords: ["ไวร์เมช", "ตะแกรงเหล็ก"] }),

  templateItem("precast", "E01", "แผ่นพื้นคอนกรีตสำเร็จรูปท้องเรียบ", "ตร.ม.", { cost: "ml", wastePct: 3, spec: "ระบุความหนา ความยาว และน้ำหนักบรรทุก", keywords: ["แผ่นพื้นสำเร็จรูป", "แผ่นพื้น"] }),
  templateItem("precast", "E02", "คอนกรีตทับหน้าแผ่นพื้น", "ลบ.ม.", { cost: "ml", wastePct: 3, keywords: ["คอนกรีตผสมเสร็จ", "คอนกรีต"] }),
  templateItem("precast", "E03", "ไวร์เมชคอนกรีตทับหน้า", "ตร.ม.", { cost: "ml", wastePct: 5, keywords: ["ไวร์เมช", "ตะแกรงเหล็ก"] }),
  templateItem("precast", "E04", "ค้ำยันแผ่นพื้นระหว่างติดตั้ง", "ตร.ม.", { cost: "le" }),
  templateItem("precast", "E05", "งานอุดรอยต่อและเกราท์แผ่นพื้น", "ม.", { cost: "ml", wastePct: 5, keywords: ["ปูนเกราท์", "ปูนซีเมนต์"] }),

  templateItem("structural_steel", "F01", "เหล็กรูปพรรณตัวซี C100", "กก.", { cost: "ml", wastePct: 5, keywords: ["เหล็กตัวซี", "C100", "เหล็กรูปพรรณ"] }),
  templateItem("structural_steel", "F02", "เหล็กรูปพรรณตัวซี C125", "กก.", { cost: "ml", wastePct: 5, keywords: ["เหล็กตัวซี", "C125", "เหล็กรูปพรรณ"] }),
  templateItem("structural_steel", "F03", "เหล็กรูปพรรณตัวซี C150", "กก.", { cost: "ml", wastePct: 5, keywords: ["เหล็กตัวซี", "C150", "เหล็กรูปพรรณ"] }),
  templateItem("structural_steel", "F04", "เหล็กกล่องและเหล็กโครงหลังคา", "กก.", { cost: "ml", wastePct: 5, spec: "แยกรายการเพิ่มตามหน้าตัดจริง", keywords: ["เหล็กกล่อง", "เหล็กรูปพรรณ"] }),
  templateItem("structural_steel", "F05", "เหล็กแผ่น Plate", "กก.", { cost: "ml", wastePct: 5, spec: "ระบุความหนา", keywords: ["เหล็กแผ่น", "เหล็ก"] }),
  templateItem("structural_steel", "F06", "นอต สกรู และ Anchor bolt", "ชุด", { cost: "m", wastePct: 5, keywords: ["นอต", "สกรู"] }),
  templateItem("structural_steel", "F07", "ลวดเชื่อมและวัสดุสิ้นเปลือง", "กก.", { cost: "m", wastePct: 5, keywords: ["ลวดเชื่อม"] }),
  templateItem("structural_steel", "F08", "ผลิต เชื่อม และติดตั้งเหล็กรูปพรรณ", "กก.", { cost: "le" }),
  templateItem("structural_steel", "F09", "สีรองพื้นกันสนิมโครงเหล็ก", "ตร.ม.", { cost: "ml", wastePct: 5, keywords: ["สีรองพื้นกันสนิม", "สีรองพื้น"] }),

  templateItem("roof", "G01", "วัสดุมุงหลังคา", "ตร.ม.", { cost: "ml", wastePct: 7, spec: "ระบุชนิด รุ่น สี และความหนา", keywords: ["กระเบื้องหลังคา", "เมทัลชีท", "วัสดุมุงหลังคา"] }),
  templateItem("roof", "G02", "ครอบสันหลังคา", "ม.", { cost: "ml", wastePct: 5, keywords: ["ครอบหลังคา", "ครอบสัน"] }),
  templateItem("roof", "G03", "ครอบข้าง ครอบตะเข้ และครอบสามทาง", "ม.", { cost: "ml", wastePct: 5, keywords: ["ครอบหลังคา"] }),
  templateItem("roof", "G04", "แผ่นปิดรอยต่อและ Flashing", "ม.", { cost: "ml", wastePct: 5, keywords: ["แผ่นปิดรอยต่อ", "ครอบหลังคา"] }),
  templateItem("roof", "G05", "ฉนวนกันความร้อนใต้หลังคา", "ตร.ม.", { cost: "ml", wastePct: 5, spec: "ระบุชนิดและความหนา", keywords: ["ฉนวนกันความร้อน", "ฉนวน"] }),
  templateItem("roof", "G06", "เชิงชายและปั้นลม", "ม.", { cost: "ml", wastePct: 5, keywords: ["เชิงชาย", "ไฟเบอร์ซีเมนต์"] }),
  templateItem("roof", "G07", "รางน้ำฝน", "ม.", { cost: "ml", wastePct: 5, keywords: ["รางน้ำฝน"] }),
  templateItem("roof", "G08", "ท่อระบายน้ำฝน", "ม.", { cost: "ml", wastePct: 5, spec: "ระบุขนาดท่อ", keywords: ["ท่อพีวีซี", "ท่อ"] }),
  templateItem("roof", "G09", "อุปกรณ์ยึดและซีลหลังคา", "Lot", { cost: "m", keywords: ["สกรู", "วัสดุยาแนว"] }),

  templateItem("wall", "H01", "ผนังก่ออิฐมอญครึ่งแผ่น", "ตร.ม.", { cost: "ml", wastePct: 7, keywords: ["อิฐมอญ", "อิฐ"] }),
  templateItem("wall", "H02", "ผนังก่ออิฐมอญเต็มแผ่น", "ตร.ม.", { cost: "ml", wastePct: 7, keywords: ["อิฐมอญ", "อิฐ"] }),
  templateItem("wall", "H03", "ผนังก่ออิฐมวลเบา", "ตร.ม.", { cost: "ml", wastePct: 5, spec: "ระบุความหนา", keywords: ["อิฐมวลเบา", "อิฐ"] }),
  templateItem("wall", "H04", "ผนังก่อคอนกรีตบล็อก", "ตร.ม.", { cost: "ml", wastePct: 5, keywords: ["คอนกรีตบล็อก", "อิฐบล็อก"] }),
  templateItem("wall", "H05", "ผนังบล็อกช่องลม", "ตร.ม.", { cost: "ml", wastePct: 5, keywords: ["บล็อกช่องลม", "คอนกรีตบล็อก"] }),
  templateItem("wall", "H06", "เสาเอ็นและคานทับหลัง", "ม.", { cost: "ml", wastePct: 5, keywords: ["คอนกรีต", "เหล็กเส้น"] }),
  templateItem("wall", "H07", "ฉาบปูนผนังภายใน", "ตร.ม.", { cost: "ml", wastePct: 5, keywords: ["ปูนฉาบ", "ปูนซีเมนต์"] }),
  templateItem("wall", "H08", "ฉาบปูนผนังภายนอก", "ตร.ม.", { cost: "ml", wastePct: 5, keywords: ["ปูนฉาบ", "ปูนซีเมนต์"] }),
  templateItem("wall", "H09", "ฉาบปูนผิวโครงสร้าง", "ตร.ม.", { cost: "ml", wastePct: 5, keywords: ["ปูนฉาบ", "ปูนซีเมนต์"] }),
  templateItem("wall", "H10", "เซาะร่องและฝังเส้น PVC ที่ผนัง", "ม.", { cost: "ml", wastePct: 5, keywords: ["พีวีซี"] }),

  templateItem("ceiling", "I01", "ฝ้ายิปซัมฉาบเรียบ", "ตร.ม.", { cost: "ml", wastePct: 7, spec: "แผ่นหนา 9 มม. พร้อมโครงคร่าว", keywords: ["แผ่นยิปซัม", "ยิปซัม"] }),
  templateItem("ceiling", "I02", "ฝ้ายิปซัมชนิดทนชื้น", "ตร.ม.", { cost: "ml", wastePct: 7, spec: "ระบุความหนาและโครงคร่าว", keywords: ["ยิปซัมทนชื้น", "แผ่นยิปซัม"] }),
  templateItem("ceiling", "I03", "ฝ้าไฟเบอร์ซีเมนต์ภายใน", "ตร.ม.", { cost: "ml", wastePct: 7, keywords: ["แผ่นไฟเบอร์ซีเมนต์", "ฝ้า"] }),
  templateItem("ceiling", "I04", "ฝ้าชายคาไฟเบอร์ซีเมนต์มีช่องระบาย", "ตร.ม.", { cost: "ml", wastePct: 7, keywords: ["แผ่นไฟเบอร์ซีเมนต์", "ฝ้าชายคา"] }),
  templateItem("ceiling", "I05", "ฝ้าเพดานฉาบปูนเรียบ", "ตร.ม.", { cost: "ml", wastePct: 5, keywords: ["ปูนฉาบ", "ปูนซีเมนต์"] }),
  templateItem("ceiling", "I06", "โครงคร่าวฝ้าโลหะ", "ตร.ม.", { cost: "ml", wastePct: 5, keywords: ["โครงคร่าว", "เหล็กชุบสังกะสี"] }),
  templateItem("ceiling", "I07", "ฉนวนเหนือฝ้า", "ตร.ม.", { cost: "ml", wastePct: 5, spec: "ระบุชนิดและความหนา", keywords: ["ฉนวนกันความร้อน", "ฉนวน"] }),
  templateItem("ceiling", "I08", "มอบฝ้าและวัสดุปิดขอบ", "ม.", { cost: "ml", wastePct: 5, keywords: ["มอบฝ้า", "ไฟเบอร์ซีเมนต์"] }),
  templateItem("ceiling", "I09", "ช่องเปิดตรวจสอบเหนือฝ้า", "ชุด", { cost: "ml", keywords: ["ช่องเซอร์วิส"] }),

  templateItem("finish", "J01", "กระเบื้องพื้นทั่วไป", "ตร.ม.", { cost: "ml", wastePct: 7, spec: "ระบุชนิด ขนาด รุ่น และรูปแบบการปู", keywords: ["กระเบื้องปูพื้น", "กระเบื้อง"] }),
  templateItem("finish", "J02", "กระเบื้องพื้นห้องน้ำ/กันลื่น", "ตร.ม.", { cost: "ml", wastePct: 7, keywords: ["กระเบื้องปูพื้น", "กระเบื้อง"] }),
  templateItem("finish", "J03", "กระเบื้องผนัง", "ตร.ม.", { cost: "ml", wastePct: 7, keywords: ["กระเบื้องบุผนัง", "กระเบื้อง"] }),
  templateItem("finish", "J04", "พื้นไม้ ปาร์เกต์ ลามิเนต หรือไวนิล", "ตร.ม.", { cost: "ml", wastePct: 7, spec: "ระบุวัสดุและความหนา", keywords: ["พื้นลามิเนต", "ไวนิล", "ปาร์เกต์"] }),
  templateItem("finish", "J05", "พื้นซีเมนต์ขัดมัน/ขัดเรียบ", "ตร.ม.", { cost: "ml", wastePct: 5, keywords: ["ปูนซีเมนต์"] }),
  templateItem("finish", "J06", "ปูนทรายปรับระดับพื้น", "ตร.ม.", { cost: "ml", wastePct: 5, keywords: ["ปูนปรับระดับ", "ปูนซีเมนต์"] }),
  templateItem("finish", "J07", "ระบบกันซึมพื้นห้องน้ำและระเบียง", "ตร.ม.", { cost: "ml", wastePct: 5, keywords: ["กันซึม"] }),
  templateItem("finish", "J08", "บัวเชิงผนัง", "ม.", { cost: "ml", wastePct: 7, spec: "ระบุวัสดุและขนาด", keywords: ["บัวเชิงผนัง", "บัว"] }),
  templateItem("finish", "J09", "ผิวขั้นบันได", "ม.", { cost: "ml", wastePct: 7, keywords: ["กระเบื้อง", "ไม้"] }),
  templateItem("finish", "J10", "ผิวชานพักบันได", "ตร.ม.", { cost: "ml", wastePct: 7, keywords: ["กระเบื้อง", "ไม้"] }),
  templateItem("finish", "J11", "จมูกบันไดและคิ้วปิดขอบ", "ม.", { cost: "ml", wastePct: 5, keywords: ["จมูกบันได", "คิ้ว"] }),

  templateItem("sanitary_fixture", "K01", "โถสุขภัณฑ์แบบนั่งราบ", "ชุด", { cost: "ml", keywords: ["โถสุขภัณฑ์", "สุขภัณฑ์"] }),
  templateItem("sanitary_fixture", "K02", "โถสุขภัณฑ์แบบนั่งยอง", "ชุด", { cost: "ml", keywords: ["โถสุขภัณฑ์", "สุขภัณฑ์"] }),
  templateItem("sanitary_fixture", "K03", "อ่างล้างหน้าพร้อมก๊อก", "ชุด", { cost: "ml", keywords: ["อ่างล้างหน้า", "ก๊อกน้ำ"] }),
  templateItem("sanitary_fixture", "K04", "ชุดฝักบัวและก๊อกอาบน้ำ", "ชุด", { cost: "ml", keywords: ["ฝักบัว", "ก๊อกน้ำ"] }),
  templateItem("sanitary_fixture", "K05", "สายฉีดชำระ", "ชุด", { cost: "ml", keywords: ["สายฉีดชำระ", "สุขภัณฑ์"] }),
  templateItem("sanitary_fixture", "K06", "กระจกเงาพร้อมชั้นวาง", "ชุด", { cost: "ml", keywords: ["กระจกเงา", "กระจก"] }),
  templateItem("sanitary_fixture", "K07", "ที่ใส่กระดาษและที่วางสบู่", "ชุด", { cost: "ml", keywords: ["อุปกรณ์ห้องน้ำ"] }),
  templateItem("sanitary_fixture", "K08", "ราวแขวนผ้าและขอแขวน", "ชุด", { cost: "ml", keywords: ["อุปกรณ์ห้องน้ำ"] }),
  templateItem("sanitary_fixture", "K09", "ก๊อกน้ำล้างพื้น", "ชุด", { cost: "ml", keywords: ["ก๊อกน้ำ"] }),
  templateItem("sanitary_fixture", "K10", "เคาน์เตอร์อ่างล้างหน้า", "ม.", { cost: "ml", spec: "ระบุวัสดุท็อปและหน้าบาน", keywords: ["เคาน์เตอร์"] }),
  templateItem("sanitary_fixture", "K11", "อุปกรณ์ห้องน้ำอื่นๆ", "ชุด", { cost: "ml", keywords: ["อุปกรณ์ห้องน้ำ"] }),

  templateItem("opening", "L01", "ประตูไม้/HDF พร้อมวงกบ", "ชุด", { cost: "ml", spec: "แยกเพิ่มตามรหัส ป1 ป2 และขนาดจริง", keywords: ["ประตู", "วงกบ"] }),
  templateItem("opening", "L02", "ประตู PVC/uPVC พร้อมวงกบ", "ชุด", { cost: "ml", keywords: ["ประตูพีวีซี", "ประตู"] }),
  templateItem("opening", "L03", "ประตูอะลูมิเนียมและกระจก", "ชุด", { cost: "ml", spec: "ระบุรูปแบบและขนาด", keywords: ["ประตูอะลูมิเนียม", "อะลูมิเนียม", "กระจก"] }),
  templateItem("opening", "L04", "ประตูกระจกเปลือย", "ชุด", { cost: "ml", keywords: ["กระจก", "ประตู"] }),
  templateItem("opening", "L05", "หน้าต่างอะลูมิเนียมบานเลื่อน", "ชุด", { cost: "ml", spec: "แยกเพิ่มตามรหัส น1 น2 และขนาดจริง", keywords: ["หน้าต่างอะลูมิเนียม", "อะลูมิเนียม", "กระจก"] }),
  templateItem("opening", "L06", "หน้าต่างอะลูมิเนียมบานเปิด", "ชุด", { cost: "ml", keywords: ["หน้าต่างอะลูมิเนียม", "อะลูมิเนียม", "กระจก"] }),
  templateItem("opening", "L07", "หน้าต่างอะลูมิเนียมบานกระทุ้ง", "ชุด", { cost: "ml", keywords: ["หน้าต่างอะลูมิเนียม", "อะลูมิเนียม", "กระจก"] }),
  templateItem("opening", "L08", "ช่องแสงและกระจกติดตาย", "ตร.ม.", { cost: "ml", keywords: ["กระจก", "อะลูมิเนียม"] }),
  templateItem("opening", "L09", "อุปกรณ์ประตูหน้าต่างและ Hardware", "ชุด", { cost: "ml", keywords: ["บานพับ", "ลูกบิด", "มือจับ"] }),
  templateItem("opening", "L10", "มุ้งลวด", "ตร.ม.", { cost: "ml", keywords: ["มุ้งลวด"] }),

  templateItem("paint", "M01", "สีผนังภายใน", "ตร.ม.", { cost: "ml", wastePct: 5, spec: "รวมรองพื้นและสีทับหน้า", keywords: ["สีทาภายใน", "สีรองพื้น", "สี"] }),
  templateItem("paint", "M02", "สีผนังภายนอก", "ตร.ม.", { cost: "ml", wastePct: 5, spec: "รวมรองพื้นและสีทับหน้า", keywords: ["สีทาภายนอก", "สีรองพื้น", "สี"] }),
  templateItem("paint", "M03", "สีฝ้าเพดาน", "ตร.ม.", { cost: "ml", wastePct: 5, keywords: ["สีทาภายใน", "สี"] }),
  templateItem("paint", "M04", "สีน้ำมันทาไม้", "ตร.ม.", { cost: "ml", wastePct: 5, keywords: ["สีน้ำมัน", "สี"] }),
  templateItem("paint", "M05", "สีรองพื้นกันสนิมและสีน้ำมันทาเหล็ก", "ตร.ม.", { cost: "ml", wastePct: 5, keywords: ["สีรองพื้นกันสนิม", "สีน้ำมัน", "สี"] }),
  templateItem("paint", "M06", "แลคเกอร์หรือวัสดุเคลือบผิวไม้", "ตร.ม.", { cost: "ml", wastePct: 5, keywords: ["แลคเกอร์", "สี"] }),

  templateItem("architectural_other", "N01", "ราวบันได", "ม.", { cost: "ml", spec: "ระบุวัสดุ รูปแบบ และความสูง", keywords: ["ราวบันได", "ราวกันตก"] }),
  templateItem("architectural_other", "N02", "ราวกันตก", "ม.", { cost: "ml", spec: "ระบุวัสดุ รูปแบบ และความสูง", keywords: ["ราวกันตก"] }),
  templateItem("architectural_other", "N03", "งานบิลต์อิน", "ม.", { cost: "ml", spec: "ระบุวัสดุและแบบขยาย", keywords: ["ไม้อัด", "ลามิเนต"] }),
  templateItem("architectural_other", "N04", "เคาน์เตอร์และตู้ลอย", "ม.", { cost: "ml", keywords: ["เคาน์เตอร์", "ไม้อัด"] }),
  templateItem("architectural_other", "N05", "ป้ายและงานตกแต่งเฉพาะโครงการ", "ชุด", { cost: "ml" }),
  templateItem("architectural_other", "N06", "วัสดุยาแนวและซีลรอยต่อ", "ม.", { cost: "ml", wastePct: 5, keywords: ["วัสดุยาแนว", "ซิลิโคน"] }),
  templateItem("architectural_other", "N07", "งานสถาปัตยกรรมเบ็ดเตล็ด", "Lot", { cost: "ml" }),

  templateItem("electrical", "O01", "ตู้เมนไฟฟ้า MDB", "ชุด", { cost: "ml", spec: "ระบุจำนวนวงจร ขนาดเมน และค่าทนกระแสลัดวงจร", keywords: ["ตู้ไฟ", "MDB"] }),
  templateItem("electrical", "O02", "ตู้ Consumer Unit/แผงย่อย", "ชุด", { cost: "ml", spec: "ระบุจำนวนวงจร", keywords: ["ตู้ไฟ", "คอนซูมเมอร์ยูนิต"] }),
  templateItem("electrical", "O03", "MCB/RCBO และอุปกรณ์ป้องกัน", "ชุด", { cost: "ml", spec: "แยกเพิ่มตาม AT, Pole และ IC", keywords: ["เซอร์กิตเบรกเกอร์", "เบรกเกอร์"] }),
  templateItem("electrical", "O04", "มิเตอร์ไฟฟ้า", "เครื่อง", { cost: "ml", keywords: ["มิเตอร์ไฟฟ้า"] }),
  templateItem("electrical", "O05", "ท่อร้อยสาย PVC Ø 15 มม.", "ม.", { cost: "ml", wastePct: 5, keywords: ["ท่อพีวีซี", "15 มม"] }),
  templateItem("electrical", "O06", "ท่อร้อยสาย PVC Ø 20 มม.", "ม.", { cost: "ml", wastePct: 5, keywords: ["ท่อพีวีซี", "20 มม"] }),
  templateItem("electrical", "O07", "ท่อร้อยสาย PVC Ø 25 มม.", "ม.", { cost: "ml", wastePct: 5, keywords: ["ท่อพีวีซี", "25 มม"] }),
  templateItem("electrical", "O08", "ท่อร้อยสาย EMT", "ม.", { cost: "ml", wastePct: 5, spec: "แยกเพิ่มตามขนาด", keywords: ["ท่อ EMT", "ท่อร้อยสาย"] }),
  templateItem("electrical", "O09", "สายไฟ 1.5 ตร.มม.", "ม.", { cost: "ml", wastePct: 7, keywords: ["สายไฟ", "1.5 ตร.มม"] }),
  templateItem("electrical", "O10", "สายไฟ 2.5 ตร.มม.", "ม.", { cost: "ml", wastePct: 7, keywords: ["สายไฟ", "2.5 ตร.มม"] }),
  templateItem("electrical", "O11", "สายไฟ 4 ตร.มม.", "ม.", { cost: "ml", wastePct: 7, keywords: ["สายไฟ", "4 ตร.มม"] }),
  templateItem("electrical", "O12", "สายเมนและสายป้อน", "ม.", { cost: "ml", wastePct: 7, spec: "แยกเพิ่มตามชนิดและขนาดสาย", keywords: ["สายไฟ", "สายเคเบิล"] }),
  templateItem("electrical", "O13", "โคม Downlight LED", "ชุด", { cost: "ml", keywords: ["โคมไฟ", "หลอด LED"] }),
  templateItem("electrical", "O14", "โคม LED Tube/โคมติดลอย", "ชุด", { cost: "ml", keywords: ["โคมไฟ", "หลอด LED"] }),
  templateItem("electrical", "O15", "โคมไฟภายนอก", "ชุด", { cost: "ml", keywords: ["โคมไฟ"] }),
  templateItem("electrical", "O16", "โคมไฟฉุกเฉินและป้ายทางออก", "ชุด", { cost: "ml", keywords: ["โคมไฟฉุกเฉิน", "โคมไฟ"] }),
  templateItem("electrical", "O17", "สวิตช์ไฟฟ้า", "จุด", { cost: "ml", spec: "แยกชนิดทางเดียว สองทาง และกันน้ำ", keywords: ["สวิตช์ไฟ"] }),
  templateItem("electrical", "O18", "เต้ารับไฟฟ้าพร้อมสายดิน", "จุด", { cost: "ml", spec: "แยกชนิดทั่วไปและกันน้ำ", keywords: ["เต้ารับ"] }),
  templateItem("electrical", "O19", "กริ่งและสวิตช์กริ่ง", "ชุด", { cost: "ml", keywords: ["กริ่ง"] }),
  templateItem("electrical", "O20", "หลักดินและระบบสายดิน", "ชุด", { cost: "ml", keywords: ["หลักดิน", "สายดิน"] }),
  templateItem("electrical", "O21", "งานเชื่อม Exothermic", "จุด", { cost: "ml", keywords: ["Exothermic"] }),
  templateItem("electrical", "O22", "ระบบล่อฟ้า", "ชุด", { cost: "ml", spec: "ใช้เมื่ออยู่ในขอบเขตโครงการ", keywords: ["สายทองแดง", "หลักดิน"] }),
  templateItem("electrical", "O23", "ระบบโทรศัพท์ อินเทอร์เน็ต และสื่อสาร", "จุด", { cost: "ml", spec: "ใช้เมื่ออยู่ในขอบเขตโครงการ", keywords: ["สายสัญญาณ", "สาย LAN"] }),
  templateItem("electrical", "O24", "อุปกรณ์ประกอบและทดสอบระบบไฟฟ้า", "Lot", { cost: "ml" }),

  templateItem("plumbing", "P01", "ท่อ PVC Class 13.5 Ø 1/2 นิ้ว", "ม.", { cost: "ml", wastePct: 5, keywords: ["ท่อพีวีซี", "1/2 นิ้ว", "13.5"] }),
  templateItem("plumbing", "P02", "ท่อ PVC Class 13.5 Ø 3/4 นิ้ว", "ม.", { cost: "ml", wastePct: 5, keywords: ["ท่อพีวีซี", "3/4 นิ้ว", "13.5"] }),
  templateItem("plumbing", "P03", "ท่อ PVC Class 13.5 Ø 1 นิ้ว", "ม.", { cost: "ml", wastePct: 5, keywords: ["ท่อพีวีซี", "1 นิ้ว", "13.5"] }),
  templateItem("plumbing", "P04", "ข้องอและข้อต่อท่อน้ำดี", "อัน", { cost: "ml", wastePct: 5, spec: "แยกเพิ่มตามชนิดและขนาด", keywords: ["ข้อต่อพีวีซี", "ข้องอ"] }),
  templateItem("plumbing", "P05", "สามทางและข้อลดท่อน้ำดี", "อัน", { cost: "ml", wastePct: 5, spec: "แยกเพิ่มตามชนิดและขนาด", keywords: ["สามทาง", "ข้อลด"] }),
  templateItem("plumbing", "P06", "Stop valve", "อัน", { cost: "ml", keywords: ["Stop Valve", "วาล์ว"] }),
  templateItem("plumbing", "P07", "Ball valve", "อัน", { cost: "ml", spec: "แยกเพิ่มตามขนาด", keywords: ["Ball Valve", "วาล์ว"] }),
  templateItem("plumbing", "P08", "Gate valve", "อัน", { cost: "ml", spec: "แยกเพิ่มตามขนาด", keywords: ["Gate Valve", "ประตูน้ำ"] }),
  templateItem("plumbing", "P09", "Check valve", "อัน", { cost: "ml", keywords: ["Check Valve", "วาล์ว"] }),
  templateItem("plumbing", "P10", "Float valve", "อัน", { cost: "ml", keywords: ["Float Valve", "ลูกลอย"] }),
  templateItem("plumbing", "P11", "มาตรวัดน้ำ", "เครื่อง", { cost: "ml", keywords: ["มาตรวัดน้ำ"] }),
  templateItem("plumbing", "P12", "ถังเก็บน้ำ", "ถัง", { cost: "ml", spec: "ระบุวัสดุและความจุ", keywords: ["ถังเก็บน้ำ", "ถังน้ำ"] }),
  templateItem("plumbing", "P13", "เครื่องสูบน้ำเพิ่มแรงดัน", "เครื่อง", { cost: "ml", spec: "ระบุกำลังและอัตราสูบ", keywords: ["ปั๊มน้ำ", "เครื่องสูบน้ำ"] }),
  templateItem("plumbing", "P14", "อุปกรณ์ยึดและรองรับท่อน้ำดี", "Lot", { cost: "ml" }),
  templateItem("plumbing", "P15", "ทดสอบแรงดัน ล้าง และทำสัญลักษณ์ท่อ", "งาน", { cost: "le" }),

  templateItem("sanitary_drainage", "Q01", "ท่อ PVC Class 8.5 Ø 1 1/2 นิ้ว", "ม.", { cost: "ml", wastePct: 5, keywords: ["ท่อพีวีซี", "1 1/2 นิ้ว", "8.5"] }),
  templateItem("sanitary_drainage", "Q02", "ท่อ PVC Class 8.5 Ø 2 นิ้ว", "ม.", { cost: "ml", wastePct: 5, keywords: ["ท่อพีวีซี", "2 นิ้ว", "8.5"] }),
  templateItem("sanitary_drainage", "Q03", "ท่อ PVC Class 8.5 Ø 2 1/2 นิ้ว", "ม.", { cost: "ml", wastePct: 5, keywords: ["ท่อพีวีซี", "2 1/2 นิ้ว", "8.5"] }),
  templateItem("sanitary_drainage", "Q04", "ท่อ PVC Class 8.5 Ø 4 นิ้ว", "ม.", { cost: "ml", wastePct: 5, keywords: ["ท่อพีวีซี", "4 นิ้ว", "8.5"] }),
  templateItem("sanitary_drainage", "Q05", "ข้องอ 45/90 องศา", "อัน", { cost: "ml", spec: "แยกเพิ่มตามองศาและขนาด", keywords: ["ข้องอพีวีซี", "ข้องอ"] }),
  templateItem("sanitary_drainage", "Q06", "สามทาง Tee/Wye", "อัน", { cost: "ml", spec: "แยกเพิ่มตามชนิดและขนาด", keywords: ["สามทางพีวีซี", "สามทาง"] }),
  templateItem("sanitary_drainage", "Q07", "ข้อลดและข้อต่ออ่อน", "อัน", { cost: "ml", spec: "แยกเพิ่มตามชนิดและขนาด", keywords: ["ข้อลด", "ข้อต่ออ่อน"] }),
  templateItem("sanitary_drainage", "Q08", "Floor drain (FD)", "ชุด", { cost: "ml", spec: "ระบุขนาด", keywords: ["Floor Drain", "ตะแกรงระบายน้ำ"] }),
  templateItem("sanitary_drainage", "Q09", "Floor cleanout (FCO)", "ชุด", { cost: "ml", spec: "ระบุขนาด", keywords: ["FCO", "Cleanout"] }),
  templateItem("sanitary_drainage", "Q10", "Roof drain (RD/RFD)", "ชุด", { cost: "ml", spec: "ระบุขนาด", keywords: ["Roof Drain", "RFD"] }),
  templateItem("sanitary_drainage", "Q11", "P-Trap", "ชุด", { cost: "ml", spec: "ระบุขนาด", keywords: ["P-Trap"] }),
  templateItem("sanitary_drainage", "Q12", "Air vent cowl (AVC)", "ชุด", { cost: "ml", spec: "ระบุขนาด", keywords: ["AVC"] }),
  templateItem("sanitary_drainage", "Q13", "ถังดักไขมัน", "ถัง", { cost: "ml", spec: "ระบุความจุ", keywords: ["ถังดักไขมัน"] }),
  templateItem("sanitary_drainage", "Q14", "ถังบำบัดน้ำเสียสำเร็จรูป", "ถัง", { cost: "ml", spec: "ระบุชนิดและความจุ", keywords: ["ถังบำบัดน้ำเสีย", "ถังบำบัด"] }),
  templateItem("sanitary_drainage", "Q15", "บ่อพักท่อระบายน้ำพร้อมฝา", "บ่อ", { cost: "ml", spec: "ระบุขนาด", keywords: ["บ่อพัก", "ฝาบ่อ"] }),
  templateItem("sanitary_drainage", "Q16", "ท่อคอนกรีตระบายน้ำ", "ม.", { cost: "ml", spec: "ระบุเส้นผ่านศูนย์กลาง", keywords: ["ท่อคอนกรีต"] }),
  templateItem("sanitary_drainage", "Q17", "รางระบายน้ำภายนอก", "ม.", { cost: "ml", spec: "ระบุขนาดและชนิดฝาปิด", keywords: ["รางระบายน้ำ"] }),
  templateItem("sanitary_drainage", "Q18", "อุปกรณ์ยึดและรองรับท่อน้ำทิ้ง", "Lot", { cost: "ml" }),
  templateItem("sanitary_drainage", "Q19", "ทดสอบ ล้าง และทำสัญลักษณ์ระบบสุขาภิบาล", "งาน", { cost: "le" }),
];

const SPREAD_FOUNDATION_ITEMS = [
  templateItem("foundation", "B01", "เตรียมก้นหลุมฐานรากแผ่", "ตร.ม.", { cost: "le" }),
  templateItem("foundation", "B02", "งานฐานรากแผ่ตามแบบโครงสร้าง", "งาน", { cost: "le", note: "คอนกรีต เหล็ก และแบบหล่อให้กรอกแยกในหมวด C และ D" }),
  templateItem("foundation", "B03", "ระบบป้องกันปลวกใต้พื้น", "ตร.ม.", { cost: "ml", keywords: ["น้ำยาป้องกันปลวก"] }),
  templateItem("foundation", "B04", "ระบบกันซึมส่วนฐานราก", "ตร.ม.", { cost: "ml", keywords: ["กันซึม"] }),
];

const PILE_FOUNDATION_ITEMS = [
  templateItem("foundation", "B01", "เสาเข็มคอนกรีตอัดแรง", "ต้น", { cost: "m", wastePct: 3, spec: "ระบุหน้าตัด ความยาว และกำลังรับน้ำหนัก", keywords: ["เสาเข็มคอนกรีตอัดแรง", "เสาเข็ม"] }),
  templateItem("foundation", "B02", "ขนส่งและตอกเสาเข็ม", "ต้น", { cost: "le" }),
  templateItem("foundation", "B03", "เชื่อมต่อท่อนเสาเข็ม", "จุด", { cost: "mle", keywords: ["แผ่นเหล็ก", "ลวดเชื่อม"] }),
  templateItem("foundation", "B04", "สกัดหัวเสาเข็ม", "ต้น", { cost: "le" }),
  templateItem("foundation", "B05", "ทดสอบเสาเข็ม", "งาน", { cost: "le", spec: "ระบุ Static/Dynamic load test ตามแบบ" }),
  templateItem("foundation", "B06", "เตรียมฐานหัวเข็มและงานเกราท์", "ต้น", { cost: "ml", keywords: ["ปูนเกราท์", "ปูนซีเมนต์"] }),
  templateItem("foundation", "B07", "ระบบป้องกันปลวกใต้พื้น", "ตร.ม.", { cost: "ml", keywords: ["น้ำยาป้องกันปลวก"] }),
  templateItem("foundation", "B08", "ระบบกันซึมส่วนฐานราก", "ตร.ม.", { cost: "ml", keywords: ["กันซึม"] }),
];

const COMMERCIAL_EXTRA_ITEMS = [
  templateItem("foundation", "B20", "งานป้องกันดินพังและสูบน้ำระหว่างก่อสร้าง", "งาน", { cost: "le" }),
  templateItem("structural_steel", "F20", "โครงสร้างเหล็กสำหรับป้ายและกันสาด", "กก.", { cost: "mle", wastePct: 5, keywords: ["เหล็กรูปพรรณ", "เหล็กกล่อง"] }),
  templateItem("opening", "L20", "ประตูม้วนเหล็กพร้อมอุปกรณ์", "ชุด", { cost: "ml", keywords: ["ประตูม้วน"] }),
  templateItem("opening", "L21", "ประตูหนีไฟพร้อมอุปกรณ์", "ชุด", { cost: "ml", keywords: ["ประตูหนีไฟ", "ประตูเหล็ก"] }),
  templateItem("architectural_other", "N20", "ป้ายหน้าร้าน", "ชุด", { cost: "ml", spec: "แยกเพิ่มตามขนาดและวัสดุ" }),
  templateItem("electrical", "O30", "ระบบไฟฟ้าสำรอง/UPS", "ชุด", { cost: "ml" }),
  templateItem("electrical", "O31", "ระบบแจ้งเหตุเพลิงไหม้", "จุด", { cost: "ml" }),
  templateItem("electrical", "O32", "ระบบกล้องวงจรปิด", "จุด", { cost: "ml" }),
  templateItem("electrical", "O33", "ระบบโทรศัพท์และเครือข่ายข้อมูล", "จุด", { cost: "ml" }),
  templateItem("sanitary_drainage", "Q30", "ระบบดับเพลิงและตู้สายฉีด", "จุด", { cost: "ml", spec: "เพิ่มเมื่ออยู่ในขอบเขตและตามข้อกำหนดอาคาร" }),
];

const TEMPLATE_DEFINITIONS = [
  { id: "house_spread", name: "บ้านพักอาศัย — ฐานรากแผ่", description: "รายการครบ 17 หมวด เหมาะกับบ้าน 1–2 ชั้นฐานรากแผ่", rows: [...SPREAD_FOUNDATION_ITEMS, ...BASE_HOUSE_ITEMS] },
  { id: "house_pile", name: "บ้านพักอาศัย — ฐานรากเสาเข็ม", description: "เพิ่มชนิดเสาเข็ม งานตอก สกัดหัวเข็ม และการทดสอบ", rows: [...PILE_FOUNDATION_ITEMS, ...BASE_HOUSE_ITEMS] },
  { id: "commercial", name: "อาคารพาณิชย์ 2–4 ชั้น", description: "เพิ่มประตูม้วน ป้าย ระบบสื่อสาร ป้องกันอัคคีภัย และงานเฉพาะอาคารพาณิชย์", rows: [...PILE_FOUNDATION_ITEMS, ...BASE_HOUSE_ITEMS, ...COMMERCIAL_EXTRA_ITEMS] },
  { id: "blank", name: "เริ่มจากแบบว่าง", description: "สร้างหมวดครบ แต่เพิ่มรายการตามแบบของโครงการเอง", rows: [] },
];

function hydrateTemplate(templateId) {
  const template = TEMPLATE_DEFINITIONS.find((entry) => entry.id === templateId) || TEMPLATE_DEFINITIONS[0];
  return template.rows.map((entry, index) => ({
    ...entry,
    id: `${template.id}-${entry.sectionId}-${entry.code}-${index}`,
    quantity: "",
    materialId: "",
    materialRate: "",
    futureMaterialRate: "",
    laborRate: "",
    equipmentRate: "",
    costTypes: {
      material: entry.cost.includes("m"),
      labor: entry.cost.includes("l"),
      equipment: entry.cost.includes("e"),
    },
  }));
}

function createCustomRow(section, index) {
  const suffix = String(index + 1).padStart(2, "0");
  return {
    id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    sectionId: section.id,
    code: `${section.code}${suffix}`,
    name: "รายการใหม่",
    spec: "",
    unit: "ตร.ม.",
    quantity: "",
    costTypes: { material: true, labor: true, equipment: false },
    wastePct: 0,
    keywords: [],
    materialId: "",
    materialRate: "",
    futureMaterialRate: "",
    laborRate: "",
    equipmentRate: "",
    note: "",
  };
}

function formatPrice(value) {
  return number(value).toLocaleString("th-TH", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function formatQty(value) {
  return number(value).toLocaleString("th-TH", { minimumFractionDigits: 0, maximumFractionDigits: 3 });
}

function optionalPrice(value) {
  return value === null || value === undefined ? "รอข้อมูล" : `฿${formatPrice(value)}`;
}

function formatForecastPeriod(months) {
  if (months <= 0) return "ปัจจุบัน";
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  if (!years) return `${remainingMonths} เดือน`;
  if (!remainingMonths) return `${years} ปี`;
  return `${years} ปี ${remainingMonths} เดือน`;
}

function forecastDate(months) {
  const date = new Date();
  date.setMonth(date.getMonth() + months);
  return date.toLocaleDateString("th-TH", { month: "long", year: "numeric" });
}

function escapeCSV(value) {
  const text = String(value ?? "");
  return /[,"\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function downloadText(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function toArabicDigits(value = "") {
  return String(value).replace(/[๐-๙]/g, (digit) => String("๐๑๒๓๔๕๖๗๘๙".indexOf(digit)));
}

function normalizeImportText(value = "") {
  return toArabicDigits(value)
    .normalize("NFKC")
    .toLocaleLowerCase("th-TH")
    .replace(/\bksc\b|kg\s*\/\s*cm(?:2|²)/g, " กกตรซม ")
    .replace(/กก\.?\s*\/\s*ตร\.?\s*ซม\.?/g, " กกตรซม ")
    .replace(/ลูกบาศก์\s*เมตร|ม(?:3|³)/g, " ลบม ")
    .replace(/ตาราง\s*เมตร|ม(?:2|²)/g, " ตรม ")
    .replace(/มิลลิเมตร|มม\.?/g, " mm ")
    .replace(/เซนติเมตร|ซม\.?/g, " cm ")
    .replace(/[Ø⌀]/g, " dia ")
    .replace(/[×*]/g, " x ")
    .replace(/[^\p{L}\p{N}.]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeColumnName(value = "") {
  return normalizeImportText(value).replace(/\s+/g, "");
}

function parseLocaleNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  let text = toArabicDigits(value).trim();
  if (!text || /^[-–—]+$/.test(text)) return null;
  const negative = /^\(.*\)$/.test(text) || /^-/.test(text);
  text = text.replace(/[^0-9.,-]/g, "").replace(/^-/, "");
  if (!text || !/\d/.test(text)) return null;
  if (text.includes(".") && text.includes(",")) {
    text = text.lastIndexOf(".") > text.lastIndexOf(",")
      ? text.replace(/,/g, "")
      : text.replace(/\./g, "").replace(",", ".");
  } else if (text.includes(",")) {
    const commaParts = text.split(",");
    text = commaParts.length > 2 || commaParts.slice(1).every((part) => part.length === 3)
      ? commaParts.join("")
      : text.replace(",", ".");
  }
  const parsed = Number(text);
  return Number.isFinite(parsed) ? (negative ? -parsed : parsed) : null;
}

function cleanImportCell(value) {
  if (value === null || value === undefined) return "";
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  if (typeof value === "object") return JSON.stringify(value);
  return String(value).replace(/^\uFEFF/, "").trim();
}

function compactMatrix(rows) {
  return (Array.isArray(rows) ? rows : [])
    .map((row) => (Array.isArray(row) ? row : [row]).map(cleanImportCell))
    .filter((row) => row.some((cell) => cell !== ""));
}

function detectDelimiter(text) {
  const sample = String(text).split(/\r?\n/).slice(0, 20).join("\n");
  const candidates = [",", "\t", ";", "|"];
  let best = { delimiter: ",", score: -1 };
  candidates.forEach((delimiter) => {
    let count = 0;
    let inQuotes = false;
    for (let index = 0; index < sample.length; index += 1) {
      const character = sample[index];
      if (character === '"') {
        if (inQuotes && sample[index + 1] === '"') index += 1;
        else inQuotes = !inQuotes;
      } else if (!inQuotes && character === delimiter) count += 1;
    }
    if (count > best.score) best = { delimiter, score: count };
  });
  return best.delimiter;
}

function parseDelimitedText(text, delimiter = detectDelimiter(text)) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  const input = String(text).replace(/^\uFEFF/, "");
  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];
    if (quoted) {
      if (character === '"' && input[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (character === '"') quoted = false;
      else cell += character;
    } else if (character === '"') quoted = true;
    else if (character === delimiter) {
      row.push(cell);
      cell = "";
    } else if (character === "\n" || character === "\r") {
      if (character === "\r" && input[index + 1] === "\n") index += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += character;
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return compactMatrix(rows);
}

function columnAliasScore(header, alias) {
  const normalizedHeader = normalizeColumnName(header);
  const normalizedAlias = normalizeColumnName(alias);
  if (!normalizedHeader || !normalizedAlias) return 0;
  if (normalizedHeader === normalizedAlias) return 100 + normalizedAlias.length;
  if (normalizedHeader.startsWith(normalizedAlias) || normalizedAlias.startsWith(normalizedHeader)) return 70 + Math.min(normalizedHeader.length, normalizedAlias.length);
  if (normalizedHeader.includes(normalizedAlias)) return 50 + normalizedAlias.length;
  return 0;
}

function detectColumnMapping(headers) {
  const pairs = [];
  IMPORT_COLUMN_FIELDS.forEach((field) => {
    headers.forEach((header, columnIndex) => {
      const score = Math.max(0, ...field.aliases.map((alias) => columnAliasScore(header, alias)));
      if (score) pairs.push({ field: field.key, columnIndex, score });
    });
  });
  pairs.sort((a, b) => b.score - a.score);
  const mapping = {};
  const usedColumns = new Set();
  pairs.forEach((pair) => {
    if (mapping[pair.field] === undefined && !usedColumns.has(pair.columnIndex)) {
      mapping[pair.field] = pair.columnIndex;
      usedColumns.add(pair.columnIndex);
    }
  });
  return mapping;
}

function uniqueHeaders(row) {
  const used = new Map();
  return row.map((cell, index) => {
    const base = cleanImportCell(cell) || `คอลัมน์ ${index + 1}`;
    const count = (used.get(base) || 0) + 1;
    used.set(base, count);
    return count === 1 ? base : `${base} (${count})`;
  });
}

function findBestHeaderRow(matrix) {
  let best = { index: 0, score: -1, mapping: {} };
  matrix.slice(0, 30).forEach((row, index) => {
    const headers = uniqueHeaders(row);
    const mapping = detectColumnMapping(headers);
    let score = Object.keys(mapping).length * 4;
    if (mapping.name !== undefined) score += 9;
    if (mapping.quantity !== undefined) score += 6;
    if (mapping.unit !== undefined) score += 5;
    if (mapping.materialRate !== undefined) score += 2;
    if (score > best.score) best = { index, score, mapping };
  });
  return best;
}

function valueAfterProjectLabel(row, cellIndex, cell) {
  const next = row.slice(cellIndex + 1).find((value) => cleanImportCell(value));
  if (next) return cleanImportCell(next);
  const text = cleanImportCell(cell);
  const separatorIndex = Math.max(text.indexOf(":"), text.indexOf("："));
  return separatorIndex >= 0 ? text.slice(separatorIndex + 1).trim() : "";
}

function detectProjectInfo(matrix) {
  const projectInfo = {};
  compactMatrix(matrix).slice(0, 60).forEach((row) => {
    row.forEach((cell, cellIndex) => {
      const normalizedCell = normalizeColumnName(cell.split(/[:：]/)[0]);
      Object.entries(IMPORT_PROJECT_FIELDS).forEach(([key, aliases]) => {
        if (projectInfo[key]) return;
        const matched = aliases.some((alias) => {
          const normalizedAlias = normalizeColumnName(alias);
          return normalizedCell === normalizedAlias || normalizedCell.startsWith(normalizedAlias);
        });
        if (matched) projectInfo[key] = valueAfterProjectLabel(row, cellIndex, cell);
      });
    });
  });
  if (projectInfo.buildingArea) projectInfo.buildingArea = parseLocaleNumber(projectInfo.buildingArea) ?? "";
  if (projectInfo.estimateDate && !/^\d{4}-\d{2}-\d{2}$/.test(projectInfo.estimateDate)) delete projectInfo.estimateDate;
  return projectInfo;
}

function createSourceTable(rows, sheetName = "ข้อมูล") {
  const matrix = compactMatrix(rows);
  if (!matrix.length) throw new Error("ไม่พบข้อมูลตารางในไฟล์นี้");
  const bestHeader = findBestHeaderRow(matrix);
  const headerIndex = bestHeader.score > 0 ? bestHeader.index : 0;
  const headers = uniqueHeaders(matrix[headerIndex] || []);
  const columnCount = headers.length;
  const dataRows = matrix.slice(headerIndex + 1)
    .map((row) => Array.from({ length: columnCount }, (_, index) => cleanImportCell(row[index])))
    .filter((row) => row.some(Boolean));
  return {
    name: sheetName,
    matrix,
    headerIndex,
    headers,
    dataRows,
    mapping: detectColumnMapping(headers),
    projectInfo: detectProjectInfo(matrix.slice(0, Math.max(headerIndex + 1, 20))),
    detectionScore: bestHeader.score,
  };
}

function externalProjectInfo(payload) {
  const source = payload?.project || payload?.projectInfo || payload?.metadata?.project || {};
  if (!source || typeof source !== "object" || Array.isArray(source)) return {};
  const output = {};
  const aliases = {
    name: ["name", "projectName", "project_name", "ชื่อโครงการ"],
    owner: ["owner", "client", "เจ้าของโครงการ"],
    location: ["location", "site", "สถานที่ก่อสร้าง"],
    drawingNo: ["drawingNo", "drawing_no", "เลขที่แบบ"],
    estimator: ["estimator", "preparedBy", "prepared_by", "ผู้ประมาณราคา"],
    estimateDate: ["estimateDate", "estimate_date", "date", "วันที่ประมาณราคา"],
    buildingArea: ["buildingArea", "building_area", "area", "พื้นที่อาคาร"],
  };
  Object.entries(aliases).forEach(([target, keys]) => {
    const key = keys.find((candidate) => source[candidate] !== undefined && source[candidate] !== null && source[candidate] !== "");
    if (key) output[target] = source[key];
  });
  if (output.buildingArea) output.buildingArea = parseLocaleNumber(output.buildingArea) ?? "";
  if (output.estimateDate && !/^\d{4}-\d{2}-\d{2}$/.test(String(output.estimateDate))) delete output.estimateDate;
  return output;
}

function findExternalRows(payload) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return null;
  const directKeys = ["items", "rows", "boqItems", "boq_items", "boq", "materials", "data", "details"];
  for (const key of directKeys) {
    if (Array.isArray(payload[key])) return payload[key];
    if (payload[key] && typeof payload[key] === "object") {
      const nested = findExternalRows(payload[key]);
      if (nested) return nested;
    }
  }
  return null;
}

function objectRowsToMatrix(rows) {
  if (!Array.isArray(rows) || !rows.length) return [];
  if (rows.every((row) => Array.isArray(row))) return rows;
  const objectRows = rows.filter((row) => row && typeof row === "object" && !Array.isArray(row));
  const headers = [];
  objectRows.slice(0, 200).forEach((row) => Object.keys(row).forEach((key) => {
    if (!headers.includes(key)) headers.push(key);
  }));
  return [headers, ...objectRows.map((row) => headers.map((key) => cleanImportCell(row[key])))];
}

function isCostPlannerBackup(payload) {
  return payload?.schemaVersion === SCHEMA_VERSION && Array.isArray(payload?.rows)
    && payload.rows.every((row) => row && typeof row === "object" && "sectionId" in row);
}

function mergeDetectedProjectInfo(...sources) {
  return sources.reduce((merged, source) => {
    Object.entries(source || {}).forEach(([key, value]) => {
      if (value !== "" && value !== null && value !== undefined && !merged[key]) merged[key] = value;
    });
    return merged;
  }, {});
}

function pdfTextItemsToLines(items, pageNumber) {
  const entries = items
    .filter((item) => typeof item?.str === "string" && item.str.trim())
    .map((item) => ({
      text: item.str.trim(),
      x: Number(item.transform?.[4]) || 0,
      y: Number(item.transform?.[5]) || 0,
      width: Math.max(0, Number(item.width) || 0),
      height: Math.max(1, Math.abs(Number(item.height) || Number(item.transform?.[3]) || 10)),
    }))
    .sort((a, b) => Math.abs(b.y - a.y) > 2.5 ? b.y - a.y : a.x - b.x);
  const groups = [];
  entries.forEach((entry) => {
    const line = groups.find((candidate) => Math.abs(candidate.y - entry.y) <= Math.max(2.5, entry.height * 0.25));
    if (line) line.items.push(entry);
    else groups.push({ y: entry.y, items: [entry] });
  });
  return groups
    .sort((a, b) => b.y - a.y)
    .map((line) => {
      const sorted = line.items.sort((a, b) => a.x - b.x);
      const cells = [];
      sorted.forEach((entry) => {
        const previous = cells[cells.length - 1];
        const gap = previous ? entry.x - previous.endX : Number.POSITIVE_INFINITY;
        const splitGap = Math.max(7, entry.height * 0.85);
        if (!previous || gap > splitGap) cells.push({ text: entry.text, endX: entry.x + entry.width });
        else {
          const separator = gap > 1.5 ? " " : "";
          previous.text += `${separator}${entry.text}`;
          previous.endX = Math.max(previous.endX, entry.x + entry.width);
        }
      });
      return { pageNumber, cells: cells.map((cell) => cleanImportCell(cell.text)).filter(Boolean) };
    })
    .filter((line) => line.cells.length);
}

function commonPdfUnit(value) {
  const unit = canonicalUnit(value);
  return unit && IMPORT_UNIT_KEYS.has(unit);
}

function parseCombinedPdfRow(text, currentSection) {
  const unitPattern = /(?:ลบ\.?\s*ม\.?|ตร\.?\s*ม\.?|กก\.?|กิโลกรัม|ตัน|เมตร|ม\.|แผ่น|เส้น|ท่อน|ถุง|ก้อน|ชุด|จุด|อัน|ใบ|ถัง|บ่อ|เครื่อง|งาน|lot)/i;
  const match = String(text).match(new RegExp(`^(.*?)\\s+(-?\\d[\\d,]*(?:\\.\\d+)?)\\s*(${unitPattern.source})\\s*(.*)$`, "i"));
  if (!match) return null;
  let leading = match[1].trim();
  const quantity = parseLocaleNumber(match[2]);
  const unit = match[3].trim();
  const tail = match[4].trim();
  const codeMatch = leading.match(/^([A-Za-zก-ฮ]?\d+(?:[.\/-]\d+)*)\s+(.+)$/);
  const code = codeMatch?.[1] || "";
  if (codeMatch) leading = codeMatch[2];
  if (!leading || quantity === null) return null;
  return [code, leading, "", quantity, unit, parseLocaleNumber(tail) ?? "", currentSection, tail];
}

function pdfLinesToTable(lines) {
  const rawMatrix = lines.map((line) => line.cells);
  try {
    const detected = createSourceTable(rawMatrix, "PDF");
    if (detected.mapping.name !== undefined && detected.mapping.quantity !== undefined && detected.mapping.unit !== undefined) {
      return { rows: rawMatrix, warning: "อ่านตารางจาก Text Layer ของ PDF โดยตรง" };
    }
  } catch {
    // Continue with the line-based fallback below.
  }

  const output = [["รหัส", "รายการ", "สเปก", "ปริมาณ", "หน่วย", "ราคาต่อหน่วย", "หมวดงาน", "ข้อความต้นฉบับ"]];
  let currentSection = "";
  lines.forEach((line) => {
    const cells = line.cells;
    const joined = cells.join(" ").replace(/\s+/g, " ").trim();
    const normalized = normalizeImportText(joined);
    if (!joined || /^(รายการ|ลำดับ|description|item)\b/i.test(normalized) || /^(รวม|subtotal|grand total)/i.test(normalized)) return;
    const hasNumber = cells.some((cell) => parseLocaleNumber(cell) !== null);
    if (!hasNumber && cells.length <= 3 && /งาน|หมวด|section|category/i.test(joined)) {
      currentSection = joined;
      return;
    }
    const unitIndex = cells.findIndex((cell) => commonPdfUnit(cell));
    if (unitIndex < 0) {
      const combined = parseCombinedPdfRow(joined, currentSection);
      if (combined) output.push(combined);
      return;
    }
    let quantityIndex = -1;
    for (let index = unitIndex - 1; index >= 0; index -= 1) {
      if (parseLocaleNumber(cells[index]) !== null) {
        quantityIndex = index;
        break;
      }
    }
    if (quantityIndex < 0 || quantityIndex === 0) return;
    const quantity = parseLocaleNumber(cells[quantityIndex]);
    let nameCells = cells.slice(0, quantityIndex);
    let code = "";
    if (/^[A-Za-zก-ฮ]?\d+(?:[.\/-]\d+)*$/.test(nameCells[0] || "")) code = nameCells.shift();
    const name = nameCells.join(" ").trim();
    if (!name || quantity === null) return;
    const afterUnit = cells.slice(unitIndex + 1);
    const sourceRate = afterUnit.map(parseLocaleNumber).find((value) => value !== null) ?? "";
    output.push([code, name, "", quantity, cells[unitIndex], sourceRate, currentSection, joined]);
  });
  return {
    rows: output,
    warning: output.length > 1
      ? "PDF ไม่มีโครงสร้างตารางที่ชัดเจน ระบบจึงแยกรายการจากตำแหน่งข้อความ กรุณาตรวจทุกแถว"
      : "อ่านข้อความจาก PDF ได้ แต่ยังแยกรายการ BOQ ไม่ได้ กรุณาใช้ Excel/CSV หรือปรับเอกสารต้นทาง",
  };
}

async function parsePdfClientSide(file) {
  let pdfjs;
  try {
    const [library, worker] = await Promise.all([
      import("pdfjs-dist"),
      import("pdfjs-dist/build/pdf.worker.min.mjs?url"),
    ]);
    pdfjs = library;
    if (pdfjs.GlobalWorkerOptions && worker?.default) pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  } catch (error) {
    throw new Error("ยังไม่พบ PDF.js สำหรับอ่าน PDF ใน Browser กรุณาติดตั้งด้วยคำสั่ง npm install pdfjs-dist แล้วลองใหม่");
  }
  const documentTask = pdfjs.getDocument({ data: await file.arrayBuffer() });
  const document = await documentTask.promise;
  const lines = [];
  let characterCount = 0;
  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const textContent = await page.getTextContent();
    characterCount += textContent.items.reduce((total, item) => total + String(item?.str || "").trim().length, 0);
    lines.push(...pdfTextItemsToLines(textContent.items, pageNumber));
  }
  if (characterCount < 20) {
    return {
      kind: "ocr-required",
      sourceType: "pdf-scan",
      message: "เอกสารนี้เป็น PDF สแกน จำเป็นต้องใช้ OCR",
      detail: "OCR ยังไม่รองรับในเวอร์ชันปัจจุบัน ไฟล์ไม่ได้ถูกนำเข้าและไม่มีการสร้างข้อมูลจำลอง",
      pageCount: document.numPages,
    };
  }
  const extracted = pdfLinesToTable(lines);
  return {
    kind: "table",
    sourceType: "pdf",
    sheets: [{ name: `PDF (${document.numPages} หน้า)`, rows: extracted.rows }],
    projectInfo: detectProjectInfo(lines.map((line) => line.cells)),
    warnings: [extracted.warning],
    pageCount: document.numPages,
  };
}

async function parseSpreadsheetClientSide(file) {
  let spreadsheet;
  try {
    const imported = await import("xlsx");
    spreadsheet = imported.default || imported;
  } catch {
    throw new Error("ยังไม่พบไลบรารี xlsx สำหรับอ่าน Excel ใน Browser กรุณาติดตั้งด้วยคำสั่ง npm install xlsx แล้วลองใหม่");
  }
  const workbook = spreadsheet.read(await file.arrayBuffer(), { type: "array", cellDates: true, raw: false });
  const sheets = workbook.SheetNames.map((name) => ({
    name,
    rows: spreadsheet.utils.sheet_to_json(workbook.Sheets[name], {
      header: 1,
      raw: false,
      defval: "",
      blankrows: false,
      dateNF: "yyyy-mm-dd",
    }),
  })).filter((sheet) => compactMatrix(sheet.rows).length);
  if (!sheets.length) throw new Error("ไม่พบข้อมูลใน Sheet ของไฟล์ Excel นี้");
  return { kind: "table", sourceType: "excel", sheets, projectInfo: {}, warnings: [] };
}

async function parseImportFile(file) {
  const extension = String(file.name || "").split(".").pop()?.toLowerCase() || "";
  if (extension === "json" || file.type === "application/json") {
    let payload;
    try {
      payload = JSON.parse(await file.text());
    } catch {
      throw new Error("JSON ไม่ถูกต้อง กรุณาตรวจวงเล็บ เครื่องหมายคำพูด และ comma ในไฟล์");
    }
    if (isCostPlannerBackup(payload)) return { kind: "backup", sourceType: "json-backup", payload };
    const rows = findExternalRows(payload);
    if (!rows?.length) throw new Error("ไม่พบ Array รายการ BOQ ใน JSON ภายนอก (รองรับ items, rows, boqItems, boq, materials หรือ data)");
    return {
      kind: "table",
      sourceType: "json-external",
      sheets: [{ name: "JSON", rows: objectRowsToMatrix(rows) }],
      projectInfo: externalProjectInfo(payload),
      warnings: [],
    };
  }
  if (["csv", "tsv"].includes(extension) || /csv|tab-separated-values/.test(file.type)) {
    const text = await file.text();
    const delimiter = extension === "tsv" ? "\t" : detectDelimiter(text);
    return {
      kind: "table",
      sourceType: extension === "tsv" ? "tsv" : "csv",
      sheets: [{ name: extension === "tsv" ? "TSV" : "CSV", rows: parseDelimitedText(text, delimiter) }],
      projectInfo: {},
      warnings: [],
    };
  }
  if (["xlsx", "xls"].includes(extension) || /spreadsheetml|ms-excel/.test(file.type)) return parseSpreadsheetClientSide(file);
  if (extension === "pdf" || file.type === "application/pdf") return parsePdfClientSide(file);
  if (["jpg", "jpeg", "png", "webp"].includes(extension) || file.type.startsWith("image/")) {
    return {
      kind: "ocr-required",
      sourceType: "image",
      message: "ไฟล์รูปภาพต้องใช้ OCR ซึ่งยังไม่เปิดใช้งานในเวอร์ชันนี้",
      detail: "ระบบจะแสดง Preview เท่านั้น และจะไม่เดารายการหรือราคาให้เอง",
      previewUrl: URL.createObjectURL(file),
    };
  }
  throw new Error("ไม่รองรับไฟล์ประเภทนี้ กรุณาใช้ JSON, CSV, TSV, XLSX, XLS, PDF, JPG, PNG หรือ WEBP");
}

function mappedCell(row, mapping, key) {
  const index = mapping?.[key];
  return index === undefined || index === null || index === "" ? "" : cleanImportCell(row[Number(index)]);
}

function previewRowErrors(item) {
  const errors = [];
  if (!item.name) errors.push("ไม่มีชื่อรายการ");
  if (item.quantity === null || item.quantity <= 0) errors.push("ปริมาณต้องมากกว่า 0");
  if (!item.unit) errors.push("ไม่มีหน่วย");
  return errors;
}

function isSummaryImportRow(name, unit, quantity) {
  const normalized = normalizeImportText(name);
  return /^(รวม|รวมทั้งสิ้น|ยอดรวม|subtotal|grand total|total)/i.test(normalized) && (!unit || quantity === null);
}

function buildImportPreview(table, mapping, fileName) {
  const previewRows = [];
  let skippedSummaryRows = 0;
  const rowsToRead = table.dataRows.slice(0, MAX_IMPORT_ROWS);
  rowsToRead.forEach((row, index) => {
    const item = {
      id: `import-preview-${index + 1}`,
      sourceRow: table.headerIndex + index + 2,
      code: mappedCell(row, mapping, "code"),
      name: mappedCell(row, mapping, "name"),
      spec: mappedCell(row, mapping, "spec"),
      quantity: parseLocaleNumber(mappedCell(row, mapping, "quantity")),
      unit: mappedCell(row, mapping, "unit"),
      sourceRate: parseLocaleNumber(mappedCell(row, mapping, "materialRate")),
      section: mappedCell(row, mapping, "section"),
      category: mappedCell(row, mapping, "category"),
      note: mappedCell(row, mapping, "note"),
      sourceFile: fileName,
    };
    if (!item.name && !item.quantity && !item.unit) return;
    if (isSummaryImportRow(item.name, item.unit, item.quantity)) {
      skippedSummaryRows += 1;
      return;
    }
    const { candidates, autoSelected } = findMaterialCandidates(item);
    item.candidates = candidates;
    item.selectedMaterialId = autoSelected ? materialId(autoSelected.material) : "";
    item.matchMethod = autoSelected ? "auto" : candidates.length ? "candidate" : "unmatched";
    item.errors = previewRowErrors(item);
    item.needsRematch = false;
    previewRows.push(item);
  });
  return {
    previewRows,
    skippedSummaryRows,
    truncated: table.dataRows.length > MAX_IMPORT_ROWS,
  };
}

function selectedPreviewMaterial(item) {
  return item.selectedMaterialId ? MATERIAL_BY_ID.get(String(item.selectedMaterialId)) || null : null;
}

function previewMatchStatus(item) {
  const selected = selectedPreviewMaterial(item);
  if (selected) return convertedOfficialPrice(selected, item.unit) !== null ? "matched" : "unit-mismatch";
  return item.candidates?.length ? "candidate" : "unmatched";
}

function rematchPreviewItem(item) {
  const { candidates, autoSelected } = findMaterialCandidates(item);
  return {
    ...item,
    candidates,
    selectedMaterialId: autoSelected ? materialId(autoSelected.material) : "",
    matchMethod: autoSelected ? "auto" : candidates.length ? "candidate" : "unmatched",
    errors: previewRowErrors(item),
    needsRematch: false,
  };
}

function sectionIdForImportedItem(item) {
  const text = normalizeImportText(`${item.section || ""} ${item.category || ""} ${item.name || ""}`);
  const direct = SECTION_DEFINITIONS.find((section) => {
    const title = normalizeImportText(section.title.replace(/^งาน/, ""));
    return title && (text.includes(title) || normalizeImportText(item.section) === normalizeImportText(section.code));
  });
  if (direct) return direct.id;
  const rules = [
    ["earthwork", /ดิน|ทรายถม|หินคลุก|ขุด|ถม/],
    ["foundation", /เสาเข็ม|ฐานราก|หัวเข็ม/],
    ["concrete_formwork", /คอนกรีต|ปูนซีเมนต์|แบบหล่อ/],
    ["rebar", /เหล็กเส้น|เหล็กข้ออ้อย|ไวร์เมช|ลวดผูก/],
    ["structural_steel", /เหล็กรูปพรรณ|เหล็กกล่อง|เหล็กตัวซี|ลวดเชื่อม/],
    ["roof", /หลังคา|ครอบ|รางน้ำ|เมทัลชีท/],
    ["wall", /อิฐ|ผนัง|ปูนฉาบ|บล็อก/],
    ["ceiling", /ฝ้า|ยิปซัม/],
    ["finish", /กระเบื้อง|พื้น|หินอ่อน|ลามิเนต/],
    ["sanitary_fixture", /สุขภัณฑ์|โถสุขภัณฑ์|อ่างล้าง/],
    ["opening", /ประตู|หน้าต่าง|กระจก|วงกบ/],
    ["paint", /สีทา|สีรองพื้น|น้ำยารองพื้น/],
    ["electrical", /ไฟฟ้า|สายไฟ|สวิตช์|ปลั๊ก|โคมไฟ|เบรกเกอร์/],
    ["plumbing", /ประปา|ท่อน้ำ|วาล์ว|ก๊อก/],
    ["sanitary_drainage", /ระบายน้ำ|สุขาภิบาล|บ่อพัก|ถังบำบัด/],
  ];
  return rules.find(([, pattern]) => pattern.test(text))?.[0] || "architectural_other";
}

function buildPlannerRowsFromPreview(previewRows, fileName) {
  const timestamp = Date.now();
  const sectionCounts = new Map();
  const usedCodes = new Set();
  return previewRows.filter((item) => !previewRowErrors(item).length).map((item, index) => {
    const sectionId = sectionIdForImportedItem(item);
    const section = SECTION_DEFINITIONS.find((entry) => entry.id === sectionId) || SECTION_DEFINITIONS[0];
    const count = (sectionCounts.get(sectionId) || 0) + 1;
    sectionCounts.set(sectionId, count);
    let code = item.code || `${section.code}${String(count).padStart(2, "0")}`;
    if (usedCodes.has(code)) code = `${code}-${count}`;
    usedCodes.add(code);
    const selectedMaterial = selectedPreviewMaterial(item);
    const sourceRateNote = item.sourceRate !== null && item.sourceRate !== undefined
      ? `ราคาในไฟล์ต้นทาง ${formatPrice(item.sourceRate)} บาท/${item.unit} เก็บไว้เพื่ออ้างอิงเท่านั้น ระบบใช้ราคาจาก data.js เมื่อจับคู่วัสดุสำเร็จ`
      : "";
    return {
      id: `import-${timestamp}-${index + 1}`,
      sectionId,
      code,
      name: item.name,
      spec: item.spec || "",
      unit: item.unit,
      quantity: item.quantity,
      costTypes: { material: true, labor: false, equipment: false },
      wastePct: 0,
      keywords: materialTokens(`${item.name} ${item.spec}`).slice(0, 12),
      materialId: selectedMaterial ? materialId(selectedMaterial) : "",
      materialRate: "",
      futureMaterialRate: "",
      laborRate: "",
      equipmentRate: "",
      note: [item.note, sourceRateNote, `นำเข้าจาก ${fileName}`].filter(Boolean).join(" • "),
    };
  });
}

function normalizeUnit(unit = "") {
  return String(unit).replace(/บาท\s*\//g, "").replace(/บาทต่อ/g, "").replace(/\s/g, "").toLowerCase();
}

function canonicalUnit(unit = "") {
  const value = normalizeUnit(unit).replace(/[()]/g, "");
  if (/^\d+/.test(value)) return value.replace(/\./g, "");
  if (value.includes("ลูกบาศก์เมตร") || value.includes("ลบ.ม") || value.includes("m3") || value.includes("ม³")) return "m3";
  if (value.includes("ตารางเมตร") || value.includes("ตร.ม") || value.includes("m2") || value.includes("ม²")) return "m2";
  if (value.includes("กิโลกรัม") || value.includes("กก") || value.includes("kg")) return "kg";
  if (value.includes("เมตริกตัน") || value === "ตัน") return "ton";
  if (value.includes("แกลลอน")) return "gallon";
  if (value.includes("ลิตร")) return "litre";
  if (value.includes("แผ่น")) return "sheet";
  if (value.includes("ถุง")) return "bag";
  if (value.includes("เส้น")) return "bar";
  if (value.includes("ท่อน")) return "piece";
  if (value.includes("เมตร") || value === "ม." || value === "ม" || value === "m") return "m";
  if (value.includes("ชุด") || value === "set") return "ชุด";
  if (value.includes("จุด")) return "จุด";
  if (value.includes("ต้น")) return "ต้น";
  if (value.includes("อัน")) return "อัน";
  if (value.includes("ใบ")) return "ใบ";
  if (value.includes("เครื่อง")) return "เครื่อง";
  if (value.includes("ถัง")) return "ถัง";
  if (value.includes("บ่อ")) return "บ่อ";
  if (value.includes("lot")) return "lot";
  if (value.includes("งาน")) return "งาน";
  return value.replace(/\./g, "");
}

function materialId(material) {
  return String(material?.id ?? material?.code ?? material?.material_id ?? material?.name ?? material?.material_name ?? "");
}

function materialName(material) {
  return String(material?.name ?? material?.material_name ?? material?.title ?? "ไม่ระบุชื่อวัสดุ");
}

function materialUnit(material) {
  return String(material?.unit ?? material?.price_unit ?? material?.unit_name ?? "");
}

function materialPrice(material) {
  return number(material?.price ?? material?.currentPrice ?? material?.current_price ?? material?.latestPrice ?? material?.latest_price);
}

function convertedOfficialPrice(material, targetUnit) {
  const source = canonicalUnit(materialUnit(material));
  const target = canonicalUnit(targetUnit);
  const officialPrice = materialPrice(material);
  if (!officialPrice || !source || !target) return null;
  if (source === target) return officialPrice;
  if (source === "ton" && target === "kg") return officialPrice / 1000;
  if (source === "kg" && target === "ton") return officialPrice * 1000;
  return null;
}

function materialMatchScore(row, material) {
  const haystack = materialName(material).toLowerCase();
  const stopWords = new Set(["งาน", "วัสดุ", "พร้อม", "และ", "ระบบ", "ชนิด", "ทั่วไป", "อื่นๆ", "ระบุ", "ติดตั้ง"]);
  const terms = [...(row.keywords || []), row.name, row.spec]
    .flatMap((value) => String(value || "").toLowerCase().split(/[\s/(),]+/))
    .filter((value) => value.length >= 2 && !stopWords.has(value));
  return [...new Set(terms)].reduce((score, term) => score + (haystack.includes(term) ? Math.min(term.length, 12) : 0), 0);
}

const MATERIAL_BY_ID = new Map(materials.map((material) => [materialId(material), material]));
const MATERIALS_BY_UNIT = materials.reduce((index, material) => {
  const unit = canonicalUnit(materialUnit(material));
  if (!index.has(unit)) index.set(unit, []);
  index.get(unit).push(material);
  return index;
}, new Map());

function compatibleMaterialsForUnit(unit) {
  const target = canonicalUnit(unit);
  const keys = target === "kg" ? ["kg", "ton"] : target === "ton" ? ["ton", "kg"] : [target];
  return keys.flatMap((key) => MATERIALS_BY_UNIT.get(key) || []);
}

function materialTokens(value) {
  return normalizeImportText(value)
    .split(/\s+/)
    .filter((token) => token.length >= 2 && !IMPORT_STOP_WORDS.has(token));
}

function numericSpecs(value) {
  return [...normalizeImportText(value).matchAll(/\d+(?:\.\d+)?/g)].map((match) => match[0]);
}

const MATERIAL_MATCH_INDEX = materials.map((material) => {
  const name = materialName(material);
  const category = String(material?.category || "");
  const joined = `${materialId(material)} ${name} ${category}`;
  return {
    material,
    text: normalizeImportText(joined),
    nameText: normalizeImportText(name),
    categoryText: normalizeImportText(category),
    tokens: new Set(materialTokens(joined)),
    specs: new Set(numericSpecs(name)),
    unit: canonicalUnit(materialUnit(material)),
  };
});

function unitCompatibilityScore(sourceUnit, material) {
  const source = canonicalUnit(sourceUnit);
  const target = canonicalUnit(materialUnit(material));
  if (!source || !target) return 0.25;
  if (source === target) return 1;
  if ((source === "kg" && target === "ton") || (source === "ton" && target === "kg")) return 0.9;
  return 0;
}

function categorySimilarity(sourceCategory, indexedMaterial) {
  const queryTokens = materialTokens(sourceCategory);
  if (!queryTokens.length) return 0.5;
  const matched = queryTokens.filter((token) => indexedMaterial.categoryText.includes(token)).length;
  return matched / queryTokens.length;
}

function scoreMaterialCandidate(item, indexedMaterial) {
  const queryName = `${item.name || ""} ${item.spec || ""}`.trim();
  const queryText = normalizeImportText(queryName);
  const queryTokens = [...new Set(materialTokens(queryName))];
  if (!queryTokens.length) return null;

  let matchedWeight = 0;
  let totalWeight = 0;
  queryTokens.forEach((token) => {
    const weight = Math.min(12, Math.max(2, token.length));
    totalWeight += weight;
    if (indexedMaterial.tokens.has(token)) matchedWeight += weight;
    else if (indexedMaterial.text.includes(token)) matchedWeight += weight * 0.72;
  });
  const tokenScore = totalWeight ? matchedWeight / totalWeight : 0;
  const phraseScore = queryText.length >= 4 && indexedMaterial.nameText.includes(queryText) ? 1 : 0;
  const querySpecs = [...new Set(numericSpecs(queryName))];
  const matchedSpecs = querySpecs.filter((spec) => indexedMaterial.specs.has(spec)).length;
  const specScore = querySpecs.length ? matchedSpecs / querySpecs.length : 0.5;
  const unitScore = unitCompatibilityScore(item.unit, indexedMaterial.material);
  const categoryScore = categorySimilarity(`${item.category || ""} ${item.section || ""}`, indexedMaterial);
  const idExact = normalizeImportText(item.code) && normalizeImportText(item.code) === normalizeImportText(materialId(indexedMaterial.material));
  let score = tokenScore * 0.56 + specScore * 0.2 + unitScore * 0.14 + categoryScore * 0.06 + phraseScore * 0.04;
  if (idExact) score = 1;
  if (querySpecs.length && matchedSpecs === 0 && indexedMaterial.specs.size) score *= 0.7;
  if (!tokenScore) score *= 0.35;
  return {
    material: indexedMaterial.material,
    score: Math.max(0, Math.min(1, score)),
    unitScore,
    tokenScore,
    specScore,
    reasons: [
      tokenScore >= 0.75 ? "ชื่อใกล้เคียง" : tokenScore >= 0.4 ? "มีคำสำคัญตรงกัน" : "",
      querySpecs.length && specScore === 1 ? "สเปกตรง" : "",
      unitScore >= 0.9 ? "หน่วยรองรับ" : "",
      categoryScore >= 0.8 && categoryScore !== 0.5 ? "หมวดตรงกัน" : "",
    ].filter(Boolean),
  };
}

function findMaterialCandidates(item, limit = 5) {
  const ranked = MATERIAL_MATCH_INDEX
    .map((indexedMaterial) => scoreMaterialCandidate(item, indexedMaterial))
    .filter((candidate) => candidate && candidate.score >= 0.24)
    .sort((a, b) => b.score - a.score || b.unitScore - a.unitScore || materialName(a.material).localeCompare(materialName(b.material), "th"))
    .slice(0, limit);
  const best = ranked[0] || null;
  const runnerUp = ranked[1] || null;
  const gap = best ? best.score - (runnerUp?.score || 0) : 0;
  const autoSelected = best && best.unitScore >= 0.9 && best.score >= 0.78
    && (gap >= 0.08 || best.score >= 0.94)
    ? best
    : null;
  return { candidates: ranked, autoSelected };
}

function materialOptionsFor(row, query = "") {
  const searchTerms = String(query).trim().toLowerCase().split(/\s+/).filter(Boolean);
  const compatible = compatibleMaterialsForUnit(row.unit)
    .filter((material) => !searchTerms.length || searchTerms.every((term) => [materialId(material), materialName(material), material?.category].some((value) => String(value ?? "").toLowerCase().includes(term))))
    .map((material) => ({ material, score: materialMatchScore(row, material) }))
    .sort((a, b) => b.score - a.score || materialName(a.material).localeCompare(materialName(b.material), "th"))
    .map((entry) => entry.material);
  const selectedCandidate = row.materialId ? MATERIAL_BY_ID.get(String(row.materialId)) : null;
  const selected = selectedCandidate && convertedOfficialPrice(selectedCandidate, row.unit) !== null ? selectedCandidate : null;
  const shortlist = compatible.slice(0, 50);
  return selected && !shortlist.includes(selected) ? [selected, ...shortlist.slice(0, 49)] : shortlist;
}

function catalogForRow(row) {
  const material = row.materialId ? MATERIAL_BY_ID.get(String(row.materialId)) : null;
  if (material && convertedOfficialPrice(material, row.unit) === null) return null;
  if (!material) return null;
  return {
    material,
    price: convertedOfficialPrice(material, row.unit),
    originalPrice: materialPrice(material),
    originalUnit: materialUnit(material),
    selected: true,
  };
}

function modelForecastPrice(material, months) {
  if (!material || months <= 0) return months <= 0 ? materialPrice(material) : null;
  const series = material.forecasts ?? material.predictions ?? material.forecast;
  if (Array.isArray(series)) {
    const exact = series.find((entry) => number(entry?.months ?? entry?.horizonMonths ?? entry?.horizon_months) === months);
    const price = exact?.price ?? exact?.predictedPrice ?? exact?.predicted_price ?? exact?.value;
    return price === undefined || price === null ? null : number(price);
  }
  if (series && typeof series === "object") {
    const value = series[months] ?? series[String(months)];
    const price = typeof value === "object" ? value?.price ?? value?.predictedPrice ?? value?.predicted_price ?? value?.value : value;
    return price === undefined || price === null ? null : number(price);
  }
  return null;
}

function convertedModelForecastPrice(material, targetUnit, months) {
  const price = modelForecastPrice(material, months);
  if (price === null) return null;
  const source = canonicalUnit(materialUnit(material));
  const target = canonicalUnit(targetUnit);
  if (source === target) return price;
  if (source === "ton" && target === "kg") return price / 1000;
  if (source === "kg" && target === "ton") return price * 1000;
  return null;
}

function calculateRow(row, forecastMonths) {
  const rawQuantity = row.quantity;
  const rawMaterialRate = row.materialRate;
  const rawFutureMaterialRate = row.futureMaterialRate;
  const rawLaborRate = row.laborRate;
  const rawEquipmentRate = row.equipmentRate;
  const quantity = number(row.quantity);
  const catalog = row.costTypes.material ? catalogForRow(row) : null;
  const hasManualMaterialRate = row.materialRate !== "" && row.materialRate !== null && row.materialRate !== undefined;
  const currentMaterialRate = row.costTypes.material ? hasManualMaterialRate ? number(row.materialRate) : (catalog?.price ?? 0) : 0;
  const materialQty = quantity * (1 + number(row.wastePct) / 100);
  const laborRate = row.costTypes.labor ? number(row.laborRate) : 0;
  const equipmentRate = row.costTypes.equipment ? number(row.equipmentRate) : 0;
  const materialTotal = materialQty * currentMaterialRate;
  const laborTotal = quantity * laborRate;
  const equipmentTotal = quantity * equipmentRate;
  const currentTotal = materialTotal + laborTotal + equipmentTotal;
  const hasFutureOverride = row.futureMaterialRate !== "" && row.futureMaterialRate !== null && row.futureMaterialRate !== undefined;
  const modelRate = row.costTypes.material && forecastMonths > 0 ? convertedModelForecastPrice(catalog?.material, row.unit, forecastMonths) : currentMaterialRate;
  const futureMaterialRate = row.costTypes.material ? hasFutureOverride ? number(row.futureMaterialRate) : modelRate : 0;
  const missingCurrent = [];
  if (quantity > 0 && row.costTypes.material && currentMaterialRate <= 0) missingCurrent.push("ราคาวัสดุ");
  if (quantity > 0 && row.costTypes.labor && laborRate <= 0) missingCurrent.push("ค่าแรง");
  if (quantity > 0 && row.costTypes.equipment && equipmentRate <= 0) missingCurrent.push("เครื่องจักร/ขนส่ง");
  const futureMaterialMissing = quantity > 0 && forecastMonths > 0 && row.costTypes.material && (!futureMaterialRate || futureMaterialRate <= 0);
  const missingFuture = [];
  if (futureMaterialMissing) missingFuture.push("ราคาวัสดุอนาคต");
  if (quantity > 0 && row.costTypes.labor && laborRate <= 0) missingFuture.push("ค่าแรง");
  if (quantity > 0 && row.costTypes.equipment && equipmentRate <= 0) missingFuture.push("เครื่องจักร/ขนส่ง");
  const futureTotal = missingFuture.length ? null : materialQty * number(futureMaterialRate) + laborTotal + equipmentTotal;
  return {
    ...row,
    rawQuantity,
    rawMaterialRate,
    rawFutureMaterialRate,
    rawLaborRate,
    rawEquipmentRate,
    quantity,
    materialQty,
    catalog,
    currentMaterialRate,
    futureMaterialRate,
    materialTotal,
    laborRate,
    laborTotal,
    equipmentRate,
    equipmentTotal,
    currentTotal,
    futureTotal,
    missingCurrent,
    missingFuture,
    currentComplete: missingCurrent.length === 0,
    futureComplete: missingFuture.length === 0,
    currentSource: hasManualMaterialRate ? "ผู้ใช้กำหนด/ใบเสนอราคา" : catalog ? "ราคากลางวัสดุภาครัฐ" : row.costTypes.material ? "ยังไม่ระบุ" : "ไม่มีค่าวัสดุ",
    futureSource: !row.costTypes.material ? "ไม่มีค่าวัสดุ" : hasFutureOverride ? "ผู้ใช้กำหนด" : modelRate ? "ML จากข้อมูลราคาวัสดุ" : "รอข้อมูล ML",
  };
}

function applyMarkup(base, rates) {
  const overhead = base * (number(rates.overhead) / 100);
  const profit = (base + overhead) * (number(rates.profit) / 100);
  const contingency = (base + overhead + profit) * (number(rates.contingency) / 100);
  const beforeVat = base + overhead + profit + contingency;
  const vat = beforeVat * (number(rates.vat) / 100);
  return { base, overhead, profit, contingency, beforeVat, vat, grandTotal: beforeVat + vat };
}

function loadDraft() {
  if (typeof window === "undefined") return null;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(DRAFT_STORAGE_KEY) || "null");
    return parsed?.schemaVersion === SCHEMA_VERSION && Array.isArray(parsed.rows) ? parsed : null;
  } catch {
    return null;
  }
}

function sectionFor(row) {
  return SECTION_DEFINITIONS.find((section) => section.id === row.sectionId);
}

function safeFileName(value) {
  return String(value || "boq").trim().replace(/[^a-zA-Z0-9ก-๙_-]+/g, "-").replace(/^-+|-+$/g, "") || "boq";
}

export default function CostPlanner() {
  const [initialDraft] = useState(loadDraft);
  const [selectedTemplate, setSelectedTemplate] = useState(initialDraft?.selectedTemplate || "house_spread");
  const [rows, setRows] = useState(() => initialDraft?.rows || hydrateTemplate("house_spread"));
  const [project, setProject] = useState({ ...EMPTY_PROJECT, ...(initialDraft?.project || {}) });
  const [priceMode, setPriceMode] = useState(initialDraft?.priceMode === "future" ? "future" : "current");
  const [forecastValue, setForecastValue] = useState(initialDraft?.forecastValue ?? 1);
  const [forecastUnit, setForecastUnit] = useState(initialDraft?.forecastUnit || "year");
  const [rates, setRates] = useState({ ...DEFAULT_RATES, ...(initialDraft?.rates || {}) });
  const [searchText, setSearchText] = useState("");
  const [rowFilter, setRowFilter] = useState("all");
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [collapsedSections, setCollapsedSections] = useState(
    new Set(SECTION_DEFINITIONS.slice(1).map((section) => section.id))
  );
  const [savedAt, setSavedAt] = useState(initialDraft?.savedAt || "");
  const [saveStatus, setSaveStatus] = useState(initialDraft?.savedAt ? "saved" : "idle");
  const [importSession, setImportSession] = useState(null);
  const [importDragging, setImportDragging] = useState(false);
  const [importNotice, setImportNotice] = useState(null);
  const importRef = useRef(null);
  const summaryRef = useRef(null);
  const [summaryInView, setSummaryInView] = useState(false);
  const initialTracking = useRef(true);

  useEffect(() => {
    if (initialTracking.current) {
      initialTracking.current = false;
      return;
    }
    setSaveStatus("unsaved");
  }, [rows, project, priceMode, forecastValue, forecastUnit, rates, selectedTemplate]);

  useEffect(() => {
    const node = summaryRef.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => setSummaryInView(entry.isIntersecting));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const requestedForecastMonths = Math.max(
    1,
    Math.round(number(forecastValue) * (forecastUnit === "year" ? 12 : 1))
  );
  const forecastMonths = priceMode === "future" ? requestedForecastMonths : 0;
  const forecastLabel = formatForecastPeriod(forecastMonths);
  const targetDateLabel = forecastDate(forecastMonths);
  const todayLabel = new Date().toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" });
  const selectedPriceLabel = priceMode === "future" ? `ราคาคาดการณ์ในอีก ${forecastLabel}` : "ราคาปัจจุบัน";
  const selectedDateLabel = priceMode === "future" ? targetDateLabel : todayLabel;

  const calculatedRows = useMemo(
    () => rows.map((row) => calculateRow(row, forecastMonths)),
    [rows, forecastMonths]
  );
  const activeRows = calculatedRows.filter((row) => row.quantity > 0);
  const currentComplete = activeRows.length > 0 && activeRows.every((row) => row.currentComplete);
  const futureComplete = activeRows.length > 0 && activeRows.every((row) => row.futureComplete);
  const currentDirect = activeRows.reduce((sum, row) => sum + row.currentTotal, 0);
  const futureDirect = futureComplete
    ? activeRows.reduce((sum, row) => sum + number(row.futureTotal), 0)
    : null;
  const currentSummary = applyMarkup(currentDirect, rates);
  const futureSummary = futureDirect === null ? null : applyMarkup(futureDirect, rates);
  const selectedSummary = priceMode === "future" ? futureSummary : currentSummary;
  const selectedDirect = priceMode === "future" ? futureDirect : currentDirect;
  const selectedComplete = priceMode === "future" ? futureComplete : currentComplete;
  const difference = futureSummary && currentComplete ? futureSummary.grandTotal - currentSummary.grandTotal : null;
  const differencePercent = difference !== null && currentSummary.grandTotal > 0
    ? difference / currentSummary.grandTotal * 100
    : null;
  const missingCurrentRows = activeRows.filter((row) => !row.currentComplete);
  const missingFutureRows = activeRows.filter((row) => !row.futureComplete);

  const totalsByType = useMemo(() => ({
    material: activeRows.reduce((sum, row) => sum + (priceMode === "future"
      ? row.materialQty * number(row.futureMaterialRate)
      : row.materialTotal), 0),
    labor: activeRows.reduce((sum, row) => sum + row.laborTotal, 0),
    equipment: activeRows.reduce((sum, row) => sum + row.equipmentTotal, 0),
  }), [activeRows, priceMode]);

  const visibleRows = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    return calculatedRows.filter((row) => {
      const matchesQuery = !query || [row.code, row.name, row.spec, row.note]
        .some((value) => String(value || "").toLowerCase().includes(query));
      const matchesFilter = rowFilter === "all"
        || (rowFilter === "active" && row.quantity > 0)
        || (rowFilter === "missing" && row.quantity > 0 && (priceMode === "future" ? !row.futureComplete : !row.currentComplete));
      return matchesQuery && matchesFilter;
    });
  }, [calculatedRows, searchText, rowFilter, priceMode]);

  const updateRow = (id, patch) => {
    setRows((current) => current.map((row) => row.id === id
      ? { ...row, ...(typeof patch === "function" ? patch(row) : patch) }
      : row));
  };

  const updateNumericRow = (id, key, value) => updateRow(id, { [key]: optionalNumber(value) });

  const addRow = (section) => {
    const sectionCount = rows.filter((row) => row.sectionId === section.id).length;
    const row = createCustomRow(section, sectionCount);
    setRows((current) => [...current, row]);
    setExpandedRows((current) => new Set([...current, row.id]));
    setCollapsedSections((current) => {
      const next = new Set(current);
      next.delete(section.id);
      return next;
    });
    window.requestAnimationFrame(() => document.getElementById(`boq-row-${row.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }));
  };

  const duplicateRow = (id) => {
    setRows((current) => {
      const index = current.findIndex((row) => row.id === id);
      if (index < 0) return current;
      const source = current[index];
      const duplicate = {
        ...source,
        id: `copy-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        code: `${source.code}-2`,
        name: `${source.name} (สำเนา)`,
        quantity: "",
      };
      const next = [...current];
      next.splice(index + 1, 0, duplicate);
      window.requestAnimationFrame(() => document.getElementById(`boq-row-${duplicate.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }));
      setExpandedRows((expanded) => new Set([...expanded, duplicate.id]));
      return next;
    });
  };

  const deleteRow = (id) => {
    const target = rows.find((row) => row.id === id);
    if (!target || !window.confirm(`ลบรายการ “${target.name}” ออกจาก BOQ ใช่หรือไม่?`)) return;
    setRows((current) => current.filter((row) => row.id !== id));
    setExpandedRows((current) => {
      const next = new Set(current);
      next.delete(id);
      return next;
    });
  };

  const moveRow = (id, direction) => {
    setRows((current) => {
      const index = current.findIndex((row) => row.id === id);
      if (index < 0) return current;
      const sectionId = current[index].sectionId;
      const sectionIndexes = current.map((row, rowIndex) => row.sectionId === sectionId ? rowIndex : -1).filter((rowIndex) => rowIndex >= 0);
      const position = sectionIndexes.indexOf(index);
      const targetPosition = position + direction;
      if (targetPosition < 0 || targetPosition >= sectionIndexes.length) return current;
      const targetIndex = sectionIndexes[targetPosition];
      const next = [...current];
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return next;
    });
  };

  const toggleExpanded = (id) => setExpandedRows((current) => {
    const next = new Set(current);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const toggleSection = (id) => setCollapsedSections((current) => {
    const next = new Set(current);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const scrollToSection = (id) => {
    setCollapsedSections((current) => {
      const next = new Set(current);
      next.delete(id);
      return next;
    });
    window.requestAnimationFrame(() => document.getElementById(`boq-section-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  const applyTemplate = () => {
    const template = TEMPLATE_DEFINITIONS.find((entry) => entry.id === selectedTemplate);
    if (!template) return;
    const hasEnteredData = rows.some((row) => number(row.quantity) > 0 || row.materialRate !== "" || row.laborRate !== "" || row.equipmentRate !== "");
    if (hasEnteredData && !window.confirm("การใช้แม่แบบใหม่จะแทนที่รายการ BOQ ปัจจุบัน ควรสำรอง JSON ก่อน ดำเนินการต่อหรือไม่?")) return;
    setRows(hydrateTemplate(template.id));
    setExpandedRows(new Set());
    setCollapsedSections(new Set(SECTION_DEFINITIONS.slice(1).map((section) => section.id)));
    if (template.id === "commercial") {
      setProject((current) => ({ ...current, name: current.name === "บ้านพักอาศัย" ? "อาคารพาณิชย์" : current.name }));
    }
  };

  const draftPayload = (nextSavedAt = savedAt) => ({
    schemaVersion: SCHEMA_VERSION,
    selectedTemplate,
    rows,
    project,
    priceMode,
    forecastValue,
    forecastUnit,
    rates,
    savedAt: nextSavedAt,
  });

  const saveDraft = () => {
    try {
      const nextSavedAt = new Date().toISOString();
      const payload = JSON.stringify(draftPayload(nextSavedAt));
      window.localStorage.setItem(DRAFT_STORAGE_KEY, payload);
      if (window.localStorage.getItem(DRAFT_STORAGE_KEY) !== payload) throw new Error("verify failed");
      setSavedAt(nextSavedAt);
      setSaveStatus("saved");
    } catch {
      setSaveStatus("error");
    }
  };

  const exportDraft = () => {
    downloadText(
      `${safeFileName(project.name)}-boq-draft.json`,
      JSON.stringify(draftPayload(new Date().toISOString()), null, 2),
      "application/json;charset=utf-8"
    );
  };

  const closeImportDialog = () => {
    if (importSession?.previewUrl) URL.revokeObjectURL(importSession.previewUrl);
    setImportSession(null);
    setImportDragging(false);
  };

  const openImportFile = async (file) => {
    if (!file) return;
    if (importSession?.previewUrl) URL.revokeObjectURL(importSession.previewUrl);
    const sessionId = `import-session-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setImportNotice(null);
    setImportSession({
      id: sessionId,
      stage: "reading",
      fileName: file.name,
      fileSize: file.size,
      sourceType: "",
      importMode: "replace",
      applyProjectInfo: true,
    });
    try {
      const parsed = await parseImportFile(file);
      if (parsed.kind === "backup") {
        setImportSession((current) => current?.id === sessionId ? {
          ...current,
          stage: "backup",
          sourceType: parsed.sourceType,
          backupPayload: parsed.payload,
        } : current);
        return;
      }
      if (parsed.kind === "ocr-required") {
        setImportSession((current) => current?.id === sessionId ? {
          ...current,
          stage: "ocr-required",
          sourceType: parsed.sourceType,
          message: parsed.message,
          detail: parsed.detail,
          previewUrl: parsed.previewUrl,
          pageCount: parsed.pageCount,
        } : current);
        return;
      }
      const tables = parsed.sheets.map((sheet) => {
        try {
          return createSourceTable(sheet.rows, sheet.name);
        } catch {
          return null;
        }
      }).filter(Boolean);
      if (!tables.length) throw new Error("ไม่พบ Sheet หรือตารางที่สามารถอ่านได้");
      let selectedSheetIndex = 0;
      tables.forEach((table, index) => {
        const currentScore = tables[selectedSheetIndex].detectionScore + Object.keys(tables[selectedSheetIndex].mapping).length * 5;
        const candidateScore = table.detectionScore + Object.keys(table.mapping).length * 5;
        if (candidateScore > currentScore) selectedSheetIndex = index;
      });
      const table = tables[selectedSheetIndex];
      setImportSession((current) => current?.id === sessionId ? {
        ...current,
        stage: "mapping",
        sourceType: parsed.sourceType,
        tables,
        selectedSheetIndex,
        table,
        mapping: table.mapping,
        baseProjectInfo: parsed.projectInfo || {},
        projectInfo: mergeDetectedProjectInfo(parsed.projectInfo, table.projectInfo),
        warnings: parsed.warnings || [],
        pageCount: parsed.pageCount,
      } : current);
    } catch (error) {
      setImportSession((current) => current?.id === sessionId ? {
        ...current,
        stage: "error",
        error: error?.message || "ไม่สามารถอ่านไฟล์นี้ได้",
      } : current);
    }
  };

  const handleImportInput = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) openImportFile(file);
  };

  const selectImportSheet = (index) => {
    setImportSession((current) => {
      const table = current?.tables?.[index];
      if (!table) return current;
      return {
        ...current,
        stage: "mapping",
        selectedSheetIndex: index,
        table,
        mapping: table.mapping,
        projectInfo: mergeDetectedProjectInfo(current.baseProjectInfo, table.projectInfo),
        previewRows: undefined,
      };
    });
  };

  const updateImportMapping = (field, value) => {
    setImportSession((current) => ({
      ...current,
      mapping: {
        ...current.mapping,
        [field]: value === "" ? undefined : Number(value),
      },
    }));
  };

  const createImportPreview = async () => {
    const snapshot = importSession;
    if (!snapshot?.table) return;
    const missingRequired = IMPORT_COLUMN_FIELDS
      .filter((field) => field.required && snapshot.mapping?.[field.key] === undefined)
      .map((field) => field.label);
    if (missingRequired.length) {
      setImportSession((current) => ({ ...current, mappingError: `กรุณาเลือกคอลัมน์: ${missingRequired.join(", ")}` }));
      return;
    }
    setImportSession((current) => ({ ...current, stage: "matching", mappingError: "" }));
    await new Promise((resolve) => window.setTimeout(resolve, 20));
    const result = buildImportPreview(snapshot.table, snapshot.mapping, snapshot.fileName);
    setImportSession((current) => current?.id === snapshot.id ? {
      ...current,
      stage: "preview",
      previewRows: result.previewRows,
      skippedSummaryRows: result.skippedSummaryRows,
      truncated: result.truncated,
    } : current);
  };

  const updateImportPreviewRow = (id, patch) => {
    const matchingFields = ["name", "spec", "unit", "section", "category"];
    const needsRematch = matchingFields.some((key) => Object.prototype.hasOwnProperty.call(patch, key));
    setImportSession((current) => ({
      ...current,
      previewRows: current.previewRows.map((item) => {
        if (item.id !== id) return item;
        const next = { ...item, ...patch };
        next.errors = previewRowErrors(next);
        if (needsRematch) next.needsRematch = true;
        return next;
      }),
    }));
  };

  const chooseImportMaterial = (id, material) => {
    setImportSession((current) => ({
      ...current,
      previewRows: current.previewRows.map((item) => item.id === id ? {
        ...item,
        selectedMaterialId: material ? materialId(material) : "",
        unit: item.unit || materialUnit(material),
        matchMethod: material ? "manual" : item.candidates?.length ? "candidate" : "unmatched",
        errors: previewRowErrors({ ...item, unit: item.unit || materialUnit(material) }),
      } : item),
    }));
  };

  const rematchImportPreviewRow = (id) => {
    setImportSession((current) => ({
      ...current,
      previewRows: current.previewRows.map((item) => item.id === id ? rematchPreviewItem(item) : item),
    }));
  };

  const removeImportPreviewRow = (id) => {
    setImportSession((current) => ({
      ...current,
      previewRows: current.previewRows.filter((item) => item.id !== id),
    }));
  };

  const commitImportedRows = () => {
    const session = importSession;
    if (!session?.previewRows) return;
    const importedRows = buildPlannerRowsFromPreview(session.previewRows, session.fileName);
    if (!importedRows.length) {
      setImportSession((current) => ({ ...current, importError: "ยังไม่มีแถวที่ผ่านการตรวจสอบ กรุณาแก้ชื่อ ปริมาณ และหน่วยก่อนนำเข้า" }));
      return;
    }
    const matchedCount = session.previewRows.filter((item) => previewMatchStatus(item) === "matched" && !previewRowErrors(item).length).length;
    const candidateCount = session.previewRows.filter((item) => previewMatchStatus(item) === "candidate" && !previewRowErrors(item).length).length;
    const unmatchedCount = importedRows.length - matchedCount;
    setRows((current) => session.importMode === "append" ? [...current, ...importedRows] : importedRows);
    if (session.importMode === "replace") setSelectedTemplate("blank");
    if (session.applyProjectInfo && Object.keys(session.projectInfo || {}).length) {
      setProject((current) => ({ ...current, ...session.projectInfo }));
    }
    const usedSections = new Set(importedRows.map((row) => row.sectionId));
    setCollapsedSections(new Set(SECTION_DEFINITIONS.filter((section) => !usedSections.has(section.id)).map((section) => section.id)));
    setExpandedRows(new Set(importedRows.filter((row) => !row.materialId).map((row) => row.id)));
    setImportNotice({
      count: importedRows.length,
      matchedCount,
      candidateCount,
      unmatchedCount,
      fileName: session.fileName,
    });
    setSaveStatus("unsaved");
    closeImportDialog();
  };

  const restoreBackup = () => {
    const payload = importSession?.backupPayload;
    if (!isCostPlannerBackup(payload)) return;
    setRows(payload.rows);
    setProject({ ...EMPTY_PROJECT, ...(payload.project || {}) });
    setSelectedTemplate(payload.selectedTemplate || "blank");
    setPriceMode(payload.priceMode === "future" ? "future" : "current");
    setForecastValue(payload.forecastValue ?? 1);
    setForecastUnit(payload.forecastUnit || "year");
    setRates({ ...DEFAULT_RATES, ...(payload.rates || {}) });
    setExpandedRows(new Set());
    setCollapsedSections(new Set());
    setImportNotice({ count: payload.rows.length, matchedCount: 0, candidateCount: 0, unmatchedCount: 0, fileName: importSession.fileName, backup: true });
    setSaveStatus("unsaved");
    closeImportDialog();
  };

  const resetPlanner = () => {
    if (!window.confirm("ล้างข้อมูล BOQ ทั้งหมดและเริ่มจากแม่แบบฐานรากแผ่ใหม่ใช่หรือไม่?")) return;
    window.localStorage.removeItem(DRAFT_STORAGE_KEY);
    setSelectedTemplate("house_spread");
    setRows(hydrateTemplate("house_spread"));
    setProject({ ...EMPTY_PROJECT });
    setPriceMode("current");
    setForecastValue(1);
    setForecastUnit("year");
    setRates({ ...DEFAULT_RATES });
    setExpandedRows(new Set());
    setCollapsedSections(new Set(SECTION_DEFINITIONS.slice(1).map((section) => section.id)));
    setSavedAt("");
    setSaveStatus("idle");
  };

  const exportBOQ = () => {
    const showFuture = priceMode === "future";
    const columnCount = showFuture ? 21 : 18;
    const blank = () => Array(columnCount).fill("");
    const rowsOut = [
      ["บัญชีรายการก่อสร้าง (BOQ)"],
      ["ชื่อโครงการ", project.name],
      ["เจ้าของโครงการ", project.owner],
      ["สถานที่ก่อสร้าง", project.location],
      ["เลขที่แบบ", project.drawingNo],
      ["ผู้ประมาณราคา", project.estimator],
      ["วันที่ประมาณราคา", project.estimateDate],
      ["พื้นที่อาคาร (ตร.ม.)", project.buildingArea],
      ["ฐานราคาที่เลือก", selectedPriceLabel],
      ["วันที่/เดือนเป้าหมาย", selectedDateLabel],
      ...(showFuture ? [["ระยะวางแผน", forecastLabel]] : []),
      ["แหล่งราคาวัสดุ", OFFICIAL_PRICE_URL],
      ["คำเตือนสำคัญ", OFFICIAL_PRICE_NOTE],
      ["ขอบเขต ML", "พยากรณ์เฉพาะราคาวัสดุก่อสร้าง ค่าแรงและเครื่องจักรคงอัตราปัจจุบันหรือใช้ค่าที่ผู้ใช้กรอก"],
      ["รายการไม่รวมในราคา", String(project.exclusions || "").replace(/\n/g, " • ")],
      [],
      [
        "ลำดับ", "หมวดหลัก", "หมวดงาน", "รหัส", "รายการ", "รายละเอียด/สเปก", "ปริมาณ", "หน่วย",
        "วัสดุ", "", "", "แรงงาน", "", "เครื่องจักร/ขนส่ง", "", "รวมปัจจุบัน",
        ...(showFuture ? ["วัสดุอนาคต", "", "รวมอนาคต"] : []),
        "แหล่งราคา", "หมายเหตุ",
      ],
      [
        "", "", "", "", "", "", "จำนวน", "",
        "ปริมาณรวมเผื่อ", "บาท/หน่วย", "รวม", "บาท/หน่วย", "รวม", "บาท/หน่วย", "รวม", "วัสดุ+แรงงาน+เครื่องจักร",
        ...(showFuture ? ["บาท/หน่วย", "รวมวัสดุ", "วัสดุอนาคต+ค่าแรง/เครื่องจักรเดิม"] : []),
        "", "",
      ],
    ];

    let sequence = 0;
    Object.entries(DISCIPLINES).forEach(([disciplineKey, disciplineTitle]) => {
      const disciplineRows = activeRows.filter((row) => sectionFor(row)?.discipline === disciplineKey);
      if (!disciplineRows.length) return;
      const disciplineHeader = blank();
      disciplineHeader[1] = disciplineTitle;
      disciplineHeader[4] = `รายละเอียด${disciplineTitle}`;
      rowsOut.push([], disciplineHeader);

      SECTION_DEFINITIONS.filter((section) => section.discipline === disciplineKey).forEach((section) => {
        const sectionRows = disciplineRows.filter((row) => row.sectionId === section.id);
        if (!sectionRows.length) return;
        const sectionHeader = blank();
        sectionHeader[2] = section.title;
        sectionHeader[4] = section.title;
        rowsOut.push(sectionHeader);

        sectionRows.forEach((row) => {
          sequence += 1;
          rowsOut.push([
            sequence,
            disciplineTitle,
            section.title,
            row.code,
            row.name,
            row.spec,
            row.quantity,
            row.unit,
            row.costTypes.material ? row.materialQty : "",
            row.costTypes.material && row.currentMaterialRate > 0 ? row.currentMaterialRate : "",
            row.costTypes.material ? row.materialTotal : "",
            row.costTypes.labor && row.laborRate > 0 ? row.laborRate : "",
            row.costTypes.labor ? row.laborTotal : "",
            row.costTypes.equipment && row.equipmentRate > 0 ? row.equipmentRate : "",
            row.costTypes.equipment ? row.equipmentTotal : "",
            row.currentComplete ? row.currentTotal : "",
            ...(showFuture ? [
              row.costTypes.material ? (row.futureMaterialRate ?? "") : "",
              row.costTypes.material && row.futureMaterialRate ? row.materialQty * row.futureMaterialRate : "",
              row.futureComplete ? row.futureTotal : "",
            ] : []),
            showFuture && row.costTypes.material ? `${row.currentSource} → ${row.futureSource}` : row.currentSource,
            `${row.note || ""}${row.costTypes.material ? ` • เผื่อสูญเสีย ${formatQty(row.wastePct)}%` : ""}`.replace(/^ • /, ""),
          ]);
        });

        const sectionCurrent = sectionRows.reduce((sum, row) => sum + row.currentTotal, 0);
        const sectionMaterial = sectionRows.reduce((sum, row) => sum + row.materialTotal, 0);
        const sectionLabor = sectionRows.reduce((sum, row) => sum + row.laborTotal, 0);
        const sectionEquipment = sectionRows.reduce((sum, row) => sum + row.equipmentTotal, 0);
        const sectionFutureComplete = sectionRows.every((row) => row.futureComplete);
        const subtotal = blank();
        subtotal[4] = `รวม${section.title}`;
        subtotal[10] = sectionMaterial;
        subtotal[12] = sectionLabor;
        subtotal[14] = sectionEquipment;
        subtotal[15] = sectionCurrent;
        if (showFuture) {
          subtotal[17] = sectionFutureComplete
            ? sectionRows.reduce((sum, row) => sum + row.materialQty * number(row.futureMaterialRate), 0)
            : "";
          subtotal[18] = sectionFutureComplete
            ? sectionRows.reduce((sum, row) => sum + number(row.futureTotal), 0)
            : "";
        }
        subtotal[columnCount - 1] = "ยอดรวมหมวดงาน";
        rowsOut.push(subtotal);
      });

      const disciplineTotal = blank();
      disciplineTotal[1] = disciplineTitle;
      disciplineTotal[4] = `รวม${disciplineTitle}`;
      disciplineTotal[10] = disciplineRows.reduce((sum, row) => sum + row.materialTotal, 0);
      disciplineTotal[12] = disciplineRows.reduce((sum, row) => sum + row.laborTotal, 0);
      disciplineTotal[14] = disciplineRows.reduce((sum, row) => sum + row.equipmentTotal, 0);
      disciplineTotal[15] = disciplineRows.reduce((sum, row) => sum + row.currentTotal, 0);
      if (showFuture && disciplineRows.every((row) => row.futureComplete)) {
        disciplineTotal[17] = disciplineRows.reduce((sum, row) => sum + row.materialQty * number(row.futureMaterialRate), 0);
        disciplineTotal[18] = disciplineRows.reduce((sum, row) => sum + number(row.futureTotal), 0);
      }
      disciplineTotal[columnCount - 1] = "ยอดรวมหมวดหลัก";
      rowsOut.push(disciplineTotal);
    });

    const totalRow = (label, currentValue, futureValue = "") => {
      const row = blank();
      row[4] = label;
      row[15] = currentValue;
      if (showFuture) row[18] = futureValue;
      return row;
    };
    rowsOut.push(
      [],
      ["สถานะราคาปัจจุบัน", currentComplete ? "ครบพร้อมตรวจทาน" : `ยังขาดราคา ${missingCurrentRows.length} รายการ`],
      ...(showFuture ? [["สถานะราคาคาดการณ์", futureComplete ? "ครบพร้อมเปรียบเทียบ" : `รอข้อมูล ML/ราคาเป้าหมาย ${missingFutureRows.length} รายการ`]] : []),
      totalRow("รวมต้นทุนตรง", currentSummary.base, futureSummary?.base ?? ""),
      totalRow(`ค่าอำนวยการ ${rates.overhead}%`, currentSummary.overhead, futureSummary?.overhead ?? ""),
      totalRow(`กำไรผู้รับเหมา ${rates.profit}%`, currentSummary.profit, futureSummary?.profit ?? ""),
      totalRow(`เงินสำรอง ${rates.contingency}%`, currentSummary.contingency, futureSummary?.contingency ?? ""),
      totalRow(`VAT ${rates.vat}%`, currentSummary.vat, futureSummary?.vat ?? ""),
      totalRow("รวมทั้งโครงการ", currentSummary.grandTotal, futureSummary?.grandTotal ?? ""),
      totalRow("ราคาต่อตารางเมตร", number(project.buildingArea) > 0 ? currentSummary.grandTotal / number(project.buildingArea) : "", futureSummary && number(project.buildingArea) > 0 ? futureSummary.grandTotal / number(project.buildingArea) : ""),
      [],
      ["คำเตือนท้ายเอกสาร", OFFICIAL_PRICE_NOTE]
    );

    const csv = "\uFEFF" + rowsOut.map((row) => row.map(escapeCSV).join(",")).join("\n");
    downloadText(
      `${safeFileName(project.name)}-${showFuture ? `forecast-${forecastMonths}m` : "current"}.csv`,
      csv,
      "text/csv;charset=utf-8"
    );
  };

  const pricePerSquareMetre = selectedSummary && number(project.buildingArea) > 0
    ? selectedSummary.grandTotal / number(project.buildingArea)
    : null;
  const riskLevel = priceMode === "current"
    ? "ไม่ใช้การคาดการณ์"
    : differencePercent === null
      ? "รอข้อมูล ML"
      : differencePercent >= 8
        ? "สูง"
        : differencePercent >= 4
          ? "ปานกลาง"
          : "ต่ำ";
  const showMobileTotalBar = activeRows.length > 0 && !summaryInView;
  const selectedTemplateInfo = TEMPLATE_DEFINITIONS.find((template) => template.id === selectedTemplate) || TEMPLATE_DEFINITIONS[0];

  return (
    <>
      <style>{BOQ_STYLES}</style>
      <PageHeader
        eyebrow="THAI เท • PROFESSIONAL CONSTRUCTION BOQ"
        title="ถอดแบบและประมาณราคางานก่อสร้าง"
        description="BOQ แบบรายการยืดหยุ่น ครบงานโครงสร้าง สถาปัตย์ และระบบ พร้อมราคาปัจจุบันและราคาวัสดุคาดการณ์"
        action={
          <div className="boq-header-actions">
            <button className={`secondary-btn boq-save-btn ${saveStatus}`} type="button" onClick={saveDraft}>
              <Save size={16} /> {saveStatus === "saved" ? "บันทึกแล้ว" : "บันทึกแบบร่าง"}
            </button>
            <button className="primary-btn" type="button" onClick={exportBOQ} disabled={!activeRows.length}>
              <Download size={16} /> ดาวน์โหลด BOQ
            </button>
          </div>
        }
      />

      {saveStatus !== "idle" && (
        <div className={`boq-save-feedback ${saveStatus}`}>
          {saveStatus === "saved" ? <CheckCircle2 size={17} /> : <AlertTriangle size={17} />}
          <div>
            <strong>{saveStatus === "saved" ? "บันทึกแบบร่างเรียบร้อย" : saveStatus === "error" ? "บันทึกไม่สำเร็จ" : "มีข้อมูลที่ยังไม่ได้บันทึก"}</strong>
            <span>{saveStatus === "saved"
              ? `ข้อมูลอยู่ในเบราว์เซอร์เครื่องนี้${savedAt ? ` • ${new Date(savedAt).toLocaleString("th-TH")}` : ""}`
              : saveStatus === "error"
                ? "โปรดอนุญาตพื้นที่จัดเก็บของเว็บไซต์ หรือสำรองข้อมูลเป็น JSON"
                : "กดบันทึกก่อนปิดหรือรีเฟรชหน้า"}</span>
          </div>
        </div>
      )}

      {importNotice && (
        <div className="boq-import-feedback" role="status">
          <CheckCircle2 size={18} />
          <div>
            <strong>{importNotice.backup ? "กู้คืนแบบร่างเรียบร้อย" : `นำเข้า BOQ ${importNotice.count} รายการเรียบร้อย`}</strong>
            <span>{importNotice.backup
              ? `${importNotice.fileName} ถูกกู้คืนแทนข้อมูลเดิมแล้ว`
              : `จับคู่และใช้ราคาจาก data.js ได้ ${importNotice.matchedCount} รายการ • ต้องตรวจหรือเลือกวัสดุเพิ่ม ${importNotice.unmatchedCount} รายการ • ไฟล์ ${importNotice.fileName}`}</span>
          </div>
          <button type="button" onClick={() => setImportNotice(null)} aria-label="ปิดข้อความ">×</button>
        </div>
      )}

      <nav className="boq-flow" aria-label="ขั้นตอนการจัดทำ BOQ">
        <div className="active"><b>1</b><span>ตั้งค่าโครงการ</span></div><i />
        <div><b>2</b><span>เลือกแม่แบบ</span></div><i />
        <div><b>3</b><span>กรอกปริมาณและราคา</span></div><i />
        <div><b>4</b><span>ตรวจและส่งออก</span></div>
      </nav>

      <div className="boq-notice" role="note">
        <AlertTriangle size={20} />
        <div>
          <strong>ราคากลางภาครัฐ ไม่ใช่ราคาขายปลีกหรือราคาซื้อจริง</strong>
          <span>{OFFICIAL_PRICE_NOTE}</span>
          <span><b>ขอบเขต ML:</b> พยากรณ์เฉพาะราคาวัสดุ ค่าแรงและเครื่องจักรใช้ค่าปัจจุบันที่ผู้ใช้กรอก</span>
          <a href={OFFICIAL_PRICE_URL} target="_blank" rel="noreferrer">ดูแหล่งราคาวัสดุภาครัฐ</a>
        </div>
      </div>

      <section className="card boq-setup-card">
        <div className="boq-step-head"><div className="boq-step-number">1</div><div><h2>ข้อมูลโครงการ</h2><p>ข้อมูลส่วนหัวและสรุปราคาต่อตารางเมตรในไฟล์ BOQ</p></div></div>
        <div className="boq-project-grid">
          <TextField label="ชื่อโครงการ" value={project.name} onChange={(value) => setProject({ ...project, name: value })} />
          <TextField label="เจ้าของโครงการ" value={project.owner} placeholder="ชื่อเจ้าของ/ผู้ว่าจ้าง" onChange={(value) => setProject({ ...project, owner: value })} />
          <TextField label="สถานที่ก่อสร้าง" value={project.location} onChange={(value) => setProject({ ...project, location: value })} icon={<MapPin size={15} />} />
          <TextField label="เลขที่แบบ" value={project.drawingNo} placeholder="เช่น AR-01, ST-01" onChange={(value) => setProject({ ...project, drawingNo: value })} />
          <TextField label="ผู้ประมาณราคา" value={project.estimator} placeholder="ชื่อผู้จัดทำ BOQ" onChange={(value) => setProject({ ...project, estimator: value })} />
          <TextField label="วันที่ประมาณราคา" type="date" value={project.estimateDate} onChange={(value) => setProject({ ...project, estimateDate: value })} />
          <TextField label="พื้นที่อาคาร" type="number" value={project.buildingArea} suffix="ตร.ม." onChange={(value) => setProject({ ...project, buildingArea: optionalNumber(value) })} />
        </div>
        <label className="boq-textarea-field"><span>รายการที่ไม่รวมในราคา <small>หนึ่งรายการต่อหนึ่งบรรทัด</small></span><textarea rows="4" value={project.exclusions} onChange={(event) => setProject({ ...project, exclusions: event.target.value })} /></label>
      </section>

      <section className="card boq-template-card">
        <div className="boq-step-head"><div className="boq-step-number">2</div><div><h2>เลือกวิธีเริ่มต้น BOQ</h2><p>เริ่มจากแม่แบบของระบบ หรือนำเข้าไฟล์ BOQ ที่มีอยู่แล้ว เลือกเพียงวิธีเดียว</p></div></div>
        <div className="boq-template-grid">
          {TEMPLATE_DEFINITIONS.map((template) => (
            <button key={template.id} type="button" className={selectedTemplate === template.id ? "active" : ""} onClick={() => setSelectedTemplate(template.id)}>
              <Building2 size={19} />
              <span><strong>{template.name}</strong><small>{template.description}</small><em>{template.rows.length} รายการตั้งต้น</em></span>
              {selectedTemplate === template.id && <CheckCircle2 size={18} />}
            </button>
          ))}
        </div>
        <div className="boq-template-start">
          <div className="boq-template-start-copy">
            <span className="boq-method-label">วิธีที่ 1 · เริ่มจากแม่แบบ</span>
            <strong>{selectedTemplateInfo.name}</strong>
            <small>สร้างรายการตั้งต้น {selectedTemplateInfo.rows.length.toLocaleString("th-TH")} รายการ และแก้ไขรายละเอียดภายหลังได้</small>
          </div>
          <button type="button" className="primary-btn boq-use-template-btn" onClick={applyTemplate}><FileSpreadsheet size={17} /> ใช้แม่แบบนี้</button>
        </div>

        <div className="boq-start-divider"><span>หรือ</span></div>

        <div
          className={`boq-import-dropzone ${importDragging ? "dragging" : ""}`}
          onDragEnter={(event) => { event.preventDefault(); setImportDragging(true); }}
          onDragOver={(event) => { event.preventDefault(); setImportDragging(true); }}
          onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setImportDragging(false); }}
          onDrop={(event) => {
            event.preventDefault();
            setImportDragging(false);
            const file = event.dataTransfer.files?.[0];
            if (file) openImportFile(file);
          }}
        >
          <span className="boq-import-drop-icon"><Upload size={23} /></span>
          <div className="boq-import-drop-copy">
            <span className="boq-method-label">วิธีที่ 2 · นำเข้าไฟล์ BOQ</span>
            <strong>ลากไฟล์มาวาง หรือเลือกไฟล์จากเครื่อง</strong>
            <small>ระบบจะเปิด Preview ให้ตรวจคอลัมน์และ Material Matching ก่อนเพิ่มรายการเข้า CostPlanner</small>
            <div className="boq-import-formats" aria-label="ประเภทไฟล์ที่รองรับ"><span>XLSX</span><span>XLS</span><span>CSV</span><span>JSON</span><span>PDF</span></div>
          </div>
          <div className="boq-import-drop-action">
            <button type="button" className="primary-btn" onClick={() => importRef.current?.click()}><Upload size={16} /> เลือกไฟล์ BOQ</button>
            <small><CheckCircle2 size={12} /> ประมวลผลใน Browser</small>
          </div>
        </div>

        <div className="boq-draft-tools">
          <div className="boq-draft-tools-copy"><FileJson size={18} /><span><strong>เครื่องมือแบบร่าง</strong><small>สำรองข้อมูลก่อนเปลี่ยนแม่แบบหรือเริ่มงานใหม่</small></span></div>
          <div className="boq-draft-tool-actions">
            <button type="button" className="secondary-btn" onClick={exportDraft}><FileJson size={15} /> สำรอง JSON</button>
            <button type="button" className="secondary-btn danger" onClick={resetPlanner}><RotateCcw size={15} /> เริ่มใหม่</button>
          </div>
        </div>
        <input ref={importRef} type="file" accept={IMPORT_ACCEPT} hidden onChange={handleImportInput} />
      </section>

      <section className="card boq-price-mode-card">
        <div className="boq-step-head"><div className="boq-step-number">3</div><div><h2>ฐานราคาที่ใช้คำนวณ</h2><p>เลือกปัจจุบันหรือกำหนดช่วงเวลาอนาคตได้เอง ไม่จำกัด 12 เดือน</p></div></div>
        <div className="boq-price-mode-grid">
          <button type="button" className={priceMode === "current" ? "active" : ""} onClick={() => setPriceMode("current")}>
            <CheckCircle2 size={19} /><span><strong>ราคาปัจจุบัน</strong><small>ใช้ราคาวัสดุภาครัฐล่าสุดหรือราคาที่กรอกเอง</small></span>
          </button>
          <button type="button" className={priceMode === "future" ? "active" : ""} onClick={() => setPriceMode("future")}>
            <TrendingUp size={19} /><span><strong>ราคาในอนาคต</strong><small>ML เปลี่ยนเฉพาะราคาวัสดุ ค่าแรงและเครื่องจักรคงเดิม</small></span>
          </button>
          {priceMode === "future" && (
            <div className="boq-horizon-field">
              <span>วางแผนเริ่มก่อสร้างในอีก</span>
              <div><input type="number" min="1" max={forecastUnit === "year" ? 50 : 600} value={forecastValue} onChange={(event) => setForecastValue(optionalNumber(event.target.value))} /><select value={forecastUnit} onChange={(event) => setForecastUnit(event.target.value)}><option value="month">เดือน</option><option value="year">ปี</option></select></div>
              <small>เป้าหมาย {targetDateLabel} • {forecastLabel}</small>
            </div>
          )}
        </div>
        {priceMode === "future" && forecastMonths > 36 && <div className="boq-long-horizon"><Info size={15} /> การคาดการณ์ระยะ {forecastLabel} มีความไม่แน่นอนสูง ควรทบทวนราคาและเผื่องบเป็นระยะ</div>}
      </section>

      <section className="card boq-work-toolbar">
        <div className="boq-step-head"><div className="boq-step-number">4</div><div><h2>รายการ BOQ จากแบบก่อสร้าง</h2><p>{rows.length} รายการ • กรอกเฉพาะรายการที่ใช้ แล้วลบหรือเพิ่มตามแบบจริง</p></div></div>
        <div className="boq-toolbar-row">
          <label className="boq-search"><Search size={16} /><input value={searchText} placeholder="ค้นหารหัส รายการ หรือสเปก" onChange={(event) => setSearchText(event.target.value)} /></label>
          <div className="boq-filter-tabs">
            <button className={rowFilter === "all" ? "active" : ""} onClick={() => setRowFilter("all")}>ทั้งหมด</button>
            <button className={rowFilter === "active" ? "active" : ""} onClick={() => setRowFilter("active")}>กรอกแล้ว {activeRows.length}</button>
            <button className={rowFilter === "missing" ? "active warning" : ""} onClick={() => setRowFilter("missing")}>ขาดราคา {priceMode === "future" ? missingFutureRows.length : missingCurrentRows.length}</button>
          </div>
        </div>
        <div className="boq-discipline-overview">
          {Object.entries(DISCIPLINES).map(([key, title]) => {
            const sections = SECTION_DEFINITIONS.filter((section) => section.discipline === key);
            const count = rows.filter((row) => sections.some((section) => section.id === row.sectionId)).length;
            return <button type="button" key={key} onClick={() => scrollToSection(sections[0].id)}><Building2 size={17} /><span><strong>{title}</strong><small>{sections.length} หมวด • {count} รายการ</small></span></button>;
          })}
        </div>
        <div className="boq-category-nav">
          {SECTION_DEFINITIONS.map((section) => <button type="button" key={section.id} onClick={() => scrollToSection(section.id)}><b>{section.code}</b><span>{section.title.replace(/^งาน/, "")}</span></button>)}
        </div>
      </section>

      <div className="boq-layout">
        <main className="boq-main">
          {SECTION_DEFINITIONS.map((section) => {
            const sectionRows = visibleRows.filter((row) => row.sectionId === section.id);
            const allSectionRows = calculatedRows.filter((row) => row.sectionId === section.id);
            if (!sectionRows.length && (searchText || rowFilter !== "all")) return null;
            const isCollapsed = collapsedSections.has(section.id) && !searchText;
            return (
              <BOQSection
                key={section.id}
                section={section}
                rows={sectionRows}
                allRows={allSectionRows}
                isCollapsed={isCollapsed}
                priceMode={priceMode}
                expandedRows={expandedRows}
                onToggleSection={() => toggleSection(section.id)}
                onToggleRow={toggleExpanded}
                onAdd={() => addRow(section)}
                onUpdate={updateRow}
                onUpdateNumber={updateNumericRow}
                onDuplicate={duplicateRow}
                onDelete={deleteRow}
                onMove={moveRow}
              />
            );
          })}
        </main>

        <aside className="boq-summary-wrap" id="boq-summary" ref={summaryRef}>
          <div className="boq-summary">
            <div className="boq-summary-step"><b>✓</b><span>ตรวจราคาและสรุปผล</span></div>
            <div className="eyebrow">CONSTRUCTION COST ESTIMATE</div>
            <h3>{selectedPriceLabel}</h3>
            <div className="boq-grand-total">{optionalPrice(selectedSummary?.grandTotal)}</div>
            <div className="boq-summary-caption">{!activeRows.length
              ? "กรอกปริมาณอย่างน้อยหนึ่งรายการเพื่อเริ่มคำนวณ"
              : selectedComplete
                ? `ฐานราคา ${selectedDateLabel} • ตรวจอัตราราคาครบแล้ว`
                : priceMode === "future"
                  ? `รอราคาอนาคต ${missingFutureRows.length} รายการ`
                  : `ยังขาดราคาปัจจุบัน ${missingCurrentRows.length} รายการ`}</div>
            <div className={`boq-validation ${selectedComplete ? "ready" : "incomplete"}`}>
              {selectedComplete ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
              <span>{selectedComplete ? "BOQ พร้อมตรวจทานและส่งออก" : activeRows.length ? "ยอดที่เห็นเป็นยอดชั่วคราวเฉพาะราคาที่กรอกครบ" : "ยังไม่มีรายการที่ใช้งาน"}</span>
            </div>
            <div className="boq-cost-split">
              <div><span>ค่าวัสดุ</span><b>฿{formatPrice(totalsByType.material)}</b></div>
              <div><span>ค่าแรง</span><b>฿{formatPrice(totalsByType.labor)}</b></div>
              <div><span>เครื่องจักร/ขนส่ง</span><b>฿{formatPrice(totalsByType.equipment)}</b></div>
            </div>
            <div className="boq-markups">
              <RateField label="ค่าอำนวยการ" value={rates.overhead} amount={selectedSummary?.overhead} onChange={(value) => setRates({ ...rates, overhead: value })} />
              <RateField label="กำไรผู้รับเหมา" value={rates.profit} amount={selectedSummary?.profit} onChange={(value) => setRates({ ...rates, profit: value })} />
              <RateField label="เงินสำรอง" value={rates.contingency} amount={selectedSummary?.contingency} onChange={(value) => setRates({ ...rates, contingency: value })} />
              <RateField label="VAT" value={rates.vat} amount={selectedSummary?.vat} onChange={(value) => setRates({ ...rates, vat: value })} />
            </div>
            {pricePerSquareMetre !== null && <div className="boq-per-sqm"><span>ราคาต่อตารางเมตร</span><strong>฿{formatPrice(pricePerSquareMetre)}/ตร.ม.</strong></div>}
            {priceMode === "future" && (
              <div className="boq-future-box">
                <span>เปรียบเทียบ BOQ ราคาปัจจุบัน</span><strong>฿{formatPrice(currentSummary.grandTotal)}</strong><em>ณ {todayLabel}</em>
                {difference === null ? <small className="waiting">รอราคา ML หรือราคาวัสดุเป้าหมายให้ครบ</small> : <small className={difference >= 0 ? "up" : "down"}>{difference >= 0 ? "+" : "-"}฿{formatPrice(Math.abs(difference))} ({differencePercent >= 0 ? "+" : ""}{differencePercent.toFixed(1)}%)</small>}
              </div>
            )}
            <div className="boq-official-disclaimer"><AlertTriangle size={14} /><span><b>ราคากลางภาครัฐ ไม่ใช่ราคาขายปลีก</b><br />ต้องขอใบเสนอราคาจริงก่อนจัดซื้อหรือยื่นราคา</span></div>
            <button className="primary-btn boq-download-full" onClick={exportBOQ} disabled={!activeRows.length}><Download size={16} /> ดาวน์โหลด BOQ แบบละเอียด</button>
          </div>
        </aside>
      </div>

      <section className={`card boq-insights ${showMobileTotalBar ? "has-mobile-bar" : ""}`}>
        <div className="boq-insight-grid">
          <InsightCard icon={<Calculator size={17} />} label={`ต้นทุนตรง • ${selectedPriceLabel}`} value={selectedDirect === null ? "รอข้อมูล" : `฿${formatPrice(selectedDirect)}`} />
          <InsightCard icon={<CalendarRange size={17} />} label={`รวมโครงการ • ${selectedDateLabel}`} value={optionalPrice(selectedSummary?.grandTotal)} />
          <InsightCard icon={<TrendingUp size={17} />} label="ความเสี่ยงจากราคา" value={riskLevel} />
          <InsightCard icon={<FileSpreadsheet size={17} />} label="รายการที่ใช้คำนวณ" value={`${activeRows.length} / ${rows.length} รายการ`} />
        </div>
      </section>

      {showMobileTotalBar && (
        <div className="boq-mobile-total-bar">
          <div><span>{selectedPriceLabel}</span><strong>{optionalPrice(selectedSummary?.grandTotal)}</strong></div>
          <button type="button" onClick={() => document.getElementById("boq-summary")?.scrollIntoView({ behavior: "smooth", block: "start" })}>ดูสรุป <ChevronUp size={16} /></button>
        </div>
      )}

      {importSession && (
        <ImportBOQDialog
          session={importSession}
          onClose={closeImportDialog}
          onChooseFile={() => importRef.current?.click()}
          onSelectSheet={selectImportSheet}
          onUpdateMapping={updateImportMapping}
          onCreatePreview={createImportPreview}
          onBackToMapping={() => setImportSession((current) => ({ ...current, stage: "mapping", importError: "" }))}
          onUpdateRow={updateImportPreviewRow}
          onChooseMaterial={chooseImportMaterial}
          onRematchRow={rematchImportPreviewRow}
          onRemoveRow={removeImportPreviewRow}
          onUpdateOptions={(patch) => setImportSession((current) => ({ ...current, ...patch }))}
          onCommit={commitImportedRows}
          onRestoreBackup={restoreBackup}
        />
      )}
    </>
  );
}

function formatFileSize(bytes) {
  const value = Number(bytes) || 0;
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function importSourceLabel(sourceType) {
  return ({
    excel: "Excel",
    csv: "CSV",
    tsv: "TSV",
    pdf: "PDF Text Layer",
    "pdf-scan": "PDF Scan",
    "json-backup": "CostPlanner Backup JSON",
    "json-external": "External BOQ JSON",
    image: "Image",
  })[sourceType] || "ไฟล์ BOQ";
}

function ImportBOQDialog({
  session,
  onClose,
  onChooseFile,
  onSelectSheet,
  onUpdateMapping,
  onCreatePreview,
  onBackToMapping,
  onUpdateRow,
  onChooseMaterial,
  onRematchRow,
  onRemoveRow,
  onUpdateOptions,
  onCommit,
  onRestoreBackup,
}) {
  const [previewLimit, setPreviewLimit] = useState(50);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event) => {
      if (event.key === "Escape" && !["reading", "matching"].includes(session.stage)) onClose();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [session.stage, onClose]);

  useEffect(() => setPreviewLimit(50), [session.id, session.stage]);

  const previewStats = useMemo(() => {
    const previewRows = session.previewRows || [];
    const valid = previewRows.filter((item) => !previewRowErrors(item).length);
    const matched = valid.filter((item) => previewMatchStatus(item) === "matched").length;
    const candidate = valid.filter((item) => previewMatchStatus(item) === "candidate").length;
    const mismatch = valid.filter((item) => previewMatchStatus(item) === "unit-mismatch").length;
    return {
      total: previewRows.length,
      valid: valid.length,
      invalid: previewRows.length - valid.length,
      matched,
      candidate,
      mismatch,
      unmatched: valid.length - matched - candidate - mismatch,
    };
  }, [session.previewRows]);

  const busy = ["reading", "matching"].includes(session.stage);
  const mappingRows = session.table?.dataRows?.slice(0, 6) || [];
  const projectEntries = Object.entries(session.projectInfo || {}).filter(([, value]) => value !== "" && value !== null && value !== undefined);

  return (
    <div className="boq-import-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }}>
      <section className="boq-import-dialog" role="dialog" aria-modal="true" aria-labelledby="boq-import-title">
        <header className="boq-import-dialog-head">
          <div className="boq-import-file-icon"><FileSpreadsheet size={22} /></div>
          <div>
            <span>{importSourceLabel(session.sourceType)}</span>
            <h2 id="boq-import-title">นำเข้าและตรวจสอบ BOQ</h2>
            <small>{session.fileName} • {formatFileSize(session.fileSize)}</small>
          </div>
          <button type="button" onClick={onClose} disabled={busy} aria-label="ปิดหน้าต่างนำเข้า">×</button>
        </header>

        <div className="boq-import-progress" aria-label="ขั้นตอนนำเข้า">
          <span className={["reading", "mapping", "matching", "preview", "backup"].includes(session.stage) ? "active" : ""}><b>1</b> อ่านไฟล์</span>
          <i />
          <span className={["mapping", "matching", "preview"].includes(session.stage) ? "active" : ""}><b>2</b> จับคู่คอลัมน์</span>
          <i />
          <span className={session.stage === "preview" ? "active" : ""}><b>3</b> ตรวจรายการ</span>
        </div>

        <div className="boq-import-dialog-body">
          {session.stage === "reading" && (
            <div className="boq-import-state">
              <span className="boq-import-spinner" />
              <strong>กำลังอ่านไฟล์ใน Browser</strong>
              <p>ไฟล์ไม่ถูกส่งไป Backend หรือบริการภายนอก</p>
            </div>
          )}

          {session.stage === "matching" && (
            <div className="boq-import-state">
              <span className="boq-import-spinner" />
              <strong>กำลังตรวจข้อมูลและค้นหา Material Candidate</strong>
              <p>เปรียบเทียบชื่อ Keyword ขนาด Specification หน่วย และหมวดกับ data.js</p>
            </div>
          )}

          {session.stage === "error" && (
            <div className="boq-import-state error">
              <AlertTriangle size={36} />
              <strong>อ่านไฟล์ไม่สำเร็จ</strong>
              <p>{session.error}</p>
              <button type="button" className="primary-btn" onClick={onChooseFile}>เลือกไฟล์อื่น</button>
            </div>
          )}

          {session.stage === "ocr-required" && (
            <div className="boq-import-state warning">
              <AlertTriangle size={36} />
              <strong>{session.message}</strong>
              <p>{session.detail}</p>
              {session.previewUrl && <img className="boq-import-image-preview" src={session.previewUrl} alt={`ตัวอย่าง ${session.fileName}`} />}
              {session.pageCount && <small>ตรวจพบ {session.pageCount} หน้า แต่ไม่พบ Text Layer ที่เพียงพอ</small>}
              <div className="boq-import-state-actions"><button type="button" className="secondary-btn" onClick={onClose}>ปิด</button><button type="button" className="primary-btn" onClick={onChooseFile}>เลือก Excel / CSV แทน</button></div>
            </div>
          )}

          {session.stage === "backup" && (
            <div className="boq-import-backup">
              <div className="boq-import-callout success"><CheckCircle2 size={20} /><span><strong>ตรวจพบ CostPlanner Backup JSON</strong><small>ไฟล์นี้จะแทนที่ข้อมูลโครงการ รายการ BOQ ฐานราคา และอัตราบวกเพิ่มทั้งหมด</small></span></div>
              <div className="boq-import-backup-summary">
                <div><span>ชื่อโครงการ</span><strong>{session.backupPayload?.project?.name || "ไม่ระบุ"}</strong></div>
                <div><span>จำนวนรายการ</span><strong>{(session.backupPayload?.rows?.length || 0).toLocaleString("th-TH")}</strong></div>
                <div><span>Schema</span><strong>Version {session.backupPayload?.schemaVersion}</strong></div>
              </div>
              <div className="boq-import-footer inline"><button type="button" className="secondary-btn" onClick={onClose}>ยกเลิก</button><button type="button" className="primary-btn" onClick={onRestoreBackup}>กู้คืนแบบร่างและแทนที่ข้อมูลเดิม</button></div>
            </div>
          )}

          {session.stage === "mapping" && session.table && (
            <>
              <div className="boq-import-section-head"><div><strong>ตรวจ Sheet และจับคู่คอลัมน์</strong><span>ระบบเดาคอลัมน์ให้แล้ว แต่คุณเปลี่ยนได้ก่อนสร้าง Preview</span></div><span className="boq-client-badge">ประมวลผลใน Browser</span></div>

              {session.tables?.length > 1 && (
                <label className="boq-import-sheet-select"><span>Sheet ที่ต้องการนำเข้า</span><select value={session.selectedSheetIndex} onChange={(event) => onSelectSheet(Number(event.target.value))}>{session.tables.map((table, index) => <option key={`${table.name}-${index}`} value={index}>{table.name} • {table.dataRows.length.toLocaleString("th-TH")} แถว</option>)}</select></label>
              )}

              {session.warnings?.filter(Boolean).map((warning, index) => <div className="boq-import-callout warning" key={`${warning}-${index}`}><Info size={18} /><span><strong>ผลการอ่านเอกสาร</strong><small>{warning}</small></span></div>)}

              {projectEntries.length > 0 && (
                <div className="boq-import-project-detected">
                  <strong>ข้อมูลโครงการที่ตรวจพบ</strong>
                  <div>{projectEntries.map(([key, value]) => <span key={key}><small>{({ name: "โครงการ", owner: "เจ้าของ", location: "สถานที่", drawingNo: "เลขที่แบบ", estimator: "ผู้ประมาณ", estimateDate: "วันที่", buildingArea: "พื้นที่" })[key] || key}</small><b>{String(value)}</b></span>)}</div>
                </div>
              )}

              <div className="boq-import-mapping-grid">
                {IMPORT_COLUMN_FIELDS.map((field) => (
                  <label key={field.key} className={field.required ? "required" : ""}>
                    <span>{field.label}{field.required && <b>*</b>}</span>
                    <select value={session.mapping?.[field.key] ?? ""} onChange={(event) => onUpdateMapping(field.key, event.target.value)}>
                      <option value="">ไม่ใช้คอลัมน์นี้</option>
                      {session.table.headers.map((header, index) => <option key={`${field.key}-${index}`} value={index}>{header}</option>)}
                    </select>
                  </label>
                ))}
              </div>
              {session.mappingError && <div className="boq-import-inline-error"><AlertTriangle size={15} /> {session.mappingError}</div>}

              <div className="boq-import-raw-preview">
                <div><strong>ตัวอย่างข้อมูลต้นทาง</strong><span>แถวหัวตารางที่ตรวจพบ: {session.table.headerIndex + 1}</span></div>
                <div className="boq-import-table-scroll"><table><thead><tr>{session.table.headers.map((header, index) => <th key={`${header}-${index}`}>{header}</th>)}</tr></thead><tbody>{mappingRows.map((row, rowIndex) => <tr key={rowIndex}>{session.table.headers.map((_, columnIndex) => <td key={columnIndex}>{row[columnIndex] || "—"}</td>)}</tr>)}</tbody></table></div>
              </div>

              <div className="boq-import-footer"><button type="button" className="secondary-btn" onClick={onClose}>ยกเลิก</button><button type="button" className="primary-btn" onClick={onCreatePreview}>ตรวจและค้นหา Material Candidate</button></div>
            </>
          )}

          {session.stage === "preview" && (
            <>
              <div className="boq-import-section-head"><div><strong>Import Preview</strong><span>ราคาจากไฟล์ต้นทางไม่ถูกนำมาใช้แทน data.js โดยอัตโนมัติ</span></div><button type="button" className="boq-link-button" onClick={onBackToMapping}>ย้อนกลับไปจับคู่คอลัมน์</button></div>
              <div className="boq-import-stats">
                <div><span>อ่านได้</span><strong>{previewStats.total}</strong></div>
                <div className="matched"><span>จับคู่มั่นใจสูง</span><strong>{previewStats.matched}</strong></div>
                <div className="candidate"><span>มี Candidate</span><strong>{previewStats.candidate}</strong></div>
                <div className="unmatched"><span>ยังไม่จับคู่</span><strong>{previewStats.unmatched + previewStats.mismatch}</strong></div>
                <div className="invalid"><span>ข้อมูลไม่ครบ</span><strong>{previewStats.invalid}</strong></div>
              </div>

              {(session.truncated || session.skippedSummaryRows > 0) && <div className="boq-import-callout warning"><Info size={18} /><span><strong>มีการกรองข้อมูลก่อน Preview</strong><small>{session.truncated ? `แสดงไม่เกิน ${MAX_IMPORT_ROWS.toLocaleString("th-TH")} แถว • ` : ""}{session.skippedSummaryRows ? `ข้ามแถวสรุปรวม ${session.skippedSummaryRows} แถว` : ""}</small></span></div>}

              <div className="boq-import-preview-list">
                {(session.previewRows || []).slice(0, previewLimit).map((item, index) => (
                  <ImportPreviewRow
                    key={item.id}
                    item={item}
                    index={index}
                    onUpdate={onUpdateRow}
                    onChooseMaterial={onChooseMaterial}
                    onRematch={onRematchRow}
                    onRemove={onRemoveRow}
                  />
                ))}
              </div>
              {previewLimit < (session.previewRows?.length || 0) && <button type="button" className="boq-import-load-more" onClick={() => setPreviewLimit((limit) => limit + 50)}>แสดงเพิ่มอีก {Math.min(50, session.previewRows.length - previewLimit)} รายการ</button>}

              <div className="boq-import-options">
                <div><strong>วิธีนำเข้ารายการ</strong><label><input type="radio" name="boq-import-mode" checked={session.importMode === "replace"} onChange={() => onUpdateOptions({ importMode: "replace" })} /> แทนที่รายการ BOQ ปัจจุบัน</label><label><input type="radio" name="boq-import-mode" checked={session.importMode === "append"} onChange={() => onUpdateOptions({ importMode: "append" })} /> เพิ่มต่อท้ายรายการปัจจุบัน</label></div>
                {projectEntries.length > 0 && <label className="boq-import-project-option"><input type="checkbox" checked={session.applyProjectInfo} onChange={(event) => onUpdateOptions({ applyProjectInfo: event.target.checked })} /><span><strong>ใช้ข้อมูลโครงการที่ตรวจพบ</strong><small>เติมเฉพาะข้อมูลที่อ่านได้จากไฟล์</small></span></label>}
              </div>
              {session.importError && <div className="boq-import-inline-error"><AlertTriangle size={15} /> {session.importError}</div>}
              <div className="boq-import-footer preview"><span>นำเข้าได้ {previewStats.valid.toLocaleString("th-TH")} รายการ • รายการไม่จับคู่จะเข้า CostPlanner โดยยังไม่มีราคา</span><div><button type="button" className="secondary-btn" onClick={onClose}>ยกเลิก</button><button type="button" className="primary-btn" disabled={!previewStats.valid} onClick={onCommit}>นำเข้า {previewStats.valid.toLocaleString("th-TH")} รายการ</button></div></div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}

function ImportPreviewRow({ item, index, onUpdate, onChooseMaterial, onRematch, onRemove }) {
  const status = previewMatchStatus(item);
  const selectedMaterial = selectedPreviewMaterial(item);
  const [expanded, setExpanded] = useState(status !== "matched" || item.errors.length > 0);
  const currentUnitOptions = UNIT_OPTIONS.includes(item.unit) || !item.unit ? UNIT_OPTIONS : [item.unit, ...UNIT_OPTIONS];
  const statusContent = {
    matched: { label: item.matchMethod === "auto" ? "จับคู่มั่นใจสูง" : "เลือกแล้ว", className: "matched" },
    candidate: { label: `พบ ${item.candidates.length} Candidate`, className: "candidate" },
    unmatched: { label: "ยังไม่ได้จับคู่วัสดุ", className: "unmatched" },
    "unit-mismatch": { label: "หน่วยยังไม่ตรง", className: "mismatch" },
  }[status];

  return (
    <article className={`boq-import-preview-row ${statusContent.className} ${item.errors.length ? "invalid" : ""}`}>
      <button type="button" className="boq-import-preview-summary" onClick={() => setExpanded((value) => !value)}>
        <span className="boq-import-row-number">{index + 1}</span>
        <span className="boq-import-row-copy"><strong>{item.name || "ไม่มีชื่อรายการ"}</strong><small>{item.quantity ?? "—"} {item.unit || "ไม่ระบุหน่วย"}{item.spec ? ` • ${item.spec}` : ""}</small></span>
        <span className={`boq-import-match-badge ${statusContent.className}`}>{statusContent.label}</span>
        {expanded ? <ChevronUp size={17} /> : <ChevronDown size={17} />}
      </button>

      {expanded && (
        <div className="boq-import-preview-detail">
          <div className="boq-import-edit-grid">
            <label><span>รหัส</span><input value={item.code || ""} onChange={(event) => onUpdate(item.id, { code: event.target.value })} /></label>
            <label className="wide"><span>ชื่อรายการ</span><input value={item.name || ""} onChange={(event) => onUpdate(item.id, { name: event.target.value })} /></label>
            <label><span>ปริมาณ</span><input type="number" min="0" step="0.001" value={item.quantity ?? ""} onChange={(event) => onUpdate(item.id, { quantity: event.target.value === "" ? null : parseLocaleNumber(event.target.value) })} /></label>
            <label><span>หน่วย</span><select value={item.unit || ""} onChange={(event) => onUpdate(item.id, { unit: event.target.value })}><option value="">เลือกหน่วย</option>{currentUnitOptions.map((unit) => <option key={unit} value={unit}>{unit}</option>)}</select></label>
            <label className="wide"><span>ขนาด / Specification</span><input value={item.spec || ""} onChange={(event) => onUpdate(item.id, { spec: event.target.value })} /></label>
            <label><span>หมวดงาน</span><select value={item.section || ""} onChange={(event) => onUpdate(item.id, { section: event.target.value })}><option value="">ให้ระบบจัดหมวด</option>{item.section && !SECTION_DEFINITIONS.some((section) => section.title === item.section) && <option value={item.section}>{item.section}</option>}{SECTION_DEFINITIONS.map((section) => <option key={section.id} value={section.title}>{section.title}</option>)}</select></label>
          </div>

          {item.errors.length > 0 && <div className="boq-import-inline-error"><AlertTriangle size={15} /> แถว {item.sourceRow}: {item.errors.join(" • ")}</div>}
          {item.sourceRate !== null && item.sourceRate !== undefined && <div className="boq-import-source-rate"><Info size={15} /><span>ราคาเดิมในเอกสาร <b>{formatPrice(item.sourceRate)} บาท/{item.unit || "หน่วย"}</b> — แสดงเพื่อเทียบเท่านั้น ยังไม่นำไปคำนวณ</span></div>}

          <div className="boq-import-candidate-head"><span><strong>Material Matching</strong><small>เลือกเองได้เสมอ ระบบจะใช้ราคาเฉพาะจาก material ที่เลือกใน data.js</small></span>{item.needsRematch && <button type="button" onClick={() => onRematch(item.id)}><Search size={14} /> ค้นหา Candidate ใหม่</button>}</div>

          {item.candidates?.length > 0 && (
            <div className="boq-import-candidates">
              {item.candidates.map((candidate) => {
                const candidateId = materialId(candidate.material);
                const selected = String(item.selectedMaterialId) === candidateId;
                const compatible = candidate.unitScore >= 0.9;
                return (
                  <div key={candidateId} className={`${selected ? "selected" : ""} ${compatible ? "" : "unit-mismatch"}`}>
                    <span><strong>{materialName(candidate.material)}</strong><small>{candidate.material?.category || "ไม่ระบุหมวด"} • {materialUnit(candidate.material)} • รหัส {candidateId}</small><em>{candidate.reasons.length ? candidate.reasons.join(" • ") : "ชื่อใกล้เคียงบางส่วน"}</em></span>
                    <span className="boq-import-candidate-price"><strong>{formatPrice(materialPrice(candidate.material))} บาท</strong><small>/{materialUnit(candidate.material) || "หน่วย"}</small><em>{Math.round(candidate.score * 100)}%</em></span>
                    <button type="button" className={selected ? "selected" : ""} onClick={() => onChooseMaterial(item.id, candidate.material)}>{selected ? "กำลังใช้รายการนี้" : "ใช้วัสดุนี้"}</button>
                  </div>
                );
              })}
            </div>
          )}

          {!item.candidates?.length && <div className="boq-import-no-candidate"><AlertTriangle size={18} /><span><strong>ยังไม่ได้จับคู่วัสดุ</strong><small>ค้นหาและเลือกจาก MaterialPicker ด้านล่าง ระบบจะไม่เดาราคาให้</small></span></div>}

          <div className="boq-import-picker-wrap">
            <MaterialPicker
              materials={materials}
              value={item.selectedMaterialId || ""}
              onChange={(_, material) => onChooseMaterial(item.id, material)}
              label="เลือกหรือแก้ไขวัสดุจาก data.js"
              placeholder="ค้นหาชื่อ รหัส หมวด หรือหน่วย"
            />
            {selectedMaterial && <button type="button" className="boq-link-button danger" onClick={() => onChooseMaterial(item.id, null)}>ยกเลิกการเลือกวัสดุ</button>}
          </div>
          {status === "unit-mismatch" && <div className="boq-import-inline-error"><AlertTriangle size={15} /> วัสดุที่เลือกมีหน่วย {materialUnit(selectedMaterial)} แต่รายการ BOQ ใช้ {item.unit} จึงยังไม่ใช้ราคาอัตโนมัติ กรุณาเลือกวัสดุ/หน่วยที่ตรงกัน</div>}

          <div className="boq-import-row-actions"><span>แถวต้นทาง {item.sourceRow}</span><button type="button" className="danger" onClick={() => onRemove(item.id)}><Trash2 size={14} /> ไม่นำเข้าแถวนี้</button></div>
        </div>
      )}
    </article>
  );
}

function TextField({ label, value, onChange, placeholder = "", icon = null, type = "text", suffix = "" }) {
  return (
    <label className="boq-field">
      <span>{icon}{label}</span>
      <div className={`boq-field-control${suffix ? " has-suffix" : ""}`}>
        <input type={type} value={value ?? ""} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
        {suffix && <em>{suffix}</em>}
      </div>
    </label>
  );
}

function RateField({ label, value, onChange, amount }) {
  return (
    <label className="boq-rate-field">
      <span>{label}</span>
      <div><input type="number" min="0" step="0.01" inputMode="decimal" value={value ?? ""} onChange={(event) => onChange(event.target.value)} /><b>%</b></div>
      <small>฿{formatPrice(amount)}</small>
    </label>
  );
}

function InsightCard({ icon, label, value }) {
  return (
    <div className="boq-insight-card">
      <i>{icon}</i>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function RateInput({ value, onChange, placeholder = "0.00", ariaLabel }) {
  return (
    <input
      className="boq-cell-input rate"
      type="number"
      min="0"
      step="0.01"
      inputMode="decimal"
      value={value ?? ""}
      placeholder={placeholder}
      aria-label={ariaLabel}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

function RowStatus({ row, priceMode }) {
  if (!row.quantity) return <span className="boq-row-state empty">ยังไม่กรอก</span>;
  if (priceMode === "future" && !row.futureComplete) return <span className="boq-row-state waiting">ขาด {row.missingFuture.join(" / ")}</span>;
  if (priceMode === "current" && !row.currentComplete) return <span className="boq-row-state missing">ขาด {row.missingCurrent.join(" / ")}</span>;
  return <span className="boq-row-state ready"><CheckCircle2 size={13} /> พร้อมคำนวณ</span>;
}

function RowDetails({ row, priceMode, onUpdate, onUpdateNumber, onDuplicate, onDelete, onMove }) {
  const effectiveMaterial = row.catalog?.material;
  const selectedRowMaterial = row.materialId ? MATERIAL_BY_ID.get(String(row.materialId)) : null;
  const unitOptions = UNIT_OPTIONS.includes(row.unit) ? UNIT_OPTIONS : [...UNIT_OPTIONS, row.unit];
  const toggleCost = (key) => onUpdate(row.id, {
    costTypes: { ...row.costTypes, [key]: !row.costTypes[key] },
  });

  return (
    <div className="boq-row-details">
      <div className="boq-details-heading">
        <div><Settings2 size={17} /><span><strong>รายละเอียดรายการ</strong><small>แก้สเปก หน่วย แหล่งราคา และองค์ประกอบต้นทุน</small></span></div>
        <RowStatus row={row} priceMode={priceMode} />
      </div>

      <div className="boq-detail-grid identity">
        <TextField label="รหัสรายการ" value={row.code} onChange={(value) => onUpdate(row.id, { code: value })} placeholder="เช่น C01" />
        <TextField label="ชื่อรายการ" value={row.name} onChange={(value) => onUpdate(row.id, { name: value })} placeholder="ระบุชื่องานหรือวัสดุ" />
        <TextField label="รายละเอียด / สเปก" value={row.spec} onChange={(value) => onUpdate(row.id, { spec: value })} placeholder="ขนาด รุ่น กำลังอัด ความหนา หรือมาตรฐาน" />
        <label className="boq-field">
          <span>หน่วยถอดแบบ</span>
          <select value={row.unit} onChange={(event) => onUpdate(row.id, { unit: event.target.value, materialId: "", materialRate: "", futureMaterialRate: "" })}>
            {unitOptions.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
          </select>
        </label>
      </div>

      <div className="boq-cost-type-block">
        <span>องค์ประกอบต้นทุนของรายการนี้</span>
        <div className="boq-cost-type-buttons">
          {Object.entries(COST_TYPES).map(([key, label]) => (
            <button type="button" key={key} className={row.costTypes[key] ? "active" : ""} onClick={() => toggleCost(key)}>
              <span>{row.costTypes[key] ? "✓" : "+"}</span>{label}
            </button>
          ))}
        </div>
        {!Object.values(row.costTypes).some(Boolean) && <small className="boq-inline-warning"><AlertTriangle size={13} /> เลือกต้นทุนอย่างน้อยหนึ่งประเภท</small>}
      </div>

      {row.costTypes.material && (
        <div className="boq-material-panel">
          <div className="boq-material-panel-title">
            <span><b>ราคาวัสดุ</b><small>ค้นหาและเลือกวัสดุตามรหัสจริง ระบบจะไม่เลือกสเปกให้อัตโนมัติ</small></span>
            <span className="boq-source-pill">{row.currentSource}</span>
          </div>
          <div className="boq-detail-grid rates">
            <div className="boq-field wide">
              <span>เลือกรายการราคากลางภาครัฐ</span>
              <MaterialPicker
                materials={materials}
                value={row.materialId || ""}
                onChange={(materialIdValue) => onUpdate(row.id, { materialId: materialIdValue, materialRate: "", futureMaterialRate: "" })}
                label="วัสดุจาก data.js"
                placeholder="ค้นหาชื่อ รหัส หมวด หรือหน่วย"
              />
              {selectedRowMaterial && convertedOfficialPrice(selectedRowMaterial, row.unit) === null && <small className="boq-inline-warning"><AlertTriangle size={13} /> หน่วยวัสดุ ({materialUnit(selectedRowMaterial)}) ไม่ตรงกับหน่วย BOQ ({row.unit}) ระบบจึงยังไม่ใช้ราคา</small>}
              {!row.materialId && number(row.rawMaterialRate) <= 0 && <small className="boq-inline-warning"><AlertTriangle size={13} /> ต้องเลือกวัสดุจริง หรือกรอกราคาวัสดุเองก่อนคำนวณ</small>}
            </div>
            <TextField
              label="ราคาวัสดุปัจจุบันที่กำหนดเอง"
              type="number"
              value={row.rawMaterialRate}
              onChange={(value) => onUpdateNumber(row.id, "materialRate", value)}
              placeholder={row.catalog?.price ? formatQty(row.catalog.price) : "บาทต่อหน่วย"}
              suffix={`บาท/${row.unit}`}
            />
            <TextField
              label="เผื่อสูญเสีย"
              type="number"
              value={row.wastePct}
              onChange={(value) => onUpdateNumber(row.id, "wastePct", value)}
              placeholder="0"
              suffix="%"
            />
            {priceMode === "future" && (
              <TextField
                label="ราคาวัสดุอนาคตที่กำหนดเอง"
                type="number"
                value={row.rawFutureMaterialRate}
                onChange={(value) => onUpdateNumber(row.id, "futureMaterialRate", value)}
                placeholder={row.futureMaterialRate ? formatQty(row.futureMaterialRate) : "เว้นว่างเพื่อใช้ ML"}
                suffix={`บาท/${row.unit}`}
              />
            )}
          </div>
          {effectiveMaterial && (
            <div className="boq-match-info">
              <Info size={14} />
              <span>จับคู่กับ <b>{materialName(effectiveMaterial)}</b> — ราคาต้นทาง ฿{formatPrice(row.catalog.originalPrice)}/{row.catalog.originalUnit || "หน่วย"}</span>
            </div>
          )}
        </div>
      )}

      <div className="boq-detail-grid rates compact">
        {row.costTypes.labor && <TextField label="ค่าแรงต่อหน่วย" type="number" value={row.rawLaborRate} onChange={(value) => onUpdateNumber(row.id, "laborRate", value)} placeholder="บาทต่อหน่วย" suffix={`บาท/${row.unit}`} />}
        {row.costTypes.equipment && <TextField label="เครื่องจักร/ขนส่งต่อหน่วย" type="number" value={row.rawEquipmentRate} onChange={(value) => onUpdateNumber(row.id, "equipmentRate", value)} placeholder="บาทต่อหน่วย" suffix={`บาท/${row.unit}`} />}
        <label className="boq-field wide-note">
          <span>หมายเหตุ</span>
          <textarea value={row.note || ""} rows="2" placeholder="เงื่อนไข ข้อยกเว้น หรือแหล่งใบเสนอราคา" onChange={(event) => onUpdate(row.id, { note: event.target.value })} />
        </label>
      </div>

      <div className="boq-row-detail-actions">
        <div>
          <button type="button" onClick={() => onMove(row.id, -1)}><ArrowUp size={15} /> เลื่อนขึ้น</button>
          <button type="button" onClick={() => onMove(row.id, 1)}><ArrowDown size={15} /> เลื่อนลง</button>
          <button type="button" onClick={() => onDuplicate(row.id)}><Copy size={15} /> ทำสำเนา</button>
        </div>
        <button type="button" className="danger" onClick={() => onDelete(row.id)}><Trash2 size={15} /> ลบรายการ</button>
      </div>
    </div>
  );
}

function DesktopRow({ row, priceMode, expanded, onToggleRow, onUpdate, onUpdateNumber, onDuplicate, onDelete, onMove, columnCount }) {
  const materialPlaceholder = row.currentMaterialRate > 0 ? formatQty(row.currentMaterialRate) : "0.00";
  return (
    <React.Fragment>
      <tr id={`boq-row-${row.id}`} className={`${expanded ? "expanded" : ""} ${row.quantity > 0 && !row.currentComplete ? "has-error" : ""}`}>
        <td className="boq-code-cell"><b>{row.code}</b></td>
        <td className="boq-description-cell">
          <button type="button" className="boq-row-title" onClick={() => onToggleRow(row.id)}>
            <span><strong>{row.name}</strong>{row.spec && <small>{row.spec}</small>}</span>
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          <RowStatus row={row} priceMode={priceMode} />
        </td>
        <td><RateInput ariaLabel={`ปริมาณ ${row.name}`} value={row.rawQuantity} onChange={(value) => onUpdateNumber(row.id, "quantity", value)} placeholder="0" /></td>
        <td className="boq-unit-cell">{row.unit}</td>
        <td>
          {row.costTypes.material ? <RateInput ariaLabel={`ราคาวัสดุ ${row.name}`} value={row.rawMaterialRate} onChange={(value) => onUpdateNumber(row.id, "materialRate", value)} placeholder={materialPlaceholder} /> : <span className="boq-na">—</span>}
        </td>
        <td>
          {row.costTypes.labor ? <RateInput ariaLabel={`ค่าแรง ${row.name}`} value={row.rawLaborRate} onChange={(value) => onUpdateNumber(row.id, "laborRate", value)} /> : <span className="boq-na">—</span>}
        </td>
        <td>
          {row.costTypes.equipment ? <RateInput ariaLabel={`เครื่องจักร ${row.name}`} value={row.rawEquipmentRate} onChange={(value) => onUpdateNumber(row.id, "equipmentRate", value)} /> : <span className="boq-na">—</span>}
        </td>
        <td className="boq-money-cell">{row.quantity ? row.currentComplete ? `฿${formatPrice(row.currentTotal)}` : <span className="missing">ขาดราคา</span> : "—"}</td>
        {priceMode === "future" && <td className="boq-money-cell future">{row.quantity ? row.futureComplete ? `฿${formatPrice(row.futureTotal)}` : <span className="waiting">รอ ML</span> : "—"}</td>}
        <td className="boq-actions-cell">
          <button type="button" title="รายละเอียด" aria-label={`รายละเอียด ${row.name}`} onClick={() => onToggleRow(row.id)}>{expanded ? <ChevronUp size={16} /> : <Settings2 size={16} />}</button>
          <button type="button" title="ทำสำเนา" aria-label={`ทำสำเนา ${row.name}`} onClick={() => onDuplicate(row.id)}><Copy size={15} /></button>
          <button type="button" className="danger" title="ลบ" aria-label={`ลบ ${row.name}`} onClick={() => onDelete(row.id)}><Trash2 size={15} /></button>
        </td>
      </tr>
      {expanded && (
        <tr className="boq-details-row">
          <td colSpan={columnCount}><RowDetails row={row} priceMode={priceMode} onUpdate={onUpdate} onUpdateNumber={onUpdateNumber} onDuplicate={onDuplicate} onDelete={onDelete} onMove={onMove} /></td>
        </tr>
      )}
    </React.Fragment>
  );
}

function MobileRow({ row, priceMode, expanded, onToggleRow, onUpdate, onUpdateNumber, onDuplicate, onDelete, onMove }) {
  return (
    <article id={`boq-mobile-row-${row.id}`} className={`boq-mobile-row ${expanded ? "expanded" : ""}`}>
      <button type="button" className="boq-mobile-row-head" onClick={() => onToggleRow(row.id)}>
        <span className="boq-mobile-code">{row.code}</span>
        <span className="boq-mobile-title"><strong>{row.name}</strong>{row.spec && <small>{row.spec}</small>}<RowStatus row={row} priceMode={priceMode} /></span>
        {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </button>
      <div className="boq-mobile-inputs">
        <label><span>ปริมาณ</span><div><RateInput ariaLabel={`ปริมาณ ${row.name}`} value={row.rawQuantity} onChange={(value) => onUpdateNumber(row.id, "quantity", value)} placeholder="0" /><b>{row.unit}</b></div></label>
        {row.costTypes.material && <label><span>วัสดุ/หน่วย</span><RateInput ariaLabel={`ราคาวัสดุ ${row.name}`} value={row.rawMaterialRate} onChange={(value) => onUpdateNumber(row.id, "materialRate", value)} placeholder={row.currentMaterialRate > 0 ? formatQty(row.currentMaterialRate) : "0.00"} /></label>}
        {row.costTypes.labor && <label><span>แรงงาน/หน่วย</span><RateInput ariaLabel={`ค่าแรง ${row.name}`} value={row.rawLaborRate} onChange={(value) => onUpdateNumber(row.id, "laborRate", value)} /></label>}
        {row.costTypes.equipment && <label><span>เครื่องจักร/หน่วย</span><RateInput ariaLabel={`เครื่องจักร ${row.name}`} value={row.rawEquipmentRate} onChange={(value) => onUpdateNumber(row.id, "equipmentRate", value)} /></label>}
      </div>
      <div className="boq-mobile-row-total">
        <span>รวมปัจจุบัน <strong>{row.quantity ? row.currentComplete ? `฿${formatPrice(row.currentTotal)}` : "ขาดราคา" : "—"}</strong></span>
        {priceMode === "future" && <span>รวมอนาคต <strong>{row.quantity ? row.futureComplete ? `฿${formatPrice(row.futureTotal)}` : "รอ ML" : "—"}</strong></span>}
        <button type="button" onClick={() => onToggleRow(row.id)}><Settings2 size={15} /> {expanded ? "ซ่อนรายละเอียด" : "ตั้งค่ารายการ"}</button>
      </div>
      {expanded && <RowDetails row={row} priceMode={priceMode} onUpdate={onUpdate} onUpdateNumber={onUpdateNumber} onDuplicate={onDuplicate} onDelete={onDelete} onMove={onMove} />}
    </article>
  );
}

function BOQSection({ section, rows, allRows, isCollapsed, priceMode, expandedRows, onToggleSection, onToggleRow, onAdd, onUpdate, onUpdateNumber, onDuplicate, onDelete, onMove }) {
  const activeRows = allRows.filter((row) => row.quantity > 0);
  const currentTotal = activeRows.reduce((sum, row) => sum + row.currentTotal, 0);
  const futureReady = activeRows.length > 0 && activeRows.every((row) => row.futureComplete);
  const futureTotal = futureReady ? activeRows.reduce((sum, row) => sum + number(row.futureTotal), 0) : null;
  const displayTotal = priceMode === "future" ? futureTotal : currentTotal;
  const columnCount = priceMode === "future" ? 10 : 9;

  return (
    <section className="boq-section-card" id={`boq-section-${section.id}`}>
      <button type="button" className="boq-section-head" onClick={onToggleSection} aria-expanded={!isCollapsed}>
        <span className="boq-section-code">{section.code}</span>
        <span className="boq-section-copy">
          <small>{DISCIPLINES[section.discipline]}</small>
          <strong>{section.title}</strong>
          <em>{activeRows.length} รายการที่กรอก • {allRows.length} รายการทั้งหมด</em>
        </span>
        <span className="boq-section-total"><small>{priceMode === "future" ? "รวมอนาคต" : "รวมปัจจุบัน"}</small><strong>{activeRows.length ? displayTotal === null ? "รอข้อมูล" : `฿${formatPrice(displayTotal)}` : "฿0"}</strong></span>
        <span className="boq-section-chevron">{isCollapsed ? <ChevronDown size={20} /> : <ChevronUp size={20} />}</span>
      </button>

      {!isCollapsed && (
        <div className="boq-section-body">
          {!rows.length ? (
            <div className="boq-no-results"><Search size={20} /><span><b>ไม่พบรายการตามตัวกรอง</b><small>ลองล้างคำค้นหรือเพิ่มรายการใหม่ในหมวดนี้</small></span></div>
          ) : (
            <>
              <div className="boq-table-scroll">
                <table className="boq-table">
                  <thead><tr>
                    <th>รหัส</th><th>รายการ / สเปก</th><th>ปริมาณ</th><th>หน่วย</th><th>วัสดุ/หน่วย</th><th>แรงงาน/หน่วย</th><th>เครื่องจักร/หน่วย</th><th>รวมปัจจุบัน</th>{priceMode === "future" && <th>รวมอนาคต</th>}<th aria-label="การทำงาน" />
                  </tr></thead>
                  <tbody>
                    {rows.map((row) => <DesktopRow key={row.id} row={row} priceMode={priceMode} expanded={expandedRows.has(row.id)} onToggleRow={onToggleRow} onUpdate={onUpdate} onUpdateNumber={onUpdateNumber} onDuplicate={onDuplicate} onDelete={onDelete} onMove={onMove} columnCount={columnCount} />)}
                  </tbody>
                </table>
              </div>
              <div className="boq-mobile-list">
                {rows.map((row) => <MobileRow key={row.id} row={row} priceMode={priceMode} expanded={expandedRows.has(row.id)} onToggleRow={onToggleRow} onUpdate={onUpdate} onUpdateNumber={onUpdateNumber} onDuplicate={onDuplicate} onDelete={onDelete} onMove={onMove} />)}
              </div>
            </>
          )}
          <button type="button" className="boq-add-row" onClick={onAdd}><Plus size={17} /> เพิ่มรายการใน{section.title}</button>
        </div>
      )}
    </section>
  );
}

const BOQ_STYLES = `
  :root {
    --boq-ink: #0f172a;
    --boq-muted: #64748b;
    --boq-line: rgba(148, 163, 184, .22);
    --boq-soft: rgba(148, 163, 184, .045);
    --boq-green: #16745c;
    --boq-green-dark: #125541;
    --boq-green-soft: rgba(22, 116, 92, .1);
    --boq-orange: #d97706;
    --boq-orange-soft: rgba(217, 119, 6, .09);
    --boq-red: #dc2626;
    --boq-yellow: #b45309;
    --boq-shadow: 0 10px 30px rgba(15, 23, 42, .08);
  }

  .boq-header-actions,
  .boq-cost-type-buttons,
  .boq-row-detail-actions,
  .boq-row-detail-actions > div {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .boq-header-actions button,
  .boq-template-start button,
  .boq-draft-tool-actions button,
  .boq-import-drop-action button,
  .boq-download-full,
  .boq-row-detail-actions button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
  }

  .boq-header-actions .boq-save-btn { min-height: 44px; padding: 0 18px; border: 1px solid rgba(22, 116, 92, .3); border-radius: 10px; color: #125541; background: rgba(22, 116, 92, .05); font-weight: 700; box-shadow: none; transition: background .15s ease, border-color .15s ease, transform .15s ease; }
  .boq-header-actions .boq-save-btn:hover { background: rgba(22, 116, 92, .1); border-color: rgba(22, 116, 92, .5); transform: translateY(-1px); }
  .boq-save-btn.saved { color: var(--boq-green-dark); border-color: #8bc9bb; background: var(--boq-green-soft); }
  .boq-save-btn.saved:hover { background: #ddf3ec; border-color: #6fbba7; }
  .boq-save-btn.unsaved { color: #945700; border-color: #e9bd70; background: #fff9e9; }
  .boq-save-btn.unsaved:hover { background: #fff2d2; border-color: #dba748; }
  .boq-header-actions .primary-btn { min-height: 44px; padding: 0 20px; border-radius: 10px; font-weight: 700; box-shadow: 0 1px 2px rgba(15, 23, 42, .06); transition: transform .15s ease, box-shadow .15s ease; }
  .boq-header-actions .primary-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 10px 22px rgba(22, 116, 92, .25); }

  .boq-save-feedback {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    margin: 0 0 14px;
    padding: 11px 14px;
    border: 1px solid #ead59d;
    border-radius: 12px;
    color: #805711;
    background: #fffbef;
  }
  .boq-save-feedback.saved { color: var(--boq-green-dark); border-color: #a8d8cc; background: #effaf7; }
  .boq-save-feedback.error { color: #a62d36; border-color: #efb7bb; background: #fff4f4; }
  .boq-save-feedback div { display: grid; gap: 2px; }
  .boq-save-feedback strong { font-size: 13px; }
  .boq-save-feedback span { font-size: 12px; }

  .boq-flow {
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 0 16px;
    padding: 13px 16px;
    border: 1px solid var(--boq-line);
    border-radius: 16px;
    background: #fff;
    box-shadow: var(--boq-shadow);
  }
  .boq-flow > div { display: flex; align-items: center; gap: 8px; color: var(--boq-muted); font-size: 12px; white-space: nowrap; }
  .boq-flow > div b { display: grid; place-items: center; width: 27px; height: 27px; border-radius: 50%; color: #fff; background: #9aaba7; }
  .boq-flow > div.active { color: var(--boq-green-dark); font-weight: 700; }
  .boq-flow > div.active b { background: var(--boq-green); }
  .boq-flow > i { width: min(8vw, 100px); height: 1px; margin: 0 10px; background: #d8e3e0; }

  .boq-notice {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    margin-bottom: 16px;
    padding: 15px 17px;
    border: 1px solid #f0c99c;
    border-left: 4px solid var(--boq-orange);
    border-radius: 13px;
    color: #664325;
    background: #fffaf4;
  }
  .boq-notice > svg { flex: 0 0 auto; color: var(--boq-orange); margin-top: 1px; }
  .boq-notice div { display: grid; gap: 4px; }
  .boq-notice strong { font-size: 14px; }
  .boq-notice span, .boq-notice a { font-size: 12px; line-height: 1.55; }
  .boq-notice a { width: fit-content; color: var(--boq-green); font-weight: 700; }

  .boq-setup-card,
  .boq-template-card,
  .boq-price-mode-card,
  .boq-work-toolbar,
  .boq-insights {
    margin-bottom: 16px;
    padding: 20px;
    border: 1px solid var(--boq-line);
    border-radius: 17px;
    background: #fff;
    box-shadow: var(--boq-shadow);
  }

  .boq-step-head { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 17px; }
  .boq-step-number { display: grid; place-items: center; flex: 0 0 auto; width: 32px; height: 32px; border-radius: 10px; color: #fff; background: var(--boq-green); font-weight: 800; }
  .boq-step-head h2 { margin: 0; color: var(--boq-ink); font-size: 17px; line-height: 1.3; }
  .boq-step-head p { margin: 3px 0 0; color: var(--boq-muted); font-size: 12px; line-height: 1.5; }

  .boq-project-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 13px; }
  .boq-field { display: grid; align-content: start; gap: 6px; min-width: 0; color: var(--boq-ink); font-size: 12px; font-weight: 700; }
  .boq-field > span { display: flex; align-items: center; gap: 5px; min-height: 18px; }
  .boq-field input,
  .boq-field select,
  .boq-field textarea,
  .boq-textarea-field textarea,
  .boq-search input,
  .boq-horizon-field input,
  .boq-horizon-field select,
  .boq-rate-field input,
  .boq-cell-input {
    width: 100%;
    min-width: 0;
    box-sizing: border-box;
    border: 1px solid #ccd9d6;
    border-radius: 9px;
    outline: none;
    color: var(--boq-ink);
    background: #fff;
    font: inherit;
    transition: border-color .16s ease, box-shadow .16s ease;
  }
  .boq-field input,
  .boq-field select { height: 42px; padding: 0 11px; }
  .boq-field textarea { padding: 10px 11px; resize: vertical; line-height: 1.5; }
  .boq-field input:focus,
  .boq-field select:focus,
  .boq-field textarea:focus,
  .boq-textarea-field textarea:focus,
  .boq-search input:focus,
  .boq-horizon-field input:focus,
  .boq-horizon-field select:focus,
  .boq-rate-field input:focus,
  .boq-cell-input:focus { border-color: #4ba994; box-shadow: 0 0 0 3px rgba(8, 119, 100, .11); }
  .boq-field-control { position: relative; min-width: 0; }
  .boq-field-control.has-suffix input { padding-right: 72px; }
  .boq-field-control em { position: absolute; top: 50%; right: 10px; transform: translateY(-50%); color: var(--boq-muted); font-size: 12px; font-style: normal; font-weight: 600; pointer-events: none; }
  .boq-field input[type="date"] {
    -webkit-appearance: none;
    appearance: none;
    min-width: 0;
    max-width: 100%;
    font-weight: 500;
    text-align: left;
  }
  .boq-field input[type="date"]::-webkit-date-and-time-value { margin: 0; text-align: left; }
  .boq-field input[type="date"]::-webkit-calendar-picker-indicator { margin-left: 0; padding: 0; }
  .boq-textarea-field { display: grid; gap: 6px; margin-top: 13px; color: var(--boq-ink); font-size: 12px; font-weight: 700; }
  .boq-textarea-field span { display: flex; gap: 6px; align-items: baseline; }
  .boq-textarea-field small { color: var(--boq-muted); font-weight: 500; }
  .boq-textarea-field textarea { min-height: 74px; padding: 10px 11px; resize: vertical; font: inherit; line-height: 1.5; }

  .boq-template-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; }
  .boq-template-grid > button,
  .boq-price-mode-grid > button {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    width: 100%;
    min-height: 92px;
    padding: 14px;
    border: 1px solid var(--boq-line);
    border-radius: 13px;
    color: var(--boq-ink);
    background: #fff;
    text-align: left;
    cursor: pointer;
  }
  .boq-template-grid > button:hover,
  .boq-price-mode-grid > button:hover { border-color: #91c9bc; background: #f8fcfb; }
  .boq-template-grid > button.active,
  .boq-price-mode-grid > button.active { border-color: var(--boq-green); background: var(--boq-green-soft); box-shadow: inset 0 0 0 1px var(--boq-green); }
  .boq-template-grid > button > svg:first-child,
  .boq-price-mode-grid > button > svg:first-child { flex: 0 0 auto; color: var(--boq-green); }
  .boq-template-grid > button > svg:last-child { margin-left: auto; color: var(--boq-green); }
  .boq-template-grid span,
  .boq-price-mode-grid button span { display: grid; gap: 3px; min-width: 0; }
  .boq-template-grid strong,
  .boq-price-mode-grid strong { font-size: 13px; line-height: 1.4; }
  .boq-template-grid small,
  .boq-price-mode-grid small { color: var(--boq-muted); font-size: 11px; line-height: 1.45; }
  .boq-template-grid em { color: var(--boq-green-dark); font-size: 12px; font-style: normal; font-weight: 700; }
  .boq-template-start { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: 18px; margin-top: 16px; padding: 15px 16px; border: 1px solid #bfdbfe; border-radius: 14px; background: linear-gradient(135deg, #f8fbff 0%, #eff6ff 100%); }
  .boq-template-start-copy { display: grid; gap: 3px; width: 100%; min-width: 0; }
  .boq-method-label { color: var(--boq-green-dark); font-size: 10px; font-weight: 900; letter-spacing: .025em; }
  .boq-template-start-copy > strong { color: var(--boq-ink); font-size: 14px; line-height: 1.45; }
  .boq-template-start-copy > small { color: var(--boq-muted); font-size: 11px; line-height: 1.45; }
  .boq-template-start > .boq-use-template-btn { width: auto !important; min-width: 170px; max-width: 220px; min-height: 44px; padding: 0 20px; justify-self: end; align-self: center; flex: none !important; border-radius: 10px; font-weight: 800; box-shadow: 0 7px 18px rgba(22, 116, 92, .18); transition: transform .15s ease, box-shadow .15s ease; }
  .boq-template-start > .boq-use-template-btn:hover:not(:disabled) { box-shadow: 0 11px 24px rgba(22, 116, 92, .26); transform: translateY(-1px); }

  .boq-start-divider { display: flex; align-items: center; gap: 12px; margin: 12px 0; color: #94a3b8; }
  .boq-start-divider::before, .boq-start-divider::after { content: ""; flex: 1 1 auto; height: 1px; background: var(--boq-line); }
  .boq-start-divider span { display: grid; place-items: center; min-width: 38px; height: 24px; border: 1px solid var(--boq-line); border-radius: 999px; background: #fff; font-size: 10px; font-weight: 800; }

  .boq-draft-tools { display: flex; align-items: center; justify-content: space-between; gap: 14px; margin-top: 13px; padding: 11px 13px; border: 1px solid var(--boq-line); border-radius: 12px; background: #f8fafc; }
  .boq-draft-tools-copy { display: flex; align-items: center; gap: 9px; min-width: 0; color: #64748b; }
  .boq-draft-tools-copy > svg { flex: 0 0 auto; }
  .boq-draft-tools-copy > span { display: grid; gap: 1px; min-width: 0; }
  .boq-draft-tools-copy strong { color: #334155; font-size: 11px; }
  .boq-draft-tools-copy small { color: var(--boq-muted); font-size: 10px; line-height: 1.4; }
  .boq-draft-tool-actions { display: flex; align-items: center; gap: 7px; flex: 0 0 auto; }
  .boq-draft-tool-actions .secondary-btn { min-height: 36px; padding: 0 12px; border: 1px solid #cbd5e1; border-radius: 9px; color: #475569; background: #fff; box-shadow: none; font-size: 11px; font-weight: 700; transition: border-color .15s ease, color .15s ease, background .15s ease; }
  .boq-draft-tool-actions .secondary-btn:hover { border-color: #94a3b8; color: var(--boq-ink); background: #f8fafc; }
  .boq-draft-tool-actions .danger { border-color: rgba(220, 38, 38, .2); color: #b91c1c; background: #fffafa; }
  .boq-draft-tool-actions .danger:hover { border-color: rgba(220, 38, 38, .42); color: #991b1b; background: #fef2f2; }

  .boq-price-mode-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)) minmax(240px, .8fr); gap: 10px; }
  .boq-price-mode-grid > button { min-height: 98px; }
  .boq-horizon-field { display: grid; align-content: center; gap: 7px; padding: 12px 14px; border: 1px solid #bcdcd4; border-radius: 13px; color: var(--boq-ink); background: #f5fbf9; }
  .boq-horizon-field > span { font-size: 11px; font-weight: 700; }
  .boq-horizon-field > div { display: grid; grid-template-columns: minmax(0, 1fr) 100px; }
  .boq-horizon-field input, .boq-horizon-field select { height: 42px; padding: 0 10px; border-radius: 9px 0 0 9px; font-size: 16px; font-weight: 800; text-align: center; }
  .boq-horizon-field select { border-left: 0; border-radius: 0 9px 9px 0; font-size: 13px; }
  .boq-horizon-field small { color: var(--boq-green-dark); font-size: 12px; font-weight: 700; }
  .boq-long-horizon { display: flex; align-items: flex-start; gap: 7px; margin-top: 11px; padding: 9px 11px; border-radius: 9px; color: #8a5b03; background: #fff8df; font-size: 11px; line-height: 1.45; }

  .boq-toolbar-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
  .boq-search { display: flex; align-items: center; gap: 8px; flex: 1 1 360px; max-width: 560px; height: 42px; padding: 0 11px; border: 1px solid #ccd9d6; border-radius: 10px; color: var(--boq-muted); background: #fff; }
  .boq-search input { height: 38px; padding: 0; border: 0; box-shadow: none; font-size: 13px; }
  .boq-search input:focus { box-shadow: none; }
  .boq-filter-tabs { display: flex; align-items: center; gap: 5px; padding: 4px; border-radius: 10px; background: var(--boq-soft); }
  .boq-filter-tabs button { min-height: 44px; padding: 0 11px; border: 0; border-radius: 7px; color: var(--boq-muted); background: transparent; font: inherit; font-size: 11px; font-weight: 700; cursor: pointer; }
  .boq-filter-tabs button.active { color: var(--boq-green-dark); background: #fff; box-shadow: 0 2px 8px rgba(21, 67, 58, .1); }
  .boq-filter-tabs button.warning { color: #9b5f00; }
  .boq-discipline-overview { display: grid; grid-template-columns: repeat(3, 1fr); gap: 9px; margin-top: 13px; }
  .boq-discipline-overview button { display: flex; align-items: center; gap: 9px; padding: 11px 12px; border: 1px solid var(--boq-line); border-radius: 11px; color: var(--boq-ink); background: #fff; text-align: left; cursor: pointer; }
  .boq-discipline-overview button:hover { border-color: #9ecfc3; background: #f7fcfa; }
  .boq-discipline-overview svg { flex: 0 0 auto; color: var(--boq-green); }
  .boq-discipline-overview span { display: grid; gap: 2px; }
  .boq-discipline-overview strong { font-size: 12px; }
  .boq-discipline-overview small { color: var(--boq-muted); font-size: 12px; }
  .boq-category-nav { display: flex; gap: 6px; margin-top: 10px; padding: 3px 1px 5px; overflow-x: auto; scrollbar-width: thin; -webkit-overflow-scrolling: touch; }
  .boq-category-nav button { display: flex; align-items: center; gap: 5px; flex: 0 0 auto; min-height: 44px; padding: 4px 9px 4px 5px; border: 1px solid var(--boq-line); border-radius: 999px; color: var(--boq-muted); background: #fff; font: inherit; font-size: 12px; cursor: pointer; }
  .boq-category-nav b { display: grid; place-items: center; width: 22px; height: 22px; border-radius: 50%; color: #fff; background: var(--boq-green); font-size: 12px; }

  .boq-layout { display: grid; grid-template-columns: minmax(0, 1fr) 300px; align-items: start; gap: 16px; }
  .boq-main { display: grid; gap: 10px; min-width: 0; }
  .boq-section-card { overflow: hidden; border: 1px solid var(--boq-line); border-radius: 15px; background: #fff; box-shadow: 0 5px 20px rgba(20, 60, 53, .05); scroll-margin-top: 14px; }
  .boq-section-head { display: grid; grid-template-columns: 42px minmax(0, 1fr) auto 28px; align-items: center; gap: 11px; width: 100%; padding: 13px 14px; border: 0; color: var(--boq-ink); background: #fff; text-align: left; cursor: pointer; }
  .boq-section-head:hover { background: #fbfdfc; }
  .boq-section-code { display: grid; place-items: center; width: 40px; height: 40px; border-radius: 11px; color: #fff; background: linear-gradient(135deg, var(--boq-green), #11977f); font-weight: 900; }
  .boq-section-copy { display: grid; gap: 1px; min-width: 0; }
  .boq-section-copy small { color: var(--boq-green); font-size: 11px; font-weight: 800; text-transform: uppercase; }
  .boq-section-copy strong { font-size: 14px; }
  .boq-section-copy em { color: var(--boq-muted); font-size: 12px; font-style: normal; }
  .boq-section-total { display: grid; justify-items: end; gap: 1px; padding-left: 16px; border-left: 1px solid var(--boq-line); }
  .boq-section-total small { color: var(--boq-muted); font-size: 11px; }
  .boq-section-total strong { color: var(--boq-green-dark); font-size: 14px; }
  .boq-section-chevron { color: var(--boq-muted); }
  .boq-section-body { border-top: 1px solid var(--boq-line); }

  .boq-table-scroll { width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; }
  .boq-table { width: 100%; min-width: 1000px; border-collapse: collapse; table-layout: fixed; color: var(--boq-ink); font-size: 11px; }
  .boq-table th { padding: 9px 7px; border-bottom: 1px solid var(--boq-line); color: #60736f; background: #f5f9f8; font-size: 11px; font-weight: 800; text-align: right; white-space: nowrap; }
  .boq-table th:nth-child(1) { width: 54px; text-align: left; }
  .boq-table th:nth-child(2) { width: 250px; text-align: left; }
  .boq-table th:nth-child(3) { width: 78px; }
  .boq-table th:nth-child(4) { width: 54px; text-align: center; }
  .boq-table th:nth-child(5), .boq-table th:nth-child(6), .boq-table th:nth-child(7) { width: 91px; }
  .boq-table th:nth-last-child(1) { width: 94px; }
  .boq-table td { padding: 7px; border-bottom: 1px solid #edf2f1; vertical-align: middle; }
  .boq-table tbody > tr:not(.boq-details-row):hover { background: #fbfdfc; }
  .boq-table tr.expanded { background: #f5fbf9; }
  .boq-table tr.has-error { box-shadow: inset 3px 0 0 #e0a13a; }
  .boq-code-cell { color: var(--boq-green-dark); font-size: 12px; }
  .boq-row-title { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; width: 100%; padding: 0; border: 0; color: var(--boq-ink); background: transparent; text-align: left; cursor: pointer; }
  .boq-row-title span { display: grid; gap: 2px; min-width: 0; }
  .boq-row-title strong { overflow: hidden; font-size: 11px; line-height: 1.4; text-overflow: ellipsis; }
  .boq-row-title small { overflow: hidden; color: var(--boq-muted); font-size: 11px; line-height: 1.35; text-overflow: ellipsis; white-space: nowrap; }
  .boq-row-title svg { flex: 0 0 auto; color: #8ca09c; }
  .boq-cell-input { height: 34px; padding: 0 7px; font-size: 11px; text-align: right; }
  .boq-cell-input::placeholder { color: #9aaba7; opacity: 1; }
  .boq-unit-cell { color: var(--boq-muted); text-align: center; white-space: nowrap; }
  .boq-money-cell { color: var(--boq-green-dark); font-size: 12px; font-weight: 800; text-align: right; white-space: nowrap; }
  .boq-money-cell.future { color: #336eaa; }
  .boq-money-cell .missing { color: #a66600; }
  .boq-money-cell .waiting { color: #58738c; }
  .boq-na { display: block; color: #a8b5b2; text-align: center; }
  .boq-actions-cell { white-space: nowrap; text-align: right; }
  .boq-actions-cell button { display: inline-grid; place-items: center; width: 34px; height: 34px; margin-left: 4px; padding: 0; border: 1px solid #d7e2df; border-radius: 7px; color: #5d746f; background: #fff; cursor: pointer; }
  .boq-actions-cell button:hover { color: var(--boq-green); border-color: #8ec7ba; }
  .boq-actions-cell button.danger:hover { color: var(--boq-red); border-color: #e6adb1; }
  .boq-details-row > td { padding: 0; background: #f4f9f8; }

  .boq-row-state { display: inline-flex; align-items: center; gap: 3px; width: fit-content; margin-top: 4px; padding: 2px 6px; border-radius: 999px; font-size: 10px; font-weight: 800; }
  .boq-row-state.empty { color: #71837f; background: #edf2f1; }
  .boq-row-state.missing { color: #9a5e00; background: #fff3d9; }
  .boq-row-state.waiting { color: #426783; background: #eaf2f8; }
  .boq-row-state.ready { color: #0b6d5a; background: #e3f5f0; }

  .boq-row-details { padding: 16px; border-top: 1px solid #cfe1dc; border-bottom: 1px solid #d8e5e2; color: var(--boq-ink); background: #f6faf9; }
  .boq-details-heading { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 13px; }
  .boq-details-heading > div { display: flex; align-items: flex-start; gap: 8px; }
  .boq-details-heading svg { color: var(--boq-green); }
  .boq-details-heading span { display: grid; gap: 2px; }
  .boq-details-heading strong { font-size: 12px; }
  .boq-details-heading small { color: var(--boq-muted); font-size: 11px; }
  .boq-detail-grid { display: grid; gap: 11px; }
  .boq-detail-grid.identity { grid-template-columns: 100px 1.15fr 1.6fr 120px; }
  .boq-detail-grid.rates { grid-template-columns: minmax(260px, 1.7fr) repeat(3, minmax(150px, 1fr)); }
  .boq-detail-grid.rates.compact { grid-template-columns: repeat(2, minmax(170px, .65fr)) minmax(260px, 1.7fr); margin-top: 12px; }
  .boq-field.wide-note textarea { min-height: 42px; }
  .boq-cost-type-block { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-top: 12px; padding: 10px 12px; border: 1px solid #dce7e4; border-radius: 10px; background: #fff; }
  .boq-cost-type-block > span { color: var(--boq-muted); font-size: 12px; font-weight: 700; }
  .boq-cost-type-buttons button { display: inline-flex; align-items: center; gap: 5px; min-height: 44px; padding: 0 10px; border: 1px solid #d5e1de; border-radius: 999px; color: #657975; background: #fff; font: inherit; font-size: 12px; font-weight: 700; cursor: pointer; }
  .boq-cost-type-buttons button span { display: grid; place-items: center; width: 16px; height: 16px; border-radius: 50%; color: #fff; background: #9baba8; }
  .boq-cost-type-buttons button.active { color: var(--boq-green-dark); border-color: #8fc9bc; background: var(--boq-green-soft); }
  .boq-cost-type-buttons button.active span { background: var(--boq-green); }
  .boq-inline-warning { display: flex; align-items: center; gap: 4px; margin-top: 4px; color: #a06100; font-size: 11px; font-weight: 700; }
  .boq-material-panel { margin-top: 12px; padding: 12px; border: 1px solid #cae1db; border-radius: 11px; background: #fff; }
  .boq-material-panel-title { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; margin-bottom: 11px; }
  .boq-material-panel-title > span:first-child { display: grid; gap: 2px; }
  .boq-material-panel-title b { font-size: 11px; }
  .boq-material-panel-title small { color: var(--boq-muted); font-size: 11px; line-height: 1.4; }
  .boq-material-search { position: relative; display: flex; align-items: center; }
  .boq-material-search svg { position: absolute; left: 11px; z-index: 1; color: var(--boq-muted); pointer-events: none; }
  .boq-material-search input { padding-left: 34px; }
  .boq-source-pill { flex: 0 0 auto; padding: 4px 8px; border-radius: 999px; color: var(--boq-green-dark); background: var(--boq-green-soft); font-size: 11px; font-weight: 800; }
  .boq-match-info { display: flex; align-items: flex-start; gap: 6px; margin-top: 9px; color: var(--boq-muted); font-size: 11px; line-height: 1.45; }
  .boq-match-info svg { flex: 0 0 auto; color: var(--boq-green); }
  .boq-row-detail-actions { justify-content: space-between; margin-top: 13px; padding-top: 12px; border-top: 1px solid #dbe6e3; }
  .boq-row-detail-actions button { min-height: 44px; padding: 0 10px; border: 1px solid #d3dfdc; border-radius: 8px; color: #5f746f; background: #fff; font: inherit; font-size: 12px; font-weight: 700; cursor: pointer; }
  .boq-row-detail-actions button:hover { color: var(--boq-green); border-color: #91c8bc; }
  .boq-row-detail-actions button.danger { color: var(--boq-red); }

  .boq-mobile-list { display: none; }
  .boq-no-results { display: flex; align-items: center; justify-content: center; gap: 9px; min-height: 110px; color: var(--boq-muted); }
  .boq-no-results span { display: grid; gap: 2px; }
  .boq-no-results b { color: var(--boq-ink); font-size: 12px; }
  .boq-no-results small { font-size: 12px; }
  .boq-add-row { display: flex; align-items: center; justify-content: center; gap: 6px; width: calc(100% - 20px); min-height: 44px; margin: 10px; border: 1px dashed #8cc6b9; border-radius: 9px; color: var(--boq-green); background: #f7fcfb; font: inherit; font-size: 11px; font-weight: 800; cursor: pointer; }
  .boq-add-row:hover { background: var(--boq-green-soft); }

  .boq-summary-wrap { position: sticky; top: 14px; scroll-margin-top: 14px; }
  .boq-summary { padding: 17px; border: 1px solid #bddbd4; border-radius: 16px; background: linear-gradient(180deg, #f4fbf9 0%, #fff 42%); box-shadow: 0 12px 32px rgba(13, 83, 70, .1); }
  .boq-summary-step { display: flex; align-items: center; gap: 7px; margin-bottom: 13px; color: var(--boq-green-dark); font-size: 12px; font-weight: 800; }
  .boq-summary-step b { display: grid; place-items: center; width: 22px; height: 22px; border-radius: 50%; color: #fff; background: var(--boq-green); }
  .boq-summary .eyebrow { color: var(--boq-green); font-size: 10px; font-weight: 900; letter-spacing: .08em; }
  .boq-summary h3 { margin: 4px 0 6px; color: var(--boq-ink); font-size: 14px; }
  .boq-grand-total { color: var(--boq-green-dark); font-size: 27px; font-weight: 900; line-height: 1.15; word-break: break-word; }
  .boq-summary-caption { margin-top: 5px; color: var(--boq-muted); font-size: 11px; line-height: 1.45; }
  .boq-validation { display: flex; align-items: flex-start; gap: 6px; margin-top: 11px; padding: 8px 9px; border-radius: 8px; font-size: 11px; font-weight: 700; line-height: 1.4; }
  .boq-validation.ready { color: #086552; background: #e6f6f1; }
  .boq-validation.incomplete { color: #8b5b02; background: #fff4da; }
  .boq-validation svg { flex: 0 0 auto; }
  .boq-cost-split { display: grid; gap: 7px; margin-top: 13px; padding: 12px 0; border-top: 1px solid #dce9e6; border-bottom: 1px solid #dce9e6; }
  .boq-cost-split > div { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
  .boq-cost-split span { color: var(--boq-muted); font-size: 12px; }
  .boq-cost-split b { color: var(--boq-ink); font-size: 11px; }
  .boq-markups { display: grid; gap: 7px; margin-top: 12px; }
  .boq-rate-field { display: grid; grid-template-columns: minmax(0, 1fr) 72px 82px; align-items: center; gap: 6px; color: var(--boq-muted); font-size: 11px; }
  .boq-rate-field > div { position: relative; }
  .boq-rate-field input { height: 30px; padding: 0 22px 0 7px; font-size: 12px; text-align: right; }
  .boq-rate-field > div b { position: absolute; top: 50%; right: 7px; transform: translateY(-50%); color: var(--boq-muted); font-size: 11px; }
  .boq-rate-field small { color: var(--boq-ink); font-size: 11px; font-weight: 800; text-align: right; }
  .boq-per-sqm { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: 12px; padding: 9px; border-radius: 8px; background: #f0f6f4; }
  .boq-per-sqm span { color: var(--boq-muted); font-size: 11px; }
  .boq-per-sqm strong { color: var(--boq-green-dark); font-size: 11px; }
  .boq-future-box { display: grid; gap: 2px; margin-top: 12px; padding: 10px; border: 1px solid #cbdfea; border-radius: 9px; background: #f2f8fc; }
  .boq-future-box > span { color: #5b7383; font-size: 11px; }
  .boq-future-box > strong { color: #315f80; font-size: 14px; }
  .boq-future-box > em { color: #6e8391; font-size: 10px; font-style: normal; }
  .boq-future-box small { margin-top: 4px; font-size: 11px; font-weight: 800; }
  .boq-future-box .up { color: #dc2626; }
  .boq-future-box .down { color: #059669; }
  .boq-future-box .waiting { color: #6c7d88; }
  .boq-official-disclaimer { display: flex; align-items: flex-start; gap: 6px; margin-top: 12px; padding: 9px; border-radius: 8px; color: #7d5315; background: var(--boq-orange-soft); font-size: 10px; line-height: 1.5; }
  .boq-official-disclaimer svg { flex: 0 0 auto; color: var(--boq-orange); }
  .boq-download-full { width: 100%; min-height: 41px; margin-top: 12px; }

  .boq-insight-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
  .boq-insight-card { display: grid; grid-template-columns: 31px minmax(0, 1fr); grid-template-rows: auto auto; column-gap: 9px; padding: 12px; border: 1px solid var(--boq-line); border-radius: 11px; background: #fbfdfc; }
  .boq-insight-card i { display: grid; place-items: center; grid-row: 1 / 3; width: 31px; height: 31px; border-radius: 9px; color: var(--boq-green); background: var(--boq-green-soft); }
  .boq-insight-card span { align-self: end; overflow: hidden; color: var(--boq-muted); font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }
  .boq-insight-card strong { overflow: hidden; color: var(--boq-ink); font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }
  .boq-mobile-total-bar { display: none; }

  .boq-import-feedback { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: start; gap: 10px; margin: 0 0 14px; padding: 12px 14px; border: 1px solid #a7d8c8; border-radius: 12px; color: #175b4e; background: #effaf7; }
  .boq-import-feedback > svg { margin-top: 1px; }
  .boq-import-feedback > div { display: grid; gap: 2px; }
  .boq-import-feedback strong { font-size: 13px; }
  .boq-import-feedback span { font-size: 12px; line-height: 1.5; }
  .boq-import-feedback button { width: 28px; height: 28px; border: 0; border-radius: 8px; color: inherit; background: transparent; font-size: 20px; line-height: 1; }

  .boq-import-dropzone { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: center; gap: 15px; width: 100%; min-height: 116px; box-sizing: border-box; padding: 18px; border: 1.5px dashed #93c5fd; border-radius: 15px; color: var(--boq-ink); background: linear-gradient(135deg, #fbfdff 0%, #f8fbff 100%); transition: border-color .18s ease, background .18s ease, box-shadow .18s ease, transform .18s ease; }
  .boq-import-dropzone:hover { border-color: #60a5fa; background: #f5f9ff; box-shadow: inset 0 0 0 1px rgba(22, 116, 92, .04); }
  .boq-import-dropzone.dragging { border-color: var(--boq-green); border-style: solid; background: #eff6ff; box-shadow: inset 0 0 0 2px rgba(22, 116, 92, .12); transform: translateY(-1px); }
  .boq-import-drop-icon { display: grid; place-items: center; width: 50px; height: 50px; border: 1px solid #dbeafe; border-radius: 14px; color: var(--boq-green); background: #fff; box-shadow: 0 7px 20px rgba(22, 116, 92, .1); }
  .boq-import-drop-copy { display: grid; gap: 4px; min-width: 0; }
  .boq-import-drop-copy > strong { color: var(--boq-ink); font-size: 14px; line-height: 1.35; }
  .boq-import-drop-copy > small { max-width: 680px; color: var(--boq-muted); font-size: 11px; line-height: 1.5; }
  .boq-import-formats { display: flex; align-items: center; gap: 5px; flex-wrap: wrap; margin-top: 4px; }
  .boq-import-formats span { padding: 3px 7px; border: 1px solid #dbeafe; border-radius: 999px; color: #125541; background: #fff; font-size: 9px; font-weight: 900; letter-spacing: .025em; }
  .boq-import-drop-action { display: grid; justify-items: stretch; gap: 6px; min-width: 166px; }
  .boq-import-drop-action .primary-btn { min-height: 44px; padding: 0 16px; border-radius: 10px; font-weight: 800; white-space: nowrap; box-shadow: 0 7px 18px rgba(22, 116, 92, .18); }
  .boq-import-drop-action > small { display: flex; align-items: center; justify-content: center; gap: 4px; color: #64748b; font-size: 9px; white-space: nowrap; }
  .boq-import-drop-action > small svg { color: #16a34a; }

  .boq-import-overlay { position: fixed; z-index: 300; inset: 0; display: grid; place-items: center; padding: 22px; background: rgba(15, 23, 42, .66); -webkit-backdrop-filter: blur(5px); backdrop-filter: blur(5px); }
  .boq-import-dialog { display: grid; grid-template-rows: auto auto minmax(0, 1fr); width: min(1120px, 100%); max-height: min(92vh, 900px); overflow: hidden; border: 1px solid rgba(255, 255, 255, .3); border-radius: 20px; background: #fff; box-shadow: 0 28px 90px rgba(2, 6, 23, .38); }
  .boq-import-dialog-head { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: center; gap: 12px; padding: 16px 20px; border-bottom: 1px solid var(--boq-line); }
  .boq-import-file-icon { display: grid; place-items: center; width: 43px; height: 43px; border-radius: 12px; color: var(--boq-green); background: var(--boq-green-soft); }
  .boq-import-dialog-head > div:nth-child(2) { display: grid; gap: 1px; min-width: 0; }
  .boq-import-dialog-head span { color: var(--boq-green); font-size: 10px; font-weight: 900; letter-spacing: .08em; text-transform: uppercase; }
  .boq-import-dialog-head h2 { margin: 0; color: var(--boq-ink); font-size: 18px; }
  .boq-import-dialog-head small { overflow: hidden; color: var(--boq-muted); font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }
  .boq-import-dialog-head > button { display: grid; place-items: center; width: 36px; height: 36px; border: 0; border-radius: 10px; color: var(--boq-muted); background: #f1f5f9; font-size: 23px; line-height: 1; }
  .boq-import-dialog-head > button:disabled { opacity: .45; }

  .boq-import-progress { display: flex; align-items: center; justify-content: center; padding: 10px 20px; border-bottom: 1px solid var(--boq-line); background: #f8fafc; }
  .boq-import-progress span { display: flex; align-items: center; gap: 6px; color: #94a3b8; font-size: 11px; font-weight: 800; }
  .boq-import-progress span b { display: grid; place-items: center; width: 23px; height: 23px; border-radius: 50%; color: #fff; background: #cbd5e1; font-size: 10px; }
  .boq-import-progress span.active { color: var(--boq-green-dark); }
  .boq-import-progress span.active b { background: var(--boq-green); }
  .boq-import-progress i { width: min(9vw, 90px); height: 1px; margin: 0 10px; background: #dbe4e2; }
  .boq-import-dialog-body { min-height: 0; overflow: auto; padding: 20px; overscroll-behavior: contain; -webkit-overflow-scrolling: touch; }

  .boq-import-state { display: grid; justify-items: center; gap: 10px; min-height: 330px; align-content: center; padding: 30px; color: var(--boq-muted); text-align: center; }
  .boq-import-state strong { color: var(--boq-ink); font-size: 17px; }
  .boq-import-state p { max-width: 620px; margin: 0; font-size: 13px; line-height: 1.6; }
  .boq-import-state.error > svg, .boq-import-state.warning > svg { color: var(--boq-orange); }
  .boq-import-spinner { width: 40px; height: 40px; border: 4px solid #dbeafe; border-top-color: var(--boq-green); border-radius: 50%; animation: boq-import-spin .8s linear infinite; }
  @keyframes boq-import-spin { to { transform: rotate(360deg); } }
  .boq-import-state-actions { display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; margin-top: 8px; }
  .boq-import-image-preview { max-width: min(620px, 100%); max-height: 310px; object-fit: contain; border: 1px solid var(--boq-line); border-radius: 12px; background: #f8fafc; }

  .boq-import-section-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 14px; margin-bottom: 15px; }
  .boq-import-section-head > div { display: grid; gap: 3px; }
  .boq-import-section-head strong { color: var(--boq-ink); font-size: 16px; }
  .boq-import-section-head span { color: var(--boq-muted); font-size: 12px; line-height: 1.5; }
  .boq-client-badge { flex: 0 0 auto; padding: 5px 9px; border-radius: 999px; color: #166534 !important; background: #dcfce7; font-size: 10px !important; font-weight: 900; }
  .boq-link-button { padding: 0; border: 0; color: var(--boq-green); background: transparent; font: inherit; font-size: 11px; font-weight: 800; text-decoration: underline; text-underline-offset: 3px; }
  .boq-link-button.danger { color: var(--boq-red); }

  .boq-import-sheet-select { display: grid; grid-template-columns: 160px minmax(0, 1fr); align-items: center; gap: 10px; margin-bottom: 14px; padding: 11px 13px; border: 1px solid var(--boq-line); border-radius: 11px; background: #fbfdfc; }
  .boq-import-sheet-select span { color: var(--boq-ink); font-size: 12px; font-weight: 800; }
  .boq-import-sheet-select select, .boq-import-mapping-grid select, .boq-import-edit-grid input, .boq-import-edit-grid select { width: 100%; min-width: 0; height: 40px; box-sizing: border-box; padding: 0 10px; border: 1px solid #cbd5e1; border-radius: 8px; outline: none; color: var(--boq-ink); background: #fff; font: inherit; font-size: 12px; }
  .boq-import-sheet-select select:focus, .boq-import-mapping-grid select:focus, .boq-import-edit-grid input:focus, .boq-import-edit-grid select:focus { border-color: var(--boq-green); box-shadow: 0 0 0 3px rgba(22, 116, 92, .1); }

  .boq-import-callout { display: flex; align-items: flex-start; gap: 10px; margin-bottom: 13px; padding: 11px 13px; border: 1px solid #bfdbfe; border-radius: 11px; color: #1e3a8a; background: #eff6ff; }
  .boq-import-callout.warning { border-color: #f1d29d; color: #7c4a10; background: #fffaf0; }
  .boq-import-callout.success { border-color: #a7d8c8; color: #175b4e; background: #effaf7; }
  .boq-import-callout > svg { flex: 0 0 auto; margin-top: 1px; }
  .boq-import-callout > span { display: grid; gap: 2px; }
  .boq-import-callout strong { font-size: 12px; }
  .boq-import-callout small { font-size: 11px; line-height: 1.5; }

  .boq-import-project-detected { margin-bottom: 15px; padding: 13px; border: 1px solid var(--boq-line); border-radius: 12px; }
  .boq-import-project-detected > strong { display: block; margin-bottom: 9px; color: var(--boq-ink); font-size: 12px; }
  .boq-import-project-detected > div { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 7px; }
  .boq-import-project-detected span { display: grid; gap: 2px; min-width: 0; padding: 8px 10px; border-radius: 8px; background: #f8fafc; }
  .boq-import-project-detected small { color: var(--boq-muted); font-size: 9px; }
  .boq-import-project-detected b { overflow: hidden; color: var(--boq-ink); font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }

  .boq-import-mapping-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; margin-bottom: 13px; }
  .boq-import-mapping-grid label { display: grid; gap: 5px; color: var(--boq-ink); font-size: 11px; font-weight: 800; }
  .boq-import-mapping-grid label > span { display: flex; gap: 3px; }
  .boq-import-mapping-grid label b { color: var(--boq-red); }
  .boq-import-inline-error { display: flex; align-items: flex-start; gap: 7px; margin: 9px 0; padding: 9px 11px; border: 1px solid #fecaca; border-radius: 9px; color: #991b1b; background: #fef2f2; font-size: 11px; line-height: 1.45; }
  .boq-import-inline-error > svg { flex: 0 0 auto; margin-top: 1px; }

  .boq-import-raw-preview { margin-top: 14px; border: 1px solid var(--boq-line); border-radius: 12px; overflow: hidden; }
  .boq-import-raw-preview > div:first-child { display: flex; justify-content: space-between; gap: 10px; padding: 10px 12px; border-bottom: 1px solid var(--boq-line); background: #f8fafc; }
  .boq-import-raw-preview strong { color: var(--boq-ink); font-size: 11px; }
  .boq-import-raw-preview span { color: var(--boq-muted); font-size: 10px; }
  .boq-import-table-scroll { overflow: auto; max-height: 230px; }
  .boq-import-table-scroll table { width: max-content; min-width: 100%; border-collapse: collapse; font-size: 10px; }
  .boq-import-table-scroll th, .boq-import-table-scroll td { max-width: 280px; padding: 8px 10px; border-right: 1px solid var(--boq-line); border-bottom: 1px solid var(--boq-line); overflow: hidden; color: var(--boq-ink); text-align: left; text-overflow: ellipsis; white-space: nowrap; }
  .boq-import-table-scroll th { position: sticky; top: 0; z-index: 1; color: #334155; background: #f1f5f9; }

  .boq-import-footer { display: flex; align-items: center; justify-content: flex-end; gap: 8px; margin-top: 18px; padding-top: 15px; border-top: 1px solid var(--boq-line); }
  .boq-import-footer.inline { border-top: 0; }
  .boq-import-footer.preview { justify-content: space-between; }
  .boq-import-footer.preview > span { color: var(--boq-muted); font-size: 11px; }
  .boq-import-footer.preview > div { display: flex; gap: 8px; }
  .boq-import-footer button { min-height: 40px; }

  .boq-import-backup-summary { display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 10px; }
  .boq-import-backup-summary > div { display: grid; gap: 4px; padding: 16px; border: 1px solid var(--boq-line); border-radius: 12px; background: #fbfdfc; }
  .boq-import-backup-summary span { color: var(--boq-muted); font-size: 10px; }
  .boq-import-backup-summary strong { color: var(--boq-ink); font-size: 14px; }

  .boq-import-stats { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 8px; margin-bottom: 14px; }
  .boq-import-stats > div { display: grid; gap: 2px; padding: 10px 12px; border: 1px solid var(--boq-line); border-radius: 10px; background: #f8fafc; }
  .boq-import-stats span { color: var(--boq-muted); font-size: 9px; }
  .boq-import-stats strong { color: var(--boq-ink); font-size: 18px; }
  .boq-import-stats .matched { border-color: #a7d8c8; background: #effaf7; }
  .boq-import-stats .candidate { border-color: #bfdbfe; background: #eff6ff; }
  .boq-import-stats .unmatched, .boq-import-stats .invalid { border-color: #f1d29d; background: #fffaf0; }

  .boq-import-preview-list { display: grid; gap: 8px; }
  .boq-import-preview-row { border: 1px solid var(--boq-line); border-left: 4px solid #94a3b8; border-radius: 12px; overflow: visible; background: #fff; }
  .boq-import-preview-row.matched { border-left-color: #16a34a; }
  .boq-import-preview-row.candidate { border-left-color: #16745c; }
  .boq-import-preview-row.unmatched, .boq-import-preview-row.mismatch, .boq-import-preview-row.invalid { border-left-color: #d97706; }
  .boq-import-preview-summary { display: grid; grid-template-columns: 30px minmax(0, 1fr) auto 18px; align-items: center; gap: 9px; width: 100%; min-height: 64px; padding: 10px 12px; border: 0; border-radius: 11px; color: var(--boq-ink); background: #fff; text-align: left; }
  .boq-import-row-number { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 8px; color: var(--boq-green-dark); background: var(--boq-green-soft); font-size: 10px; font-weight: 900; }
  .boq-import-row-copy { display: grid; gap: 3px; min-width: 0; }
  .boq-import-row-copy strong { overflow: hidden; font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }
  .boq-import-row-copy small { overflow: hidden; color: var(--boq-muted); font-size: 10px; text-overflow: ellipsis; white-space: nowrap; }
  .boq-import-match-badge { padding: 5px 8px; border-radius: 999px; font-size: 9px; font-weight: 900; white-space: nowrap; }
  .boq-import-match-badge.matched { color: #166534; background: #dcfce7; }
  .boq-import-match-badge.candidate { color: #125541; background: #dbeafe; }
  .boq-import-match-badge.unmatched, .boq-import-match-badge.mismatch { color: #92400e; background: #fef3c7; }
  .boq-import-preview-detail { padding: 14px; border-top: 1px solid var(--boq-line); background: #fbfdfc; }
  .boq-import-edit-grid { display: grid; grid-template-columns: 110px 2fr 120px 120px; gap: 9px; }
  .boq-import-edit-grid label { display: grid; align-content: start; gap: 5px; min-width: 0; color: var(--boq-ink); font-size: 10px; font-weight: 800; }
  .boq-import-edit-grid label.wide { grid-column: span 2; }
  .boq-import-source-rate { display: flex; align-items: flex-start; gap: 7px; margin-top: 9px; padding: 8px 10px; border-radius: 8px; color: #475569; background: #f1f5f9; font-size: 10px; line-height: 1.45; }
  .boq-import-source-rate > svg { flex: 0 0 auto; }

  .boq-import-candidate-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 10px; margin: 14px 0 8px; }
  .boq-import-candidate-head > span { display: grid; gap: 2px; }
  .boq-import-candidate-head strong { color: var(--boq-ink); font-size: 12px; }
  .boq-import-candidate-head small { color: var(--boq-muted); font-size: 10px; }
  .boq-import-candidate-head button { display: inline-flex; align-items: center; gap: 5px; min-height: 32px; padding: 0 9px; border: 1px solid #bfdbfe; border-radius: 8px; color: #125541; background: #eff6ff; font: inherit; font-size: 10px; font-weight: 800; }
  .boq-import-candidates { display: grid; gap: 7px; }
  .boq-import-candidates > div { display: grid; grid-template-columns: minmax(0, 1fr) 120px auto; align-items: center; gap: 10px; padding: 10px; border: 1px solid var(--boq-line); border-radius: 9px; background: #fff; }
  .boq-import-candidates > div.selected { border-color: #60a5fa; box-shadow: 0 0 0 2px rgba(22, 116, 92, .09); }
  .boq-import-candidates > div.unit-mismatch { border-style: dashed; }
  .boq-import-candidates > div > span:first-child { display: grid; gap: 2px; min-width: 0; }
  .boq-import-candidates > div > span:first-child strong { color: var(--boq-ink); font-size: 11px; line-height: 1.4; }
  .boq-import-candidates > div > span:first-child small { color: var(--boq-muted); font-size: 9px; }
  .boq-import-candidates > div > span:first-child em { color: #16745c; font-size: 9px; font-style: normal; }
  .boq-import-candidate-price { display: grid; justify-items: end; gap: 1px; }
  .boq-import-candidate-price strong { color: var(--boq-ink); font-size: 11px; }
  .boq-import-candidate-price small { color: var(--boq-muted); font-size: 9px; }
  .boq-import-candidate-price em { color: #16a34a; font-size: 9px; font-style: normal; font-weight: 900; }
  .boq-import-candidates button { min-height: 34px; padding: 0 10px; border: 1px solid #bfdbfe; border-radius: 8px; color: #125541; background: #eff6ff; font: inherit; font-size: 10px; font-weight: 900; white-space: nowrap; }
  .boq-import-candidates button.selected { border-color: #86efac; color: #166534; background: #dcfce7; }
  .boq-import-no-candidate { display: flex; align-items: flex-start; gap: 8px; padding: 11px; border: 1px solid #f1d29d; border-radius: 9px; color: #7c4a10; background: #fffaf0; }
  .boq-import-no-candidate > span { display: grid; gap: 2px; }
  .boq-import-no-candidate strong { font-size: 11px; }
  .boq-import-no-candidate small { font-size: 10px; }
  .boq-import-picker-wrap { display: grid; gap: 6px; margin-top: 10px; }
  .boq-import-picker-wrap > .boq-link-button { justify-self: end; }
  .boq-import-row-actions { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-top: 12px; padding-top: 10px; border-top: 1px solid var(--boq-line); }
  .boq-import-row-actions span { color: var(--boq-muted); font-size: 9px; }
  .boq-import-row-actions button { display: inline-flex; align-items: center; gap: 5px; min-height: 32px; padding: 0 9px; border: 1px solid #fecaca; border-radius: 8px; color: #b91c1c; background: #fff; font: inherit; font-size: 10px; font-weight: 800; }
  .boq-import-load-more { display: block; min-height: 38px; margin: 10px auto 0; padding: 0 14px; border: 1px solid #bfdbfe; border-radius: 9px; color: #125541; background: #eff6ff; font: inherit; font-size: 11px; font-weight: 800; }

  .boq-import-options { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 16px; padding: 13px; border: 1px solid var(--boq-line); border-radius: 12px; background: #f8fafc; }
  .boq-import-options > div { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
  .boq-import-options > div > strong { width: 100%; color: var(--boq-ink); font-size: 11px; }
  .boq-import-options label { display: flex; align-items: center; gap: 6px; color: #334155; font-size: 10px; }
  .boq-import-options input { accent-color: var(--boq-green); }
  .boq-import-project-option { align-self: center; padding-left: 12px; border-left: 1px solid var(--boq-line); }
  .boq-import-project-option > span { display: grid; gap: 1px; }
  .boq-import-project-option strong { font-size: 10px; }
  .boq-import-project-option small { color: var(--boq-muted); font-size: 9px; }

  @media (max-width: 1180px) {
    .boq-project-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    .boq-template-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .boq-price-mode-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .boq-horizon-field { grid-column: 1 / -1; }
    .boq-layout { grid-template-columns: minmax(0, 1fr) 270px; }
    .boq-detail-grid.identity { grid-template-columns: 90px 1fr 1.4fr 110px; }
    .boq-detail-grid.rates { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .boq-field.wide { grid-column: 1 / -1; }
  }

  @media (max-width: 1024px) {
    .boq-flow span { display: none; }
    .boq-flow > i { width: 50px; }
    .boq-project-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .boq-layout { grid-template-columns: minmax(0, 1fr); }
    .boq-summary-wrap { position: static; }
    .boq-summary { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0 18px; }
    .boq-summary-step, .boq-summary .eyebrow, .boq-summary h3, .boq-grand-total, .boq-summary-caption, .boq-validation, .boq-download-full { grid-column: 1 / -1; }
    .boq-insight-grid { grid-template-columns: repeat(2, 1fr); }
    .boq-import-mapping-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .boq-import-edit-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .boq-import-edit-grid label.wide { grid-column: span 1; }
    .boq-import-candidates > div { grid-template-columns: minmax(0, 1fr) 105px; }
    .boq-import-candidates > div > button { grid-column: 1 / -1; justify-self: stretch; }
  }

  @media (max-width: 960px) {
    .boq-header-actions { width: 100%; }
    .boq-header-actions button { flex: 1 1 140px; min-height: 44px; }
    .boq-save-feedback { margin-bottom: 12px; }
    .boq-flow { justify-content: space-between; padding: 10px 14px; }
    .boq-flow > i { flex: 1 1 auto; width: auto; margin: 0 6px; }
    .boq-notice { padding: 13px; }
    .boq-notice span { display: none; }
    .boq-notice strong, .boq-notice a { font-size: 11px; }
    .boq-setup-card, .boq-template-card, .boq-price-mode-card, .boq-work-toolbar, .boq-insights { padding: 15px; border-radius: 14px; }
    .boq-step-head { margin-bottom: 14px; }
    .boq-step-head h2 { font-size: 15px; }
    .boq-project-grid { grid-template-columns: minmax(0, 1fr); gap: 11px; }
    .boq-field input, .boq-field select { height: 46px; font-size: 16px; }
    .boq-field textarea, .boq-textarea-field textarea { font-size: 16px; }
    .boq-textarea-field textarea { min-height: 112px; }
    .boq-template-grid { grid-template-columns: 1fr; }
    .boq-template-grid > button { min-height: 82px; }
    .boq-template-start { grid-template-columns: minmax(0, 1fr); align-items: stretch; gap: 12px; padding: 13px; }
    .boq-template-start > .boq-use-template-btn { width: 100% !important; min-width: 0; max-width: none; min-height: 46px; justify-self: stretch; }
    .boq-draft-tools { align-items: stretch; flex-direction: column; }
    .boq-draft-tool-actions { display: grid; grid-template-columns: 1fr 1fr; }
    .boq-draft-tool-actions .secondary-btn { justify-content: center; min-height: 42px; }
    .boq-price-mode-grid { grid-template-columns: 1fr; }
    .boq-price-mode-grid > button { min-height: 86px; }
    .boq-horizon-field { grid-column: auto; }
    .boq-horizon-field input, .boq-horizon-field select { height: 48px; font-size: 16px; }
    .boq-toolbar-row { align-items: stretch; flex-direction: column; }
    .boq-search { flex-basis: auto; max-width: none; height: 46px; }
    .boq-search input { font-size: 16px; }
    .boq-filter-tabs { display: grid; grid-template-columns: repeat(3, 1fr); }
    .boq-filter-tabs button { min-height: 44px; padding: 0 5px; }
    .boq-discipline-overview { grid-template-columns: 1fr; }
    .boq-discipline-overview button { min-height: 49px; }
    .boq-category-nav { margin-right: -15px; padding-right: 15px; }
    .boq-category-nav button { min-height: 44px; }
    .boq-section-head { grid-template-columns: 38px minmax(0, 1fr) 20px; gap: 9px; min-height: 72px; padding: 11px 12px; }
    .boq-section-code { width: 38px; height: 38px; }
    .boq-section-copy strong { font-size: 13px; }
    .boq-section-total { grid-column: 2; grid-row: 2; justify-items: start; padding: 0; border: 0; }
    .boq-section-total small { display: none; }
    .boq-section-total strong { font-size: 11px; }
    .boq-section-chevron { grid-column: 3; grid-row: 1 / 3; }
    .boq-table-scroll { display: none; }
    .boq-mobile-list { display: grid; }
    .boq-mobile-row { border-bottom: 1px solid var(--boq-line); background: #fff; scroll-margin-top: 10px; }
    .boq-mobile-row.expanded { background: #f7fbfa; }
    .boq-mobile-row-head { display: grid; grid-template-columns: 37px minmax(0, 1fr) 20px; align-items: start; gap: 9px; width: 100%; min-height: 62px; padding: 12px; border: 0; color: var(--boq-ink); background: transparent; text-align: left; }
    .boq-mobile-code { display: grid; place-items: center; min-height: 28px; padding: 0 4px; border-radius: 7px; color: var(--boq-green-dark); background: var(--boq-green-soft); font-size: 11px; font-weight: 900; }
    .boq-mobile-title { display: grid; gap: 2px; min-width: 0; }
    .boq-mobile-title strong { font-size: 12px; line-height: 1.4; }
    .boq-mobile-title small { overflow: hidden; color: var(--boq-muted); font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }
    .boq-mobile-row-head > svg { color: var(--boq-muted); }
    .boq-mobile-inputs { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; padding: 0 12px 11px; }
    .boq-mobile-inputs label { display: grid; gap: 4px; min-width: 0; color: var(--boq-muted); font-size: 11px; font-weight: 700; }
    .boq-mobile-inputs label > div { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; }
    .boq-mobile-inputs label > div .boq-cell-input { border-radius: 9px 0 0 9px; }
    .boq-mobile-inputs label > div b { display: grid; place-items: center; height: 42px; padding: 0 8px; border: 1px solid #ccd9d6; border-left: 0; border-radius: 0 9px 9px 0; color: var(--boq-muted); background: var(--boq-soft); font-size: 11px; }
    .boq-mobile-inputs .boq-cell-input { height: 42px; font-size: 16px; }
    .boq-mobile-row-total { display: flex; align-items: center; gap: 9px; flex-wrap: wrap; padding: 9px 12px; border-top: 1px solid #eef3f2; background: #fbfdfc; }
    .boq-mobile-row-total > span { display: grid; gap: 1px; color: var(--boq-muted); font-size: 10px; }
    .boq-mobile-row-total strong { color: var(--boq-green-dark); font-size: 11px; }
    .boq-mobile-row-total button { display: inline-flex; align-items: center; gap: 5px; min-height: 44px; margin-left: auto; padding: 0 9px; border: 1px solid #c7ddd7; border-radius: 8px; color: var(--boq-green); background: #fff; font: inherit; font-size: 11px; font-weight: 800; }
    .boq-row-details { padding: 13px 12px; }
    .boq-details-heading { align-items: flex-start; }
    .boq-details-heading > .boq-row-state { flex: 0 0 auto; }
    .boq-detail-grid.identity, .boq-detail-grid.rates, .boq-detail-grid.rates.compact { grid-template-columns: minmax(0, 1fr); }
    .boq-field.wide { grid-column: auto; }
    .boq-cost-type-block { align-items: stretch; flex-direction: column; }
    .boq-cost-type-buttons { display: grid; grid-template-columns: 1fr; }
    .boq-cost-type-buttons button { justify-content: flex-start; min-height: 44px; border-radius: 9px; }
    .boq-material-panel-title { flex-direction: column; }
    .boq-source-pill { flex: auto; width: fit-content; }
    .boq-row-detail-actions { align-items: stretch; flex-direction: column; }
    .boq-row-detail-actions > div { display: grid; grid-template-columns: repeat(3, 1fr); }
    .boq-row-detail-actions button { min-height: 44px; }
    .boq-row-detail-actions > .danger { width: 100%; }
    .boq-add-row { min-height: 46px; }
    .boq-summary { display: block; padding: 16px; }
    .boq-grand-total { font-size: 25px; }
    .boq-insight-grid { grid-template-columns: 1fr; }
    .boq-insight-card { min-height: 48px; }
    .boq-import-feedback { grid-template-columns: auto minmax(0, 1fr) auto; }
    .boq-import-dropzone { grid-template-columns: auto minmax(0, 1fr); gap: 11px; min-height: 0; padding: 14px; }
    .boq-import-drop-icon { width: 44px; height: 44px; }
    .boq-import-drop-action { grid-column: 1 / -1; min-width: 0; }
    .boq-import-drop-action .primary-btn { width: 100%; min-height: 46px; }
    .boq-import-overlay { place-items: stretch; padding: 0; }
    .boq-import-dialog { width: 100%; max-height: 100vh; min-height: 100vh; max-height: 100dvh; min-height: 100dvh; border: 0; border-radius: 0; }
    .boq-import-dialog-head { padding: max(12px, env(safe-area-inset-top)) max(14px, env(safe-area-inset-right)) 12px max(14px, env(safe-area-inset-left)); }
    .boq-import-dialog-head h2 { font-size: 15px; }
    .boq-import-dialog-body { padding: 14px max(14px, env(safe-area-inset-right)) max(14px, env(safe-area-inset-bottom)) max(14px, env(safe-area-inset-left)); }
    .boq-import-progress { padding: 8px 12px; }
    .boq-import-progress span { font-size: 0; }
    .boq-import-progress span b { font-size: 10px; }
    .boq-import-progress i { flex: 1 1 auto; width: auto; }
    .boq-import-section-head { align-items: stretch; flex-direction: column; }
    .boq-client-badge { width: fit-content; }
    .boq-import-sheet-select { grid-template-columns: 1fr; }
    .boq-import-project-detected > div, .boq-import-mapping-grid { grid-template-columns: 1fr; }
    .boq-import-mapping-grid select, .boq-import-sheet-select select, .boq-import-edit-grid input, .boq-import-edit-grid select { height: 46px; font-size: 16px; }
    .boq-import-footer, .boq-import-footer.preview { align-items: stretch; flex-direction: column; }
    .boq-import-footer.preview > div { display: grid; grid-template-columns: 1fr 1fr; }
    .boq-import-footer button { min-height: 44px; }
    .boq-import-backup-summary { grid-template-columns: 1fr; }
    .boq-import-stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .boq-import-stats > div:first-child { grid-column: 1 / -1; }
    .boq-import-preview-summary { grid-template-columns: 28px minmax(0, 1fr) 18px; }
    .boq-import-match-badge { grid-column: 2; width: fit-content; }
    .boq-import-preview-summary > svg { grid-column: 3; grid-row: 1 / 3; }
    .boq-import-edit-grid { grid-template-columns: 1fr; }
    .boq-import-candidate-head { align-items: stretch; flex-direction: column; }
    .boq-import-candidate-head button { justify-content: center; min-height: 42px; }
    .boq-import-candidates > div { grid-template-columns: 1fr; }
    .boq-import-candidate-price { justify-items: start; }
    .boq-import-candidates > div > button { grid-column: auto; min-height: 42px; }
    .boq-import-options { grid-template-columns: 1fr; }
    .boq-import-project-option { padding: 10px 0 0; border-top: 1px solid var(--boq-line); border-left: 0; }
    .boq-mobile-total-bar { position: fixed; z-index: 40; right: max(10px, env(safe-area-inset-right)); bottom: calc(16px + env(safe-area-inset-bottom)); left: max(10px, env(safe-area-inset-left)); display: flex; align-items: center; justify-content: space-between; gap: 10px; min-height: 57px; padding: 8px 8px 8px 13px; border: 1px solid #3a8f7d; border-radius: 15px; color: #fff; background: rgba(5, 91, 77, .96); box-shadow: 0 12px 34px rgba(7, 65, 55, .3); -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px); }
    .boq-mobile-total-bar > div { display: grid; gap: 1px; min-width: 0; }
    .boq-mobile-total-bar span { overflow: hidden; color: #d7f1eb; font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }
    .boq-mobile-total-bar strong { overflow: hidden; font-size: 16px; text-overflow: ellipsis; white-space: nowrap; }
    .boq-mobile-total-bar button { display: inline-flex; align-items: center; gap: 4px; flex: 0 0 auto; min-height: 44px; padding: 0 10px; border: 0; border-radius: 10px; color: var(--boq-green-dark); background: #fff; font: inherit; font-size: 12px; font-weight: 900; }
    .boq-insights.has-mobile-bar { margin-bottom: 88px; }
  }

  @media (min-width: 641px) and (max-width: 960px) {
    .boq-project-grid,
    .boq-template-grid,
    .boq-price-mode-grid,
    .boq-insight-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .boq-horizon-field { grid-column: 1 / -1; }
    .boq-template-start { grid-template-columns: minmax(0, 1fr) auto; align-items: center; }
    .boq-template-start > .boq-use-template-btn { width: auto !important; min-width: 170px; max-width: 220px; justify-self: end; }
    .boq-draft-tools { align-items: center; flex-direction: row; }
    .boq-draft-tool-actions { display: flex; }
    .boq-discipline-overview { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    .boq-import-dropzone { grid-template-columns: auto minmax(0, 1fr) auto; }
    .boq-import-drop-action { grid-column: auto; min-width: 170px; }
    .boq-import-drop-action .primary-btn { width: auto; min-height: 44px; }
    .boq-import-overlay { place-items: center; padding: 16px; }
    .boq-import-dialog { width: 100%; max-height: calc(100dvh - 32px); min-height: 0; border: 1px solid rgba(255, 255, 255, .3); border-radius: 18px; }
    .boq-import-dialog-head { padding: 14px 18px; }
    .boq-import-dialog-body { padding: 18px; }
    .boq-import-project-detected > div,
    .boq-import-mapping-grid,
    .boq-import-edit-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .boq-import-candidates > div { grid-template-columns: minmax(0, 1fr) 105px; }
    .boq-import-candidates > div > button { grid-column: 1 / -1; }
    .boq-import-footer,
    .boq-import-footer.preview { align-items: center; flex-direction: row; }
    .boq-import-footer.preview > div { display: flex; }
    .boq-import-options { grid-template-columns: 1fr 1fr; }
    .boq-import-project-option { padding: 0 0 0 12px; border-top: 0; border-left: 1px solid var(--boq-line); }
  }

  @media (max-width: 390px) {
    .boq-draft-tool-actions { grid-template-columns: 1fr; }
    .boq-import-dropzone { grid-template-columns: 1fr; }
    .boq-import-drop-icon { justify-self: start; }
    .boq-import-drop-action { grid-column: auto; }
    .boq-mobile-inputs { grid-template-columns: 1fr; }
    .boq-row-detail-actions > div { grid-template-columns: 1fr; }
    .boq-section-copy em { max-width: 190px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .boq-filter-tabs button { font-size: 11px; }
  }

  @media print {
    .boq-header-actions, .boq-flow, .boq-template-card, .boq-work-toolbar, .boq-category-nav, .boq-add-row, .boq-mobile-total-bar, .boq-actions-cell, .boq-row-detail-actions, .boq-import-overlay, .boq-import-feedback { display: none !important; }
    .boq-layout { display: block; }
    .boq-summary-wrap { position: static; margin-top: 16px; }
    .boq-section-card { break-inside: avoid; box-shadow: none; }
  }
`;
