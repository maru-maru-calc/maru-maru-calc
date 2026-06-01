import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { StageTargetSummary } from '@/components/StageTargetSummary';
import { getCopy } from '@/data/copy';
import { getStageDescription, getStageTitle } from '@/domain/stage/copy';
import { StageProgressItem } from '@/domain/stage/progress';
import { TextMode } from '@/store/settingsStore';

type StageListItemProps = {
  item: StageProgressItem;
  textMode: TextMode;
  accessibleMode?: boolean;
};

export function StageListItem({ item, textMode, accessibleMode }: StageListItemProps) {
  const { stage, completed, current, recommended } = item;
  const actionLabel = current ? getCopy('continue', textMode) : completed ? getCopy('replay', textMode) : getCopy('play', textMode);

  return (
    <View style={[styles.stageItem, recommended ? styles.recommendedStageItem : null]}>
      <View style={styles.stageTextGroup}>
        <Text style={styles.stageTitle}>
          {getStageTitle(stage, textMode)}
          {completed ? ` ${getCopy('clearedMarker', textMode)}` : ''}
          {current ? ` ${getCopy('continueMarker', textMode)}` : ''}
          {recommended && !current ? ` ${getCopy('recommendedMarker', textMode)}` : ''}
        </Text>
        <Text style={styles.stageDescription}>{getStageDescription(stage, textMode)}</Text>
        <StageTargetSummary value={stage.targetValue} textMode={textMode} accessibleMode={accessibleMode} />
      </View>
      <AppButton label={actionLabel} onPress={() => router.push(`/play/${stage.id}`)} />
    </View>
  );
}

const styles = StyleSheet.create({
  stageItem: {
    gap: 10,
    padding: 14,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderColor: '#e0d2bb',
    borderWidth: 1,
  },
  recommendedStageItem: {
    borderColor: '#f0b451',
    backgroundColor: '#fffaf0',
  },
  stageTextGroup: {
    gap: 4,
  },
  stageTitle: {
    color: '#25201a',
    fontSize: 18,
    fontWeight: '800',
  },
  stageDescription: {
    color: '#746852',
    fontSize: 14,
    fontWeight: '600',
  },
});
