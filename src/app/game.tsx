import { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DentakuGame } from '@/components/DentakuGame';
import { MarumaruGame } from '@/components/MarumaruGame';
import { NavImageIcon } from '@/components/NavImageIcon';
import { LONG_FORM_STAGES, LONG_FORM_WORLDS } from '@/components/select/long-form-stages';
import { ModeSelect } from '@/components/select/mode-select';
import { DentakuStageSelect, StageSelect } from '@/components/select/stage-select';
import { styles } from '@/components/select/styles';
import type { WorldId } from '@/components/select/types';
import { DentakuWorldSelect, WorldSelect } from '@/components/select/world-select';
import { DENTAKU_STAGES, DENTAKU_WORLDS, DentakuStage, DentakuWorldId } from '@/game/dentaku';
import { createNavController } from '@/game/nav-controller';
import type { HistoryWindow, NavController } from '@/game/nav-controller';
import { noteKukuAnswer } from '@/game/kuku-weak-facts';
import { createInitialNavState } from '@/game/navigation';
import type { NavOptions, NavState } from '@/game/navigation';
import { STAGES, STAGE_ISLANDS, getStageIndexById } from '@/game/stages';
import { Stage } from '@/game/types';
import { a11yLabel } from '@/i18n/a11y-label';
import { isSidewaysPhone } from '@/layout/phone-frame';
import { loadProgress, saveProgress } from '@/storage/progress';

const NAV_OPTIONS: NavOptions = {
  worldIds: STAGE_ISLANDS.map((island) => island.id),
  dentakuWorldIds: DENTAKU_WORLDS.map((world) => world.id),
  longFormWorldIds: LONG_FORM_WORLDS.map((world) => world.id),
  stageCount: STAGES.length,
  dentakuStageIds: DENTAKU_STAGES.map((stage) => stage.id),
  longFormStageIds: LONG_FORM_STAGES.map((stage) => stage.id),
};

function getHistoryWindow(): HistoryWindow | undefined {
  if (Platform.OS !== 'web' || typeof window === 'undefined' || typeof window.history?.pushState !== 'function') {
    return undefined;
  }
  return window as unknown as HistoryWindow;
}

// Read while the bundle loads, before the router rewrites the entry (see `stateAtPageLoad`).
// It describes the page load only, so only the first game screen after it may use it.
let historyStateAtPageLoad: unknown = Platform.OS === 'web' && typeof window !== 'undefined' ? window.history?.state : undefined;

function takeHistoryStateAtPageLoad() {
  const state = historyStateAtPageLoad;
  historyStateAtPageLoad = undefined;
  return state;
}

function isGameRouteActive() {
  return typeof window === 'undefined' || !window.location || /\/game\/?$/.test(window.location.pathname);
}

function addCompletedStageId(current: Set<string>, stageId: string) {
  if (current.has(stageId)) {
    return current;
  }
  const next = new Set(current);
  next.add(stageId);
  return next;
}

export default function GameRoute() {
  const { width, height } = useWindowDimensions();
  const shouldShowRotateHint = Platform.OS === 'web' && isSidewaysPhone(width, height);

  return (
    <View style={styles.gameRoute}>
      <IndexScreen />
      {shouldShowRotateHint ? <RotateHint /> : null}
    </View>
  );
}

// The game is laid out for portrait. On a phone held sideways the bowl and the footer fall off
// the screen, so the game is covered (not unmounted: progress in a stage is kept) until it is turned back.
// Like the rest of the game it speaks in pictures: a sideways phone, a turn arrow, an upright phone.
function RotateHint() {
  return (
    <View accessibilityLabel={a11yLabel('turn the phone upright')} accessibilityRole="alert" style={styles.rotateHint} testID="rotate-hint">
      <View style={[styles.rotateHintPhone, styles.rotateHintPhoneSideways]}>
        <View style={styles.rotateHintPhoneScreen} />
      </View>
      <NavImageIcon kind="retry" size={40} />
      <View style={styles.rotateHintPhone}>
        <View style={styles.rotateHintPhoneScreen} />
      </View>
    </View>
  );
}

function IndexScreen() {
  const { width, height } = useWindowDimensions();
  const [nav, setNav] = useState<NavState>(() => createInitialNavState(NAV_OPTIONS));
  const navControllerRef = useRef<NavController | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [hasSeenIntro, setHasSeenIntro] = useState(false);
  const [completedStageIds, setCompletedStageIds] = useState<Set<string>>(() => new Set());
  const [completedDentakuStageIds, setCompletedDentakuStageIds] = useState<Set<string>>(() => new Set());
  const [completedLongFormStageIds, setCompletedLongFormStageIds] = useState<Set<string>>(() => new Set());
  const [weakKukuFacts, setWeakKukuFacts] = useState<string[]>([]);

  const screen = nav.screen;
  const selectedIslandId = nav.worldId as WorldId;
  const selectedDentakuWorldId = nav.dentakuWorldId as DentakuWorldId;
  const selectedLongFormWorldId = nav.longFormWorldId as DentakuWorldId;
  const playingStageIndex = nav.stageIndex;
  const playingDentakuStage = DENTAKU_STAGES.find((stage) => stage.id === nav.dentakuStageId) ?? DENTAKU_STAGES[0];
  const playingLongFormStage = LONG_FORM_STAGES.find((stage) => stage.id === nav.longFormStageId) ?? LONG_FORM_STAGES[0];
  const selectedIsland = STAGE_ISLANDS.find((island) => island.id === selectedIslandId) ?? STAGE_ISLANDS[0];
  const selectedStages = useMemo(() => STAGES.filter((stage) => stage.islandId === selectedIslandId), [selectedIslandId]);
  const selectedDentakuStages = useMemo(() => DENTAKU_STAGES.filter((stage) => stage.worldId === selectedDentakuWorldId), [selectedDentakuWorldId]);
  const selectedLongFormStages = useMemo(() => LONG_FORM_STAGES.filter((stage) => stage.worldId === selectedLongFormWorldId), [selectedLongFormWorldId]);
  const mapWidth = Math.max(320, width);

  const navigate = (patch: Partial<NavState>, method: 'push' | 'replace' = 'push') => {
    navControllerRef.current?.navigate(patch, method);
  };
  const goBack = () => {
    navControllerRef.current?.goBack();
  };

  useEffect(() => {
    let isCancelled = false;
    const navController = createNavController({
      historyWindow: getHistoryWindow(),
      options: NAV_OPTIONS,
      initialNav: createInitialNavState(NAV_OPTIONS),
      onChange: setNav,
      isRouteActive: isGameRouteActive,
      stateAtPageLoad: takeHistoryStateAtPageLoad(),
    });
    navControllerRef.current = navController;

    void loadProgress().then((progress) => {
      if (isCancelled) {
        return;
      }

      setHasSeenIntro(progress.hasSeenIntro);
      setCompletedStageIds((current) => new Set([...progress.marumaru, ...current]));
      setCompletedDentakuStageIds((current) => new Set([...progress.dentaku, ...current]));
      setCompletedLongFormStageIds((current) => new Set([...progress.longForm, ...current]));
      setWeakKukuFacts(progress.kukuWeak);
      // Returning players skip the launch demo and start from the mode select.
      navController.start(progress.hasSeenIntro ? 'mode' : 'launch');
      setIsReady(true);
    });

    return () => {
      isCancelled = true;
      navController.dispose();
      navControllerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    saveProgress({
      marumaru: [...completedStageIds],
      dentaku: [...completedDentakuStageIds],
      longForm: [...completedLongFormStageIds],
      kukuWeak: weakKukuFacts,
      hasSeenIntro,
    });
  }, [completedDentakuStageIds, completedLongFormStageIds, completedStageIds, hasSeenIntro, isReady, weakKukuFacts]);

  const completeLaunch = () => {
    setHasSeenIntro(true);
    // Replaces the launch entry, so going back from the mode select leaves the game instead of replaying the demo.
    navControllerRef.current?.setBaseScreen('mode');
    navigate({ screen: 'mode' }, 'replace');
  };

  const startStage = (stage: Stage) => {
    navigate({ screen: 'game', stageIndex: getStageIndexById(stage.id) });
  };

  const startDentakuStage = (stage: DentakuStage) => {
    navigate({ screen: 'dentakuGame', dentakuStageId: stage.id });
  };
  const startLongFormStage = (stage: DentakuStage) => {
    navigate({ screen: 'longFormGame', longFormStageId: stage.id });
  };
  const startNextDentakuStage = () => {
    const currentIndex = selectedDentakuStages.findIndex((stage) => stage.id === playingDentakuStage.id);
    const nextStage = selectedDentakuStages[currentIndex + 1];
    if (nextStage) {
      navigate({ dentakuStageId: nextStage.id }, 'replace');
      return;
    }
    goBack();
  };
  const startNextLongFormStage = () => {
    const currentIndex = selectedLongFormStages.findIndex((stage) => stage.id === playingLongFormStage.id);
    const nextStage = selectedLongFormStages[currentIndex + 1];
    if (nextStage) {
      navigate({ longFormStageId: nextStage.id }, 'replace');
      return;
    }
    goBack();
  };

  if (!isReady) {
    // Saved progress loads within a moment; showing only the water avoids flashing the wrong screen.
    return <SafeAreaView style={styles.screen} />;
  }

  if (screen === 'launch') {
    return <MarumaruGame mode="launch" onComplete={completeLaunch} />;
  }

  if (screen === 'game') {
    return (
      <MarumaruGame
        initialStageIndex={playingStageIndex}
        onBack={goBack}
        onStageClear={(stageId) => {
          setCompletedStageIds((current) => addCompletedStageId(current, stageId));
        }}
      />
    );
  }

  if (screen === 'dentakuGame') {
    return (
      <DentakuGame
        stage={playingDentakuStage}
        weakKukuFacts={weakKukuFacts}
        onKukuFactAnswered={(factId, answer, showsKnowing) => {
          setWeakKukuFacts((current) => noteKukuAnswer(current, factId, answer, showsKnowing));
        }}
        onBack={goBack}
        onNextStage={startNextDentakuStage}
        onStageClear={(stageId) => {
          setCompletedDentakuStageIds((current) => addCompletedStageId(current, stageId));
        }}
      />
    );
  }

  if (screen === 'longFormGame') {
    return (
      <DentakuGame
        stage={playingLongFormStage}
        longFormMode
        onBack={goBack}
        onNextStage={startNextLongFormStage}
        onStageClear={(stageId) => {
          setCompletedLongFormStageIds((current) => addCompletedStageId(current, stageId));
        }}
      />
    );
  }

  if (screen === 'stage') {
    return (
      <StageSelect
        island={selectedIsland}
        stages={selectedStages}
        completedStageIds={completedStageIds}
        mapWidth={mapWidth}
        viewportWidth={width}
        viewportHeight={height}
        onBack={goBack}
        onStartStage={startStage}
      />
    );
  }

  if (screen === 'dentakuStage') {
    return (
      <DentakuStageSelect
        stages={selectedDentakuStages}
        completedStageIds={completedDentakuStageIds}
        mapWidth={mapWidth}
        viewportWidth={width}
        viewportHeight={height}
        onBack={goBack}
        onStartStage={startDentakuStage}
      />
    );
  }

  if (screen === 'longFormStage') {
    return (
      <DentakuStageSelect
        stages={selectedLongFormStages}
        completedStageIds={completedLongFormStageIds}
        mapWidth={mapWidth}
        viewportWidth={width}
        viewportHeight={height}
        onBack={goBack}
        onStartStage={startLongFormStage}
      />
    );
  }

  if (screen === 'dentakuWorld') {
    return (
      <DentakuWorldSelect
        completedStageIds={completedDentakuStageIds}
        mapWidth={mapWidth}
        viewportWidth={width}
        viewportHeight={height}
        onBack={goBack}
        onSelectWorld={(worldId) => {
          navigate({ screen: 'dentakuStage', dentakuWorldId: worldId });
        }}
      />
    );
  }

  if (screen === 'longFormWorld') {
    return (
      <DentakuWorldSelect
        completedStageIds={completedLongFormStageIds}
        stagesForProgress={LONG_FORM_STAGES}
        worlds={LONG_FORM_WORLDS}
        mapWidth={mapWidth}
        viewportWidth={width}
        viewportHeight={height}
        onBack={goBack}
        onSelectWorld={(worldId) => {
          navigate({ screen: 'longFormStage', longFormWorldId: worldId });
        }}
      />
    );
  }

  if (screen === 'mode') {
    return (
      <ModeSelect
        mapWidth={mapWidth}
        viewportWidth={width}
        viewportHeight={height}
        onSelectMarumaru={() => navigate({ screen: 'world' })}
        onSelectDentaku={() => navigate({ screen: 'dentakuWorld' })}
        onSelectLongForm={() => navigate({ screen: 'longFormWorld' })}
      />
    );
  }

  return (
    <WorldSelect
      completedStageIds={completedStageIds}
      mapWidth={mapWidth}
      viewportWidth={width}
      viewportHeight={height}
      onBack={goBack}
      onSelectWorld={(worldId) => {
        navigate({ screen: 'stage', worldId });
      }}
    />
  );
}
