import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { GroupMotionState } from '@/domain/game/types';
import { AdditionReadinessState, NumberGroup, NumberObject } from '@/domain/math/types';
import { NumberObjectView } from '@/components/NumberObjectView';
import { layoutNumberObjects } from '@/rendering/layout';
import { getMarbleRenderSpec } from '@/rendering/marbles';

type NumberGroupViewProps = {
  group: NumberGroup;
  objects: NumberObject[];
  selected: boolean;
  hinted?: boolean;
  readinessState?: AdditionReadinessState;
  disabled?: boolean;
  motionState?: GroupMotionState;
  accessibleMode?: boolean;
  onPress: () => void;
};

export function NumberGroupView({
  group,
  objects,
  selected,
  hinted = false,
  readinessState = 'none',
  disabled = false,
  motionState = 'idle',
  accessibleMode,
  onPress,
}: NumberGroupViewProps) {
  const { width } = useWindowDimensions();
  const laidOutObjects = layoutNumberObjects(objects, width);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${group.value}の数グループ`}
      accessibilityHint={selected ? '選択されています' : hinted ? 'ヒントの数です' : 'タップで選択します'}
      accessibilityState={{ disabled, selected }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.group,
        selected ? styles.selected : null,
        hinted ? styles.hinted : null,
        disabled ? styles.disabled : null,
        motionState === 'merging' ? styles.merging : null,
        motionState === 'hinted' ? styles.hintedMotion : null,
        motionState === 'dragging' ? styles.dragging : null,
        motionState === 'dropTarget' ? styles.dropTarget : null,
        motionState === 'blockedDropTarget' ? styles.blockedDropTarget : null,
        motionState === 'settled' ? styles.settled : null,
        pressed ? styles.pressed : null,
      ]}
    >
      <View pointerEvents="none" style={[styles.trayShadow, motionState === 'merging' ? styles.mergingShadow : null]} />
      <View
        pointerEvents="none"
        style={[
          styles.tray,
          selected ? styles.selectedTray : null,
          hinted ? styles.hintedTray : null,
          readinessState === 'near' ? styles.nearTray : null,
          readinessState === 'ready' ? styles.readyTray : null,
          motionState === 'dragging' ? styles.draggingTray : null,
          motionState === 'dropTarget' ? styles.dropTargetTray : null,
          motionState === 'blockedDropTarget' ? styles.blockedDropTargetTray : null,
          motionState === 'merging' ? styles.mergingTray : null,
          motionState === 'settled' ? styles.settledTray : null,
        ]}
      />
      <View pointerEvents="none" style={styles.trayHighlight} />
      {motionState === 'settled' ? (
        <View pointerEvents="none" style={styles.resultBadge}>
          <Text style={styles.resultBadgeText}>できた</Text>
        </View>
      ) : null}
      <View style={styles.marbleArea}>
        {laidOutObjects.length === 0 ? (
          <Text style={styles.zeroText}>0</Text>
        ) : (
          laidOutObjects.map(({ object, x, y, rotationDeg, zIndex }) => (
            <View
              key={object.id}
              style={[
                styles.positionedMarble,
                {
                  left: x - getMarbleRenderSpec(object.value, width).size / 2,
                  top: y,
                  transform: [{ rotate: `${rotationDeg}deg` }],
                  zIndex,
                },
              ]}
            >
              <NumberObjectView value={object.value} accessibleMode={accessibleMode} />
            </View>
          ))
        )}
      </View>
      <Text style={styles.valueText}>{group.value}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  group: {
    width: 154,
    minHeight: 152,
    alignItems: 'center',
    gap: 10,
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingTop: 20,
    paddingBottom: 14,
    borderRadius: 999,
    backgroundColor: 'transparent',
  },
  selected: {
    backgroundColor: 'transparent',
  },
  hinted: {
    backgroundColor: 'transparent',
  },
  disabled: {
    opacity: 0.82,
  },
  merging: {
    backgroundColor: 'transparent',
  },
  hintedMotion: {
    backgroundColor: 'transparent',
  },
  dragging: {
    backgroundColor: 'transparent',
  },
  dropTarget: {
    backgroundColor: 'transparent',
  },
  blockedDropTarget: {
    backgroundColor: 'transparent',
  },
  settled: {
    backgroundColor: 'transparent',
  },
  pressed: {
    opacity: 0.74,
  },
  trayShadow: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 13,
    height: 32,
    borderRadius: 999,
    backgroundColor: 'rgba(73, 51, 24, 0.13)',
  },
  mergingShadow: {
    backgroundColor: 'rgba(177, 92, 0, 0.16)',
  },
  tray: {
    position: 'absolute',
    left: 7,
    right: 7,
    top: 18,
    bottom: 18,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 250, 240, 0.52)',
    borderColor: 'rgba(151, 113, 58, 0.2)',
    borderWidth: 1,
  },
  selectedTray: {
    backgroundColor: 'rgba(236, 247, 241, 0.66)',
    borderColor: 'rgba(37, 111, 93, 0.58)',
    borderWidth: 2,
  },
  hintedTray: {
    backgroundColor: 'rgba(255, 248, 224, 0.78)',
    borderColor: 'rgba(241, 166, 56, 0.74)',
    borderWidth: 2,
  },
  nearTray: {
    backgroundColor: 'rgba(255, 238, 206, 0.72)',
    borderColor: 'rgba(177, 92, 0, 0.48)',
    borderWidth: 2,
  },
  readyTray: {
    backgroundColor: 'rgba(236, 247, 241, 0.82)',
    borderColor: 'rgba(37, 111, 93, 0.72)',
    borderWidth: 2,
  },
  mergingTray: {
    backgroundColor: 'rgba(255, 238, 206, 0.7)',
    borderColor: 'rgba(241, 177, 93, 0.72)',
    borderWidth: 2,
  },
  draggingTray: {
    backgroundColor: 'rgba(255, 255, 255, 0.76)',
    borderColor: 'rgba(47, 128, 216, 0.58)',
    borderWidth: 2,
  },
  dropTargetTray: {
    backgroundColor: 'rgba(236, 247, 241, 0.86)',
    borderColor: 'rgba(37, 111, 93, 0.82)',
    borderWidth: 2,
  },
  blockedDropTargetTray: {
    backgroundColor: 'rgba(255, 239, 230, 0.82)',
    borderColor: 'rgba(177, 92, 0, 0.74)',
    borderWidth: 2,
  },
  settledTray: {
    backgroundColor: 'rgba(236, 247, 241, 0.72)',
    borderColor: 'rgba(37, 111, 93, 0.62)',
    borderWidth: 2,
  },
  trayHighlight: {
    position: 'absolute',
    left: 36,
    right: 36,
    top: 30,
    height: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.34)',
  },
  resultBadge: {
    position: 'absolute',
    top: 10,
    right: 16,
    zIndex: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#256f5d',
    shadowColor: '#17473b',
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  resultBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  marbleArea: {
    width: 126,
    minHeight: 96,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  positionedMarble: {
    position: 'absolute',
  },
  valueText: {
    color: '#25201a',
    fontSize: 22,
    fontWeight: '800',
    zIndex: 2,
  },
  zeroText: {
    color: '#746852',
    fontSize: 28,
    fontWeight: '800',
  },
});
