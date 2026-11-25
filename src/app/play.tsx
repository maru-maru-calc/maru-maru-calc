import { createElement } from 'react';
import { Redirect, useRouter } from 'expo-router';
import { Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandLogo } from '@/components/BrandLogo';
import { CreatureArt } from '@/components/creature-art';
import { a11yLabel } from '@/i18n/a11y-label';
import { getPhoneFrameLayout, shouldUsePhoneFrame } from '@/layout/phone-frame';

const TEXT_BASE_COLOR = '#12334A';
const TEXT_ACCENT_COLOR = '#0284C7';
const WATER_COLOR = '#C6E8F4';
const LATIN_FONT_FAMILY = 'Helvetica';
const PLAYFUL_FONT_FAMILY = 'Noto Sans Japanese';
const GRID = 8;
const SECTION_CONTENT_WIDTH = GRID * 123;
const RADIUS_XL = 24;
const RADIUS_PILL = 999;
const PAGE_PADDING_HORIZONTAL = GRID * 3;
const HEADER_HEIGHT = 72;
const PHONE_AREA_MARGIN_BOTTOM = GRID * 2;
const COPYRIGHT_BLOCK_HEIGHT = 18 + GRID * 2;
const COPYRIGHT_TEXT = '© 2026 nozomitaguchi';
const BASE_PATH = __DEV__ ? '' : process.env.EXPO_BASE_URL ?? '';
const PLAY_FRAME_VERSION = 'long-form-mode-v1';

export default function PlayPage() {
  const { width, height } = useWindowDimensions();
  const router = useRouter();
  const isFramed = Platform.OS === 'web' && shouldUsePhoneFrame(width, height);
  const frame = getPhoneFrameLayout(
    width - PAGE_PADDING_HORIZONTAL * 2,
    height - HEADER_HEIGHT - PHONE_AREA_MARGIN_BOTTOM - COPYRIGHT_BLOCK_HEIGHT,
  );
  const openLanding = () => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const frame = document.querySelector('[data-testid="play-frame"]') as HTMLIFrameElement | null;
      frame?.contentWindow?.postMessage({ type: 'marumaru:pause-bgm' }, window.location.origin);
      window.setTimeout(() => router.push('/'), 50);
      return;
    }
    router.push('/');
  };

  if (!isFramed) {
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
          <Pressable accessibilityLabel={a11yLabel('maru maru calc logo')} accessibilityRole="link" onPress={openLanding} style={({ pressed }) => pressed && styles.pressedLogo}>
            <BrandLogo />
          </Pressable>
        </View>
      </View>

      <View style={styles.phoneArea}>
        {/* The slot takes up the scaled size on the page; the frame inside keeps its own size and is scaled to fill it. */}
        <View style={{ width: frame.slotWidth, height: frame.slotHeight }} testID="play-frame-slot">
          <View
            style={[
              styles.phoneShell,
              {
                width: frame.shellWidth,
                height: frame.shellHeight,
                left: (frame.slotWidth - frame.shellWidth) / 2,
                top: (frame.slotHeight - frame.shellHeight) / 2,
                transform: [{ scale: frame.scale }],
              },
            ]}
            testID="play-frame-shell"
          >
            <View style={styles.phoneSpeaker} />
            <View style={styles.phoneViewport}>
              {createElement('iframe', {
                src: `${BASE_PATH}/game?preview=${PLAY_FRAME_VERSION}`,
                title: a11yLabel('maru maru calc playable web app'),
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
      <CreatureArt kind="clownfish" width={86} />
    </View>
  );
}

function PlayBlueTang({ style, testID }: { style: StyleProp<ViewStyle>; testID: string }) {
  return (
    <View style={[styles.playFish, styles.playBlueTang, style]} testID={testID}>
      <CreatureArt kind="blueTang" width={96} />
    </View>
  );
}

function PlayPuffer({ style, testID }: { style: StyleProp<ViewStyle>; testID: string }) {
  return (
    <View style={[styles.playFish, styles.playPuffer, style]} testID={testID}>
      <CreatureArt kind="puffer" width={60} />
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: WATER_COLOR,
    paddingHorizontal: PAGE_PADDING_HORIZONTAL,
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
  },
  playClownfish: {
    opacity: 0.78,
  },
  playBlueTang: {
    opacity: 0.7,
    transform: [{ scaleX: -1 }, { rotate: '-6deg' }],
  },
  playPuffer: {
    opacity: 0.74,
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
    minHeight: HEADER_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: GRID * 2,
  },
  pressedLogo: {
    opacity: 0.72,
  },
  phoneArea: {
    zIndex: 1,
    flex: 1,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: PHONE_AREA_MARGIN_BOTTOM,
  },
  phoneShell: {
    position: 'absolute',
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
