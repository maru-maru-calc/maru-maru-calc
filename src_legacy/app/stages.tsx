import { StyleSheet, Text } from 'react-native';

import { ProgressSummary } from '@/components/ProgressSummary';
import { ScreenShell } from '@/components/ScreenShell';
import { StageListItem } from '@/components/StageListItem';
import { getCopy } from '@/data/copy';
import { initialStages } from '@/data/stages';
import { getStageProgressItems, getStageProgressSections, getStageProgressSummary } from '@/domain/stage/progress';
import { useProgressStore } from '@/store/progressStore';
import { useSettingsStore } from '@/store/settingsStore';

export default function StageSelectScreen() {
  const completedStageIds = useProgressStore((state) => state.completedStageIds);
  const lastPlayedStageId = useProgressStore((state) => state.lastPlayedStageId);
  const textMode = useSettingsStore((state) => state.textMode);
  const accessibleMode = useSettingsStore((state) => state.accessibleMode);
  const stageProgressItems = getStageProgressItems(initialStages, completedStageIds, lastPlayedStageId);
  const stageProgressSections = getStageProgressSections(stageProgressItems);
  const mvpStages = initialStages.filter((stage) => stage.kind === 'mvp');
  const mvpSummary = getStageProgressSummary(mvpStages, completedStageIds);
  const showPracticeStages =
    mvpSummary.allCompleted || stageProgressSections.practice.some((item) => item.completed || item.current);

  return (
    <ScreenShell title={getCopy('stageSelect', textMode)} backTo="/" backLabel={getCopy('back', textMode)}>
      <ProgressSummary summary={mvpSummary} textMode={textMode} />
      <Text style={styles.sectionTitle}>{getCopy('mvpStages', textMode)}</Text>
      {stageProgressSections.mvp.map((item) => (
        <StageListItem key={item.stage.id} item={item} textMode={textMode} accessibleMode={accessibleMode} />
      ))}
      {showPracticeStages ? (
        <Text style={styles.sectionTitle}>{getCopy('practiceStages', textMode)}</Text>
      ) : null}
      {showPracticeStages
        ? stageProgressSections.practice.map((item) => (
            <StageListItem key={item.stage.id} item={item} textMode={textMode} accessibleMode={accessibleMode} />
          ))
        : null}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    color: '#746852',
    fontSize: 15,
    fontWeight: '800',
    marginTop: 4,
  },
});
