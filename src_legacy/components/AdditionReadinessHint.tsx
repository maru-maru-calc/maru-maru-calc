import { StyleSheet, Text } from 'react-native';

import { getCopy } from '@/data/copy';
import { AdditionReadiness } from '@/domain/math/types';
import { TextMode } from '@/store/settingsStore';

type AdditionReadinessHintProps = {
  readiness: AdditionReadiness;
  textMode: TextMode;
};

export function AdditionReadinessHint({ readiness, textMode }: AdditionReadinessHintProps) {
  if (readiness.state === 'none' || !readiness.digit) {
    return null;
  }

  if (readiness.state === 'ready') {
    return <Text style={styles.ready}>{getCopy('tenReady', textMode)}</Text>;
  }

  return (
    <Text style={styles.near}>
      {readiness.digit}
      {getCopy('marblesCount', textMode)}
      {readiness.count}
      {getCopy('moreToTen', textMode)}
      {readiness.remainingToCarry}こで10
    </Text>
  );
}

const styles = StyleSheet.create({
  ready: {
    color: '#256f5d',
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
  },
  near: {
    color: '#b15c00',
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
  },
});
