/**
 * Responsive SVG Slider Component
 *
 * Faithfully preserves the original Slider.svg proportions.
 * Only the horizontal dimension stretches — vertical stays at the SVG's native 64.34 height.
 * Uses ResizeObserver for live resize. Pointer events for mouse + touch.
 *
 * IDs:
 *   #Slider-track-base   – Track path, stretched horizontally only
 *   #slider-thumb        – Draggable knob (uniform scale keeps it circular)
 *   #slider-fill-left    – Blue bar (#0078ff)
 *   #slider-fill-right   – Black bar (#1a1a1a)
 *   #label-percentage    – Percentage text injected here
 *   #label-quality       – Repositioned to right edge
 */

import sliderSvgContent from '../assets/Slider.svg?raw';

// ── Original SVG geometry (from Slider.svg) ───────────────────
const SVG_H = 64.34;   // Original viewBox height — never changes
const MARGIN = 105;     // Left/right margin for fill bars & thumb — widened for labels
const CENTER_Y = 40.44;   // Vertical center of fill bars
const ANCHOR_X = 83.8;    // Original thumb cx
const THUMB_CY = 40.32;   // Original thumb cy

// Fill bars — doubled thickness
const FILL_TOP = 34.44;    // Raised by 3 so bar is centred on CENTER_Y (40.44)
const FILL_H = 12;         // Doubled from 6
const CAP_R = 6;           // Doubled from 3

// Thumb
const THUMB_SCALE = 1.5;    // Gentle scale-up, keeps proportional

// Track — original geometry reference points
const TRACK_TOP_Y = 22.44;
const NOTCH_HALF = 32.78;   // From SVG center to notch right curve start
const NOTCH_INNER_HALF = 19.37;

// ── Path Builders ─────────────────────────────────────────────

function buildTrackPath(W) {
  const cx = W / 2;
  const rightTopX = W - 23.06;             // Same right margin as original
  const leftSideX = 23.06;                 // Same left margin as original
  const notchRightX = cx + NOTCH_HALF;
  const hToNotch = -(rightTopX - notchRightX);
  const bottomSpan = W - 39.08;             // Original: 19.54 from each side
  const innerRectX = cx + NOTCH_INNER_HALF;

  return (
    `M${rightTopX.toFixed(2)},${TRACK_TOP_Y}` +
    `h${hToNotch.toFixed(2)}` +
    `c-3.56,0,-6.77,-2.16,-8.12,-5.46` +
    `l-2.19,-5.37` +
    `c-1.34,-3.3,-4.55,-5.46,-8.12,-5.46` +
    `h-28.71` +
    `c-3.56,0,-6.77,2.16,-8.12,5.46` +
    `l-2.19,5.37` +
    `c-1.34,3.3,-4.55,5.46,-8.12,5.46` +
    `H${leftSideX}` +
    `c-9.92,0,-18.35,8.12,-18.16,18.04` +
    `c0.18,9.62,8.03,17.36,17.7,17.36` +
    `h${bottomSpan.toFixed(2)}` +
    `c9.66,0,17.52,-7.74,17.7,-17.36` +
    `c0.19,-9.92,-8.24,-18.04,-18.16,-18.04Z` +
    `M${innerRectX.toFixed(2)},19.04` +
    `c0,2.88,-2.33,5.21,-5.21,5.21h-28.32` +
    `c-2.88,0,-5.21,-2.33,-5.21,-5.21v-4.82` +
    `c0,-2.88,2.33,-5.21,5.21,-5.21h28.32` +
    `c2.88,0,5.21,2.33,5.21,5.21v4.82Z`
  );
}

function buildLeftPath(thumbX) {
  const leftStart = MARGIN;
  const flat = thumbX - leftStart;
  if (flat <= CAP_R) {
    return `M${(leftStart + CAP_R)},${FILL_TOP + FILL_H}` +
      `c${-CAP_R},0,${-CAP_R},${-CAP_R},${-CAP_R},${-CAP_R / 2}` +
      `c0,${-CAP_R / 2},${CAP_R},${-CAP_R},${CAP_R},${-CAP_R}v${FILL_H}Z`;
  }
  const bodyW = flat - CAP_R;
  return `M${thumbX.toFixed(2)},${FILL_TOP}` +
    `h${(-bodyW).toFixed(2)}` +
    `c${-CAP_R},0,${-CAP_R},${FILL_H / 2},${-CAP_R},${FILL_H / 2}` +
    `c0,${FILL_H / 2},${CAP_R},${FILL_H / 2},${CAP_R},${FILL_H / 2}` +
    `h${bodyW.toFixed(2)}v${-FILL_H}Z`;
}

function buildRightPath(thumbX, maxX) {
  const rightEnd = maxX;  // maxX is already SVGW - MARGIN (symmetric)
  const flat = rightEnd - thumbX;
  if (flat <= 0) {
    return `M${rightEnd.toFixed(2)},${FILL_TOP}` +
      `c${CAP_R},0,${CAP_R},${FILL_H / 2},${CAP_R},${FILL_H / 2}` +
      `c0,${FILL_H / 2},${-CAP_R},${FILL_H / 2},${-CAP_R},${FILL_H / 2}v${-FILL_H}Z`;
  }
  return `M${thumbX.toFixed(2)},${FILL_TOP}` +
    `h${flat.toFixed(2)}` +
    `c${CAP_R},0,${CAP_R},${FILL_H / 2},${CAP_R},${FILL_H / 2}` +
    `c0,${FILL_H / 2},${-CAP_R},${FILL_H / 2},${-CAP_R},${FILL_H / 2}` +
    `h${(-flat).toFixed(2)}v${-FILL_H}Z`;
}

// ── Public API ────────────────────────────────────────────────

export function initSlider(containerId, initialValue, onValueChange) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = sliderSvgContent;
  const svg = container.querySelector('svg');
  if (!svg) return;

  svg.style.width = '100%';
  svg.style.height = '100%';
  svg.style.display = 'block';
  svg.style.overflow = 'visible'; // Allow thumb shadow to render

  const thumb = svg.getElementById('slider-thumb');
  const fillLeft = svg.getElementById('slider-fill-left');
  const fillRight = svg.getElementById('slider-fill-right');
  const labelRect = svg.getElementById('label-percentage');
  const labelQuality = svg.getElementById('label-quality');
  const track = svg.getElementById('Slider-track-base');

  if (!thumb || !fillLeft || !fillRight || !track) {
    console.error('Slider: missing SVG elements');
    return;
  }

  // ── Percentage text (bigger, bold) ─────────────────────────
  let percentText = null;
  if (labelRect) {
    const ly = parseFloat(labelRect.getAttribute('y'));
    const lh = parseFloat(labelRect.getAttribute('height'));

    percentText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    percentText.setAttribute('y', String(ly + lh / 2 + 1));
    percentText.setAttribute('text-anchor', 'middle');
    percentText.setAttribute('dominant-baseline', 'central');
    percentText.setAttribute('font-size', '14');
    percentText.setAttribute('font-weight', '900');
    percentText.setAttribute('font-family', 'Inter, sans-serif');
    percentText.setAttribute('fill', '#1a1a1a');
    labelRect.parentNode.insertBefore(percentText, labelRect.nextSibling);
  }

  // ── State ─────────────────────────────────────────────────
  let currentPercent = initialValue;
  let minX = MARGIN;
  let maxX = 236;

  function updateVisuals() {
    const pct = currentPercent;
    const range = maxX - minX;
    const thumbX = minX + (pct / 100) * range;
    const dx = thumbX - ANCHOR_X;

    // Position thumb with gentle scale centered on its original position
    thumb.setAttribute('transform',
      `translate(${(ANCHOR_X + dx).toFixed(2)}, ${THUMB_CY}) ` +
      `scale(${THUMB_SCALE}) ` +
      `translate(${(-ANCHOR_X).toFixed(2)}, ${(-THUMB_CY).toFixed(2)})`
    );

    fillLeft.setAttribute('d', buildLeftPath(thumbX));
    fillRight.setAttribute('d', buildRightPath(thumbX, maxX));
    if (percentText) percentText.textContent = `${pct}%`;
  }

  function setPercent(pct) {
    currentPercent = Math.max(0, Math.min(100, Math.round(pct)));
    updateVisuals();
  }

  // ── Resize ────────────────────────────────────────────────
  function onResize() {
    const rect = container.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const svgW = rect.width * (SVG_H / rect.height);
    svg.setAttribute('viewBox', `0 0 ${svgW.toFixed(2)} ${SVG_H}`);

    minX = MARGIN;
    maxX = svgW - MARGIN;

    track.setAttribute('d', buildTrackPath(svgW));

    // Center labels
    const cx = svgW / 2;
    if (labelRect) labelRect.setAttribute('x', String((cx - NOTCH_INNER_HALF).toFixed(2)));
    if (percentText) percentText.setAttribute('x', String(cx.toFixed(2)));
    if (labelQuality) labelQuality.setAttribute('x', String((svgW - 70.91).toFixed(2)));

    updateVisuals();
  }

  onResize();
  setPercent(initialValue);

  const ro = new ResizeObserver(() => onResize());
  ro.observe(container);

  // ── Pointer interaction ───────────────────────────────────
  let isDragging = false;
  svg.style.touchAction = 'none';
  thumb.style.cursor = 'grab';

  function percentFromEvent(e) {
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgP = pt.matrixTransform(svg.getScreenCTM().inverse());
    const x = Math.max(minX, Math.min(maxX, svgP.x));
    return Math.round(((x - minX) / (maxX - minX)) * 100);
  }

  svg.addEventListener('pointerdown', (e) => {
    const isThumb = thumb.contains(e.target);
    const isInteractive = isThumb ||
      e.target === track || e.target === fillLeft || e.target === fillRight;
    if (!isInteractive) return;

    isDragging = true;
    thumb.style.cursor = 'grabbing';
    svg.setPointerCapture(e.pointerId);
    e.preventDefault();

    if (!isThumb) {
      const pct = percentFromEvent(e);
      setPercent(pct);
      if (onValueChange) onValueChange(pct);
    }
  });

  svg.addEventListener('pointermove', (e) => {
    if (!isDragging) return;
    const pct = percentFromEvent(e);
    setPercent(pct);
    if (onValueChange) onValueChange(pct);
  });

  svg.addEventListener('pointerup', () => {
    if (isDragging) { isDragging = false; thumb.style.cursor = 'grab'; }
  });

  svg.addEventListener('lostpointercapture', () => {
    isDragging = false; thumb.style.cursor = 'grab';
  });
}
