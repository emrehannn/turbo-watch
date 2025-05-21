const slider = document.getElementById("speedSlider");
const label = document.getElementById("speedValue");

slider.addEventListener("input", () => {
  const speed = parseFloat(slider.value);
  label.textContent = speed.toFixed(1);

  chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (rate) => {
        const video = document.querySelector("video");
        if (video) {
          video.playbackRate = rate;
        } else {
          alert("No video found on this page.");
        }
      },
      args: [speed],
    });
  });
});
