importScripts("api.js");

const APP_SOURCE = "turbo-watch";
const DEFAULTS = {
  speed: 1,
  volumeBoost: 100,
};
const SETTINGS_KEY = "settings";

function normalizeState(state = {}) {
  const speed = Number.parseFloat(state.speed);
  const volumeBoost = Number.parseFloat(state.volumeBoost);

  return {
    speed: Number.isFinite(speed) ? Math.min(10, Math.max(0.1, speed)) : DEFAULTS.speed,
    volumeBoost: Number.isFinite(volumeBoost)
      ? Math.min(600, Math.max(100, volumeBoost))
      : DEFAULTS.volumeBoost,
  };
}

async function readSettings() {
  const data = await TurboWatchApi.getStorage(SETTINGS_KEY);
  const current = data[SETTINGS_KEY] || {};
  return {
    defaults: normalizeState(current.defaults || DEFAULTS),
    perTab: current.perTab && typeof current.perTab === "object" ? current.perTab : {},
  };
}

async function writeSettings(settings) {
  await TurboWatchApi.setStorage({ [SETTINGS_KEY]: settings });
}

async function getEffectiveState(tabId) {
  const settings = await readSettings();
  const tabState = settings.perTab[String(tabId)] || {};
  return normalizeState({ ...settings.defaults, ...tabState });
}

async function setTabPartialState(tabId, partial) {
  const key = String(tabId);
  const settings = await readSettings();
  settings.perTab[key] = normalizeState({
    ...settings.defaults,
    ...(settings.perTab[key] || {}),
    ...partial,
  });
  await writeSettings(settings);
  return settings.perTab[key];
}

async function resetTabState(tabId) {
  const key = String(tabId);
  const settings = await readSettings();
  delete settings.perTab[key];
  await writeSettings(settings);
  return settings.defaults;
}

async function removeTabState(tabId) {
  const key = String(tabId);
  const settings = await readSettings();
  if (settings.perTab[key]) {
    delete settings.perTab[key];
    await writeSettings(settings);
  }
}

async function applyStateToTab(tabId, state) {
  return TurboWatchApi.sendMessageToTab(tabId, {
    source: APP_SOURCE,
    type: "APPLY_STATE",
    state,
  });
}

async function getTabRuntimeState(tabId) {
  return TurboWatchApi.sendMessageToTab(tabId, {
    source: APP_SOURCE,
    type: "GET_STATE",
  });
}

async function getActiveTabOrThrow() {
  const tab = await TurboWatchApi.queryActiveTab();
  if (!tab || typeof tab.id !== "number") {
    throw new Error("No active tab available");
  }
  return tab;
}

TurboWatchApi.addOnInstalledListener(async () => {
  const settings = await readSettings();
  await writeSettings(settings);
});

TurboWatchApi.addOnActivatedListener(async ({ tabId }) => {
  const state = await getEffectiveState(tabId);
  await applyStateToTab(tabId, state);
});

TurboWatchApi.addOnUpdatedListener(async (tabId, changeInfo) => {
  if (changeInfo.status !== "complete") return;
  const state = await getEffectiveState(tabId);
  await applyStateToTab(tabId, state);
});

TurboWatchApi.addOnRemovedListener(async (tabId) => {
  await removeTabState(tabId);
});

TurboWatchApi.addRuntimeMessageListener((message, _sender, sendResponse) => {
  if (!message || message.source !== APP_SOURCE || typeof message.type !== "string") {
    return false;
  }

  (async () => {
    try {
      const tab = await getActiveTabOrThrow();

      if (message.type === "GET_ACTIVE_STATE") {
        const effectiveState = await getEffectiveState(tab.id);
        const tabRuntimeState = await getTabRuntimeState(tab.id);

        sendResponse({
          ok: true,
          state: effectiveState,
          hasVideo: Boolean(tabRuntimeState?.hasVideo),
          videoCount: tabRuntimeState?.videoCount || 0,
        });
        return;
      }

      if (message.type === "SET_ACTIVE_SPEED") {
        const state = await setTabPartialState(tab.id, { speed: message.speed });
        const applied = await applyStateToTab(tab.id, state);
        sendResponse({ ok: true, state, hasVideo: Boolean(applied?.hasVideo) });
        return;
      }

      if (message.type === "SET_ACTIVE_VOLUME_BOOST") {
        const state = await setTabPartialState(tab.id, { volumeBoost: message.volumeBoost });
        const applied = await applyStateToTab(tab.id, state);
        sendResponse({ ok: true, state, hasVideo: Boolean(applied?.hasVideo) });
        return;
      }

      if (message.type === "RESET_ACTIVE_STATE") {
        const state = await resetTabState(tab.id);
        const applied = await applyStateToTab(tab.id, state);
        sendResponse({ ok: true, state, hasVideo: Boolean(applied?.hasVideo) });
        return;
      }

      sendResponse({ ok: false, error: "Unknown message type" });
    } catch (error) {
      sendResponse({ ok: false, error: error.message });
    }
  })();

  return true;
});
