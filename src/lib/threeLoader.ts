// Global Three.js loader - loads once and caches
let threePromise: Promise<any> | null = null;

export function loadThree(): Promise<any> {
  if (!threePromise) {
    threePromise = import("https://cdn.jsdelivr.net/npm/three@r128/build/three.module.js");
  }
  return threePromise;
}
