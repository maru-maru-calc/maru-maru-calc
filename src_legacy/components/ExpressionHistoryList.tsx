import { StyleSheet, Text, View } from 'react-native';

import { getCopy } from '@/data/copy';
import { TextMode } from '@/store/settingsStore';

type ExpressionHistoryListProps = {
  expressions: string[];
  textMode: TextMode;
  compact?: boolean;
};

export function ExpressionHistoryList({ expressions, textMode, compact = false }: ExpressionHistoryListProps) {
  if (expressions.length === 0) {
    return null;
  }

  if (compact && expressions.length === 1) {
    return <Text style={styles.compactExpression}>{expressions[0]}</Text>;
  }

  return (
    <View style={[styles.history, compact ? styles.compactHistory : null]}>
      <Text style={styles.historyTitle}>{getCopy('expressionHistory', textMode)}</Text>
      {expressions.map((expression, index) => (
        <Text key={`${expression}-${index}`} style={styles.historyItem}>
          {index + 1}. {expression}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  compactExpression: {
    color: '#25201a',
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  history: {
    alignSelf: 'stretch',
    gap: 4,
    padding: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.68)',
  },
  compactHistory: {
    backgroundColor: 'rgba(255, 255, 255, 0.56)',
  },
  historyTitle: {
    color: '#746852',
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
  },
  historyItem: {
    color: '#25201a',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
});
