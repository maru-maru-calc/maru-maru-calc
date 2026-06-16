import { createElement } from 'react';
import { Redirect, useRouter } from 'expo-router';
import { Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandLogo } from '@/components/BrandLogo';

const TEXT_BASE_COLOR = '#12334A';
const TEXT_ACCENT_COLOR = '#0284C7';
const WATER_COLOR = '#C6E8F4';
const LATIN_FONT_FAMILY = 'Helvetica';
const PLAYFUL_FONT_FAMILY = 'Noto Sans Japanese';
const GRID = 8;
const SECTION_CONTENT_WIDTH = GRID * 123;
const RADIUS_XL = 24;
const RADIUS_PILL = 999;
const DESKTOP_MIN_WIDTH = 900;
const COPYRIGHT_TEXT = '© 2026 nozomitaguchi';
const BASE_PATH = __DEV__ ? '' : process.env.EXPO_BASE_URL ?? '';

export default function PlayPage() {
  const { width } = useWindowDimensions();
  const router = useRouter();
  const shouldUsePhoneFrame = Platform.OS === 'web' && width >= DESKTOP_MIN_WIDTH;
  const openLanding = () => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const frame = document.querySelector('[data-testid="play-frame"]') as HTMLIFrameElement | null;
      frame?.contentWindow?.postMessage({ type: 'marumaru:pause-bgm' }, window.location.origin);
      window.setTimeout(() => router.push('/'), 50);
      return;
    }
    router.push('/');
  };

  if (!shouldUsePhoneFrame) {
    return <Redirect href="/game" />;
  }

  return (
    <SafeAreaView style={styles.page} testID="play-page">
      <View pointerEvents="none" style={styles.background}>
        <FloatingBubble size={118} left="5%" top="12%" opacity={0.28} />
        <FloatingBubble size={58} left="80%" top="18%" opacity={0.34} />
        <FloatingBubble size={28} left="30%" top="10%" opacity={0.32} />
        <FloatingBubble size={148} left="88%" top="36%" opacity={0.16} />
        <FloatingBubble size={46} left="45%" top="82%" opacity={0.3} />
        <FloatingBubble size={34} left="16%" top="76%" opacity={0.36} />
        <FloatingBubble size={86} left="68%" top="70%" opacity={0.22} />
        <PlayClownfish style={styles.backgroundClownfish} testID="play-background-fish-clownfish" />
        <PlayBlueTang style={styles.backgroundBlueTang} testID="play-background-fish-blue-tang" />
        <PlayPuffer style={styles.backgroundPuffer} testID="play-background-fish-puffer" />
      </View>

      <View style={styles.header}>
        <View>
          <Pressable accessibilityLabel="maru maru calc logo" accessibilityRole="link" onPress={openLanding} style={({ pressed }) => pressed && styles.pressedLogo}>
            <BrandLogo />
          </Pressable>
        </View>
      </View>

      <View style={styles.phoneShell}>
        <View style={styles.phoneSpeaker} />
        <View style={styles.phoneViewport}>
          {createElement('iframe', {
            src: `${BASE_PATH}/game`,
            title: 'maru maru calc playable web app',
            'data-testid': 'play-frame',
            style: {
              width: '100%',
              height: '100%',
              border: '0',
              borderRadius: 24,
              backgroundColor: WATER_COLOR,
            },
          })}
        </View>
      </View>
      <Text style={styles.copyright}>{COPYRIGHT_TEXT}</Text>
    </SafeAreaView>
  );
}

function FloatingBubble({ size, left, top, opacity }: { size: number; left: `${number}%`; top: `${number}%`; opacity: number }) {
  return (
    <View style={[styles.floatingBubble, { width: size, height: size, borderRadius: size / 2, left, top, opacity }]}>
      <View style={[styles.floatingBubbleShine, { width: size * 0.25, height: size * 0.25, borderRadius: size * 0.125 }]} />
    </View>
  );
}

function PlayClownfish({ style, testID }: { style: StyleProp<ViewStyle>; testID: string }) {
  return (
    <View style={[styles.playFish, styles.playClownfish, style]} testID={testID}>
      <View style={[styles.playFishTail, styles.playClownfishTail]} />
      <View style={[styles.playFishBody, styles.playClownfishBody]}>
        <View style={[styles.clownfishBand, styles.clownfishBandLeft]} />
        <View style={[styles.clownfishBand, styles.clownfishBandRight]} />
        <View style={styles.playFishEye} />
      </View>
    </View>
  );
}

function PlayBlueTang({ style, testID }: { style: StyleProp<ViewStyle>; testID: string }) {
  return (
    <View style={[styles.playFish, styles.playBlueTang, style]} testID={testID}>
      <View style={[styles.playFishTail, styles.playBlueTangTail]} />
      <View style={[styles.playFishBody, styles.playBlueTangBody]}>
        <View style={styles.blueTangStripe} />
        <View style={styles.playFishEye} />
      </View>
    </View>
  );
}

function PlayPuffer({ style, testID }: { style: StyleProp<ViewStyle>; testID: string }) {
  return (
    <View style={[styles.playPuffer, style]} testID={testID}>
      <View style={styles.playPufferMouth} />
      <View style={styles.playFishEye} />
      <View style={styles.playPufferFin} />
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: WATER_COLOR,
    paddingHorizontal: GRID * 3,
    alignItems: 'center',
  },
  background: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  floatingBubble: {
    position: 'absolute',
    borderWidth: 6,
    borderColor: 'rgba(125, 211, 252, 0.42)',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  floatingBubbleShine: {
    position: 'absolute',
    left: '22%',
    top: '18%',
    backgroundColor: 'rgba(255, 255, 255, 0.62)',
  },
  playFish: {
    position: 'absolute',
    width: 86,
    height: 48,
  },
  playFishBody: {
    position: 'absolute',
    left: 15,
    top: 7,
    width: 58,
    height: 34,
    borderRadius: 999,
    borderWidth: 3,
    overflow: 'hidden',
  },
  playFishTail: {
    position: 'absolute',
    right: 0,
    top: 12,
    width: 0,
    height: 0,
    borderTopWidth: 12,
    borderBottomWidth: 12,
    borderLeftWidth: 20,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  playFishEye: {
    position: 'absolute',
    left: 14,
    top: 9,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: TEXT_BASE_COLOR,
  },
  playClownfish: {
    opacity: 0.78,
  },
  playClownfishBody: {
    borderColor: 'rgba(219, 123, 31, 0.62)',
    backgroundColor: 'rgba(251, 146, 60, 0.78)',
  },
  playClownfishTail: {
    borderLeftColor: 'rgba(251, 146, 60, 0.72)',
  },
  clownfishBand: {
    position: 'absolute',
    top: -3,
    width: 8,
    height: 42,
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
  },
  clownfishBandLeft: {
    left: 22,
  },
  clownfishBandRight: {
    left: 40,
  },
  playBlueTang: {
    width: 96,
    opacity: 0.7,
    transform: [{ scaleX: -1 }, { rotate: '-6deg' }],
  },
  playBlueTangBody: {
    width: 66,
    borderColor: 'rgba(2, 132, 199, 0.5)',
    backgroundColor: 'rgba(56, 189, 248, 0.58)',
  },
  playBlueTangTail: {
    borderLeftColor: 'rgba(250, 204, 21, 0.74)',
  },
  blueTangStripe: {
    position: 'absolute',
    left: 25,
    top: -5,
    width: 12,
    height: 46,
    borderRadius: 999,
    backgroundColor: 'rgba(18, 51, 74, 0.28)',
    transform: [{ rotate: '18deg' }],
  },
  playPuffer: {
    position: 'absolute',
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 3,
    borderColor: 'rgba(218, 165, 32, 0.48)',
    backgroundColor: 'rgba(253, 224, 71, 0.38)',
    opacity: 0.74,
  },
  playPufferMouth: {
    position: 'absolute',
    left: 4,
    top: 24,
    width: 8,
    height: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(18, 51, 74, 0.32)',
  },
  playPufferFin: {
    position: 'absolute',
    right: -9,
    top: 20,
    width: 0,
    height: 0,
    borderTopWidth: 8,
    borderBottomWidth: 8,
    borderLeftWidth: 14,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: 'rgba(253, 224, 71, 0.5)',
  },
  backgroundClownfish: {
    left: '11%',
    top: '54%',
    transform: [{ rotate: '8deg' }],
  },
  backgroundBlueTang: {
    left: '73%',
    top: '49%',
  },
  backgroundPuffer: {
    left: '28%',
    top: '30%',
  },
  header: {
    zIndex: 1,
    width: '100%',
    maxWidth: SECTION_CONTENT_WIDTH,
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: GRID * 2,
  },
  pressedLogo: {
    opacity: 0.72,
  },
  phoneShell: {
    zIndex: 1,
    flex: 1,
    width: '100%',
    maxWidth: 430,
    maxHeight: 780,
    marginBottom: GRID * 2,
    borderRadius: 36,
    paddingHorizontal: 14,
    paddingTop: 26,
    paddingBottom: 14,
    backgroundColor: 'rgba(18, 51, 74, 0.86)',
    shadowColor: '#0284C7',
    shadowOpacity: 0.2,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 18 },
  },
  phoneSpeaker: {
    position: 'absolute',
    top: 10,
    alignSelf: 'center',
    width: 82,
    height: 6,
    borderRadius: RADIUS_PILL,
    backgroundColor: 'rgba(198, 232, 244, 0.34)',
  },
  phoneViewport: {
    flex: 1,
    overflow: 'hidden',
    borderRadius: RADIUS_XL,
    backgroundColor: WATER_COLOR,
  },
  copyright: {
    zIndex: 1,
    marginBottom: GRID * 2,
    color: 'rgba(18, 51, 74, 0.68)',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
    fontFamily: LATIN_FONT_FAMILY,
  },
});
