const isText = (value, limit) => typeof value === "string" && value.length <= limit;
const isAmount = value => Number.isFinite(value) && value >= 0;
const isRevision = value => typeof value === "string" && /^[a-f0-9]{36}$/i.test(value);

export function validEstimateUpdate({ revision, nextRevision, lines, meta }) {
  if (!(revision === "" || isRevision(revision)) || !isRevision(nextRevision) || nextRevision === revision) return false;
  if (!meta || !isText(meta.project, 120) || !isText(meta.customer, 120) ||
      ![0, 3, 5, 10].includes(meta.contingency) || typeof meta.vat !== "boolean") return false;
  if (!Array.isArray(lines) || lines.length > 2000) return false;
  return lines.every(line => line && isText(line.key, 256) && line.key.length > 0 &&
    isText(line.materialId, 100) && isText(line.name, 1000) && isText(line.unit, 100) &&
    [0, 1, 2, 3].includes(line.month) && isText(line.monthLabel, 100) &&
    isAmount(line.qty) && isAmount(line.price) && isAmount(line.low) && isAmount(line.high) &&
    typeof line.demo === "boolean" && (line.asOf === undefined || (typeof line.asOf === "string" && /^\d{4}-\d{2}-\d{2}$/.test(line.asOf))));
}

export async function saveEstimate(User, userId, update) {
  if (update.accountId !== userId) return 403;
  if (!validEstimateUpdate(update)) return 400;
  const { revision, nextRevision, lines, meta } = update;
  const allowed = [{ "estimate.revision": revision }];
  if (!revision) allowed.push({ "estimate.revision": { $exists: false } });
  const result = await User.updateOne(
    { _id: userId, $or: allowed },
    { $set: { estimate: { revision: nextRevision, lines, meta } } },
  );
  if (result.matchedCount) return 200;
  // ถ้าบันทึกสำเร็จแต่คำตอบขาดหาย ให้คำขอเดิมลองซ้ำได้
  if (await User.exists({ _id: userId, "estimate.revision": nextRevision })) return 200;
  return 409;
}
