/**
 * Keeps a help tooltip inside the screen. The bubble is CSS, centred on its
 * icon by default. When it opens, this measures the icon and, if the bubble
 * would run past either edge, shifts it and narrows it to fit. The arrow
 * stays on the icon.
 */
const EDGE = 12;
const WIDTH = 320;

function place(tip) {
  const icon = tip.getBoundingClientRect();
  const screen = document.documentElement.clientWidth;
  const width = Math.min(WIDTH, screen - EDGE * 2);
  const centre = icon.left + icon.width / 2;
  const left = Math.min(Math.max(centre - width / 2, EDGE), screen - EDGE - width);
  tip.style.setProperty('--tip-width', `${width}px`);
  tip.style.setProperty('--tip-left', `${left - icon.left}px`);
  tip.style.setProperty('--tip-shift', 'none');
}

export function initTips(root = document) {
  for (const event of ['pointerenter', 'focusin', 'pointerdown']) {
    root.addEventListener(event, (e) => {
      const tip = e.target.closest?.('.tip');
      if (tip) place(tip);
    }, true);
  }
}
