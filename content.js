(() => {
  const runtime = globalThis.browser?.runtime ?? globalThis.chrome?.runtime;
  const DEFAULT_STATE = {
    speed: 1,
    volumeBoost: 100,
  };

  const APP_SOURCE = "turbo-watch";
  const mediaNodes = new Map();

  let currentState = { ...DEFAULT_STATE };
  let audioContext = null;
  let observer = null;

  function getDocumentVideos() {
    return Array.from(document.querySelectorAll("video"));
  }

  function ensureAudioContext() {
    if (!audioContext) {
      const Ctx = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!Ctx) {
        return null;
      }
      audioContext = new Ctx();
    }
    return audioContext;
  }

  function createMediaNode(video) {
    if (mediaNodes.has(video)) {
      return mediaNodes.get(video);
    }

    const ctx = ensureAudioContext();
    if (!ctx) {
      return null;
    }

    try {
      const source = ctx.createMediaElementSource(video);
      const gain = ctx.createGain();
      gain.gain.value = currentState.volumeBoost / 100;

      source.connect(gain);
      gain.connect(ctx.destination);

      const node = { source, gain };
      mediaNodes.set(video, node);
      return node;
    } catch (error) {
      return null;
    }
  }

  function cleanupMediaNodes() {
    for (const [video, node] of mediaNodes.entries()) {
      if (!document.contains(video)) {
        try {
          node.source.disconnect();
          node.gain.disconnect();
        } catch (_) {
          // Ignore disconnect errors.
        }
        mediaNodes.delete(video);
      }
    }
  }

  function applyPlaybackRate() {
    const videos = getDocumentVideos();
    for (const video of videos) {
      video.playbackRate = currentState.speed;
    }
  }

  function applyVolumeBoost() {
    const videos = getDocumentVideos();

    for (const video of videos) {
      const node = createMediaNode(video);
      if (node) {
        node.gain.gain.value = currentState.volumeBoost / 100;
      }
    }

    cleanupMediaNodes();
  }

  function maybeResumeAudio() {
    if (audioContext && audioContext.state === "suspended") {
      audioContext.resume().catch(() => {
        // Ignore resume errors.
      });
    }
  }

  function applyState(nextState) {
    const speed = Number.parseFloat(nextState.speed);
    const volumeBoost = Number.parseFloat(nextState.volumeBoost);

    currentState = {
      speed: Number.isFinite(speed) ? Math.min(10, Math.max(0.1, speed)) : DEFAULT_STATE.speed,
      volumeBoost: Number.isFinite(volumeBoost)
        ? Math.min(600, Math.max(100, volumeBoost))
        : DEFAULT_STATE.volumeBoost,
    };

    applyPlaybackRate();
    applyVolumeBoost();
    maybeResumeAudio();
  }

  function getStateResponse() {
    const videoCount = getDocumentVideos().length;
    return {
      ok: true,
      state: {
        speed: currentState.speed,
        volumeBoost: currentState.volumeBoost,
      },
      videoCount,
      hasVideo: videoCount > 0,
    };
  }

  function handleMessage(message, _sender, sendResponse) {
    if (!message || message.source !== APP_SOURCE || typeof message.type !== "string") {
      return false;
    }

    if (message.type === "APPLY_STATE") {
      applyState(message.state || DEFAULT_STATE);
      sendResponse(getStateResponse());
      return true;
    }

    if (message.type === "GET_STATE") {
      sendResponse(getStateResponse());
      return true;
    }

    return false;
  }

  function watchVideos() {
    if (observer) return;

    observer = new MutationObserver(() => {
      applyPlaybackRate();
      applyVolumeBoost();
    });

    observer.observe(document.documentElement || document.body, {
      childList: true,
      subtree: true,
    });
  }

  document.addEventListener(
    "play",
    () => {
      maybeResumeAudio();
    },
    { capture: true },
  );

  document.addEventListener("click", maybeResumeAudio, { capture: true });
  document.addEventListener("keydown", maybeResumeAudio, { capture: true });

  runtime?.onMessage?.addListener(handleMessage);

  applyState(DEFAULT_STATE);
  watchVideos();
})();
