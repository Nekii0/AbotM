// Shows headlines from news.json (refreshed by GitHub every few hours) in <ul id="news-list">,
// 3 at a time, moving to the next 3 every minute. Pauses on hover/focus or with the pause button.
const list = document.getElementById("news-list");
const pauseBtn = document.getElementById("news-pause");
const PER_PAGE = 3, EVERY_MS = 60_000;

const ago = iso => {
  const h = Math.round((Date.now() - new Date(iso)) / 36e5);
  return h < 1 ? "just now" : h < 24 ? `${h}h ago` : `${Math.round(h / 24)}d ago`;
};

const row = i => {
  const li = document.createElement("li");
  const a = document.createElement("a");
  a.href = i.link.startsWith("https://") ? i.link : "#";
  a.target = "_blank";
  a.rel = "noopener";
  a.textContent = i.title;
  const meta = document.createElement("span");
  meta.textContent = `${i.source} · ${ago(i.date)}`;
  li.append(a, meta);
  return li;
};

if (list) {
  // Hourly query string so browsers don't keep showing yesterday's cached headlines.
  fetch("news.json?h=" + Math.floor(Date.now() / 36e5))
    .then(r => r.ok ? r.json() : Promise.reject())
    .then(({ items }) => {
      let start = 0, paused = false, hovered = false;
      const show = () => list.replaceChildren(...Array.from({ length: Math.min(PER_PAGE, items.length) },
        (_, k) => row(items[(start + k) % items.length])));
      show();
      if (items.length <= PER_PAGE) return;

      pauseBtn.hidden = false;
      pauseBtn.onclick = () => {
        paused = !paused;
        pauseBtn.textContent = paused ? "Play" : "Pause";
        pauseBtn.setAttribute("aria-label", paused ? "Resume changing headlines" : "Pause changing headlines");
      };
      const panel = list.closest(".panel");
      panel.addEventListener("mouseenter", () => hovered = true);
      panel.addEventListener("mouseleave", () => hovered = false);

      setInterval(() => {
        if (paused || hovered || panel.contains(document.activeElement)) return;
        list.classList.add("out");
        // Swap after the fade-out finishes; new rows fade in through their CSS animation.
        setTimeout(() => {
          start = (start + PER_PAGE) % items.length;
          show();
          list.classList.remove("out");
        }, 300);
      }, EVERY_MS);
    })
    .catch(() => { list.innerHTML = "<li>News is unavailable right now.</li>"; });
}
