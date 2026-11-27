import { useCallback, useEffect, useState, type SetStateAction } from "react";
import { saveAccountEstimate, useAuth } from "@/context/AuthContext";
import type { ToastMessage } from "@/components/site/chrome";
import { createEstimateWriter } from "@/lib/estimateWriter";
import { DEFAULT_META, cleanLines, cleanMeta } from "@/lib/savedState";
import { usePersistentState } from "@/lib/storage";
import { materialTitleById } from "@/lib/materialTitle";
import type { AddLine, EstimateLine, EstimateMeta } from "@/types";

export function useEstimate(notify: (message: ToastMessage) => void) {
  const { user } = useAuth();
  const [guestLines, setGuestLines] = usePersistentState<EstimateLine[]>(
    "thai-tay-estimate-v1",
    [],
    cleanLines,
  );
  const [guestMeta, setGuestMeta] = usePersistentState<EstimateMeta>(
    "thai-tay-estimate-meta-v1",
    DEFAULT_META,
    cleanMeta,
  );
  const [writer] = useState(
    () =>
      user &&
      createEstimateWriter(
        user.estimate ?? { lines: [], meta: DEFAULT_META, revision: "" },
        (estimate, revision) => saveAccountEstimate(user.id, estimate, revision),
      ),
  );
  const [draft, setDraft] = useState(writer?.draft);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const lines = draft?.lines ?? guestLines;
  const meta = draft?.meta ?? guestMeta;

  const syncEstimate = useCallback(async () => {
    if (!writer) return;
    setSaving(true);
    setSaveError("");
    try {
      await writer.flush();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "บันทึกใบประมาณราคาไม่สำเร็จ");
      throw error;
    } finally {
      setSaving(false);
    }
  }, [writer]);

  useEffect(() => {
    function warnBeforeLeaving(event: BeforeUnloadEvent) {
      if (!writer?.dirty) return;
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", warnBeforeLeaving);
    return () => window.removeEventListener("beforeunload", warnBeforeLeaving);
  }, [writer]);

  const setLines = useCallback(
    (update: SetStateAction<EstimateLine[]>) => {
      if (!writer) return setGuestLines(update);
      const next = typeof update === "function" ? update(writer.draft.lines) : update;
      writer.edit({ ...writer.draft, lines: next });
      setDraft(writer.draft);
      void syncEstimate().catch(() => {});
    },
    [writer, setGuestLines, syncEstimate],
  );

  const setMeta = useCallback(
    (update: SetStateAction<EstimateMeta>) => {
      if (!writer) return setGuestMeta(update);
      const next = typeof update === "function" ? update(writer.draft.meta) : update;
      writer.edit({ ...writer.draft, meta: next });
      setDraft(writer.draft);
      void syncEstimate().catch(() => {});
    },
    [writer, setGuestMeta, syncEstimate],
  );

  const addLine: AddLine = useCallback(
    (line) => {
      setLines((prev) => [
        ...prev,
        { ...line, key: `${line.materialId}-${line.month}-${Date.now()}` },
      ]);
      notify({
        id: Date.now(),
        text: "เพิ่มลงใบประมาณราคาแล้ว",
        detail: `${materialTitleById(line.materialId, line.name)} · ${line.qty.toLocaleString("th-TH")} ${line.unit}`,
        action: "estimate",
      });
    },
    [notify, setLines],
  );

  const saveBeforeLogout = useCallback(async () => {
    if (writer?.dirty) await syncEstimate();
  }, [writer, syncEstimate]);

  return {
    lines,
    setLines,
    meta,
    setMeta,
    addLine,
    saving,
    saveError,
    syncEstimate,
    saveBeforeLogout,
  };
}
