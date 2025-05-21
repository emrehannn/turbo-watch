chrome.runtime.onInstalled.addListener(() => {
  console.log("Turbo Watch installed and ready to blast.");
});

// Listen for tab activation events
chrome.tabs.onActivated.addListener((activeInfo) => {
  chrome.storage.session.get(String(activeInfo.tabId), (result) => {
    const storedSpeed = result[String(activeInfo.tabId)];
    const speed = storedSpeed !== undefined ? storedSpeed : 1.0; // Default to 1.0x

    // Send message to popup.js to update UI if it's open
    chrome.runtime.sendMessage({ type: "updateSpeedUI", speed: speed }).catch(() => {
      // Ignore error if popup is not open
    });
  });
});

// Listen for tab removal events to clean up storage
chrome.tabs.onRemoved.addListener((tabId) => {
  chrome.storage.session.remove(String(tabId)).catch(() => {
    // Ignore error if key doesn't exist
  });
});
