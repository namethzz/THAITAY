import React from "react";
import { ArrowDownRight, ArrowUpRight, Database, Minus, TriangleAlert } from "lucide-react";
import { materials } from "../data.js";

function numeric(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatPrice(value) {
  const parsed = numeric(value);
  if (parsed === null) return "—";
  return parsed.toLocaleString("th-TH", { maximumFractionDigits: 2 });
}

export function PageHeader({ eyebrow, title, description, action }) {
  return (
    <>
      <style>{SHARED_STYLES}</style>
      <header className="page-header">
        <div className="page-header-copy">
          <div className="eyebrow">{eyebrow}</div>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        {action && <div className="page-header-action">{action}</div>}
      </header>
    </>
  );
}

export function StatCard({ label, value, change, note, positive }) {
  const direction = positive === true ? "up" : positive === false ? "down" : "neutral";
  return (
    <article className="stat-card">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {change !== undefined && change !== null && (
        <div className={`stat-change ${direction}`}>
          {direction === "up" ? <ArrowUpRight size={14} /> : direction === "down" ? <ArrowDownRight size={14} /> : <Minus size={14} />}
          {change}
        </div>
      )}
      <div className="stat-note">{note}</div>
    </article>
  );
}

export function Driver({ label, value, unit = "%" }) {
  const parsed = numeric(value);
  const percent = parsed === null ? 0 : Math.min(100, Math.max(0, parsed));
  return (
    <div className={`driver ${parsed === null ? "waiting" : ""}`}>
      <div className="driver-row"><span>{label}</span><b>{parsed === null ? "รอข้อมูล" : `${parsed.toFixed(1)}${unit}`}</b></div>
      <div className="bar"><i style={{ width: `${percent}%` }} /></div>
    </div>
  );
}

export function MaterialTable({ compact = false }) {
  const rows = compact ? materials.slice(0, 4) : materials;
  if (!rows.length) return <div className="shared-empty"><Database size={22} />ยังไม่มีรายการวัสดุ</div>;

  return (
    <div className="material-table-responsive">
      <div className="material-mobile-list">
        {rows.map((material) => (
          <article key={`mobile-${material.id || material.name}`}>
            <div><b>{material.id || "—"}</b><span><strong>{material.name}</strong><small>{material.category}</small></span></div>
            <div><span>ราคาล่าสุดใน Dataset</span><strong>฿{formatPrice(material.price)}</strong><small>{material.unit}</small></div>
            <em className={material.change === "-" ? "neutral" : material.positive ? "up-text" : "down-text"}>{material.change || "—"}</em>
          </article>
        ))}
      </div>
      <div className="table-scroll material-desktop-table">
        <table>
          <thead><tr><th>วัสดุ</th><th>หมวด</th><th>ราคาล่าสุดใน Dataset</th><th>หน่วย</th><th>เปลี่ยนแปลง</th></tr></thead>
          <tbody>{rows.map((material) => (
            <tr key={material.id || material.name}>
              <td><b>{material.name}</b></td>
              <td><span className="tag">{material.category}</span></td>
              <td className="price">฿{formatPrice(material.price)}</td>
              <td>{material.unit}</td>
              <td className={material.change === "-" ? "neutral-text" : material.positive ? "up-text" : "down-text"}>{material.change || "—"}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}

export function Metric({ title, value, change }) {
  return <article className="metric-card"><span>{title}</span><b>{value}</b>{change !== undefined && <em>{change}</em>}</article>;
}

export function Source({ name, status = "waiting", note = "ข้อมูลรายเดือน" }) {
  const connected = ["connected", "ready", "live"].includes(String(status).toLowerCase());
  return (
    <div className={`source-row ${connected ? "connected" : "waiting"}`}>
      <span className="source-dot" />
      <div><b>{name}</b><small>{note}</small></div>
      <em>{connected ? "เชื่อมต่อแล้ว" : <><TriangleAlert size={12} /> รอเชื่อมต่อ</>}</em>
    </div>
  );
}

const SHARED_STYLES = `
  .page-header { display:flex; align-items:flex-start; justify-content:space-between; gap:20px; margin-bottom:18px; }
  .page-header-copy { min-width:0; } .page-header h1 { margin:5px 0 5px; font-size:clamp(22px,3vw,32px); line-height:1.15; letter-spacing:-.5px; }
  .page-header p { max-width:760px; margin:0; font-size:12px; line-height:1.6; opacity:.58; } .page-header-action { flex:0 0 auto; }
  .stat-change { display:flex; align-items:center; gap:4px; } .stat-change.neutral { opacity:.55; }
  .driver.waiting { opacity:.62; } .driver.waiting .bar i { width:0 !important; }
  .material-mobile-list { display:none; } .neutral-text { opacity:.45; }
  .shared-empty { min-height:140px; display:flex; align-items:center; justify-content:center; gap:8px; border:1px dashed rgba(148,163,184,.23); border-radius:10px; font-size:10px; opacity:.5; }
  .source-row > em { display:flex; align-items:center; gap:4px; }
  @media (max-width:620px) {
    .page-header { align-items:stretch; flex-direction:column; gap:12px; margin-bottom:14px; }
    .page-header h1 { font-size:24px; } .page-header p { font-size:10px; } .page-header-action { width:100%; }
    .page-header-action > button,.page-header-action > .outline-btn { width:100%; min-height:44px; justify-content:center; }
    .material-desktop-table { display:none; } .material-mobile-list { display:grid; gap:8px; }
    .material-mobile-list article { position:relative; display:grid; grid-template-columns:1fr auto; gap:9px; padding:11px; border:1px solid rgba(148,163,184,.14); border-radius:9px; }
    .material-mobile-list article > div:first-child { display:flex; align-items:center; gap:8px; min-width:0; } .material-mobile-list article > div:first-child > b { width:28px; height:28px; display:grid; place-items:center; flex:0 0 auto; border-radius:7px; background:rgba(128,83,41,.1); color:#70441a; font-size:8px; }
    .material-mobile-list strong,.material-mobile-list small,.material-mobile-list span { display:block; } .material-mobile-list strong { font-size:10px; } .material-mobile-list small,.material-mobile-list span { margin-top:2px; font-size:7px; opacity:.5; }
    .material-mobile-list article > div:nth-child(2) { text-align:right; } .material-mobile-list article > em { grid-column:2; font-size:9px; font-style:normal; font-weight:700; text-align:right; }
  }
`;
