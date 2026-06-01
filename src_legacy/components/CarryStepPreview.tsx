import { StyleSheet, Text, View } from 'react-native';

import { NumberObjectView } from '@/components/NumberObjectView';
import { CarryStep } from '@/domain/math/types';
import { getCarryStepRenderModel } from '@/rendering/carry';

type CarryStepPreviewProps = {
  step: CarryStep;
};

export function CarryStepPreview({ step }: CarryStepPreviewProps) {
  const model = getCarryStepRenderModel(step);

  return (
    <View style={styles.container}>
      <View style={styles.sourceDigits}>
        {model.sourceDigits.map((digit, index) => (
          <NumberObjectView key={`${digit}-${index}`} value={digit} scale={0.34} />
        ))}
      </View>
      <Text style={styles.arrow}>→</Text>
      <NumberObjectView value={model.targetDigit} scale={0.54} />
      {model.remainderDigits.length > 0 ? (
        <View style={styles.remainder}>
          <Text style={styles.plus}>+</Text>
          {model.remainderDigits.map((digit, index) => (
            <NumberObjectView key={`remainder-${digit}-${index}`} value={digit} scale={0.34} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.58)',
  },
  sourceDigits: {
    width: 70,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 1,
  },
  arrow: {
    color: '#746852',
    fontSize: 16,
    fontWeight: '800',
  },
  remainder: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  plus: {
    color: '#746852',
    fontSize: 12,
    fontWeight: '800',
  },
});
