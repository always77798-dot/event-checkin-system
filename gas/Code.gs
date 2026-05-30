var SHEET_NAMES = {
  settings: "Settings",
  guests: "GuestList",
  records: "CheckIn"
};

var DEFAULT_SETTINGS = {
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

function doGet(e) {
  var params = e && e.parameter ? e.parameter : {};
  var page = params.page || "checkin";
  var allowedPages = {
    checkin: true,
    host: true,
    admin: true
  };
  if (!allowedPages[page]) page = "checkin";

  var template = HtmlService.createTemplateFromFile(page);
  template.webAppUrl = getWebAppUrl_();
  return template
    .evaluate()
    .setTitle("活動簽到退系統")
    .addMetaTag("viewport", "width=device-width, initial-scale=1")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(fileName) {
  return HtmlService.createHtmlOutputFromFile(fileName).getContent();
}

function getAppState() {
  return {
    settings: getSettings(),
    guests: getGuests(),
    records: getRecords()
  };
}

function saveSettings(settings, token) {
  requireAdmin_(token);
  var nextSettings = Object.assign({}, DEFAULT_SETTINGS, settings || {});
  var sheet = getOrCreateSheet_(SHEET_NAMES.settings, ["key", "value"]);
  var rows = [["key", "value"]];
  Object.keys(nextSettings).forEach(function(key) {
    rows.push([key, serializeSettingValue_(nextSettings[key])]);
  });
  sheet.clearContents();
  sheet.getRange(1, 1, rows.length, 2).setValues(rows);
  return getAppState();
}

function importGuests(guests, token) {
  requireAdmin_(token);
  var sheet = getOrCreateSheet_(SHEET_NAMES.guests, ["單位", "職稱", "姓名", "專屬連結", "QR Code"]);
  sheet.clearContents();
  sheet.appendRow(["單位", "職稱", "姓名", "專屬連結", "QR Code"]);
  (guests || []).forEach(function(guest) {
    sheet.appendRow([guest.unit || "", guest.title || "", guest.name || "", "", ""]);
  });
  return getAppState();
}

function addGuest(guest, token) {
  requireAdmin_(token);
  var sheet = getOrCreateSheet_(SHEET_NAMES.guests, ["單位", "職稱", "姓名", "專屬連結", "QR Code"]);
  sheet.appendRow([guest.unit || "", guest.title || "", guest.name || "", "", ""]);
  return getAppState();
}

function submitCheckin(record) {
  var settings = getSettings();
  if (!settings.isOpen) throw new Error("目前尚未開放簽到");
  if (settings.authCode && record.authCode !== settings.authCode) throw new Error("簽到連結已失效");
  var sheet = getOrCreateSheet_(SHEET_NAMES.records, [
    "時間戳記", "活動名稱", "類型", "單位", "職稱", "姓名", "簽名檔連結",
    "IP 位址", "裝置資訊", "數位指紋(UUID)", "彈性欄位 1", "彈性欄位 2"
  ]);

  var signatureUrl = "";
  if (record.signature && record.signature.indexOf("data:image/") === 0) {
    signatureUrl = saveSignature_(record.signature, settings.eventName, record.name, settings.mode);
  } else if (record.signature) {
    signatureUrl = record.signature;
  }

  sheet.appendRow([
    record.timestamp ? new Date(record.timestamp) : new Date(),
    settings.eventName,
    settings.mode,
    record.unit || "",
    record.title || "",
    record.name || "",
    signatureUrl,
    record.ip || "Prototype",
    record.device || "",
    record.uuid || "",
    record.extra1 || "",
    record.extra2 || ""
  ]);
  return getAppState();
}

function submitHostRecord_(record) {
  return appendRecord_(record);
}

function appendRecord_(record) {
  var settings = getSettings();
  var sheet = getOrCreateSheet_(SHEET_NAMES.records, [
    "時間戳記", "活動名稱", "類型", "單位", "職稱", "姓名", "簽名檔連結",
    "IP 位址", "裝置資訊", "數位指紋(UUID)", "彈性欄位 1", "彈性欄位 2"
  ]);
  sheet.appendRow([
    record.timestamp ? new Date(record.timestamp) : new Date(),
    record.eventName || settings.eventName,
    record.mode || settings.mode,
    record.unit || "",
    record.title || "",
    record.name || "",
    record.signature || "Host-Manual-CheckIn",
    "Host-IP",
    "Host-Device",
    "Host-Manual-CheckIn",
    record.extra1 || "",
    record.extra2 || ""
  ]);
  return getAppState();
}

function clearRecords(token) {
  requireAdmin_(token);
  var sheet = getOrCreateSheet_(SHEET_NAMES.records, [
    "時間戳記", "活動名稱", "類型", "單位", "職稱", "姓名", "簽名檔連結",
    "IP 位址", "裝置資訊", "數位指紋(UUID)", "彈性欄位 1", "彈性欄位 2"
  ]);
  sheet.clearContents();
  sheet.appendRow([
    "時間戳記", "活動名稱", "類型", "單位", "職稱", "姓名", "簽名檔連結",
    "IP 位址", "裝置資訊", "數位指紋(UUID)", "彈性欄位 1", "彈性欄位 2"
  ]);
  return getAppState();
}

function replaceAll(nextState, token) {
  requireAdmin_(token);
  saveSettings(nextState.settings || DEFAULT_SETTINGS, token);
  importGuests(nextState.guests || [], token);
  clearRecords(token);
  (nextState.records || []).forEach(function(record) {
    appendRecord_(record);
  });
  return getAppState();
}

function resetDemoData(token) {
  requireAdmin_(token);
  saveSettings(DEFAULT_SETTINGS, token);
  importGuests([], DEFAULT_SETTINGS.adminToken);
  clearRecords(DEFAULT_SETTINGS.adminToken);
  return getAppState();
}

function manualCheckIn(record, token) {
  requireHost_(token);
  record = record || {};
  record.signature = "Host-Manual-CheckIn";
  return submitHostRecord_(record);
}

function getSettings() {
  var sheet = getOrCreateSheet_(SHEET_NAMES.settings, ["key", "value"]);
  var values = sheet.getDataRange().getValues();
  var settings = Object.assign({}, DEFAULT_SETTINGS);
  for (var i = 1; i < values.length; i++) {
    var key = values[i][0];
    if (!key) continue;
    settings[key] = values[i][1];
  }
  settings.isOpen = settings.isOpen === true || settings.isOpen === "true" || settings.isOpen === "TRUE";
  return settings;
}

function serializeSettingValue_(value) {
  if (Array.isArray(value)) return value.join(",");
  if (value === null || value === undefined) return "";
  return String(value);
}

function getGuests() {
  var sheet = getOrCreateSheet_(SHEET_NAMES.guests, ["單位", "職稱", "姓名", "專屬連結", "QR Code"]);
  var values = sheet.getDataRange().getValues();
  var guests = [];
  for (var i = 1; i < values.length; i++) {
    if (!values[i][2]) continue;
    guests.push({
      unit: values[i][0] || "",
      title: values[i][1] || "",
      name: values[i][2] || ""
    });
  }
  return guests;
}

function getRecords() {
  var sheet = getOrCreateSheet_(SHEET_NAMES.records, [
    "時間戳記", "活動名稱", "類型", "單位", "職稱", "姓名", "簽名檔連結",
    "IP 位址", "裝置資訊", "數位指紋(UUID)", "彈性欄位 1", "彈性欄位 2"
  ]);
  var values = sheet.getDataRange().getValues();
  var records = [];
  for (var i = 1; i < values.length; i++) {
    if (!values[i][5]) continue;
    records.push({
      id: "sheet-" + i,
      timestamp: values[i][0] ? new Date(values[i][0]).toISOString() : new Date().toISOString(),
      eventName: values[i][1] || "",
      mode: values[i][2] || "",
      unit: values[i][3] || "",
      title: values[i][4] || "",
      name: values[i][5] || "",
      signature: values[i][6] || "",
      ip: values[i][7] || "",
      device: values[i][8] || "",
      uuid: values[i][9] || "",
      extra1: values[i][10] || "",
      extra2: values[i][11] || ""
    });
  }
  return records;
}

function getOrCreateSheet_(name, headers) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  if (sheet.getLastRow() === 0 && headers && headers.length) {
    sheet.appendRow(headers);
  }
  return sheet;
}

function saveSignature_(dataUrl, eventName, personName, mode) {
  var parentFolderName = "活動簽名檔";
  var folders = DriveApp.getFoldersByName(parentFolderName);
  var parent = folders.hasNext() ? folders.next() : DriveApp.createFolder(parentFolderName);
  var eventFolderName = "簽名檔_" + eventName;
  var eventFolders = parent.getFoldersByName(eventFolderName);
  var folder = eventFolders.hasNext() ? eventFolders.next() : parent.createFolder(eventFolderName);
  var base64 = dataUrl.split(",")[1];
  var timestamp = Utilities.formatDate(new Date(), "GMT+8", "HHmmss");
  var fileName = (personName || "未命名") + "_" + (mode || "簽到") + "_" + timestamp + ".png";
  var blob = Utilities.newBlob(Utilities.base64Decode(base64), "image/png", fileName);
  var file = folder.createFile(blob);
  try {
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (err) {
    console.log(err);
  }
  return file.getUrl();
}

function requireAdmin_(token) {
  var settings = getSettings();
  if (!token || token !== settings.adminToken) {
    throw new Error("無管理權限");
  }
}

function requireHost_(token) {
  var settings = getSettings();
  if (!token || (token !== settings.hostToken && token !== settings.adminToken)) {
    throw new Error("無主持人權限");
  }
}

function getWebAppUrl_() {
  try {
    return ScriptApp.getService().getUrl();
  } catch (err) {
    return "";
  }
}
