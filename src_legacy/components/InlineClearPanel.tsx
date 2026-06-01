import { StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { ExpressionHistoryList } from '@/components/ExpressionHistoryList';
import { getCopy } from '@/data/copy';
import { ClearBadge, getClearBadges } from '@/domain/game/clearBadges';
import { TextMode } from '@/store/settingsStore';

type InlineClearPanelProps = {
  moveCount: number;
  resetCount: number;
  minimumMoveCount?: number;
  expression?: string;
  expressionHistory?: string[];
  hasNextStage: boolean;
  nextStageKind?: 'mvp' | 'practice';
  textMode: TextMode;
  onNextStage: () => void;
  onRetry: () => void;
  onStageSelect: () => void;
};

export function InlineClearPanel({
  moveCount,
  resetCount,
  minimumMoveCount,
  expression,
  expressionHistory = [],
  hasNextStage,
  nextStageKind,
  textMode,
  onNextStage,
  onRetry,
  onStageSelect,
}: InlineClearPanelProps) {
  const badges = getClearBadges({ moveCount, resetCount, minimumMoveCount });

  return (
    <View style={styles.panel}>
      <Text style={styles.star}>★</Text>
      <Text style={styles.title}>{getCopy('done', textMode)}</Text>
      <Text style={styles.message}>
        {getCopy('moveCount', textMode)}: {moveCount}
        {minimumMoveCount !== undefined ? ` / ${minimumMoveCount}` : ''}
      </Text>
      <Text style={styles.subMessage}>
        {resetCount === 0
          ? getCopy('noResetClear', textMode)
          : `${getCopy('resetCount', textMode)}: ${resetCount}`}
      </Text>
      {badges.length > 0 ? (
        <View style={styles.badges}>
          {badges.map((badge) => (
            <Text key={badge} style={styles.badge}>
              {getBadgeLabel(badge, textMode)}
            </Text>
          ))}
        </View>
      ) : null}
      {expressionHistory.length > 1 ? (
        <ExpressionHistoryList expressions={expressionHistory} textMode={textMode} />
      ) : expression ? (
        <ExpressionHistoryList expressions={[expression]} textMode={textMode} compact />
      ) : null}
      <View style={styles.actions}>
        {hasNextStage ? (
          <AppButton
            label={getCopy(nextStageKind === 'practice' ? 'nextPractice' : 'next', textMode)}
            onPress={onNextStage}
          />
        ) : (
          <AppButton label={getCopy('stageSelectTo', textMode)} onPress={onStageSelect} />
        )}
        <AppButton label={getCopy('retry', textMode)} variant="secondary" onPress={onRetry} />
        {hasNextStage ? (
          <AppButton label={getCopy('stageSelectTo', textMode)} variant="secondary" onPress={onStageSelect} />
        ) : null}
      </View>
    </View>
  );
}

function getBadgeLabel(badge: ClearBadge, textMode: TextMode) {
  if (badge === 'fewestMoves') {
    return getCopy('fewestMovesBadge', textMode);
  }

  return getCopy('noResetBadge', textMode);
}

const styles = StyleSheet.create({
  panel: {
    alignItems: 'center',
    gap: 6,
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 250, 241, 0.84)',
    borderColor: '#f1d59f',
    borderWidth: 1,
  },
  star: {
    color: '#f1a638',
    fontSize: 34,
    fontWeight: '800',
    lineHeight: 36,
  },
  title: {
    color: '#256f5d',
    fontSize: 22,
    fontWeight: '800',
  },
  message: {
    color: '#746852',
    fontSize: 15,
    fontWeight: '700',
  },
  subMessage: {
    color: '#256f5d',
    fontSize: 13,
    fontWeight: '800',
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
  },
  badge: {
    overflow: 'hidden',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: '#ecf7f1',
    color: '#256f5d',
    fontSize: 12,
    fontWeight: '800',
  },
  actions: {
    alignSelf: 'stretch',
    gap: 8,
    marginTop: 4,
  },
});
