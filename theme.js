// Loaded in <head> without defer, so the theme is set before the page paints (no white flash).
// Saved choice wins; otherwise follow the device's light/dark setting.
const root = document.documentElement;
let saved = null;
try { saved = localStorage.getItem("theme"); } catch {}
root.dataset.theme = saved || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");

addEventListener("DOMContentLoaded", () => {
  // Header video: still image for reduced-motion users; pause button only once a real video plays.
  const video = document.querySelector(".hero-media video");
  if (video) {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) video.pause();
    video.addEventListener("playing", () => {
      if (video.parentNode.nextElementSibling?.classList.contains("hero-pause")) return;
      const pause = document.createElement("button");
      pause.type = "button";
      pause.className = "hero-pause";
      pause.textContent = "Pause video";
      pause.onclick = () => {
        video.paused ? video.play() : video.pause();
        pause.textContent = video.paused ? "Play video" : "Pause video";
      };
      video.parentNode.after(pause);
    });
  }

  const btn = document.getElementById("theme-toggle");
  if (!btn) return;
  const sync = () => {
    const dark = root.dataset.theme === "dark";
    btn.setAttribute("aria-label", dark ? "Switch to light mode" : "Switch to dark mode");
    btn.title = btn.getAttribute("aria-label");
  };
  sync();
  btn.onclick = () => {
    root.dataset.theme = root.dataset.theme === "dark" ? "light" : "dark";
    try { localStorage.setItem("theme", root.dataset.theme); } catch {}
    sync();
  };
});
