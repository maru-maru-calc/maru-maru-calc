import { getParentScreen, normalizeNavState } from './navigation';
import type { AppScreen, NavOptions, NavState } from './navigation';

const HISTORY_NAV_KEY = 'marumaruNav';
const HISTORY_DEPTH_KEY = 'marumaruDepth';
const HISTORY_BACK_GUARD_MS = 600;
const RECENT_POP_ENTRY_MS = 2000;
const ENTRY_REPAIR_INTERVAL_MS = 250;

/** The part of the browser `window` the controller needs. Tests pass a fake one. */
export type HistoryWindow = {
  history: {
    state: unknown;
    pushState: (data: unknown, unused: string) => void;
    replaceState: (data: unknown, unused: string) => void;
    back: () => void;
  };
  addEventListener: (type: 'popstate', listener: () => void) => void;
  removeEventListener: (type: 'popstate', listener: () => void) => void;
};

type HistoryNavEntry = {
  nav: NavState;
  depth: number;
};

export type NavController = {
  getNav: () => NavState;
  /**
   * Shows the first screen. A history entry that already holds a screen (after a reload,
   * or when browser back/forward rebuilt the page) wins over `baseScreen`.
   */
  start: (baseScreen: AppScreen) => void;
  /** The screen to show for a history entry that holds no screen of ours. */
  setBaseScreen: (baseScreen: AppScreen) => void;
  /**
   * Moves to another screen. A `push` becomes a browser history entry, so the browser's
   * own back button (or an Android back gesture) retraces the same path.
   */
  navigate: (patch: Partial<NavState>, method?: 'push' | 'replace') => void;
  /** The in-app back button: one step back in history, or straight to the parent screen without history. */
  goBack: () => void;
  dispose: () => void;
};

// The app's router listens to the same back/forward events. Right after one of them it rewrites
// the current history entry, which drops the screen stored in it, and it may rebuild the game screen.
// Two things keep that from losing the player's place: the controller regularly puts the screen
// back into the current entry, and the entry most recently reached is remembered here so a
// rebuilt screen picks up from it.
let recentPopEntry: { entry: HistoryNavEntry; at: number; historyWindow: HistoryWindow } | undefined;

function getRecentPopEntry(historyWindow: HistoryWindow | undefined): HistoryNavEntry | undefined {
  if (!historyWindow || !recentPopEntry || recentPopEntry.historyWindow !== historyWindow) {
    return undefined;
  }
  return Date.now() - recentPopEntry.at < RECENT_POP_ENTRY_MS ? recentPopEntry.entry : undefined;
}

export function createNavController({
  historyWindow,
  options,
  initialNav,
  onChange,
  isRouteActive,
  repairIntervalMs = ENTRY_REPAIR_INTERVAL_MS,
}: {
  /** Omit where there is no browser history (native apps); in-app back buttons still work. */
  historyWindow?: HistoryWindow;
  options: NavOptions;
  initialNav: NavState;
  onChange: (nav: NavState) => void;
  /** False while another route is on screen, so its history entries are left alone. */
  isRouteActive?: () => boolean;
  repairIntervalMs?: number;
}): NavController {
  let nav = initialNav;
  let depth = 0;
  let baseScreen: AppScreen = initialNav.screen;
  let hasStarted = false;
  let isBackPending = false;
  let backGuardTimer: ReturnType<typeof setTimeout> | undefined;
  const recentEntryAtCreation = getRecentPopEntry(historyWindow);

  const readEntry = (): HistoryNavEntry | undefined => {
    if (!historyWindow) {
      return undefined;
    }

    let state: unknown;
    try {
      state = historyWindow.history.state;
    } catch {
      return undefined;
    }
    if (!state || typeof state !== 'object') {
      return undefined;
    }

    const record = state as Record<string, unknown>;
    const entryNav = normalizeNavState(record[HISTORY_NAV_KEY], options);
    if (!entryNav) {
      return undefined;
    }

    const entryDepth = record[HISTORY_DEPTH_KEY];
    return { nav: entryNav, depth: typeof entryDepth === 'number' && entryDepth > 0 ? entryDepth : 0 };
  };

  const writeEntry = (method: 'push' | 'replace', entryNav: NavState, entryDepth: number) => {
    if (!historyWindow) {
      return;
    }

    try {
      // Keep whatever the router stored in this entry so its own back/forward handling still recognizes it.
      const current: unknown = historyWindow.history.state;
      const base = current && typeof current === 'object' ? (current as Record<string, unknown>) : {};
      const next = { ...base, [HISTORY_NAV_KEY]: entryNav, [HISTORY_DEPTH_KEY]: entryDepth };
      if (method === 'push') {
        historyWindow.history.pushState(next, '');
      } else {
        historyWindow.history.replaceState(next, '');
      }
    } catch {
      // History can be unavailable (sandboxed frames). In-app back buttons still work without it.
    }
  };

  const apply = (next: NavState) => {
    nav = next;
    onChange(next);
  };

  const clearBackGuard = () => {
    isBackPending = false;
    if (backGuardTimer) {
      clearTimeout(backGuardTimer);
      backGuardTimer = undefined;
    }
  };

  // Puts the current screen back into the current entry if the router dropped it.
  const repairCurrentEntry = () => {
    if (!historyWindow || !hasStarted || (isRouteActive && !isRouteActive())) {
      return;
    }
    if (!readEntry()) {
      writeEntry('replace', nav, depth);
    }
  };

  const handlePopState = () => {
    clearBackGuard();
    const entry = readEntry();
    if (entry) {
      if (historyWindow) {
        recentPopEntry = { entry, at: Date.now(), historyWindow };
      }
      depth = entry.depth;
      apply(entry.nav);
      return;
    }

    // An entry without our data is the one the game was first opened on (or another route, which the router handles).
    depth = 0;
    apply({ ...nav, screen: baseScreen });
  };

  historyWindow?.addEventListener('popstate', handlePopState);
  const repairTimer = historyWindow ? setInterval(repairCurrentEntry, repairIntervalMs) : undefined;

  const navigate: NavController['navigate'] = (patch, method = 'push') => {
    const next = { ...nav, ...patch };
    if (method === 'push') {
      // The entry being left must still describe this screen when the player comes back to it.
      repairCurrentEntry();
      depth += 1;
    }
    writeEntry(method, next, depth);
    apply(next);
  };

  return {
    getNav: () => nav,
    start: (nextBaseScreen) => {
      baseScreen = nextBaseScreen;
      hasStarted = true;
      const restored = readEntry() ?? recentEntryAtCreation;
      if (restored) {
        depth = restored.depth;
        apply(restored.nav);
        return;
      }

      depth = 0;
      const first = { ...nav, screen: nextBaseScreen };
      writeEntry('replace', first, 0);
      apply(first);
    },
    setBaseScreen: (nextBaseScreen) => {
      baseScreen = nextBaseScreen;
    },
    navigate,
    goBack: () => {
      const parentScreen = getParentScreen(nav.screen);
      if (!parentScreen) {
        return;
      }

      if (historyWindow && depth > 0) {
        if (isBackPending) {
          return;
        }
        // The popstate listener applies the screen stored in the previous history entry.
        repairCurrentEntry();
        isBackPending = true;
        backGuardTimer = setTimeout(clearBackGuard, HISTORY_BACK_GUARD_MS);
        historyWindow.history.back();
        return;
      }

      navigate({ screen: parentScreen }, 'replace');
    },
    dispose: () => {
      clearBackGuard();
      if (repairTimer) {
        clearInterval(repairTimer);
      }
      historyWindow?.removeEventListener('popstate', handlePopState);
    },
  };
}
