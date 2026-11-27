import type { AccountEstimate } from "@/context/AuthContext";

type Draft = Pick<AccountEstimate, "lines" | "meta">;

// รอคำตอบของฉบับก่อนหน้า แล้วจึงส่งฉบับล่าสุด รวมการแก้ไขระหว่างรอไว้ในคำขอเดียว
function revisionToken() {
  return Array.from(crypto.getRandomValues(new Uint8Array(18)), byte => byte.toString(16).padStart(2, "0")).join("");
}

export function createEstimateWriter(initial: AccountEstimate,
  save: (estimate: AccountEstimate, nextRevision: string) => Promise<unknown>) {
  let saved: Draft = initial;
  let current: Draft = initial;
  let revision = initial.revision;
  let pending: { draft: Draft; nextRevision: string } | undefined;
  let running: Promise<void> | undefined;

  async function drain() {
    while (current !== saved) {
      pending ??= { draft: current, nextRevision: revisionToken() };
      try {
        await save({ ...pending.draft, revision }, pending.nextRevision);
      } catch (error) {
        // ข้อมูลไม่ผ่านการตรวจ จึงใช้ฉบับที่ผู้ใช้แก้ไขแล้วในการลองครั้งต่อไป
        if (error instanceof Error && "status" in error && error.status === 400) pending = undefined;
        throw error;
      }
      saved = pending.draft;
      revision = pending.nextRevision;
      pending = undefined;
    }
  }

  function flush() {
    running ??= Promise.resolve().then(drain).finally(() => { running = undefined; });
    return running;
  }

  return {
    get draft() { return current; },
    get dirty() { return current !== saved; },
    edit(draft: Draft) { current = draft; },
    flush,
  };
}
