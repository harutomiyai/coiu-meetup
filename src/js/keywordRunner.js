const initRunner = (trackId) => {
  const track = document.getElementById(trackId);
  if (!track) return;

  const original = Array.from(track.children);
  if (!original.length) return;

  const build = () => {
    track.innerHTML = "";

    // 画面幅を埋めるのに必要なセット数を計算（最低 16 セット = 前半8・後半8）
    const tempSpan = original[0].cloneNode(true);
    tempSpan.style.visibility = "hidden";
    tempSpan.style.position = "absolute";
    document.body.appendChild(tempSpan);
    const spanW = tempSpan.offsetWidth + 80; // 80 = gap
    document.body.removeChild(tempSpan);

    const oneSetW = spanW * original.length;
    const needed = Math.max(16, Math.ceil((window.innerWidth * 2) / oneSetW) * 2);
    // needed は偶数にして前半=後半を保証

    for (let i = 0; i < needed; i++) {
      original.forEach((span) => {
        track.appendChild(span.cloneNode(true));
      });
    }

    // duration はトラック前半幅に比例
    const halfW = track.scrollWidth / 2;
    track.style.animationDuration = `${Math.max(20, halfW / 30)}s`;
  };

  build();
  window.addEventListener("resize", build, { passive: true });
};

export const initKeywordRunner = () => {
  initRunner("keyword-runner-track");
};
