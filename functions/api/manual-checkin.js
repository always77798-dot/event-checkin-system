import { addRecord, error, getState, readJson, requireHost } from "../_lib/data.js";

export async function onRequestPost({ env, request }) {
  try {
    const url = new URL(request.url);
    const settings = await requireHost(env.DB, url.searchParams.get("token") || "");
    const body = await readJson(request);
    const record = { ...(body.record || {}), signature: "Host-Manual-CheckIn" };
    if (!record.name) return error("請輸入姓名", 400);
    await addRecord(env.DB, settings, record, request);
    return Response.json(await getState(env.DB, "host"));
  } catch (err) {
    return error(err.message || "手動簽到失敗", err.message?.includes("無權限") ? 403 : 400);
  }
}
