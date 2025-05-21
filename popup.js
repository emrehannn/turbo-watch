const slider = document.getElementById("speedSlider");
const label = document.getElementById("speedValue");

// Function to update video playback rate
function setVideoPlaybackRate(tabId, rate) {
  chrome.scripting.executeScript({
    target: { tabId: tabId },
    func: (rate) => {
      const video = document.querySelector("video");
      if (video) {
        video.playbackRate = rate;
      } else {
        // alert("No video found on this page."); // Removed alert for smoother UX
      }
    },
    args: [rate],
  });
}

// Function to update the UI (slider and label)
function updateUI(speed) {
  slider.value = speed;
  label.textContent = speed.toFixed(1);
}

// Load speed when popup opens
document.addEventListener("DOMContentLoaded", () => {
  chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
    if (tab) {
      chrome.storage.session.get(String(tab.id), (result) => {
        const storedSpeed = result[String(tab.id)];
        const speed = storedSpeed !== undefined ? storedSpeed : 1.0; // Default to 1.0x

        updateUI(speed);
        setVideoPlaybackRate(tab.id, speed);
      });
    }
  });
});

// Save speed and update video when slider changes
slider.addEventListener("input", () => {
  const speed = parseFloat(slider.value);
  updateUI(speed);

  chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
    if (tab) {
      chrome.storage.session.set({ [String(tab.id)]: speed }, () => {
        setVideoPlaybackRate(tab.id, speed);
      });
    }
  });
});

// Listen for messages from background.js to update UI when tab changes
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "updateSpeedUI" && message.speed !== undefined) {
    updateUI(message.speed);
  }
});
