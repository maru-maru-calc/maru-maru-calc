import { Canvas, Circle, RadialGradient, vec } from '@shopify/react-native-skia';
import { Platform, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { DigitValue } from '@/domain/math/types';
import { getAccessibilityTexture } from '@/rendering/accessibilityTexture';
import { getMarbleRenderSpec } from '@/rendering/marbles';

type NumberObjectViewProps = {
  value: DigitValue;
  accessibleMode?: boolean;
  scale?: number;
  sizeOverride?: number;
};

export function NumberObjectView({ value, accessibleMode = false, scale = 1, sizeOverride }: NumberObjectViewProps) {
  const { width } = useWindowDimensions();
  const spec = sizeOverride ? getMarbleRenderSpec(value, undefined, 1) : getMarbleRenderSpec(value, width, scale);
  const size = sizeOverride ?? spec.size;

  return (
    <View
      accessibilityLabel={`${value}のおはじき`}
      style={[
        styles.marbleFrame,
        {
          width: size,
          height: size,
          borderRadius: size,
        },
      ]}
    >
      {Platform.OS === 'web' ? (
        <View
          style={[
            styles.webMarble,
            {
              width: size,
              height: size,
              borderRadius: size,
              backgroundColor: spec.color,
            },
          ]}
        />
      ) : (
        <SkiaMarble color={spec.color} size={size} />
      )}
      {accessibleMode ? <Texture value={value} /> : null}
      <Text style={[styles.label, accessibleMode ? styles.accessibleLabel : null]}>{spec.label}</Text>
    </View>
  );
}

function SkiaMarble({ color, size }: { color: string; size: number }) {
  const center = size / 2;
  const radius = size * 0.46;
  const glowRadius = size * 0.58;
  const darkColor = withOpacity(color, 'd9');
  const softColor = withOpacity(color, '72');

  return (
    <Canvas pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Circle cx={center} cy={center + size * 0.08} r={radius} color="rgba(0, 0, 0, 0.12)" />
      <Circle cx={center} cy={center} r={radius}>
        <RadialGradient
          c={vec(size * 0.36, size * 0.3)}
          r={glowRadius}
          colors={['rgba(255,255,255,0.86)', softColor, darkColor]}
          positions={[0, 0.5, 1]}
        />
      </Circle>
      <Circle
        cx={center}
        cy={center}
        r={radius - 1}
        color="rgba(255, 255, 255, 0.64)"
        style="stroke"
        strokeWidth={2}
      />
      <Circle cx={size * 0.38} cy={size * 0.31} r={size * 0.13} color="rgba(255, 255, 255, 0.58)" />
      <Circle cx={size * 0.63} cy={size * 0.7} r={size * 0.08} color="rgba(255, 255, 255, 0.2)" />
    </Canvas>
  );
}

function Texture({ value }: { value: DigitValue }) {
  const texture = getAccessibilityTexture(value);

  if (texture === 'plain') {
    return null;
  }

  if (texture === 'stripes') {
    return (
      <View style={styles.stripes}>
        <View style={styles.stripe} />
        <View style={styles.stripe} />
      </View>
    );
  }

  return (
    <View style={styles.dots}>
      <View style={styles.textureDot} />
      <View style={styles.textureDot} />
      <View style={styles.textureDot} />
    </View>
  );
}

function withOpacity(hexColor: string, alpha: string) {
  return `${hexColor}${alpha}`;
}

const styles = StyleSheet.create({
  marbleFrame: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
    borderColor: 'rgba(255, 255, 255, 0.72)',
    shadowColor: '#000000',
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  webMarble: {
    position: 'absolute',
    borderColor: 'rgba(255, 255, 255, 0.72)',
    borderWidth: 2,
    boxShadow: 'inset 7px 7px 10px rgba(255,255,255,0.42), inset -8px -8px 12px rgba(0,0,0,0.12)',
  },
  label: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
    textShadowColor: 'rgba(0, 0, 0, 0.24)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  accessibleLabel: {
    color: '#ffffff',
    fontSize: 12,
  },
  stripes: {
    position: 'absolute',
    width: '70%',
    gap: 6,
  },
  stripe: {
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.62)',
  },
  dots: {
    position: 'absolute',
    flexDirection: 'row',
    gap: 4,
  },
  textureDot: {
    width: 6,
    height: 6,
    borderRadius: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.64)',
  },
});
