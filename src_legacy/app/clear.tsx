import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { ScreenShell } from '@/components/ScreenShell';
import { getCopy } from '@/data/copy';
import { findNextStageId, findStageById } from '@/data/stages';
import { toDisplayExpression } from '@/domain/math/expression';
import { useGameStore } from '@/store/gameStore';
import { useSettingsStore } from '@/store/settingsStore';

export default function ClearScreen() {
  const { stageId } = useLocalSearchParams<{ stageId?: string }>();
  const stage = findStageById(stageId);
  const nextStageId = findNextStageId(stageId);
  const moveCount = useGameStore((state) => state.moveCount);
  const latestExpression = useGameStore((state) => state.history.at(-1)?.expressionNode);
  const textMode = useSettingsStore((state) => state.textMode);

  return (
    <ScreenShell title={getCopy('done', textMode)}>
      <Text style={styles.star}>★</Text>
      <Text style={styles.message}>{stage ? `${stage.title} をクリアしました。` : 'ステージをクリアしました。'}</Text>
      <Text style={styles.message}>
        {getCopy('moveCount', textMode)}: {moveCount}
      </Text>
      {latestExpression ? <Text style={styles.expression}>{toDisplayExpression(latestExpression)}</Text> : null}
      {nextStageId ? (
        <AppButton label={getCopy('next', textMode)} onPress={() => router.replace(`/play/${nextStageId}`)} />
      ) : (
        <AppButton label={getCopy('stageSelectTo', textMode)} onPress={() => router.replace('/stages')} />
      )}
      {stage ? (
        <AppButton label={getCopy('retry', textMode)} variant="secondary" onPress={() => router.replace(`/play/${stage.id}`)} />
      ) : null}
      <AppButton label={getCopy('title', textMode)} variant="secondary" onPress={() => router.replace('/')} />
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  star: {
    color: '#f1a638',
    fontSize: 48,
    fontWeight: '800',
    textAlign: 'center',
  },
  message: {
    color: '#746852',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  expression: {
    color: '#25201a',
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
});
