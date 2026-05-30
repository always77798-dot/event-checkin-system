import { error, readJson, replaceGuests, requireAdmin, saveSettings, replaceRecords, getState } from "../_lib/data.js";

export async function onRequestPost({ env, request }) {
  try {
    const url = new URL(request.url);
    await requireAdmin(env.DB, url.searchParams.get("token") || "");
    const body = await readJson(request);
    const nextState = body.state || {};
    const settings = await saveSettings(env.DB, nextState.settings || {});
    await replaceGuests(env.DB, nextState.guests || []);
    await replaceRecords(env.DB, settings, nextState.records || [], request);
    return Response.json(await getState(env.DB, "admin"));
  } catch (err) {
    return error(err.message || "還原備份失敗", err.message?.includes("無權限") ? 403 : 400);
  }
}
