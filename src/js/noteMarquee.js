const SPEED_NORMAL = 0.05;
const SPEED_SLOW   = 0.02;

const ICON_PAUSE = `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><rect x="2" y="2" width="3.5" height="10" rx="1" fill="currentColor"/><rect x="8.5" y="2" width="3.5" height="10" rx="1" fill="currentColor"/></svg>`;
const ICON_PLAY  = `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M3 2.5L11 7L3 11.5V2.5Z" fill="currentColor"/></svg>`;

export const initNoteMarquee = () => {
  const marquee = document.getElementById("note-feed");
  const track   = document.getElementById("note-feed-grid");
  const btn     = document.getElementById("note-feed-toggle");
  if (!marquee || !track) return;

  const start = () => {
    track.style.animation = "none";

    const halfWidth = track.scrollWidth / 2;
    if (halfWidth <= 0) return;

    let x = 0;
    let lastTime = null;
    let slow = false;
    let paused = false;
    let raf;

    const step = (now) => {
      if (!paused) {
        if (lastTime !== null) {
          const dt = now - lastTime;
          x += (slow ? SPEED_SLOW : SPEED_NORMAL) * dt;
          if (x >= halfWidth) x -= halfWidth;
          track.style.transform = `translateX(-${x}px)`;
        }
        lastTime = now;
      } else {
        lastTime = null;
      }
      raf = requestAnimationFrame(step);
    };

    raf = requestAnimationFrame(step);

    marquee.addEventListener("mouseenter", () => { slow = true; });
    marquee.addEventListener("mouseleave", () => { slow = false; });

    if (btn) {
      btn.addEventListener("click", () => {
        paused = !paused;
        btn.setAttribute("aria-pressed", String(paused));
        btn.setAttribute("aria-label", paused ? "スクロールを再生" : "スクロールを一時停止");
        btn.innerHTML = paused ? ICON_PLAY : ICON_PAUSE;
      });
    }
  };

  if (track.children.length > 0) {
    start();
  } else {
    const observer = new MutationObserver(() => {
      if (track.children.length > 0) {
        observer.disconnect();
        requestAnimationFrame(start);
      }
    });
    observer.observe(track, { childList: true });
  }
};
