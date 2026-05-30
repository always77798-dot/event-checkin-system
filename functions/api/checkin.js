import { addRecord, error, getSettings, getState, readJson } from "../_lib/data.js";

export async function onRequestPost({ env, request }) {
  try {
    const body = await readJson(request);
    const settings = await getSettings(env.DB);
    const record = body.record || {};

    if (!settings.isOpen) return error("目前尚未開放簽到", 403);
    if (settings.authCode && record.authCode !== settings.authCode) return error("簽到連結已失效", 403);
    if (!record.name) return error("請輸入姓名", 400);

    await addRecord(env.DB, settings, record, request);
    return Response.json(await getState(env.DB, "public"));
  } catch (err) {
    return error(err.message || "簽到失敗", 400);
  }
}
