/** Day / night / auto theme. The preference lives in localStorage; the resolved theme is the
 *  `data-theme` attribute on <html>, set before first paint by THEME_BOOTSTRAP in the root layout. */
export type ThemePref = "light" | "dark" | "auto";
export const THEME_KEY = "rd_theme";

export const THEME_BOOTSTRAP = `(function(){try{var p=localStorage.getItem("${THEME_KEY}");var d=window.matchMedia("(prefers-color-scheme: dark)").matches;document.documentElement.setAttribute("data-theme",p==="dark"||p==="light"?p:(d?"dark":"light"));}catch(e){}})();`;

const listeners = new Set<() => void>();

export function getThemePref(): ThemePref {
  if (typeof window === "undefined") return "auto";
  try {
    const v = localStorage.getItem(THEME_KEY);
    return v === "dark" || v === "light" ? v : "auto";
  } catch {
    return "auto";
  }
}

export function resolveTheme(pref: ThemePref): "light" | "dark" {
  if (pref !== "auto") return pref;
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function applyTheme(pref: ThemePref) {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-theme", resolveTheme(pref));
}

export function setThemePref(pref: ThemePref) {
  try {
    if (pref === "auto") localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, pref);
  } catch {
    /* private mode: still apply for this page */
  }
  applyTheme(pref);
  listeners.forEach((l) => l());
}

export function subscribeTheme(cb: () => void) {
  listeners.add(cb);
  const mq = typeof window !== "undefined" ? window.matchMedia("(prefers-color-scheme: dark)") : null;
  const onSystem = () => {
    if (getThemePref() === "auto") applyTheme("auto");
    cb();
  };
  mq?.addEventListener("change", onSystem);
  const onStorage = (e: StorageEvent) => {
    if (e.key === THEME_KEY) {
      applyTheme(getThemePref());
      cb();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    mq?.removeEventListener("change", onSystem);
    window.removeEventListener("storage", onStorage);
  };
}
