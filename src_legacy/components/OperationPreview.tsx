import { StyleSheet, Text, View } from 'react-native';

import { CarryStepPreview } from '@/components/CarryStepPreview';
import { NumberObjectStrip } from '@/components/NumberObjectStrip';
import { getCopy } from '@/data/copy';
import { AddOperationPreview } from '@/domain/game/selectors';
import { TextMode } from '@/store/settingsStore';

type OperationPreviewProps = {
  preview: AddOperationPreview;
  textMode: TextMode;
  guidance?: string;
};

export function OperationPreview({ preview, textMode, guidance }: OperationPreviewProps) {
  if (!preview.ok) {
    return null;
  }

  return (
    <View style={[styles.preview, preview.hasCarry ? styles.carryPreview : null]}>
      <Text style={styles.expression}>{preview.expression}</Text>
      {guidance ? <Text style={styles.guidance}>{guidance}</Text> : null}
      <View style={styles.sourceRow}>
        <NumberObjectStrip
          value={preview.leftValue}
          groupId={`preview-left-${preview.leftValue}`}
          accessibleLabel={`${preview.leftValue}の左のおはじき`}
          scale={0.42}
          gap={2}
          minHeight={26}
        />
        <Text style={styles.sourcePlus}>＋</Text>
        <NumberObjectStrip
          value={preview.rightValue}
          groupId={`preview-right-${preview.rightValue}`}
          accessibleLabel={`${preview.rightValue}の右のおはじき`}
          scale={0.42}
          gap={2}
          minHeight={26}
        />
      </View>
      <Text style={styles.arrow}>↓</Text>
      <NumberObjectStrip
        value={preview.resultValue}
        groupId={`preview-${preview.resultValue}`}
        accessibleLabel={`${preview.resultValue}の結果おはじき`}
        scale={0.72}
        gap={3}
        minHeight={40}
      />
      {preview.hasCarry ? <Text style={styles.note}>{getCopy('carryPreview', textMode)}</Text> : null}
      {preview.carrySteps.length > 0 ? (
        <View style={styles.carrySteps}>
          {preview.carrySteps.map((step) => (
            <CarryStepPreview key={`${step.fromDigit}-${step.toDigit}`} step={step} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  preview: {
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
    borderColor: '#e0d2bb',
    borderWidth: 1,
  },
  carryPreview: {
    backgroundColor: '#fff4df',
    borderColor: '#f0b451',
  },
  expression: {
    color: '#25201a',
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  sourcePlus: {
    color: '#256f5d',
    fontSize: 16,
    fontWeight: '800',
  },
  arrow: {
    color: '#746852',
    fontSize: 13,
    fontWeight: '800',
    marginTop: -2,
  },
  note: {
    color: '#b15c00',
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
  },
  guidance: {
    color: '#256f5d',
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
  },
  carrySteps: {
    gap: 5,
  },
});
