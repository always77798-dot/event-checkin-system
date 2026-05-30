export const DEFAULT_SETTINGS = {
  eventName: "114學年度第二次家長委員會議",
  mode: "簽到",
  isOpen: true,
  themeColor: "#d63384",
  requiredFields: "name, signature",
  hiddenFields: "unit, title",
  authCode: "close",
  hostToken: "host-change-me",
  adminToken: "admin-change-me",
  extra1Label: "",
  extra2Label: ""
};

export function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...(init.headers || {})
    }
  });
}

export function error(message, status = 400) {
  return json({ error: message }, { status });
}

export async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

export function publicSettings(settings, role = "public") {
  const safe = { ...settings };
  if (role !== "admin") delete safe.adminToken;
  if (role !== "admin") delete safe.hostToken;
  return safe;
}

export async function getSettings(DB) {
  const result = await DB.prepare("SELECT key, value FROM settings").all();
  const settings = { ...DEFAULT_SETTINGS };
  for (const row of result.results || []) {
    settings[row.key] = row.value;
  }
  settings.isOpen = settings.isOpen === true || settings.isOpen === "true" || settings.isOpen === "TRUE";
  return settings;
}

export async function saveSettings(DB, settings) {
  const next = { ...DEFAULT_SETTINGS, ...(settings || {}) };
  next.isOpen = next.isOpen ? "true" : "false";
  const entries = Object.entries(next).map(([key, value]) => [
    key,
    Array.isArray(value) ? value.join(", ") : String(value ?? "")
  ]);
  const statements = entries.map(([key, value]) =>
    DB.prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").bind(key, value)
  );
  await DB.batch(statements);
  return getSettings(DB);
}

export async function getGuests(DB) {
  const result = await DB.prepare("SELECT unit, title, name FROM guests ORDER BY id").all();
  return result.results || [];
}

export async function replaceGuests(DB, guests) {
  const normalized = (guests || [])
    .map((guest) => ({
      unit: String(guest.unit || "").trim(),
      title: String(guest.title || "").trim(),
      name: String(guest.name || "").trim()
    }))
    .filter((guest) => guest.name);
  const inserts = normalized.map((guest) =>
    DB.prepare("INSERT INTO guests (unit, title, name) VALUES (?, ?, ?)").bind(guest.unit, guest.title, guest.name)
  );
  await DB.batch([DB.prepare("DELETE FROM guests"), ...inserts]);
}

export async function addGuest(DB, guest) {
  const name = String(guest?.name || "").trim();
  if (!name) throw new Error("請輸入姓名");
  await DB.prepare("INSERT INTO guests (unit, title, name) VALUES (?, ?, ?)").bind(
    String(guest.unit || "").trim(),
    String(guest.title || "").trim(),
    name
  ).run();
}

export async function getRecords(DB) {
  const result = await DB.prepare(
    "SELECT id, timestamp, event_name AS eventName, mode, unit, title, name, signature, ip, device, fingerprint, extra1, extra2 FROM records ORDER BY timestamp"
  ).all();
  return result.results || [];
}

export async function addRecord(DB, settings, record, request) {
  const now = new Date().toISOString();
  const id = String(record.id || crypto.randomUUID());
  await DB.prepare(
    `INSERT INTO records
      (id, timestamp, event_name, mode, unit, title, name, signature, ip, device, fingerprint, extra1, extra2)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    id,
    String(record.timestamp || now),
    String(record.eventName || settings.eventName),
    String(record.mode || settings.mode),
    String(record.unit || ""),
    String(record.title || ""),
    String(record.name || ""),
    String(record.signature || ""),
    request.headers.get("cf-connecting-ip") || "",
    request.headers.get("user-agent") || "",
    String(record.fingerprint || ""),
    String(record.extra1 || ""),
    String(record.extra2 || "")
  ).run();
}

export async function getState(DB, role = "public") {
  const settings = await getSettings(DB);
  return {
    settings: publicSettings(settings, role),
    guests: await getGuests(DB),
    records: role === "public" ? [] : await getRecords(DB),
    access: { role, authorized: true }
  };
}

export async function requireAdmin(DB, token) {
  const settings = await getSettings(DB);
  if (!token || token !== settings.adminToken) throw new Error("無權限存取管理設定");
  return settings;
}

export async function requireHost(DB, token) {
  const settings = await getSettings(DB);
  if (!token || (token !== settings.hostToken && token !== settings.adminToken)) throw new Error("無權限存取主持人後台");
  return settings;
}
