import { afterEach, describe, expect, it } from 'vitest';

import { createNavController } from '@/game/nav-controller';
import type { HistoryWindow, NavController } from '@/game/nav-controller';
import { createInitialNavState } from '@/game/navigation';
import type { NavOptions, NavState } from '@/game/navigation';

const options: NavOptions = {
  worldIds: ['addition', 'subtraction'],
  dentakuWorldIds: ['kuku', 'addition'],
  longFormWorldIds: ['addition', 'division'],
  stageCount: 10,
  dentakuStageIds: ['dentaku-kuku-dan-1', 'dentaku-kuku-dan-2'],
  longFormStageIds: ['long-form-addition-1', 'long-form-addition-2'],
};

type PopStateListener = Parameters<HistoryWindow['addEventListener']>[1];

/** A browser history stand-in: entries, an index, and popstate fired on back/forward. */
function createFakeWindow(initialState: unknown = null) {
  const entries: unknown[] = [initialState];
  let index = 0;
  const listeners: PopStateListener[] = [];

  const firePopState = () => {
    [...listeners].forEach((listener) => listener());
  };

  const fakeWindow: HistoryWindow = {
    history: {
      get state() {
        return entries[index];
      },
      pushState: (data) => {
        entries.splice(index + 1);
        entries.push(data);
        index += 1;
      },
      replaceState: (data) => {
        entries[index] = data;
      },
      back: () => {
        if (index > 0) {
          index -= 1;
          firePopState();
        }
      },
    },
    addEventListener: (_type, listener) => {
      listeners.push(listener);
    },
    removeEventListener: (_type, listener) => {
      const listenerIndex = listeners.indexOf(listener);
      if (listenerIndex >= 0) {
        listeners.splice(listenerIndex, 1);
      }
    },
  };

  return {
    fakeWindow,
    entryCount: () => entries.length,
    currentIndex: () => index,
    forward: () => {
      if (index < entries.length - 1) {
        index += 1;
        firePopState();
      }
    },
    /** What the app's router does to an entry it rewrites: only its own id is left in it. */
    rewriteCurrentEntryLikeTheRouter: () => {
      entries[index] = { id: 'router-entry' };
    },
    listenerCount: () => listeners.length,
  };
}

const REPAIR_INTERVAL_MS = 5;
const createdControllers: NavController[] = [];

function createController(
  fake: ReturnType<typeof createFakeWindow> | undefined,
  { isRouteActive, stateAtPageLoad }: { isRouteActive?: () => boolean; stateAtPageLoad?: unknown } = {},
) {
  const screens: NavState['screen'][] = [];
  const controller = createNavController({
    historyWindow: fake?.fakeWindow,
    options,
    initialNav: createInitialNavState(options),
    onChange: (nav) => {
      screens.push(nav.screen);
    },
    isRouteActive,
    stateAtPageLoad,
    repairIntervalMs: REPAIR_INTERVAL_MS,
  });
  createdControllers.push(controller);
  return { controller, screens };
}

function waitForRepair() {
  return new Promise((resolve) => {
    setTimeout(resolve, REPAIR_INTERVAL_MS * 8);
  });
}

afterEach(() => {
  createdControllers.splice(0).forEach((controller) => controller.dispose());
});

describe('navigation controller with browser history', () => {
  it('opens the launch demo for a first visit and the mode select for a returning player', () => {
    const first = createController(createFakeWindow());
    first.controller.start('launch');
    expect(first.controller.getNav().screen).toBe('launch');

    const returning = createController(createFakeWindow());
    returning.controller.start('mode');
    expect(returning.controller.getNav().screen).toBe('mode');
  });

  it('adds one history entry per forward step and none for finishing the launch demo', () => {
    const fake = createFakeWindow();
    const { controller } = createController(fake);
    controller.start('launch');
    controller.setBaseScreen('mode');
    controller.navigate({ screen: 'mode' }, 'replace');
    expect(fake.entryCount()).toBe(1);

    controller.navigate({ screen: 'world' });
    controller.navigate({ screen: 'stage', worldId: 'subtraction' });
    controller.navigate({ screen: 'game', stageIndex: 4 });
    expect(fake.entryCount()).toBe(4);
    expect(controller.getNav()).toEqual({ ...createInitialNavState(options), screen: 'game', worldId: 'subtraction', stageIndex: 4 });
  });

  it('walks back one screen at a time with the in-app back button', () => {
    const fake = createFakeWindow();
    const { controller } = createController(fake);
    controller.start('mode');
    controller.navigate({ screen: 'world' });
    controller.navigate({ screen: 'stage', worldId: 'subtraction' });
    controller.navigate({ screen: 'game', stageIndex: 4 });

    controller.goBack();
    expect(controller.getNav().screen).toBe('stage');
    expect(controller.getNav().worldId).toBe('subtraction');
    controller.goBack();
    expect(controller.getNav().screen).toBe('world');
    controller.goBack();
    expect(controller.getNav().screen).toBe('mode');
    expect(fake.currentIndex()).toBe(0);

    controller.goBack();
    expect(controller.getNav().screen).toBe('mode');
    expect(fake.currentIndex()).toBe(0);
  });

  it('follows the browser back and forward buttons', () => {
    const fake = createFakeWindow();
    const { controller } = createController(fake);
    controller.start('mode');
    controller.navigate({ screen: 'dentakuWorld' });
    controller.navigate({ screen: 'dentakuStage', dentakuWorldId: 'addition' });

    fake.fakeWindow.history.back();
    expect(controller.getNav().screen).toBe('dentakuWorld');
    fake.forward();
    expect(controller.getNav().screen).toBe('dentakuStage');
    expect(controller.getNav().dentakuWorldId).toBe('addition');
  });

  it('keeps the next question of a stage in the same history entry', () => {
    const fake = createFakeWindow();
    const { controller } = createController(fake);
    controller.start('mode');
    controller.navigate({ screen: 'dentakuWorld' });
    controller.navigate({ screen: 'dentakuStage' });
    controller.navigate({ screen: 'dentakuGame', dentakuStageId: 'dentaku-kuku-dan-1' });
    controller.navigate({ dentakuStageId: 'dentaku-kuku-dan-2' }, 'replace');
    expect(fake.entryCount()).toBe(4);

    controller.goBack();
    expect(controller.getNav().screen).toBe('dentakuStage');
  });

  it('returns to the same screen after a reload', () => {
    const fake = createFakeWindow();
    const beforeReload = createController(fake);
    beforeReload.controller.start('mode');
    beforeReload.controller.navigate({ screen: 'longFormWorld' });
    beforeReload.controller.navigate({ screen: 'longFormStage', longFormWorldId: 'division' });
    beforeReload.controller.dispose();

    const afterReload = createController(fake);
    afterReload.controller.start('mode');
    expect(afterReload.controller.getNav().screen).toBe('longFormStage');
    expect(afterReload.controller.getNav().longFormWorldId).toBe('division');

    afterReload.controller.goBack();
    expect(afterReload.controller.getNav().screen).toBe('longFormWorld');
  });

  it('returns to the same screen after a reload even though the router rewrites the entry on startup', () => {
    const fake = createFakeWindow();
    const beforeReload = createController(fake);
    beforeReload.controller.start('mode');
    beforeReload.controller.navigate({ screen: 'world' });
    beforeReload.controller.navigate({ screen: 'stage', worldId: 'subtraction' });
    beforeReload.controller.dispose();

    const stateAtPageLoad = fake.fakeWindow.history.state;
    fake.rewriteCurrentEntryLikeTheRouter();
    const afterReload = createController(fake, { stateAtPageLoad });
    afterReload.controller.start('mode');
    expect(afterReload.controller.getNav().screen).toBe('stage');
    expect(afterReload.controller.getNav().worldId).toBe('subtraction');
    expect((fake.fakeWindow.history.state as { id?: string }).id).toBe('router-entry');

    afterReload.controller.goBack();
    expect(afterReload.controller.getNav().screen).toBe('world');
    expect(fake.currentIndex()).toBe(1);
  });

  it('ignores a page-load state that holds no screen', () => {
    const { controller } = createController(createFakeWindow(), { stateAtPageLoad: { id: 'router-entry' } });
    controller.start('launch');
    expect(controller.getNav().screen).toBe('launch');
  });

  it('keeps the data the router stored in a history entry', () => {
    const fake = createFakeWindow({ id: 'router-entry' });
    const { controller } = createController(fake);
    controller.start('mode');
    controller.navigate({ screen: 'world' });

    expect((fake.fakeWindow.history.state as { id?: string }).id).toBe('router-entry');
  });

  it('shows the base screen for an entry that holds no screen', () => {
    const fake = createFakeWindow();
    const { controller } = createController(fake);
    controller.start('mode');
    controller.navigate({ screen: 'world' });
    fake.fakeWindow.history.back();
    fake.rewriteCurrentEntryLikeTheRouter();
    fake.forward();

    fake.fakeWindow.history.back();
    expect(controller.getNav().screen).toBe('mode');
  });

  it('keeps going back through history after the router rewrote the current entry', () => {
    const fake = createFakeWindow();
    const { controller } = createController(fake);
    controller.start('mode');
    controller.navigate({ screen: 'world' });
    controller.navigate({ screen: 'stage' });
    fake.rewriteCurrentEntryLikeTheRouter();

    controller.goBack();
    expect(controller.getNav().screen).toBe('world');
    expect(fake.currentIndex()).toBe(1);
  });

  it('describes the screen being left again before moving on from a rewritten entry', () => {
    const fake = createFakeWindow();
    const { controller } = createController(fake);
    controller.start('mode');
    controller.navigate({ screen: 'world' });
    fake.rewriteCurrentEntryLikeTheRouter();
    controller.navigate({ screen: 'stage' });

    fake.fakeWindow.history.back();
    expect(controller.getNav().screen).toBe('world');
    expect((fake.fakeWindow.history.state as { id?: string }).id).toBe('router-entry');
  });

  it('puts the screen back into an entry the router rewrote, so forward and reload still find it', async () => {
    const fake = createFakeWindow();
    const { controller } = createController(fake);
    controller.start('mode');
    controller.navigate({ screen: 'world' });
    controller.navigate({ screen: 'stage', worldId: 'subtraction' });

    fake.fakeWindow.history.back();
    fake.rewriteCurrentEntryLikeTheRouter();
    await waitForRepair();
    fake.fakeWindow.history.back();
    fake.rewriteCurrentEntryLikeTheRouter();
    await waitForRepair();

    fake.forward();
    expect(controller.getNav().screen).toBe('world');
    expect((fake.fakeWindow.history.state as { id?: string }).id).toBe('router-entry');
  });

  it('leaves the entries of other routes alone', async () => {
    const fake = createFakeWindow();
    let isGameOnScreen = true;
    const { controller } = createController(fake, { isRouteActive: () => isGameOnScreen });
    controller.start('mode');

    isGameOnScreen = false;
    fake.fakeWindow.history.pushState({ id: 'landing-entry' }, '');
    await waitForRepair();
    expect(fake.fakeWindow.history.state).toEqual({ id: 'landing-entry' });
  });

  it('picks up the popped screen when the router rebuilds the game screen and rewrites the entry', () => {
    const fake = createFakeWindow();
    const beforeRebuild = createController(fake);
    beforeRebuild.controller.start('mode');
    beforeRebuild.controller.navigate({ screen: 'world' });
    beforeRebuild.controller.navigate({ screen: 'stage', worldId: 'subtraction' });
    beforeRebuild.controller.navigate({ screen: 'game', stageIndex: 3 });

    fake.fakeWindow.history.back();
    fake.rewriteCurrentEntryLikeTheRouter();
    beforeRebuild.controller.dispose();

    const afterRebuild = createController(fake);
    afterRebuild.controller.start('mode');
    expect(afterRebuild.controller.getNav().screen).toBe('stage');
    expect(afterRebuild.controller.getNav().worldId).toBe('subtraction');

    afterRebuild.controller.goBack();
    expect(afterRebuild.controller.getNav().screen).toBe('world');
    expect(fake.currentIndex()).toBe(1);
  });

  it('stops listening once disposed', () => {
    const fake = createFakeWindow();
    const { controller } = createController(fake);
    expect(fake.listenerCount()).toBe(1);
    controller.dispose();
    expect(fake.listenerCount()).toBe(0);
  });
});

describe('navigation controller without browser history', () => {
  it('moves between screens with the in-app buttons alone', () => {
    const { controller, screens } = createController(undefined);
    controller.start('launch');
    controller.setBaseScreen('mode');
    controller.navigate({ screen: 'mode' }, 'replace');
    controller.navigate({ screen: 'world' });
    controller.navigate({ screen: 'stage' });
    controller.goBack();
    controller.goBack();
    controller.goBack();

    expect(screens).toEqual(['launch', 'mode', 'world', 'stage', 'world', 'mode']);
  });
});
