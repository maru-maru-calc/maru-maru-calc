import { StyleSheet, Text, View } from 'react-native';

type NavImageIconKind = 'back' | 'next' | 'retry';

const TEXT_BASE_COLOR = '#12334A';

export function NavImageIcon({ kind, size }: { kind: NavImageIconKind; size: number }) {
  if (kind === 'retry') {
    return <RetryIcon size={size} />;
  }

  return <ArrowIcon direction={kind === 'back' ? -1 : 1} size={size} />;
}

function ArrowIcon({ direction, size }: { direction: -1 | 1; size: number }) {
  const stroke = Math.max(4, Math.round(size * 0.14));
  const shaftWidth = Math.round(size * 0.58);
  const head = Math.round(size * 0.38);
  const center = size / 2;

  return (
    <View pointerEvents="none" testID={direction < 0 ? 'nav-icon-back' : 'nav-icon-next'} style={{ width: size, height: size }}>
      <View
        style={[
          styles.navStroke,
          {
            width: shaftWidth,
            height: stroke,
            borderRadius: stroke / 2,
            left: (size - shaftWidth) / 2,
            top: center - stroke / 2,
          },
        ]}
      />
      <View
        style={[
          styles.arrowHead,
          {
            width: head,
            height: head,
            borderLeftWidth: stroke,
            borderTopWidth: stroke,
            borderRadius: Math.max(1, Math.round(stroke * 0.38)),
            left: direction < 0 ? size * 0.18 : size * 0.44,
            top: center - head / 2,
            transform: [{ rotate: direction < 0 ? '-45deg' : '135deg' }],
          },
        ]}
      />
    </View>
  );
}

function RetryIcon({ size }: { size: number }) {
  return (
    <View pointerEvents="none" testID="nav-icon-retry" style={{ width: size, height: size }}>
      <Text
        style={[
          styles.retryGlyph,
          {
            fontSize: Math.round(size * 1.18),
            lineHeight: Math.round(size * 1.08),
            width: size,
            height: size,
            transform: [{ translateY: -Math.round(size * 0.04) }],
          },
        ]}
      >
        ↻
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  navStroke: {
    position: 'absolute',
    backgroundColor: TEXT_BASE_COLOR,
  },
  arrowHead: {
    position: 'absolute',
    borderColor: TEXT_BASE_COLOR,
  },
  retryGlyph: {
    color: TEXT_BASE_COLOR,
    fontFamily: 'Helvetica',
    fontWeight: '900',
    textAlign: 'center',
    includeFontPadding: false,
  },
});
