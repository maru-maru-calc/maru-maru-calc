import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { NumberObjectView } from '@/components/NumberObjectView';
import { ScreenShell } from '@/components/ScreenShell';
import { getCopy } from '@/data/copy';
import { useProgressStore } from '@/store/progressStore';
import { TextMode, useSettingsStore } from '@/store/settingsStore';

export default function SettingsScreen() {
  const soundEnabled = useSettingsStore((state) => state.soundEnabled);
  const effectsEnabled = useSettingsStore((state) => state.effectsEnabled);
  const accessibleMode = useSettingsStore((state) => state.accessibleMode);
  const textMode = useSettingsStore((state) => state.textMode);
  const setSoundEnabled = useSettingsStore((state) => state.setSoundEnabled);
  const setEffectsEnabled = useSettingsStore((state) => state.setEffectsEnabled);
  const setAccessibleMode = useSettingsStore((state) => state.setAccessibleMode);
  const setTextMode = useSettingsStore((state) => state.setTextMode);
  const resetProgress = useProgressStore((state) => state.resetProgress);

  return (
    <ScreenShell title={getCopy('settings', textMode)} backTo="/" backLabel={getCopy('back', textMode)}>
      <View style={styles.row}>
        <Text style={styles.label}>{getCopy('sound', textMode)}</Text>
        <Switch value={soundEnabled} onValueChange={setSoundEnabled} />
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>{getCopy('effects', textMode)}</Text>
        <Switch value={soundEnabled && effectsEnabled} onValueChange={setEffectsEnabled} disabled={!soundEnabled} />
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>{getCopy('accessibleMode', textMode)}</Text>
        <Switch value={accessibleMode} onValueChange={setAccessibleMode} />
      </View>
      <View style={styles.previewRow}>
        <NumberObjectView value={1} accessibleMode={accessibleMode} scale={0.72} />
        <NumberObjectView value={10} accessibleMode={accessibleMode} scale={0.72} />
        <NumberObjectView value={100} accessibleMode={accessibleMode} scale={0.72} />
      </View>
      <View style={styles.settingBlock}>
        <Text style={styles.label}>{getCopy('textDisplay', textMode)}</Text>
        <View style={styles.segmented}>
          <TextModeButton
            label={getCopy('normalText', textMode)}
            value="normal"
            selected={textMode === 'normal'}
            onPress={setTextMode}
          />
          <TextModeButton
            label={getCopy('hiraganaText', textMode)}
            value="hiragana"
            selected={textMode === 'hiragana'}
            onPress={setTextMode}
          />
        </View>
      </View>
      <AppButton label={getCopy('resetProgress', textMode)} variant="secondary" onPress={resetProgress} />
    </ScreenShell>
  );
}

function TextModeButton({
  label,
  value,
  selected,
  onPress,
}: {
  label: string;
  value: TextMode;
  selected: boolean;
  onPress: (value: TextMode) => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={() => onPress(value)}
      style={[styles.segmentButton, selected ? styles.segmentButtonSelected : null]}
    >
      <Text style={[styles.segmentLabel, selected ? styles.segmentLabelSelected : null]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'space-between',
    flexDirection: 'row',
    gap: 12,
  },
  settingBlock: {
    gap: 10,
  },
  label: {
    color: '#25201a',
    fontSize: 16,
    fontWeight: '700',
  },
  segmented: {
    flexDirection: 'row',
    gap: 8,
  },
  previewRow: {
    minHeight: 68,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 14,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.64)',
    borderColor: '#e0d2bb',
    borderWidth: 1,
  },
  segmentButton: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderColor: '#d7c7ad',
    borderWidth: 1,
    backgroundColor: '#ffffff',
  },
  segmentButtonSelected: {
    borderColor: '#256f5d',
    backgroundColor: '#ecf7f1',
  },
  segmentLabel: {
    color: '#25201a',
    fontSize: 15,
    fontWeight: '700',
  },
  segmentLabelSelected: {
    color: '#256f5d',
    fontWeight: '800',
  },
});
