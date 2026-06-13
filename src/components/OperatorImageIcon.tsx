import { StyleSheet, View } from 'react-native';

type OperatorImageIconKind = '+' | '-' | '×' | '÷';

export function OperatorImageIcon({ operator, size = 26 }: { operator: OperatorImageIconKind; size?: number }) {
  const stroke = Math.max(4, Math.round(size * 0.18));
  const lineLength = Math.round(size * 0.74);
  const dotSize = Math.max(4, Math.round(size * 0.16));

  return (
    <View pointerEvents="none" style={{ width: size, height: size }}>
      {operator === '+' ? (
        <>
          <View style={[styles.operatorStroke, { width: lineLength, height: stroke, borderRadius: stroke / 2, left: (size - lineLength) / 2, top: (size - stroke) / 2 }]} />
          <View style={[styles.operatorStroke, { width: stroke, height: lineLength, borderRadius: stroke / 2, left: (size - stroke) / 2, top: (size - lineLength) / 2 }]} />
        </>
      ) : null}
      {operator === '-' ? (
        <View style={[styles.operatorStroke, { width: lineLength, height: stroke, borderRadius: stroke / 2, left: (size - lineLength) / 2, top: (size - stroke) / 2 }]} />
      ) : null}
      {operator === '×' ? (
        <>
          <View style={[styles.operatorStroke, styles.operatorRotateRight, { width: lineLength, height: stroke, borderRadius: stroke / 2, left: (size - lineLength) / 2, top: (size - stroke) / 2 }]} />
          <View style={[styles.operatorStroke, styles.operatorRotateLeft, { width: lineLength, height: stroke, borderRadius: stroke / 2, left: (size - lineLength) / 2, top: (size - stroke) / 2 }]} />
        </>
      ) : null}
      {operator === '÷' ? (
        <>
          <View style={[styles.operatorDot, { width: dotSize, height: dotSize, borderRadius: dotSize / 2, left: (size - dotSize) / 2, top: Math.round(size * 0.12) }]} />
          <View style={[styles.operatorStroke, { width: lineLength, height: stroke, borderRadius: stroke / 2, left: (size - lineLength) / 2, top: (size - stroke) / 2 }]} />
          <View style={[styles.operatorDot, { width: dotSize, height: dotSize, borderRadius: dotSize / 2, left: (size - dotSize) / 2, bottom: Math.round(size * 0.12) }]} />
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  operatorStroke: {
    position: 'absolute',
    backgroundColor: '#38BDF8',
  },
  operatorDot: {
    position: 'absolute',
    backgroundColor: '#38BDF8',
  },
  operatorRotateRight: {
    transform: [{ rotate: '45deg' }],
  },
  operatorRotateLeft: {
    transform: [{ rotate: '-45deg' }],
  },
});
