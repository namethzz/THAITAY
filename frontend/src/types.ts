export type PageId = "overview" | "prices" | "forecast" | "cost" | "analysis";
export type Navigate = (page: PageId) => void;
export interface Material {
  id: string;
  categoryCode: string;
  familyCode: string;
  category: string;
  name: string;
  unit: string;
}
export interface SelectionProps {
  selectedId: string;
  onSelect: (id: string) => void;
}

export interface EstimateLine {
  key: string;
  materialId: string;
  name: string;
  unit: string;
  /** 0 = ราคาปัจจุบัน, 1–3 = อีกกี่เดือนข้างหน้า */
  month: number;
  monthLabel: string;
  qty: number;
  price: number;
  low: number;
  high: number;
  demo: boolean;
}
