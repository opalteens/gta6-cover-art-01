// Editor wiring for Vice Cover Lab: controls, photo strip, drag-pan, export.
import { LAYOUTS, GRADES, SIZES, defaultState, makeHistory, panelCount, cloneState, docOf, variedPanels } from "./state.js";
import { drawCover, layoutRects } from "./cover.js";

const canvas = document.getElementById("stage");
const ctx = canvas.getContext("2d");
let state = defaultState();
let history = makeHistory();
const SAMPLES = ["samples/boulevard.jpg", "samples/pier.jpg"];

function render() {
  const size = SIZES.find((s) => s.id === state.size);
  canvas.width = size.w;
  canvas.height = size.h;
  drawCover(ctx, state, size.w, size.h);
  refreshButtons();
  refreshUndo();
}
function snapshot() {
  history.push(docOf(state));
  render();
}
function refreshButtons() {
  markActive("layoutRow", state.layout);
  markActive("gradeRow", state.grade);
  markActive("sizeRow", state.size);
}
function markActive(rowId, value) {
  const row = document.getElementById(rowId);
  if (!row) return;
  for (const btn of row.querySelectorAll("button")) {
    btn.classList.toggle("active", btn.dataset.value === value);
  }
}
function refreshUndo() {
  document.getElementById("undoBtn").disabled = !history.canUndo();
  document.getElementById("redoBtn").disabled = !history.canRedo();
}
function buildOptionRow(rowId, items, onPick) {
  const row = document.getElementById(rowId);
  row.innerHTML = "";
  for (const item of items) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = item.label;
    btn.dataset.value = item.id;
    btn.addEventListener("click", () => onPick(item.id));
    row.appendChild(btn);
  }
}
function buildControls() {
  buildOptionRow("layoutRow", LAYOUTS, (id) => {
    snapshot();
    state.layout = id;
    state.selected = 0;
    render();
  });
  buildOptionRow("gradeRow", GRADES, (id) => {
    snapshot();
    state.grade = id;
    render();
  });
  buildOptionRow("sizeRow", SIZES, (id) => {
    snapshot();
    state.size = id;
    render();
  });
}
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
async function addPhotoFile(file) {
  const url = URL.createObjectURL(file);
  const img = await loadImage(url);
  state.photos.push({ img, name: file.name });
  return state.photos.length - 1;
}
async function useSamples() {
  snapshot();
  state.photos = [];
  for (const src of SAMPLES) {
    const img = await loadImage(src);
    state.photos.push({ img, name: src.split("/").pop() });
  }
  state.panels = variedPanels();
  state.selected = 0;
  refreshStrip();
  render();
}
function refreshStrip() {
  const strip = document.getElementById("photoStrip");
  strip.innerHTML = "";
  state.photos.forEach((photo, i) => {
    const thumb = document.createElement("img");
    thumb.src = photo.img.src;
    thumb.alt = photo.name;
    thumb.classList.toggle("selected", state.panels[state.selected]?.photo === i);
    thumb.addEventListener("click", () => {
      snapshot();
      state.panels[state.selected].photo = i;
      refreshStrip();
      render();
    });
    strip.appendChild(thumb);
  });
}
// Drag on the preview pans the selected panel's photo; click selects a panel.
function panelAt(clientX, clientY) {
  const box = canvas.getBoundingClientRect();
  const x = ((clientX - box.left) / box.width) * canvas.width;
  const y = ((clientY - box.top) / box.height) * canvas.height;
  const rects = layoutRects(state.layout, canvas.width, canvas.height);
  for (let i = 0; i < Math.min(rects.length, state.panels.length); i++) {
    const r = rects[i];
    if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return i;
  }
  return 0;
}
function bindPointer() {
  let drag = null;
  canvas.addEventListener("pointerdown", (e) => {
    const idx = panelAt(e.clientX, e.clientY);
    state.selected = idx;
    refreshStrip();
    render();
    drag = { x: e.clientX, y: e.clientY, panX: state.panels[idx].panX, panY: state.panels[idx].panY, moved: false, before: docOf(state) };
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!drag) return;
    const box = canvas.getBoundingClientRect();
    const dx = (e.clientX - drag.x) / box.width;
    const dy = (e.clientY - drag.y) / box.height;
    if (!drag.moved && Math.abs(dx) + Math.abs(dy) > 0.005) {
      drag.moved = true;
      history.push(drag.before);
    }
    const panel = state.panels[state.selected];
    panel.panX = Math.max(-1, Math.min(1, drag.panX + dx * 2));
    panel.panY = Math.max(-1, Math.min(1, drag.panY + dy * 2));
    render();
  });
  canvas.addEventListener("pointerup", () => {
    drag = null;
    refreshUndo();
  });
}
// Export the cover at the chosen size; returns the exact PNG bytes.
export function exportCover() {
  const size = SIZES.find((s) => s.id === state.size);
  const off = document.createElement("canvas");
  off.width = size.w;
  off.height = size.h;
  drawCover(off.getContext("2d"), state, size.w, size.h);
  return new Promise((resolve) => off.toBlob(resolve, "image/png"));
}
async function downloadExport() {
  const blob = await exportCover();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `vice-cover-${state.size}.png`;
  a.click();
  URL.revokeObjectURL(url);
}
function bindInputs() {
  document.getElementById("fileInput").addEventListener("change", async (e) => {
    snapshot();
    for (const file of e.target.files) await addPhotoFile(file);
    refreshStrip();
    render();
    e.target.value = "";
  });
  document.getElementById("sampleBtn").addEventListener("click", useSamples);
  document.getElementById("titleInput").addEventListener("input", (e) => {
    state.title = e.target.value;
    render();
  });
  document.getElementById("subInput").addEventListener("input", (e) => {
    state.subtitle = e.target.value;
    render();
  });
  document.getElementById("zoomInput").addEventListener("input", (e) => {
    state.panels[state.selected].zoom = parseFloat(e.target.value);
    render();
  });
}
function bindFinish() {
  document.getElementById("undoBtn").addEventListener("click", () => {
    const prev = history.undo(docOf(state));
    if (prev) {
      state = { ...state, ...prev };
      refreshStrip();
      render();
    }
  });
  document.getElementById("redoBtn").addEventListener("click", () => {
    const next = history.redo(docOf(state));
    if (next) {
      state = { ...state, ...next };
      refreshStrip();
      render();
    }
  });
  document.getElementById("exportBtn").addEventListener("click", downloadExport);
}
// Test hooks: the screenshot scenes use these, and the finalist review can too.
window.__viceExport = async () => {
  const blob = await exportCover();
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
};
window.__viceState = () => cloneState(state);
window.__viceSetState = (patch) => {
  Object.assign(state, patch);
  refreshStrip();
  render();
};
buildControls();
bindInputs();
bindPointer();
bindFinish();
render();
