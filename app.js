const storageKey = "checkin-web-prototype-v1";

const seedState = {
  settings: {
    eventName: "114學年度第二次家長委員會議",
    mode: "簽到",
    isOpen: true,
    themeColor: "#d63384",
    requiredFields: "name, signature",
    hiddenFields: "unit, title",
    authCode: "close",
    hostToken: "",
    adminToken: "",
    extra1Label: "",
    extra2Label: ""
  },
  guests: [
    { unit: "新北市土城國小家長會", title: "會長", name: "朱威丞" },
    { unit: "新北市土城國小家長會", title: "副會長", name: "許智銘" },
    { unit: "新北市土城國小家長會", title: "副會長", name: "劉鴻傑" },
    { unit: "新北市土城國小家長會", title: "副會長", name: "魯家寧" },
    { unit: "新北市土城國小家長會", title: "副會長", name: "黃大千" },
    { unit: "新北市土城國小家長會", title: "委員", name: "羅翌紋" },
    { unit: "新北市土城國小家長會", title: "委員", name: "何春慧" },
    { unit: "新北市土城國小家長會", title: "委員", name: "楊新峰" },
    { unit: "新北市土城國小", title: "校長", name: "謝芳儒" },
    { unit: "新北市土城國小", title: "主任", name: "萬志祥" },
    { unit: "新北市土城國小", title: "主任", name: "黃碧秋" },
    { unit: "新北市土城國小", title: "組長", name: "沈哲民" }
  ],
  records: []
};

const dataService = {
  load() {
    const stored = localStorage.getItem(storageKey);
    if (!stored) return normalizeState(structuredClone(seedState));
    try {
      return normalizeState({ ...structuredClone(seedState), ...JSON.parse(stored) });
    } catch {
      return normalizeState(structuredClone(seedState));
    }
  },
  save(nextState) {
    localStorage.setItem(storageKey, JSON.stringify(nextState));
  },
  saveSettings(settings) {
    const nextState = this.load();
    nextState.settings = { ...nextState.settings, ...settings };
    this.save(nextState);
    return nextState;
  },
  importGuests(guests) {
    const nextState = this.load();
    const seen = new Set(nextState.guests.map(guestKey));
    guests.forEach((guest) => {
      if (!guest.name) return;
      const key = guestKey(guest);
      if (seen.has(key)) return;
      seen.add(key);
      nextState.guests.push(guest);
    });
    this.save(nextState);
    return nextState;
  },
  addGuest(guest) {
    const nextState = this.load();
    if (!nextState.guests.some((item) => guestKey(item) === guestKey(guest))) nextState.guests.push(guest);
    this.save(nextState);
    return nextState;
  },
  deleteGuest(guest) {
    const nextState = this.load();
    nextState.guests = nextState.guests.filter((item) => guestKey(item) !== guestKey(guest));
    this.save(nextState);
    return nextState;
  },
  clearGuests() {
    const nextState = this.load();
    nextState.guests = [];
    this.save(nextState);
    return nextState;
  },
  submitCheckin(record) {
    const nextState = this.load();
    nextState.records.push(record);
    this.save(nextState);
    return nextState;
  },
  clearRecords() {
    const nextState = this.load();
    nextState.records = [];
    this.save(nextState);
    return nextState;
  },
  replaceAll(nextState) {
    const normalized = normalizeState(nextState);
    this.save(normalized);
    return normalized;
  },
  reset() {
    localStorage.removeItem(storageKey);
    return this.load();
  }
};

const apiDataService = {
  isAvailable() {
    return window.location.protocol === "http:" || window.location.protocol === "https:";
  },
  async request(path, options = {}) {
    const response = await fetch(path, {
      ...options,
      headers: {
        "content-type": "application/json",
        ...(options.headers || {})
      }
    });
    const contentType = response.headers.get("content-type") || "";
    const payload = contentType.includes("application/json") ? await response.json() : await response.text();
    if (!response.ok) {
      throw new Error(payload?.error || payload || "操作失敗");
    }
    return payload;
  },
  tokenParam() {
    const token = getUrlToken();
    return token ? `?token=${encodeURIComponent(token)}` : "";
  },
  load() {
    const params = new URLSearchParams(window.location.search);
    const page = getPageKind() || params.get("page") || "checkin";
    params.set("page", page);
    return this.request(`/api/state?${params.toString()}`);
  },
  saveSettings(settings) {
    return this.request(`/api/settings${this.tokenParam()}`, {
      method: "POST",
      body: JSON.stringify({ settings })
    });
  },
  importGuests(guests) {
    return this.request(`/api/guests/import${this.tokenParam()}`, {
      method: "POST",
      body: JSON.stringify({ guests })
    });
  },
  addGuest(guest) {
    return this.request(`/api/guests${this.tokenParam()}`, {
      method: "POST",
      body: JSON.stringify({ guest })
    });
  },
  deleteGuest(guest) {
    return this.request(`/api/guests/delete${this.tokenParam()}`, {
      method: "POST",
      body: JSON.stringify({ guest })
    });
  },
  clearGuests() {
    return this.request(`/api/guests/clear${this.tokenParam()}`, { method: "POST", body: "{}" });
  },
  submitCheckin(record) {
    const isManual = record.signature === "Host-Manual-CheckIn";
    if (isManual) {
      return this.request(`/api/manual-checkin${this.tokenParam()}`, {
        method: "POST",
        body: JSON.stringify({ record })
      });
    }
    record.authCode = new URLSearchParams(window.location.search).get("code") || "";
    return this.request("/api/checkin", {
      method: "POST",
      body: JSON.stringify({ record })
    });
  },
  clearRecords() {
    return this.request(`/api/records/clear${this.tokenParam()}`, { method: "POST", body: "{}" });
  },
  replaceAll(nextState) {
    return this.request(`/api/replace-all${this.tokenParam()}`, {
      method: "POST",
      body: JSON.stringify({ state: nextState })
    });
  },
  reset() {
    return this.replaceAll(seedState);
  },
  exportUrl() {
    return `/api/export.csv${this.tokenParam()}`;
  }
};

function normalizeState(nextState) {
  nextState.records = (nextState.records || []).map((record, index) => ({
    id: record.id || `legacy-${index}-${record.timestamp || Date.now()}`,
    ...record
  }));
  nextState.guests = nextState.guests || [];
  nextState.settings = { ...seedState.settings, ...(nextState.settings || {}) };
  return nextState;
}

let state = normalizeState(structuredClone(seedState));
let activeFilter = "all";
let hostSearch = "";
let signatureDirty = false;

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));
const setText = (selector, value) => {
  const element = $(selector);
  if (element) element.textContent = value;
};
const setValue = (selector, value) => {
  const element = $(selector);
  if (element) element.value = value;
};
const setHtml = (selector, value) => {
  const element = $(selector);
  if (element) element.innerHTML = value;
};
const fieldLabels = {
  unit: "單位",
  title: "職稱",
  name: "姓名",
  signature: "簽名",
  extra1: "彈性欄位 1",
  extra2: "彈性欄位 2"
};

function getDataService() {
  if (window.gasDataService && window.google && google.script && google.script.run) {
    return window.gasDataService;
  }
  if (apiDataService.isAvailable()) {
    return apiDataService;
  }
  return dataService;
}

async function loadState() {
  const service = getDataService();
  state = normalizeState(await service.load());
  if (service === dataService) dataService.save(state);
  return state;
}

function parseList(value) {
  return value
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function formatFieldList(value) {
  const fields = parseList(value);
  return fields.length ? fields.map((field) => fieldLabels[field] || field).join("、") : "";
}

function guestKey(guest) {
  return [guest.unit || "", guest.title || "", guest.name || ""].join("\u001f");
}

function syncCheckboxGroup(groupName, csvValue) {
  const selected = new Set(parseList(csvValue));
  $$(`[data-setting-group="${groupName}"] input[type="checkbox"]`).forEach((input) => {
    input.checked = selected.has(input.value);
  });
}

function readCheckboxGroup(groupName) {
  return $$(`[data-setting-group="${groupName}"] input[type="checkbox"]:checked`)
    .map((input) => input.value)
    .join(", ");
}

function subtractCsv(sourceValue, removeValue) {
  const remove = new Set(parseList(removeValue));
  return parseList(sourceValue).filter((field) => !remove.has(field)).join(", ");
}

function formatTime(dateValue) {
  const date = new Date(dateValue);
  return date.toLocaleTimeString("zh-TW", { hour12: false });
}

function getStats() {
  const arrivedNames = new Set(
    state.records
      .filter((record) => record.eventName === state.settings.eventName)
      .map((record) => record.name)
  );
  const totalExpected = state.guests.length;
  const verifiedPresent = state.guests.filter((guest) => arrivedNames.has(guest.name)).length;
  const absent = Math.max(totalExpected - verifiedPresent, 0);
  const rate = totalExpected ? `${((verifiedPresent / totalExpected) * 100).toFixed(1)}%` : "0%";
  const duplicateCount = state.records
    .filter((record) => record.eventName === state.settings.eventName)
    .reduce((sum, record, index, records) => {
      const firstIndex = records.findIndex((item) => item.name === record.name);
      return sum + (firstIndex !== index ? 1 : 0);
    }, 0);

  return { totalExpected, verifiedPresent, absent, rate, arrivedNames, duplicateCount };
}

function showToast(message) {
  const toast = $("#toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 2200);
}

function showError(error, fallback = "操作失敗") {
  const message = error && error.message ? error.message : fallback;
  showToast(message);
}

function getPageUrl(fileName, params = {}) {
  const page = fileName.replace(/\.html$/i, "");
  const isGasRoute = !window.location.pathname.toLowerCase().endsWith(".html") && window.location.search.includes("page=");
  const url = isGasRoute ? new URL(window.location.origin + window.location.pathname) : new URL(fileName, window.location.href);
  if (isGasRoute) url.searchParams.set("page", page);
  Object.entries(params).forEach(([key, value]) => {
    if (value) url.searchParams.set(key, value);
  });
  return url.toString();
}

function getQrUrl(text) {
  return `https://quickchart.io/qr?size=220&text=${encodeURIComponent(text)}`;
}

function normalizeSignaturePreview(signature) {
  if (!signature) return "";
  if (signature.startsWith("data:image/")) return signature;
  const match = signature.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (match && match[1]) return `https://drive.google.com/uc?export=view&id=${match[1]}`;
  return signature;
}

function isCheckinAuthorized() {
  const code = new URLSearchParams(window.location.search).get("code") || "";
  return state.settings.isOpen && (!state.settings.authCode || code === state.settings.authCode);
}

function getUrlToken() {
  return new URLSearchParams(window.location.search).get("token") || "";
}

function updateCurrentTokenUrl() {
  const pageKind = getPageKind();
  const nextToken = pageKind === "admin" ? state.settings.adminToken : pageKind === "host" ? state.settings.hostToken : "";
  if (!nextToken || nextToken === getUrlToken() || !window.history?.replaceState) return;
  const url = new URL(window.location.href);
  url.searchParams.set("token", nextToken);
  window.history.replaceState({}, "", url.toString());
}

function getPageKind() {
  const path = window.location.pathname.toLowerCase();
  if (path.endsWith("host.html")) return "host";
  if (path.endsWith("admin.html")) return "admin";
  return "";
}

function hasPrivilegedAccess() {
  const pageKind = getPageKind();
  const token = getUrlToken();
  if (state.access && (pageKind === "host" || pageKind === "admin")) return state.access.authorized;
  if (window.location.protocol === "file:" && pageKind === "admin" && !token) return true;
  if (pageKind === "host") return token && token === state.settings.hostToken;
  if (pageKind === "admin") return token && token === state.settings.adminToken;
  return true;
}

function setView(view) {
  if (!$(".nav-item")) return;
  $$(".nav-item").forEach((button) => button.classList.toggle("active", button.dataset.view === view));
  $$(".view").forEach((panel) => panel.classList.toggle("active", panel.id === `view-${view}`));
}

function applySettingsToUi() {
  const settings = state.settings;
  document.documentElement.style.setProperty("--theme", settings.themeColor || "#d63384");
  setText("#eventTitle", settings.eventName);
  setText("#eventNameCard", settings.eventName);
  setText(".brand-subtitle", settings.eventName);
  setText("#modeLabel", `${settings.mode}模式`);
  setText("#submitLabel", `完成${settings.mode}`);
  setText("#authStatus", settings.isOpen ? (settings.authCode ? "有效連結" : "未設驗證") : "活動關閉");

  const requiredFields = parseList(settings.requiredFields);
  setText("#requiredSummary", requiredFields.length ? `${formatFieldList(settings.requiredFields)} 必填` : "未設定必填欄位");

  const hiddenFields = parseList(settings.hiddenFields);
  $$("[data-field]").forEach((field) => {
    const key = field.dataset.field;
    const isHiddenBySetting = hiddenFields.includes(key);
    const isEmptyExtra = key === "extra1" && !settings.extra1Label || key === "extra2" && !settings.extra2Label;
    field.hidden = isHiddenBySetting || isEmptyExtra;
  });

  $$("[data-field] input").forEach((input) => {
    const field = input.closest("[data-field]")?.dataset.field;
    input.required = field ? requiredFields.includes(field) && !hiddenFields.includes(field) : false;
  });

  setText("#extra1Label", settings.extra1Label || "彈性欄位 1");
  setText("#extra2Label", settings.extra2Label || "彈性欄位 2");

  setValue("#settingEventName", settings.eventName);
  setValue("#settingMode", settings.mode);
  setValue("#settingIsOpen", settings.isOpen ? "open" : "closed");
  setValue("#settingThemeColor", settings.themeColor);
  setValue("#settingRequired", settings.requiredFields);
  setValue("#settingHidden", settings.hiddenFields);
  syncCheckboxGroup("required", settings.requiredFields);
  syncCheckboxGroup("hidden", settings.hiddenFields);
  setValue("#settingAuthCode", settings.authCode);
  if (settings.hostToken) setValue("#settingHostToken", settings.hostToken);
  if (settings.adminToken || getUrlToken()) setValue("#settingAdminToken", settings.adminToken || getUrlToken());
  setValue("#settingExtra1", settings.extra1Label);
  setValue("#settingExtra2", settings.extra2Label);
}

function renderDatalists() {
  if (!$("#unitOptions")) return;
  const units = [...new Set(state.guests.map((guest) => guest.unit).filter(Boolean))].sort();
  const titles = [...new Set(state.guests.map((guest) => guest.title).filter(Boolean))].sort();
  const names = state.guests.map((guest) => guest.name).sort();

  setHtml("#unitOptions", units.map((value) => `<option value="${value}"></option>`).join(""));
  setHtml("#titleOptions", titles.map((value) => `<option value="${value}"></option>`).join(""));
  setHtml("#nameOptions", names.map((value) => `<option value="${value}"></option>`).join(""));
}

function renderRecent() {
  if (!$("#recentList")) return;
  const records = state.records
    .filter((record) => record.eventName === state.settings.eventName)
    .slice()
    .reverse()
    .slice(0, 4);

  setHtml("#recentList", records.length
    ? records.map((record) => `
      <div class="recent-item">
        <strong>${record.name}</strong>
        <span>${record.unit || "未填單位"} · ${formatTime(record.timestamp)}</span>
      </div>
    `).join("")
    : `<div class="recent-item"><strong>尚無紀錄</strong><span>完成第一筆簽到後會顯示在這裡</span></div>`);
}

function renderStats() {
  const stats = getStats();
  setText("#checkinExpected", stats.totalExpected);
  setText("#checkinPresent", stats.verifiedPresent);
  setText("#checkinRate", stats.rate);
  setText("#totalExpected", stats.totalExpected);
  setText("#verifiedPresent", stats.verifiedPresent);
  setText("#absentCount", stats.absent);
  setText("#attendanceRate", stats.rate);
  setText("#duplicateCount", stats.duplicateCount);
  setText("#lastUpdated", `更新於 ${new Date().toLocaleTimeString("zh-TW", { hour12: false })}`);
}

function getGuestRows() {
  const stats = getStats();
  return state.guests.map((guest) => {
    const record = state.records.findLast((item) => item.name === guest.name && item.eventName === state.settings.eventName);
    return {
      ...guest,
      arrived: stats.arrivedNames.has(guest.name),
      timestamp: record?.timestamp || null
    };
  });
}

function renderGuestTable() {
  let rows = getGuestRows();
  if (activeFilter === "arrived") rows = rows.filter((row) => row.arrived);
  if (activeFilter === "absent") rows = rows.filter((row) => !row.arrived);
  if (hostSearch) {
    rows = rows.filter((row) => [row.unit, row.title, row.name].join(" ").toLowerCase().includes(hostSearch));
  }

  setHtml("#guestTableBody", rows.map((row) => `
    <tr>
      <td>${row.unit}</td>
      <td>${row.title}</td>
      <td><strong>${row.name}</strong></td>
      <td><span class="badge ${row.arrived ? "ok" : "wait"}">${row.arrived ? "已簽到" : "未出席"}</span></td>
      <td>${row.timestamp ? formatTime(row.timestamp) : "-"}</td>
      <td>
        ${row.arrived ? "" : `<button class="row-action" data-manual="${row.name}" type="button">手動簽到</button>`}
      </td>
    </tr>
  `).join(""));

  setHtml("#settingsGuestTable", state.guests.map((guest, index) => `
    <tr>
      <td>${guest.unit}</td>
      <td>${guest.title}</td>
      <td><strong>${guest.name}</strong></td>
      <td><button class="row-action" data-delete-guest="${index}" type="button">刪除</button></td>
    </tr>
  `).join(""));
  setText("#guestCountLabel", `${state.guests.length} 位`);
}

function renderRecordTable() {
  if (!$("#recordTableBody")) return;
  const rows = state.records
    .filter((record) => record.eventName === state.settings.eventName)
    .slice()
    .reverse();

  setHtml("#recordTableBody", rows.length ? rows.map((row) => {
    const hasSignature = row.signature && row.signature !== "Host-Manual-CheckIn";
    const manual = row.signature === "Host-Manual-CheckIn";
    const isListed = state.guests.some((guest) => guest.name === row.name);
    return `
      <tr>
        <td>${formatTime(row.timestamp)}</td>
        <td>${row.mode}</td>
        <td>${row.unit || "-"}</td>
        <td>${row.title || "-"}</td>
        <td><strong>${row.name || "-"}</strong>${isListed ? "" : ` <span class="badge wait">非名單</span>`}</td>
        <td>
          ${hasSignature ? `<button class="row-action" data-signature-index="${row.id}" type="button">預覽</button>` : `<span class="badge wait">${manual ? "手動" : "無簽名"}</span>`}
        </td>
      </tr>
    `;
  }).join("") : `
    <tr>
      <td colspan="6">目前尚無簽到紀錄</td>
    </tr>
  `);
}

function renderPublishLinks() {
  const checkinUrl = getPageUrl("checkin.html", { code: state.settings.authCode });
  const hostUrl = getPageUrl("host.html", { token: state.settings.hostToken });
  const adminUrl = getPageUrl("admin.html", { token: state.settings.adminToken });
  const checkinPageQr = $("#checkinPageQr");
  if (checkinPageQr) {
    checkinPageQr.src = getQrUrl(window.location.href);
  }
  if (!$("#checkinUrl")) return;
  setValue("#checkinUrl", checkinUrl);
  setValue("#hostUrl", hostUrl);
  setValue("#adminUrl", adminUrl);
  const checkinQr = $("#checkinQr");
  const hostQr = $("#hostQr");
  const adminQr = $("#adminQr");
  if (checkinQr) checkinQr.src = getQrUrl(checkinUrl);
  if (hostQr) hostQr.src = getQrUrl(hostUrl);
  if (adminQr) adminQr.src = getQrUrl(adminUrl);
}

function renderGuestPicker() {
  const list = $("#guestPickerList");
  if (!list) return;
  const keyword = ($("#guestPickerSearch")?.value || "").trim().toLowerCase();
  const guests = state.guests.filter((guest) => {
    if (!keyword) return true;
    return [guest.unit, guest.title, guest.name].join(" ").toLowerCase().includes(keyword);
  });
  setHtml("#guestPickerList", guests.length ? guests.map((guest) => `
    <button class="guest-picker-item" data-pick-guest="${encodeURIComponent(guestKey(guest))}" type="button">
      <strong>${guest.name}</strong>
      <span>${guest.unit || "未填單位"} · ${guest.title || "未填職稱"}</span>
    </button>
  `).join("") : `<div class="guest-picker-empty">找不到符合的名單</div>`);
}

function applyPageAccess() {
  const pageKind = getPageKind();
  if (!pageKind || hasPrivilegedAccess()) return;
  setHtml("body", `
    <main class="page-shell">
      <section class="panel access-denied">
        <i data-lucide="lock-keyhole"></i>
        <h1>無權限存取</h1>
        <p>這個頁面需要有效的${pageKind === "host" ? "主持人" : "管理者"}權杖。請使用管理端產生的最新連結。</p>
      </section>
    </main>
  `);
  if (window.lucide) lucide.createIcons();
}

function applyAuthState() {
  if (!$("#checkinForm")) return;
  const authorized = isCheckinAuthorized();
  const warning = $("#authWarning");
  if (warning) warning.hidden = authorized;
  setText("#authStatus", authorized ? "有效連結" : (state.settings.isOpen ? "無效連結" : "活動關閉"));
  setText("#authWarningTitle", state.settings.isOpen ? "這個簽到連結已失效" : "目前尚未開放簽到");
  setText("#authWarningBody", state.settings.isOpen ? "請掃描現場最新 QR Code，或向主辦單位確認連結。" : "主辦單位開放活動後，簽到表單才可使用。");
  $("#authStatus")?.classList.toggle("invalid", !authorized);
  $("#checkinForm").dataset.blocked = authorized ? "false" : "true";
  $$("#checkinForm input, #checkinForm button, #signatureCanvas").forEach((element) => {
    if (element.id === "clearSignatureButton" || element.id === "fillSampleButton") {
      element.disabled = !authorized;
      return;
    }
    if ("disabled" in element) element.disabled = !authorized;
  });
}

function renderAll() {
  applyPageAccess();
  if (!hasPrivilegedAccess()) return;
  applySettingsToUi();
  applyAuthState();
  renderDatalists();
  renderStats();
  renderRecent();
  renderGuestTable();
  renderRecordTable();
  renderPublishLinks();
  if (window.lucide) lucide.createIcons();
}

async function createRecord({ unit, title, name, extra1 = "", extra2 = "", signature = "" }) {
  const record = {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    timestamp: new Date().toISOString(),
    eventName: state.settings.eventName,
    mode: state.settings.mode,
    unit,
    title,
    name,
    signature,
    ip: "Prototype",
    device: navigator.userAgent,
    uuid: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    extra1,
    extra2
  };
  state = normalizeState(await getDataService().submitCheckin(record));
}

function getCompressedSignature() {
  const source = $("#signatureCanvas");
  if (!source || !signatureDirty) return "";
  const target = document.createElement("canvas");
  target.width = 520;
  target.height = 150;
  const ctx = target.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, target.width, target.height);
  ctx.drawImage(source, 0, 0, target.width, target.height);
  return target.toDataURL("image/jpeg", 0.72);
}

function validateForm(formData) {
  const requiredFields = parseList(state.settings.requiredFields);
  const hiddenFields = new Set(parseList(state.settings.hiddenFields));
  for (const key of requiredFields) {
    if (hiddenFields.has(key)) continue;
    if (key === "signature" && !signatureDirty) return "請完成簽名";
    if (key !== "signature" && !String(formData.get(key) || "").trim()) return "請補齊必填欄位";
  }
  return "";
}

function setupSignaturePad() {
  const canvas = $("#signatureCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  let drawing = false;

  function getPoint(event) {
    const rect = canvas.getBoundingClientRect();
    const point = event.touches ? event.touches[0] : event;
    return {
      x: ((point.clientX - rect.left) / rect.width) * canvas.width,
      y: ((point.clientY - rect.top) / rect.height) * canvas.height
    };
  }

  function start(event) {
    event.preventDefault();
    drawing = true;
    const point = getPoint(event);
    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
  }

  function move(event) {
    if (!drawing) return;
    event.preventDefault();
    const point = getPoint(event);
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#17202b";
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
    signatureDirty = true;
  }

  function end() {
    drawing = false;
  }

  canvas.addEventListener("mousedown", start);
  canvas.addEventListener("mousemove", move);
  window.addEventListener("mouseup", end);
  canvas.addEventListener("touchstart", start, { passive: false });
  canvas.addEventListener("touchmove", move, { passive: false });
  window.addEventListener("touchend", end);

  $("#clearSignatureButton")?.addEventListener("click", () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    signatureDirty = false;
  });
}

function exportCsv() {
  const service = getDataService();
  if (service.exportUrl) {
    window.location.href = service.exportUrl();
    return;
  }
  const rows = getGuestRows();
  const csvRows = [
    ["單位", "職稱", "姓名", "報到狀態", "簽到時間"],
    ...rows.map((row) => [row.unit, row.title, row.name, row.arrived ? "已簽到" : "未出席", row.timestamp ? formatTime(row.timestamp) : "-"])
  ];
  const csv = "\uFEFF" + csvRows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${state.settings.eventName}_報到名單.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function downloadTextFile(fileName, text, type = "application/json;charset=utf-8") {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

function generateAuthCode() {
  return Math.random().toString(36).slice(2, 8);
}

function parseGuestImport(text) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const delimiter = line.includes("\t") ? "\t" : line.includes("，") ? "，" : ",";
      const parts = line.split(delimiter).map((part) => part.trim());
      return {
        unit: parts[0] || "",
        title: parts[1] || "",
        name: parts[2] || ""
      };
    })
    .filter((guest) => guest.name);
}

function bindEvents() {
  $$(".nav-item").forEach((button) => button.addEventListener("click", () => setView(button.dataset.view)));
  $$(".segment").forEach((button) => button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;
    $$(".segment").forEach((item) => item.classList.toggle("active", item === button));
    renderGuestTable();
  }));

  $("#hostSearchInput")?.addEventListener("input", (event) => {
    hostSearch = event.target.value.trim().toLowerCase();
    renderGuestTable();
  });

  $("#fillSampleButton")?.addEventListener("click", () => {
    renderGuestPicker();
    $("#guestPickerDialog")?.showModal();
  });

  $("#closeGuestPickerDialog")?.addEventListener("click", () => {
    $("#guestPickerDialog")?.close();
  });

  $("#guestPickerSearch")?.addEventListener("input", renderGuestPicker);

  $("#guestPickerList")?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-pick-guest]");
    if (!button) return;
    const guest = state.guests.find((item) => guestKey(item) === decodeURIComponent(button.dataset.pickGuest));
    if (!guest) return;
    $("#unitInput").value = guest.unit;
    $("#titleInput").value = guest.title;
    $("#nameInput").value = guest.name;
    $("#guestPickerDialog")?.close();
  });

  $("#checkinForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    if (form.dataset.blocked === "true") {
      showToast("簽到連結已失效");
      return;
    }
    const formData = new FormData(form);
    const error = validateForm(formData);
    if (error) {
      showToast(error);
      return;
    }

    try {
      await createRecord({
        unit: formData.get("unit").trim(),
        title: formData.get("title").trim(),
        name: formData.get("name").trim(),
        extra1: formData.get("extra1")?.trim() || "",
        extra2: formData.get("extra2")?.trim() || "",
        signature: getCompressedSignature()
      });

      form.reset();
      $("#clearSignatureButton")?.click();
      renderAll();
      showToast(`${state.settings.mode}成功`);
    } catch (error) {
      showError(error, "簽到失敗");
    }
  });

  $("#guestTableBody")?.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-manual]");
    if (!button) return;
    const guest = state.guests.find((item) => item.name === button.dataset.manual);
    try {
      await createRecord({ ...guest, signature: "Host-Manual-CheckIn" });
      renderAll();
      showToast(`${guest.name} 已手動簽到`);
    } catch (error) {
      showError(error, "手動簽到失敗");
    }
  });

  $("#recordTableBody")?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-signature-index]");
    if (!button) return;
    const record = state.records.find((item) => item.id === button.dataset.signatureIndex);
    if (!record) return;
    setText("#signatureDialogName", record.name || "-");
    const preview = $("#signaturePreview");
    const fallback = $("#signatureFallback");
    if (preview && fallback) {
      const previewUrl = normalizeSignaturePreview(record.signature);
      if (previewUrl) {
        preview.src = previewUrl;
        preview.style.display = "block";
        fallback.style.display = "none";
      } else {
        preview.removeAttribute("src");
        preview.style.display = "none";
        fallback.style.display = "block";
      }
    }
    $("#signatureDialog")?.showModal();
  });

  $("#settingsGuestTable")?.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-delete-guest]");
    if (!button) return;
    const guest = state.guests[Number(button.dataset.deleteGuest)];
    if (!guest || !confirm(`確定刪除 ${guest.name} 嗎？`)) return;
    try {
      state = normalizeState(await getDataService().deleteGuest(guest));
      renderAll();
      showToast("名單已刪除");
    } catch (error) {
      showError(error, "刪除名單失敗");
    }
  });

  $("#closeSignatureDialog")?.addEventListener("click", () => {
    $("#signatureDialog")?.close();
  });

  $("#settingsForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const hiddenFields = readCheckboxGroup("hidden");
    const requiredFields = subtractCsv(readCheckboxGroup("required"), hiddenFields);
    const hostToken = String(formData.get("hostToken") || "").trim();
    const adminToken = String(formData.get("adminToken") || "").trim();
    if (!hostToken || !adminToken) {
      showToast("主持人與管理者權杖不可空白，請重新整理後再儲存");
      return;
    }
    setValue("#settingRequired", requiredFields);
    setValue("#settingHidden", hiddenFields);
    try {
      state = normalizeState(await getDataService().saveSettings({
        eventName: formData.get("eventName").trim() || seedState.settings.eventName,
        mode: formData.get("mode"),
        isOpen: formData.get("isOpen") === "open",
        themeColor: formData.get("themeColor"),
        requiredFields,
        hiddenFields,
        authCode: formData.get("authCode"),
        hostToken,
        adminToken,
        extra1Label: formData.get("extra1Label"),
        extra2Label: formData.get("extra2Label")
      }));
      updateCurrentTokenUrl();
      renderAll();
      showToast("設定已儲存");
    } catch (error) {
      showError(error, "設定儲存失敗");
    }
  });

  $$("[data-setting-group] input[type='checkbox']").forEach((input) => {
    input.addEventListener("change", () => {
      const hiddenFields = readCheckboxGroup("hidden");
      setValue("#settingRequired", subtractCsv(readCheckboxGroup("required"), hiddenFields));
      setValue("#settingHidden", hiddenFields);
    });
  });

  $("#regenerateCodeButton")?.addEventListener("click", () => {
    setValue("#settingAuthCode", generateAuthCode());
    showToast("已產生新驗證碼，記得儲存設定");
  });

  $("#regenerateHostTokenButton")?.addEventListener("click", () => {
    setValue("#settingHostToken", `host-${generateAuthCode()}${generateAuthCode()}`);
    showToast("已產生新主持人權杖，記得儲存設定");
  });

  $("#regenerateAdminTokenButton")?.addEventListener("click", () => {
    setValue("#settingAdminToken", `admin-${generateAuthCode()}${generateAuthCode()}`);
    showToast("已產生新管理者權杖，記得儲存設定");
  });

  $("#addGuestButton")?.addEventListener("click", async () => {
    const name = prompt("姓名");
    if (!name) return;
    const unit = prompt("單位") || "";
    const title = prompt("職稱") || "";
    try {
      state = normalizeState(await getDataService().addGuest({ unit, title, name }));
      renderAll();
      showToast("名單已新增");
    } catch (error) {
      showError(error, "名單新增失敗");
    }
  });

  $("#importGuestButton")?.addEventListener("click", async () => {
    const text = $("#guestImportText")?.value || "";
    const guests = parseGuestImport(text);
    if (!guests.length) {
      showToast("沒有可匯入的名單");
      return;
    }
    try {
      state = normalizeState(await getDataService().importGuests(guests));
      renderAll();
      showToast(`已匯入 ${guests.length} 位`);
    } catch (error) {
      showError(error, "名單匯入失敗");
    }
  });

  $("#clearRecordsButton")?.addEventListener("click", async () => {
    if (!confirm("確定要清空目前所有簽到紀錄嗎？名單與設定會保留。")) return;
    try {
      state = normalizeState(await getDataService().clearRecords());
      renderAll();
      showToast("簽到紀錄已清空");
    } catch (error) {
      showError(error, "清空紀錄失敗");
    }
  });

  $("#clearGuestsButton")?.addEventListener("click", async () => {
    if (!confirm("確定要清空名單嗎？簽到紀錄會保留。")) return;
    try {
      state = normalizeState(await getDataService().clearGuests());
      renderAll();
      showToast("名單已清空");
    } catch (error) {
      showError(error, "清空名單失敗");
    }
  });

  $("#exportBackupButton")?.addEventListener("click", () => {
    const payload = JSON.stringify(state, null, 2);
    setValue("#backupText", payload);
    downloadTextFile(`${state.settings.eventName}_完整備份.json`, payload);
    showToast("完整備份已匯出");
  });

  $("#restoreBackupButton")?.addEventListener("click", async () => {
    const text = $("#backupText")?.value || "";
    if (!text.trim()) {
      showToast("請先貼上 JSON 備份內容");
      return;
    }
    try {
      const restored = JSON.parse(text);
      state = normalizeState(await getDataService().replaceAll(restored));
      renderAll();
      showToast("備份已還原");
    } catch (error) {
      showError(error, "JSON 格式不正確或還原失敗");
    }
  });

  $("#resetDemoButton")?.addEventListener("click", async () => {
    try {
      state = normalizeState(await getDataService().reset());
      renderAll();
      showToast("示範資料已重置");
    } catch (error) {
      showError(error, "重置失敗");
    }
  });

  $("#exportButton")?.addEventListener("click", exportCsv);

  $$(".copy-button").forEach((button) => button.addEventListener("click", async () => {
    const input = $(`#${button.dataset.copyTarget}`);
    if (!input) return;
    try {
      await navigator.clipboard.writeText(input.value);
      showToast("連結已複製");
    } catch {
      input.select();
      document.execCommand("copy");
      showToast("連結已複製");
    }
  }));

  $$(".open-link-button").forEach((button) => button.addEventListener("click", () => {
    const input = $(`#${button.dataset.openTarget}`);
    if (!input?.value) return;
    window.open(input.value, "_blank", "noopener");
  }));
}

function setupLiveRefresh() {
  if (!$("#guestTableBody") && !$("#recordTableBody")) return;
  window.addEventListener("storage", async (event) => {
    if (event.key !== storageKey) return;
    await loadState();
    renderAll();
  });
  setInterval(async () => {
    try {
      await loadState();
    } catch {
      return;
    }
    renderAll();
  }, 5000);
}

async function initApp() {
  try {
    await loadState();
  } catch (error) {
    if (apiDataService.isAvailable()) {
      state = normalizeState({
        ...structuredClone(seedState),
        access: { role: getPageKind() || "public", authorized: false },
        loadError: error.message || "資料載入失敗"
      });
      showError(error, "資料載入失敗");
    } else {
      showError(error, "資料載入失敗，暫時使用本機示範資料");
    }
  }
  setupSignaturePad();
  bindEvents();
  renderAll();
  setupLiveRefresh();
}

initApp();
