import { useCallback, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import type { ToastMessage } from "@/components/site/chrome";
import { materialTitleById } from "@/lib/materialTitle";
import { cleanWatch } from "@/lib/savedState";
import { usePersistentState } from "@/lib/storage";

export function useWatchlist(onHome: boolean, notify: (message: ToastMessage) => void) {
  const { user, loading: authLoading, saveWatch } = useAuth();
  const [deviceWatch, setDeviceWatch] = usePersistentState<string[]>(
    "thai-tay-watch-v1",
    [],
    cleanWatch,
  );
  const watch = user ? cleanWatch(user.watchlist).reverse() : deviceWatch;
  const pendingWatch = useRef(false);
  const persistWatch = useCallback(
    async (ids: string[], following: boolean) => {
      if (pendingWatch.current) return false;
      pendingWatch.current = true;
      try {
        await saveWatch(ids, following);
        return true;
      } catch (cause) {
        notify({
          id: Date.now(),
          tone: "error",
          text: "บันทึกรายการติดตามไม่สำเร็จ",
          detail: cause instanceof Error ? cause.message : "กรุณาลองอีกครั้ง",
        });
        return false;
      } finally {
        pendingWatch.current = false;
      }
    },
    [saveWatch, notify],
  );
  const toggleWatch = useCallback(
    async (id: string) => {
      if (authLoading || pendingWatch.current) return;
      const watching = watch.includes(id);
      if (user) {
        if (!(await persistWatch([id], !watching))) return;
      } else {
        setDeviceWatch(watching ? watch.filter((x) => x !== id) : [id, ...watch]);
      }
      if (!watching && !onHome)
        notify({
          id: Date.now(),
          text: "ติดตามแล้ว ราคาจะแสดงที่หน้าแรก",
          detail: materialTitleById(id, ""),
          action: "home",
        });
    },
    [watch, setDeviceWatch, user, authLoading, persistWatch, onHome, notify],
  );
  const unsavedWatch = user ? deviceWatch.filter((id) => !watch.includes(id)) : [];
  async function importDeviceWatch() {
    if (await persistWatch([...unsavedWatch].reverse(), true)) setDeviceWatch([]);
  }

  return { watch, toggleWatch, unsavedCount: unsavedWatch.length, importDeviceWatch };
}
