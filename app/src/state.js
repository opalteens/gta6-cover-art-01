// Editor state for Vice Cover Lab: one object, plain data, no DOM inside.
export const LAYOUTS = [
  { id: "grid", label: "Four Panel", panels: 4 },
  { id: "hero", label: "Hero + Three", panels: 4 },
  { id: "triptych", label: "Triptych", panels: 3 },
  { id: "full", label: "Full Bleed", panels: 1 },
];
export const GRADES = [
  { id: "sunset", label: "Vice Sunset" },
  { id: "neon", label: "Neon Nights" },
  { id: "teal", label: "Teal Noir" },
  { id: "golden", label: "Golden Hour" },
];
export const SIZES = [
  { id: "square", label: "Square 1080", w: 1080, h: 1080 },
  { id: "story", label: "Story 1080×1350", w: 1080, h: 1350 },
  { id: "wide", label: "Wide 1920×1080", w: 1920, h: 1080 },
];
export function freshPanel(photo) {
  return { photo, zoom: 1.2, panX: 0, panY: 0, anchorX: 0.5, anchorY: 0.5 };
}
export function defaultState() {
  return {
    layout: "grid",
    grade: "sunset",
    size: "square",
    title: "VICE CITY",
    subtitle: "nights on the boulevard",
    photos: [],
    panels: variedPanels(),
    selected: 0,
  };
}
// Small undo/redo stack: snapshots of the plain state object.
export function makeHistory(limit = 60) {
  const past = [];
  const future = [];
  return {
    push(state) {
      past.push(JSON.stringify(state));
      if (past.length > limit) past.shift();
      future.length = 0;
    },
    undo(current) {
      if (!past.length) return null;
      future.push(JSON.stringify(current));
      return JSON.parse(past.pop());
    },
    redo(current) {
      if (!future.length) return null;
      past.push(JSON.stringify(current));
      return JSON.parse(future.pop());
    },
    canUndo() { return past.length > 0; },
    canRedo() { return future.length > 0; },
  };
}
export function panelCount(state) {
  return LAYOUTS.find((l) => l.id === state.layout).panels;
}
export function cloneState(state) {
  return JSON.parse(JSON.stringify(state));
}
// Plain document for history: photos hold live Image objects, which JSON
// cannot carry, so undo/redo snapshots keep everything except photos.
export function docOf(state) {
  return {
    layout: state.layout,
    grade: state.grade,
    size: state.size,
    title: state.title,
    subtitle: state.subtitle,
    panels: state.panels,
    selected: state.selected,
  };
}
// Default panels: the same photo twice must NOT look identical — each repeat
// gets its own zoom and pan so the cover reads as several different shots.
export function variedPanels() {
  return [
    { photo: 0, zoom: 1.15, panX: 0, panY: 0, anchorX: 0.5, anchorY: 0.05 },
    { photo: 0, zoom: 1.7, panX: 0.4, panY: 0.15, anchorX: 0.5, anchorY: 0.5 },
    { photo: 1, zoom: 1.3, panX: 0.35, panY: -0.15, anchorX: 0.5, anchorY: 0.5 },
    { photo: 1, zoom: 1.7, panX: -0.4, panY: 0.1, anchorX: 0.5, anchorY: 0.5 },
  ];
}
