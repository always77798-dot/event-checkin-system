import {
  addGuest,
  addRecord,
  error,
  getRecords,
  getSettings,
  getState,
  readJson,
  replaceGuests,
  requireAdmin,
  requireHost,
  saveSettings
} from "../functions/_lib/data.js";

function csvCell(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

async function handleApi(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;

  if (request.method === "GET" && path === "/api/state") {
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
  }

  if (request.method === "POST" && path === "/api/settings") {
    await requireAdmin(env.DB, url.searchParams.get("token") || "");
    const body = await readJson(request);
    await saveSettings(env.DB, body.settings || {});
    return Response.json(await getState(env.DB, "admin"));
  }

  if (request.method === "POST" && path === "/api/guests") {
    await requireAdmin(env.DB, url.searchParams.get("token") || "");
    const body = await readJson(request);
    await addGuest(env.DB, body.guest || {});
    return Response.json(await getState(env.DB, "admin"));
  }

  if (request.method === "POST" && path === "/api/guests/import") {
    await requireAdmin(env.DB, url.searchParams.get("token") || "");
    const body = await readJson(request);
    await replaceGuests(env.DB, body.guests || []);
    return Response.json(await getState(env.DB, "admin"));
  }

  if (request.method === "POST" && path === "/api/checkin") {
    const body = await readJson(request);
    const settings = await getSettings(env.DB);
    const record = body.record || {};

    if (!settings.isOpen) return error("目前尚未開放簽到", 403);
    if (settings.authCode && record.authCode !== settings.authCode) return error("簽到連結已失效", 403);
    if (!record.name) return error("請輸入姓名", 400);

    await addRecord(env.DB, settings, record, request);
    return Response.json(await getState(env.DB, "public"));
  }

  if (request.method === "POST" && path === "/api/manual-checkin") {
    const settings = await requireHost(env.DB, url.searchParams.get("token") || "");
    const body = await readJson(request);
    const record = { ...(body.record || {}), signature: "Host-Manual-CheckIn" };
    if (!record.name) return error("請輸入姓名", 400);
    await addRecord(env.DB, settings, record, request);
    return Response.json(await getState(env.DB, "host"));
  }

  if (request.method === "POST" && path === "/api/records/clear") {
    await requireAdmin(env.DB, url.searchParams.get("token") || "");
    await env.DB.prepare("DELETE FROM records").run();
    return Response.json(await getState(env.DB, "admin"));
  }

  if (request.method === "POST" && path === "/api/replace-all") {
    await requireAdmin(env.DB, url.searchParams.get("token") || "");
    const body = await readJson(request);
    const nextState = body.state || {};
    const settings = await saveSettings(env.DB, nextState.settings || {});
    await replaceGuests(env.DB, nextState.guests || []);
    await env.DB.prepare("DELETE FROM records").run();
    for (const record of nextState.records || []) {
      await addRecord(env.DB, settings, record, request);
    }
    return Response.json(await getState(env.DB, "admin"));
  }

  if (request.method === "GET" && path === "/api/export.csv") {
    await requireHost(env.DB, url.searchParams.get("token") || "");
    const rows = await getRecords(env.DB);
    const header = ["時間戳記", "活動名稱", "類型", "單位", "職稱", "姓名", "簽名", "裝置", "彈性欄位 1", "彈性欄位 2"];
    const lines = [
      header.map(csvCell).join(","),
      ...rows.map((record) => [
        record.timestamp,
        record.eventName,
        record.mode,
        record.unit,
        record.title,
        record.name,
        record.signature,
        record.device,
        record.extra1,
        record.extra2
      ].map(csvCell).join(","))
    ];
    return new Response(lines.join("\n"), {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": "attachment; filename=\"checkin-records.csv\""
      }
    });
  }

  return error("找不到 API", 404);
}

export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);
      if (url.pathname.startsWith("/api/")) {
        return await handleApi(request, env);
      }
      return env.SITE_ASSETS.fetch(request);
    } catch (err) {
      const status = err.message?.includes("無權限") ? 403 : 500;
      return error(err.message || "伺服器發生錯誤", status);
    }
  }
};
