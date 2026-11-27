import { getMaterialById } from "@/data.js";
import { CategoryIcon } from "@/components/site/category-icon";
import { ChangeChip, useQuote } from "@/components/ui/price-widgets";
import { formatPrice } from "@/services/priceService";
import { materialTitle } from "@/lib/materialTitle";
import type { Material } from "@/types";

export function WatchList({ watch }: { watch: string[] }) {
  return (
    <ul className="watch-list">
      {watch
        .map((id) => getMaterialById(id))
        .filter((m): m is Material => Boolean(m))
        .map((m) => (
          <li key={m.id}>
            <WatchCard material={m} />
          </li>
        ))}
    </ul>
  );
}

/** การ์ดเล็กของวัสดุที่ติดตาม: ราคาล่าสุด + เปลี่ยนไปเท่าไหร่ใน 3 เดือน */
function WatchCard({ material }: { material: Material }) {
  const { data } = useQuote(material);
  const last = data?.forecast.at(-1);
  return (
    <a className="watch-card" href={`#m/${material.id}`}>
      <CategoryIcon code={material.categoryCode} size={40} />
      <span className="watch-copy">
        <strong>{materialTitle(material).title}</strong>
        <span className="watch-price">
          <b className="num">{data ? `฿${formatPrice(data.latest.price)}` : "—"}</b>
          <small>ต่อ {material.unit}</small>
        </span>
        {data && last && (
          <span className="watch-trend">
            <ChangeChip from={data.latest.price} to={last.price} short /> ใน 3 เดือน
          </span>
        )}
      </span>
    </a>
  );
}
