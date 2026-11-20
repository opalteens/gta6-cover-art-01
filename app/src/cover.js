// Cover renderer for Vice Cover Lab: draws the poster onto a 2D canvas.
export const GRADE_WASH = {
  sunset: { top: "#ff7e3d", bottom: "#b3126e", wash: "rgba(255,94,58,0.20)", ink: "#fff3e0" },
  neon: { top: "#2b1055", bottom: "#ff2e88", wash: "rgba(255,46,136,0.22)", ink: "#eaf6ff" },
  teal: { top: "#062a2e", bottom: "#0f766e", wash: "rgba(20,184,166,0.18)", ink: "#e6fff9" },
  golden: { top: "#f7b733", bottom: "#c2410c", wash: "rgba(247,183,51,0.20)", ink: "#fff8e7" },
};
// Panel rectangles for each layout, in fractions of the cover size.
export function layoutRects(layout, w, h) {
  const gap = Math.round(w * 0.012);
  if (layout === "hero") {
    const heroH = Math.round(h * 0.58);
    const third = Math.floor((w - gap * 2) / 3);
    return [
      { x: 0, y: 0, w, h: heroH },
      { x: 0, y: heroH + gap, w: third, h: h - heroH - gap },
      { x: third + gap, y: heroH + gap, w: third, h: h - heroH - gap },
      { x: third * 2 + gap * 2, y: heroH + gap, w: w - third * 2 - gap * 2, h: h - heroH - gap },
    ];
  }
  if (layout === "triptych") {
    const third = Math.floor((w - gap * 2) / 3);
    return [
      { x: 0, y: 0, w: third, h },
      { x: third + gap, y: 0, w: third, h },
      { x: third * 2 + gap * 2, y: 0, w: w - third * 2 - gap * 2, h },
    ];
  }
  if (layout === "full") return [{ x: 0, y: 0, w, h }];
  const halfW = Math.floor((w - gap) / 2);
  const halfH = Math.floor((h - gap) / 2);
  return [
    { x: 0, y: 0, w: halfW, h: halfH },
    { x: halfW + gap, y: 0, w: w - halfW - gap, h: halfH },
    { x: 0, y: halfH + gap, w: halfW, h: h - halfH - gap },
    { x: halfW + gap, y: halfH + gap, w: w - halfW - gap, h: h - halfH - gap },
  ];
}
// Deterministic grain so two runs of the same cover match byte for byte.
export function seededDots(seed, count, w, h) {
  let s = seed >>> 0;
  const dots = [];
  for (let i = 0; i < count; i++) {
    s = (s * 1664525 + 1013904223) >>> 0;
    const x = (s / 4294967296) * w;
    s = (s * 1664525 + 1013904223) >>> 0;
    const y = (s / 4294967296) * h;
    dots.push([x, y]);
  }
  return dots;
}
// Draw one photo into a panel rect, cover-fit, with the panel's zoom, pan
// and anchor (anchor 0 = photo edge at the panel edge, 0.5 = centred).
export function drawPhotoInto(ctx, img, rect, panel) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const scale = Math.max(rect.w / iw, rect.h / ih) * panel.zoom;
  const dw = iw * scale;
  const dh = ih * scale;
  const ax = panel.anchorX ?? 0.5;
  const ay = panel.anchorY ?? 0.5;
  const dx = rect.x - (dw - rect.w) * ax + panel.panX * rect.w * 0.1;
  const dy = rect.y - (dh - rect.h) * ay + panel.panY * rect.h * 0.1;
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();
}
// Draw the whole cover: panels, grade wash, title block, grain, vignette.
export function drawCover(ctx, state, w, h) {
  const grade = GRADE_WASH[state.grade] || GRADE_WASH.sunset;
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, grade.top);
  sky.addColorStop(1, grade.bottom);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);
  const rects = layoutRects(state.layout, w, h);
  const count = Math.min(rects.length, state.panels.length);
  for (let i = 0; i < count; i++) {
    const panel = state.panels[i];
    const photo = state.photos[panel.photo];
    if (photo && photo.img) drawPhotoInto(ctx, photo.img, rects[i], panel);
    ctx.strokeStyle = "rgba(255,255,255,0.85)";
    ctx.lineWidth = Math.max(2, Math.round(w * 0.004));
    ctx.strokeRect(rects[i].x, rects[i].y, rects[i].w, rects[i].h);
  }
  ctx.fillStyle = grade.wash;
  ctx.fillRect(0, 0, w, h);
  drawTitleBlock(ctx, state, w, h, grade);
  drawGrain(ctx, w, h);
  drawVignette(ctx, w, h);
}
// Bold caption across the bottom, with a neon script subtitle beneath it.
export function drawTitleBlock(ctx, state, w, h, grade) {
  const bandH = Math.round(h * 0.20);
  const y0 = h - bandH;
  const shade = ctx.createLinearGradient(0, y0, 0, h);
  shade.addColorStop(0, "rgba(10,6,20,0)");
  shade.addColorStop(1, "rgba(10,6,20,0.82)");
  ctx.fillStyle = shade;
  ctx.fillRect(0, y0, w, bandH);
  const title = (state.title || "").toUpperCase();
  const size = Math.round(w * 0.105);
  ctx.font = `${size}px Anton, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineWidth = Math.round(size * 0.08);
  ctx.strokeStyle = "#1a0b2e";
  ctx.strokeText(title, w / 2, y0 + bandH * 0.38);
  ctx.fillStyle = grade.ink;
  ctx.fillText(title, w / 2, y0 + bandH * 0.38);
  ctx.font = `${Math.round(w * 0.032)}px Pacifico, cursive`;
  ctx.fillStyle = "#ffd166";
  ctx.fillText(state.subtitle || "", w / 2, y0 + bandH * 0.78);
}
export function drawGrain(ctx, w, h) {
  const dots = seededDots(20261119, Math.round((w * h) / 900), w, h);
  ctx.fillStyle = "rgba(255,255,255,0.05)";
  for (const [x, y] of dots) ctx.fillRect(x, y, 1.5, 1.5);
}
export function drawVignette(ctx, w, h) {
  const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.42, w / 2, h / 2, Math.max(w, h) * 0.75);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, "rgba(0,0,0,0.38)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}
