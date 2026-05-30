import { error, getState, getSettings } from "../_lib/data.js";

export async function onRequestGet({ env, request }) {
  try {
    const url = new URL(request.url);
    const page = url.searchParams.get("page") || "checkin";
    const token = url.searchParams.get("token") || "";
    const settings = await getSettings(env.DB);

    if (page === "admin") {
      if (token !== settings.adminToken) return error("無權限存取管理設定", 403);
      return Response.json(await getState(env.DB, "admin"));
    }

    if (page === "host") {
      if (token !== settings.hostToken && token !== settings.adminToken) return error("無權限存取主持人後台", 403);
      return Response.json(await getState(env.DB, "host"));
    }

    return Response.json(await getState(env.DB, "public"));
  } catch (err) {
    return error(err.message || "讀取資料失敗", 500);
  }
}
