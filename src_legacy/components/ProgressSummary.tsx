import { StyleSheet, Text, View } from 'react-native';

import { getCopy } from '@/data/copy';
import { StageProgressSummary as StageProgressSummaryValue } from '@/domain/stage/progress';
import { TextMode } from '@/store/settingsStore';

type ProgressSummaryProps = {
  summary: StageProgressSummaryValue;
  textMode: TextMode;
};

export function ProgressSummary({ summary, textMode }: ProgressSummaryProps) {
  const label =
    summary.allCompleted
      ? getCopy('allMvpCleared', textMode)
      : textMode === 'hiragana'
      ? `${summary.completedCount} / ${summary.totalCount} くりあ`
      : `${summary.completedCount} / ${summary.totalCount} クリア`;

  return (
    <View style={[styles.container, summary.allCompleted ? styles.completed : null]}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.dots}>
        {Array.from({ length: summary.totalCount }).map((_, index) => (
          <View
            key={index}
            style={[styles.dot, index < summary.completedCount ? styles.completedDot : null]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
    borderColor: '#e0d2bb',
    borderWidth: 1,
  },
  label: {
    color: '#746852',
    fontSize: 14,
    fontWeight: '800',
  },
  completed: {
    backgroundColor: '#ecf7f1',
    borderColor: '#9dcdbb',
  },
  dots: {
    flexDirection: 'row',
    gap: 5,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 8,
    backgroundColor: '#d7c7ad',
  },
  completedDot: {
    backgroundColor: '#256f5d',
  },
});
