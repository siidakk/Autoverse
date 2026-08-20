// Recently viewed cars, kept on the device rather than on the server. It is
// browsing history, it is only useful on the machine that did the browsing, and
// there is no reason for it to leave.

const KEY = "autoverse.recent";
const LIMIT = 6;

export function recentlyViewed() {
  try {
    const stored = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(stored) ? stored.slice(0, LIMIT) : [];
  } catch {
    return [];
  }
}

export function noteViewed(car) {
  if (!car) return;

  try {
    const existing = recentlyViewed().filter((entry) => entry.id !== car.id);
    const next = [{ id: car.id, at: Date.now() }, ...existing].slice(0, LIMIT);
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // A full or blocked store is not worth interrupting anybody over.
  }
}
