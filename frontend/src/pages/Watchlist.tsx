import { WatchList } from "@/components/site/watch-list";

interface Props {
  watch: string[];
  unsavedCount: number;
  onImport: () => void;
}

export default function Watchlist({ watch, unsavedCount, onImport }: Props) {
  return (
    <div className="page watch-page">
      <header className="page-head">
        <h1>วัสดุที่ติดตาม</h1>
      </header>
      {unsavedCount > 0 && (
        <div className="watch-import">
          <p>มีวัสดุที่ติดตามไว้ในเครื่องนี้อีก {unsavedCount} รายการ</p>
          <button type="button" className="btn btn-secondary" onClick={onImport}>
            บันทึกเข้าบัญชี
          </button>
        </div>
      )}
      {watch.length ? (
        <WatchList watch={watch} />
      ) : (
        <div className="empty-state">
          <p>ยังไม่มีวัสดุที่ติดตาม กดรูปดาวบนการ์ดวัสดุเพื่อเก็บไว้ดูราคาที่นี่</p>
          <a className="btn btn-primary" href="#search">
            ค้นหาวัสดุ
          </a>
        </div>
      )}
    </div>
  );
}
