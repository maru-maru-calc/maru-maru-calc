import { StyleSheet, Text, View } from 'react-native';

import { NumberObjectStrip } from '@/components/NumberObjectStrip';
import { getCopy } from '@/data/copy';
import { TextMode } from '@/store/settingsStore';

type StageTargetSummaryProps = {
  value: number;
  textMode: TextMode;
  accessibleMode?: boolean;
};

export function StageTargetSummary({ value, textMode, accessibleMode }: StageTargetSummaryProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        {getCopy('target', textMode)}: {value}
      </Text>
      <NumberObjectStrip
        value={value}
        groupId={`stage-target-${value}`}
        accessibleLabel={`${value}の目標おはじき`}
        accessibleMode={accessibleMode}
        scale={0.7}
        gap={2}
        minHeight={34}
        centered={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  label: {
    color: '#256f5d',
    fontSize: 14,
    fontWeight: '800',
  },
});
