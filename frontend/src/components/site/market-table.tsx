import { useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import type { ComparableMarketRow } from "@/lib/chartData";
import { materialTitle } from "@/lib/materialTitle";
import { movements, percentText, priceText } from "@/lib/marketDisplay";

type Column = "name" | "previous" | "latest" | "change";
const collator = new Intl.Collator("th", {numeric: true});
const perPage = 12;

export function MarketTable({rows, previousMonth, month}: {rows: ComparableMarketRow[]; previousMonth: string; month: string}) {
  const [sort, setSort] = useState<{key: Column; asc: boolean}>({key: "change", asc: false});
  const [page, setPage] = useState(1);
  const pages = Math.max(1, Math.ceil(rows.length / perPage));
  const ordered = [...rows].sort((a, b) => {
    if (sort.key === "name") return collator.compare(a.material.name, b.material.name) * (sort.asc ? 1 : -1);
    const left = a[sort.key], right = b[sort.key];
    return (left - right) * (sort.asc ? 1 : -1);
  });
  const headers: [Column, string][] = [["name", "วัสดุ / หน่วย"], ["previous", previousMonth], ["latest", month], ["change", "เปลี่ยนแปลง"]];
  return <section className="md-panel md-table-panel">
    <div className="md-section-head"><h2>ราคาวัสดุรายรายการ</h2><span>{rows.length} รายการ</span></div>
    <div className="md-table-scroll"><table><thead><tr>{headers.map(([key, label]) => {
      const Icon = sort.key !== key ? ArrowUpDown : sort.asc ? ArrowUp : ArrowDown;
      return <th key={key} scope="col" aria-sort={sort.key === key ? (sort.asc ? "ascending" : "descending") : undefined}><button onClick={() => {setSort({key, asc: sort.key === key ? !sort.asc : key === "name"}); setPage(1);}}>{label}<Icon size={13}/></button></th>;
    })}</tr></thead><tbody>{ordered.slice((page - 1) * perPage, page * perPage).map(r => <tr key={r.material.id}>
      <td><a title={r.material.name} href={"#m/" + r.material.id}>{materialTitle(r.material).title}</a><small>{r.material.category} · บาท/{r.material.unit}</small></td>
      <td>{priceText(r.previous)}</td><td>{priceText(r.latest)}</td>
      <td><span style={{color: movements[r.status].color}}>{percentText(r.change)}</span></td>
    </tr>)}</tbody></table></div>
    {!rows.length && <p className="md-empty">ไม่มีวัสดุในตัวกรองที่เลือก</p>}
    <div className="md-pagination"><span>หน้า {page} จาก {pages}</span><button aria-label="หน้าก่อน" disabled={page === 1} onClick={() => setPage(page - 1)}><ChevronLeft size={16}/></button><button aria-label="หน้าถัดไป" disabled={page >= pages} onClick={() => setPage(page + 1)}><ChevronRight size={16}/></button></div>
  </section>;
}
