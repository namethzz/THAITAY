// Bar-end paint codes: mills paint the cut ends of bar bundles to tell grades apart at a glance.
// THAI TAY borrows the idea to tell the nine structural categories apart. Always shown beside the
// category name, never as the only cue.
export const CATEGORY_PAINT: Record<string, string> = {
  "STR-01": "#e0a100", // เหล็กเส้นเสริมคอนกรีต
  "STR-02": "#245594", // เหล็กรูปพรรณ
  "STR-03": "#2f8a55", // ตะแกรงเหล็กเสริมคอนกรีต
  "STR-04": "#7b52b8", // ลวดผูกเหล็ก
  "STR-05": "#c0392b", // ลวดอัดแรง
  "STR-06": "#5d6b78", // คอนกรีตผสมเสร็จ
  "STR-07": "#a8957a", // คอนกรีตหยาบ
  "STR-08": "#16809a", // เสาเข็มและชิ้นส่วนคอนกรีตสำเร็จรูป
  "STR-09": "#9a5a24", // มวลรวมคอนกรีต
};

export const paintFor = (categoryCode: string) => CATEGORY_PAINT[categoryCode] ?? "#9aa6b0";
