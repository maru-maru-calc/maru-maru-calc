import { StyleSheet, Text, View } from 'react-native';

import { NumberObjectStrip } from '@/components/NumberObjectStrip';
import { getCopy } from '@/data/copy';
import { TextMode } from '@/store/settingsStore';

type TargetDisplayProps = {
  value: number;
  moveCount: number;
  textMode: TextMode;
  accessibleMode?: boolean;
};

export function TargetDisplay({ value, moveCount, textMode, accessibleMode }: TargetDisplayProps) {
  return (
    <View style={styles.container}>
      <View style={styles.textGroup}>
        <Text style={styles.label}>{getCopy('target', textMode)}</Text>
        <Text style={styles.value}>{value}</Text>
      </View>
      <NumberObjectStrip
        value={value}
        groupId="target"
        accessibleLabel={`${value}の目標おはじき`}
        accessibleMode={accessibleMode}
        gap={5}
        minHeight={44}
      />
      <View style={styles.textGroup}>
        <Text style={styles.label}>{getCopy('moveCount', textMode)}</Text>
        <Text style={styles.value}>{moveCount}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderColor: '#e0d2bb',
    borderWidth: 1,
  },
  textGroup: {
    alignItems: 'center',
    minWidth: 48,
  },
  label: {
    color: '#746852',
    fontSize: 12,
    fontWeight: '800',
  },
  value: {
    color: '#25201a',
    fontSize: 22,
    fontWeight: '800',
  },
});
