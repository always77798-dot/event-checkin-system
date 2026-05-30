/*
 * GAS bridge draft.
 *
 * The current prototype still uses the synchronous localStorage dataService in
 * app.js. This adapter defines the async shape we will switch to when these
 * pages are deployed inside Google Apps Script and google.script.run exists.
 */

function callGas(functionName, ...args) {
  return new Promise((resolve, reject) => {
    if (!window.google || !google.script || !google.script.run) {
      reject(new Error("google.script.run is not available"));
      return;
    }

    google.script.run
      .withSuccessHandler(resolve)
      .withFailureHandler(reject)[functionName](...args);
  });
}

function getCurrentToken() {
  return new URLSearchParams(window.location.search).get("token") || "";
}

function getCurrentCheckinCode() {
  return new URLSearchParams(window.location.search).get("code") || "";
}

window.gasDataService = {
  load() {
    return callGas("getAppState");
  },
  saveSettings(settings) {
    return callGas("saveSettings", settings, getCurrentToken());
  },
  importGuests(guests) {
    return callGas("importGuests", guests, getCurrentToken());
  },
  addGuest(guest) {
    return callGas("addGuest", guest, getCurrentToken());
  },
  submitCheckin(record) {
    if (record.signature === "Host-Manual-CheckIn") {
      return callGas("manualCheckIn", record, getCurrentToken());
    }
    record.authCode = getCurrentCheckinCode();
    return callGas("submitCheckin", record);
  },
  clearRecords() {
    return callGas("clearRecords", getCurrentToken());
  },
  replaceAll(nextState) {
    return callGas("replaceAll", nextState, getCurrentToken());
  },
  reset() {
    return callGas("resetDemoData", getCurrentToken());
  }
};
