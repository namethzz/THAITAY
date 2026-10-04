const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");

const excelArgument = process.argv[2];

if (!excelArgument) {
  throw new Error(
    'กรุณาระบุตำแหน่ง Excel เช่น node make-data.cjs "C:\\Users\\ADMIN\\Downloads\\รายการวัสดุ.xlsx"'
  );
}

const excelPath = path.resolve(excelArgument);
const outputPath = path.join(__dirname, "src", "data.js");

if (!fs.existsSync(excelPath)) {
  throw new Error(`ไม่พบไฟล์ Excel: ${excelPath}`);
}

const workbook = XLSX.readFile(excelPath, {
  raw: false,
  cellText: true,
  cellDates: false,
});

const sheetName = workbook.SheetNames[0];

if (!sheetName) {
  throw new Error("ไม่พบ Sheet ในไฟล์ Excel");
}

const sheet = workbook.Sheets[sheetName];

const table = XLSX.utils.sheet_to_json(sheet, {
  header: 1,
  defval: "",
  raw: false,
  blankrows: true,
});

function cleanText(value) {
  return String(value ?? "")
    .replace(/\u00a0/g, " ")
    .trim();
}

function parsePrice(value, excelRow) {
  const normalized = cleanText(value)
    .replace(/,/g, "")
    .replace(/฿/g, "");

  const price = Number(normalized);

  if (normalized === "" || !Number.isFinite(price)) {
    throw new Error(
      `ราคาไม่ถูกต้องที่แถว Excel ${excelRow}: "${value}"`
    );
  }

  return price;
}

// ข้อมูลเริ่มแถวที่ 6
const sourceRows = table
  .slice(5)
  .map((row, index) => ({
    row,
    excelRow: index + 6,
  }))
  .filter(({ row }) =>
    row.some((value) => cleanText(value) !== "")
  );

const materialRows = sourceRows.map(({ row, excelRow }) => {
  const categoryCode = cleanText(row[0]);
  const category = cleanText(row[1]);
  const id = cleanText(row[2]).replace(/\s/g, "");
  const name = cleanText(row[3]);
  const unit = cleanText(row[4]);
  const price = parsePrice(row[5], excelRow);

  if (!/^\d{16}$/.test(id)) {
    throw new Error(
      `รหัสวัสดุไม่ถูกต้องที่แถว ${excelRow}: "${id}"`
    );
  }

  if (!categoryCode || !category || !name || !unit) {
    throw new Error(
      `ข้อมูลวัสดุไม่ครบที่แถว Excel ${excelRow}`
    );
  }

  return [
    categoryCode,
    category,
    id,
    name,
    unit,
    price,
  ];
});

const uniqueIds = new Set(
  materialRows.map((row) => row[2])
);

const categories = new Set(
  materialRows.map((row) => `${row[0]}:${row[1]}`)
);

const units = new Set(
  materialRows.map((row) => row[4])
);

if (materialRows.length !== 5511) {
  throw new Error(
    `จำนวนวัสดุไม่ตรง พบ ${materialRows.length} รายการ ต้องเป็น 5,511 รายการ`
  );
}

if (uniqueIds.size !== materialRows.length) {
  throw new Error("พบรหัสวัสดุซ้ำใน Excel");
}

if (categories.size !== 15) {
  throw new Error(
    `จำนวนหมวดไม่ตรง พบ ${categories.size} หมวด ต้องเป็น 15 หมวด`
  );
}

if (units.size !== 28) {
  throw new Error(
    `จำนวนหน่วยไม่ตรง พบ ${units.size} หน่วย ต้องเป็น 28 หน่วย`
  );
}

const materialRowsCode = JSON.stringify(materialRows);
const generatedAt = new Date().toISOString();

const output = `import {
  LayoutDashboard,
  Boxes,
  TrendingUp,
  Calculator,
  Database,
  Activity,
} from "lucide-react";

const OFFICIAL_PRICE_URL =
  "https://index.tpso.go.th/construction-material-prices/prices-building-materials";

const PERIOD_KEY = "2569-07";
const PERIOD_LABEL = "กรกฎาคม 2569";

const AREA_LABEL =
  "กรุงเทพมหานคร (อ้างอิงราคาส่วนกลาง)";

const SOURCE_NAME =
  "สำนักงานนโยบายและยุทธศาสตร์การค้า กระทรวงพาณิชย์";

const PRICE_NOTE =
  "ราคาวัสดุก่อสร้างในส่วนกลาง เป็นราคาเงินสด ไม่รวมภาษีมูลค่าเพิ่มและค่าขนส่ง";

// ข้อมูลอ้างอิงจากรายการวัสดุ.xlsx
// [categoryCode, category, id, name, unit, price]
const MATERIAL_ROWS = ${materialRowsCode};

export const dataMeta = Object.freeze({
  schemaVersion: "2.0",
  status: "live",
  isMock: false,
  label: "ราคาวัสดุก่อสร้างส่วนกลาง " + PERIOD_LABEL,
  area: AREA_LABEL,
  frequency: "monthly",
  availableHistoryMonths: 1,
  targetHistoryMonths: 120,
  sourceName: SOURCE_NAME,
  sourceUrl: OFFICIAL_PRICE_URL,
  retrievedAt: ${JSON.stringify(generatedAt)},
  note: PRICE_NOTE,
});

export const materialCatalog = MATERIAL_ROWS.map(
  ([categoryCode, category, id, name, unit, price]) => ({
    id: String(id),
    categoryCode,
    category,
    name,
    unit,
    price,
    period: PERIOD_KEY,
    area: AREA_LABEL,
    isMock: false,
    status: "live",
    sourceName: SOURCE_NAME,
    sourceUrl: OFFICIAL_PRICE_URL,
    note: PRICE_NOTE,
  })
);

// Shared.jsx เรียก export ตัวนี้
export const materials = materialCatalog;

const materialById = new Map(
  materialCatalog.map((material) => [
    material.id,
    material,
  ])
);

const materialSearchIndex = materialCatalog.map(
  (material) => ({
    material,
    text: [
      material.id,
      material.name,
      material.category,
      material.unit,
    ]
      .join(" ")
      .toLocaleLowerCase("th-TH"),
  })
);

export function getMaterialById(id) {
  return (
    materialById.get(String(id ?? "")) ?? null
  );
}

export function searchMaterials(
  query = "",
  limit = 50
) {
  const text = String(query)
    .trim()
    .toLocaleLowerCase("th-TH");

  const max = Math.max(
    1,
    Number(limit) || 50
  );

  if (!text) {
    return materialCatalog.slice(0, max);
  }

  const terms = text
    .split(/\\s+/)
    .filter(Boolean);

  const results = [];

  for (const entry of materialSearchIndex) {
    const matched = terms.every((term) =>
      entry.text.includes(term)
    );

    if (matched) {
      results.push(entry.material);
    }

    if (results.length >= max) {
      break;
    }
  }

  return results;
}

export const materialCategories = Object.freeze(
  [
    ...new Map(
      materialCatalog.map((material) => [
        material.categoryCode,
        {
          code: material.categoryCode,
          name: material.category,
        },
      ])
    ).values(),
  ]
);

export const materialUnits = Object.freeze(
  [
    ...new Set(
      materialCatalog.map(
        (material) => material.unit
      )
    ),
  ].sort((a, b) =>
    a.localeCompare(b, "th")
  )
);

const currentPrices = Object.fromEntries(
  materialCatalog.map((material) => [
    material.id,
    material.price,
  ])
);

// Excel มีข้อมูลเพียงเดือนกรกฎาคม 2569
export const priceData = [
  {
    key: PERIOD_KEY,
    month: PERIOD_LABEL,
    prices: currentPrices,
    area: AREA_LABEL,
    isMock: false,
    status: "live",
    sourceName: SOURCE_NAME,
    sourceUrl: OFFICIAL_PRICE_URL,
    retrievedAt: dataMeta.retrievedAt,
    note: PRICE_NOTE,
    factors: {},
  },
];

// ยังไม่มีผลจากโมเดล ML
export const forecastData = [];

export const navItems = [
  ["overview", "ภาพรวม", LayoutDashboard],
  ["prices", "ราคาวัสดุ", Boxes],
  ["forecast", "พยากรณ์ราคา", TrendingUp],
  ["analysis", "วิเคราะห์ราคา", Activity],
  ["cost", "BOQ และต้นทุน", Calculator],
  ["data", "ข้อมูลและสถิติ", Database],
];
`;

fs.mkdirSync(path.dirname(outputPath), {
  recursive: true,
});

fs.writeFileSync(
  outputPath,
  output,
  "utf8"
);

console.log("");
console.log("สร้าง src/data.js สำเร็จ");
console.log("ตำแหน่ง:", outputPath);
console.log("รายการวัสดุ:", materialRows.length);
console.log("รหัสไม่ซ้ำ:", uniqueIds.size);
console.log("หมวดวัสดุ:", categories.size);
console.log("หน่วย:", units.size);