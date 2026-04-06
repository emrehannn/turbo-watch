(function initTurboWatchApi(global) {
  const raw = global.browser ?? global.chrome;

  if (!raw) {
    throw new Error("Turbo Watch: browser API is not available");
  }

  const promisify = (fn, context, ...args) =>
    new Promise((resolve, reject) => {
      try {
        if (typeof fn !== "function") {
          resolve(undefined);
          return;
        }

        const maybePromise = fn.call(context, ...args, (result) => {
          const runtime = raw.runtime || {};
          const err = runtime.lastError;
          if (err) {
            reject(new Error(err.message));
            return;
          }
          resolve(result);
        });

        if (maybePromise && typeof maybePromise.then === "function") {
          maybePromise.then(resolve).catch(reject);
        }
      } catch (error) {
        reject(error);
      }
    });

  const storageArea = raw.storage?.local;

  global.TurboWatchApi = {
    queryActiveTab() {
      return promisify(raw.tabs?.query, raw.tabs, { active: true, currentWindow: true }).then(
        (tabs) => (Array.isArray(tabs) && tabs.length ? tabs[0] : null),
      );
    },

    async getStorage(keys) {
      if (!storageArea) return {};
      return promisify(storageArea.get, storageArea, keys);
    },

    async setStorage(values) {
      if (!storageArea) return;
      await promisify(storageArea.set, storageArea, values);
    },

    async sendMessageToTab(tabId, message) {
      if (!raw.tabs?.sendMessage || typeof tabId !== "number") {
        return { ok: false, error: "No active tab" };
      }

      try {
        const response = await promisify(raw.tabs.sendMessage, raw.tabs, tabId, message);
        return response ?? { ok: false, error: "No response" };
      } catch (error) {
        return { ok: false, error: error.message };
      }
    },

    async sendRuntimeMessage(message) {
      if (!raw.runtime?.sendMessage) {
        return { ok: false, error: "Runtime messaging unavailable" };
      }
      try {
        const response = await promisify(raw.runtime.sendMessage, raw.runtime, message);
        return response ?? { ok: false, error: "No response" };
      } catch (error) {
        return { ok: false, error: error.message };
      }
    },

    addRuntimeMessageListener(listener) {
      raw.runtime?.onMessage?.addListener(listener);
    },

    addOnInstalledListener(listener) {
      raw.runtime?.onInstalled?.addListener(listener);
    },

    addOnActivatedListener(listener) {
      raw.tabs?.onActivated?.addListener(listener);
    },

    addOnUpdatedListener(listener) {
      raw.tabs?.onUpdated?.addListener(listener);
    },

    addOnRemovedListener(listener) {
      raw.tabs?.onRemoved?.addListener(listener);
    },
  };
})(globalThis);
