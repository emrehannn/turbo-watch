const APP_SOURCE = "turbo-watch";

const speedSlider = document.getElementById("speedSlider");
const speedValue = document.getElementById("speedValue");
const volumeSlider = document.getElementById("volumeSlider");
const volumeValue = document.getElementById("volumeValue");
const statusText = document.getElementById("statusText");
const resetButton = document.getElementById("resetButton");

function clampSpeed(speed) {
  return Math.min(10, Math.max(0.1, speed));
}

function clampVolumeBoost(volumeBoost) {
  return Math.min(600, Math.max(100, volumeBoost));
}

function updateUI(state, hasVideo) {
  const speed = clampSpeed(Number.parseFloat(state.speed));
  const volumeBoost = clampVolumeBoost(Number.parseFloat(state.volumeBoost));

  speedSlider.value = String(speed);
  speedValue.textContent = `${speed.toFixed(1)}x`;

  volumeSlider.value = String(volumeBoost);
  volumeValue.textContent = `${Math.round(volumeBoost)}%`;

  statusText.textContent = hasVideo
    ? "Connected to page video controls."
    : "No HTML5 video detected on this page.";
}

async function sendRuntimeMessage(type, payload = {}) {
  return TurboWatchApi.sendRuntimeMessage({
    source: APP_SOURCE,
    type,
    ...payload,
  });
}

async function loadState() {
  const result = await sendRuntimeMessage("GET_ACTIVE_STATE");
  if (result.ok && result.state) {
    updateUI(result.state, result.hasVideo);
    return;
  }

  updateUI({ speed: 1, volumeBoost: 100 }, false);
  statusText.textContent = "Unable to sync with active tab.";
}

async function onSpeedInput() {
  const speed = clampSpeed(Number.parseFloat(speedSlider.value));
  speedValue.textContent = `${speed.toFixed(1)}x`;

  const result = await sendRuntimeMessage("SET_ACTIVE_SPEED", { speed });
  if (result.ok && result.state) {
    updateUI(result.state, result.hasVideo);
  }
}

async function onVolumeInput() {
  const volumeBoost = clampVolumeBoost(Number.parseFloat(volumeSlider.value));
  volumeValue.textContent = `${Math.round(volumeBoost)}%`;

  const result = await sendRuntimeMessage("SET_ACTIVE_VOLUME_BOOST", { volumeBoost });
  if (result.ok && result.state) {
    updateUI(result.state, result.hasVideo);
  }
}

async function onResetClick() {
  const result = await sendRuntimeMessage("RESET_ACTIVE_STATE");
  if (result.ok && result.state) {
    updateUI(result.state, result.hasVideo);
  }
}

speedSlider.addEventListener("input", onSpeedInput);
volumeSlider.addEventListener("input", onVolumeInput);
resetButton.addEventListener("click", onResetClick);

document.addEventListener("DOMContentLoaded", loadState);
