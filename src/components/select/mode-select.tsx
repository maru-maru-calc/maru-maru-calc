// The first screen after the launch demo: choosing a mode.
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SFX } from '@/audio/sfx';
import { useOneShotAudio } from '@/audio/use-one-shot-audio';
import { BrandLogo } from '@/components/BrandLogo';
import { DepthBackdrop } from '@/components/select/backdrop';
import { BubbleRoute, SoundToggleButton } from '@/components/select/map-parts';
import { styles } from '@/components/select/styles';
import { createValueStore } from '@/game/value-store';
import { a11yLabel } from '@/i18n/a11y-label';

export function ModeSelect({
  mapWidth,
  viewportWidth,
  viewportHeight,
  onSelectMarumaru,
  onSelectDentaku,
  onSelectLongForm,
}: {
  mapWidth: number;
  viewportWidth: number;
  viewportHeight: number;
  onSelectMarumaru: () => void;
  onSelectDentaku: () => void;
  onSelectLongForm: () => void;
}) {
  // How far the list is scrolled only matters to the backdrop, so scrolling does not redraw this screen.
  const [scrollDepthStore] = useState(() => createValueStore(0));
  const { play: playBackgroundBubbleSfx } = useOneShotAudio(SFX.backgroundBubble.source, SFX.backgroundBubble.volume);
  const { play: playActionSfx } = useOneShotAudio(SFX.uiAction.source, SFX.uiAction.volume);
  const centerX = mapWidth / 2;
  const modeNodeOffset = Math.min(82, Math.max(58, mapWidth * 0.21));
  const marumaruY = 210;
  const dentakuY = 366;
  const longFormY = 522;

  return (
    <SafeAreaView style={styles.screen}>
      <View testID="mode-select" style={styles.depthScene}>
        <DepthBackdrop width={viewportWidth} height={viewportHeight} scrollDepthStore={scrollDepthStore} onBubblePop={playBackgroundBubbleSfx} onCreaturePress={playActionSfx} />
        <SoundToggleButton />
        <ScrollView
          style={styles.worldScroll}
          contentContainerStyle={styles.modeScrollContent}
          showsVerticalScrollIndicator={false}
          onScroll={(event) => scrollDepthStore.set(event.nativeEvent.contentOffset.y)}
          scrollEventThrottle={16}
        >
          <View style={styles.modeRouteLayer}>
            <View pointerEvents="none" style={styles.modeLogo}>
              <BrandLogo size="medium" />
            </View>
            <BubbleRoute from={{ x: centerX - modeNodeOffset, y: marumaruY }} to={{ x: centerX + modeNodeOffset, y: dentakuY }} />
            <BubbleRoute from={{ x: centerX + modeNodeOffset, y: dentakuY }} to={{ x: centerX - modeNodeOffset, y: longFormY }} />
            <ModeDiver variant="boy" style={[styles.modeDiverBoy, { left: Math.max(18, centerX - 178) }]} />
            <ModeDiver variant="girl" style={[styles.modeDiverGirl, { left: Math.min(mapWidth - 136, centerX + 38) }]} />
            <ModeNode
              label="marumaru mode"
              kind="marumaru"
              x={centerX - modeNodeOffset}
              y={marumaruY}
              onPress={() => {
                playActionSfx();
                onSelectMarumaru();
              }}
            />
            <ModeNode
              label="dentaku mode"
              kind="dentaku"
              x={centerX + modeNodeOffset}
              y={dentakuY}
              onPress={() => {
                playActionSfx();
                onSelectDentaku();
              }}
            />
            <ModeNode
              label="long form mode"
              kind="longForm"
              x={centerX - modeNodeOffset}
              y={longFormY}
              onPress={() => {
                playActionSfx();
                onSelectLongForm();
              }}
            />
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

function ModeDiver({ variant, style }: { variant: 'boy' | 'girl'; style: StyleProp<ViewStyle> }) {
  const isGirl = variant === 'girl';

  return (
    <View pointerEvents="none" style={[styles.modeDiver, style, isGirl && styles.modeDiverGirlFlip]}>
      <View style={styles.modeDiverTrailBubbleLarge} />
      <View style={styles.modeDiverTrailBubbleSmall} />
      <View style={[styles.modeDiverArm, styles.modeDiverArmFront]} />
      <View style={[styles.modeDiverArm, styles.modeDiverArmBack]} />
      <View style={styles.modeDiverBody}>
        <View style={styles.modeDiverTank} />
        <View style={styles.modeDiverSuitBand} />
      </View>
      <View style={[styles.modeDiverLeg, styles.modeDiverLegTop]}>
        <View style={styles.modeDiverFin} />
      </View>
      <View style={[styles.modeDiverLeg, styles.modeDiverLegBottom]}>
        <View style={styles.modeDiverFin} />
      </View>
      <View style={styles.modeDiverHead}>
        {isGirl ? <View style={styles.modeDiverPonytail} /> : null}
        <View style={styles.modeDiverHair} />
        <View style={styles.modeDiverMask}>
          <View style={styles.modeDiverMaskGlass} />
        </View>
      </View>
    </View>
  );
}

function ModeNode({
  label,
  kind,
  x,
  y,
  onPress,
}: {
  label: string;
  kind: 'marumaru' | 'dentaku' | 'longForm';
  x: number;
  y: number;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={a11yLabel(label)}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.bubbleNode,
        styles.modeNode,
        {
          left: x - 82,
          top: y - 82,
        },
        pressed && styles.pressed,
      ]}
    >
      <View pointerEvents="none" style={styles.nodeBubbleInnerGlow} />
      <View pointerEvents="none" style={styles.nodeBubbleShine} />
      {kind === 'marumaru' ? <ModeMarumaruTitle /> : kind === 'longForm' ? <ModeLongFormTitle /> : <ModeDentakuTitle />}
    </Pressable>
  );
}

function ModeMarumaruTitle() {
  return (
    <View pointerEvents="none" style={styles.modeTitleLine}>
      <View style={[styles.modeTitleBead, styles.modeTitleBeadBlue]}>
        <View style={styles.modeTitleBeadHighlight} />
      </View>
      <View style={[styles.modeTitleBead, styles.modeTitleBeadGold]}>
        <View style={styles.modeTitleBeadHighlight} />
      </View>
      <Text style={styles.modeNodeText}> = 11</Text>
    </View>
  );
}

function ModeDentakuTitle() {
  return (
    <Text pointerEvents="none" style={styles.modeNodeText}>
      5 + 6 = <Text style={styles.modeNodeUnknown}>?</Text>
    </Text>
  );
}

function ModeLongFormTitle() {
  return (
    <View pointerEvents="none" style={styles.modeLongFormTitle}>
      <View style={styles.modeLongFormRow}>
        <View style={styles.modeLongFormOperatorSlot} />
        <View style={styles.modeLongFormNumberSlot}>
          <Text style={styles.modeNodeText}>18</Text>
        </View>
      </View>
      <View style={styles.modeLongFormRow}>
        <Text style={[styles.modeNodeText, styles.modeLongFormOperator]}>-</Text>
        <View style={styles.modeLongFormNumberSlot}>
          <Text style={styles.modeNodeText}>7</Text>
        </View>
      </View>
      <View style={styles.modeLongFormDividerRow}>
        <View style={styles.modeLongFormOperatorSlot} />
        <View style={styles.modeLongFormLine} />
      </View>
      <View style={styles.modeLongFormRow}>
        <View style={styles.modeLongFormOperatorSlot} />
        <View style={styles.modeLongFormNumberSlot}>
          <Text style={[styles.modeNodeText, styles.modeNodeUnknown]}>?</Text>
        </View>
      </View>
    </View>
  );
}
