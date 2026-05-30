import { error, getState, readJson, requireAdmin, saveSettings } from "../_lib/data.js";

export async function onRequestPost({ env, request }) {
  try {
    const url = new URL(request.url);
    await requireAdmin(env.DB, url.searchParams.get("token") || "");
    const body = await readJson(request);
    await saveSettings(env.DB, body.settings || {});
    return Response.json(await getState(env.DB, "admin"));
  } catch (err) {
    return error(err.message || "設定儲存失敗", err.message?.includes("無權限") ? 403 : 400);
  }
}
