import { StyleSheet, Text, View } from 'react-native';

const TEXT_BASE_COLOR = '#12334A';
const LATIN_FONT_FAMILY = 'Helvetica';

type BrandLogoProps = {
  size?: 'small' | 'medium' | 'large';
};

export function BrandLogo({ size = 'small' }: BrandLogoProps) {
  const isLarge = size === 'large';
  const isMedium = size === 'medium';
  const circleSize = isLarge ? 72 : isMedium ? 40 : 32;
  const borderWidth = isLarge ? 4 : 3;

  return (
    <View style={[styles.logo, isLarge && styles.logoLarge]}>
      <View style={[styles.circle, { width: circleSize, height: circleSize, borderRadius: circleSize / 2, borderWidth }]}>
        <View style={[styles.circleInnerGlass, { borderRadius: circleSize / 2 }]} />
        <View style={[styles.circleShine, { width: circleSize * 0.34, height: circleSize * 0.34, borderRadius: circleSize * 0.17 }]} />
      </View>
      <View style={[styles.circle, { width: circleSize, height: circleSize, borderRadius: circleSize / 2, borderWidth }]}>
        <View style={[styles.circleInnerGlass, { borderRadius: circleSize / 2 }]} />
        <View style={[styles.circleShine, { width: circleSize * 0.34, height: circleSize * 0.34, borderRadius: circleSize * 0.17 }]} />
      </View>
      <Text style={[styles.word, isMedium && styles.wordMedium, isLarge && styles.wordLarge]}>calc.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  logo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  logoLarge: {
    gap: 10,
  },
  circle: {
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: 'rgba(253, 230, 138, 0.34)',
    borderColor: '#CFA83A',
    shadowColor: '#0284C7',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
  },
  circleInnerGlass: {
    position: 'absolute',
    left: 4,
    right: 4,
    top: 4,
    bottom: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.44)',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  circleShine: {
    marginLeft: '16%',
    marginTop: '14%',
    backgroundColor: '#FFF7C7',
    opacity: 0.82,
  },
  word: {
    color: TEXT_BASE_COLOR,
    fontSize: 26,
    lineHeight: 31,
    fontWeight: '900',
    letterSpacing: 0,
    fontFamily: LATIN_FONT_FAMILY,
  },
  wordMedium: {
    fontSize: 34,
    lineHeight: 40,
  },
  wordLarge: {
    fontSize: 64,
    lineHeight: 72,
  },
});
