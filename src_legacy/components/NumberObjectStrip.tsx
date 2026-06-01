import { StyleSheet, Text, View } from 'react-native';

import { NumberObjectView } from '@/components/NumberObjectView';
import { createRenderNumberObjects } from '@/rendering/numberObjects';

type NumberObjectStripProps = {
  value: number;
  groupId: string;
  accessibleLabel: string;
  accessibleMode?: boolean;
  scale?: number;
  gap?: number;
  minHeight?: number;
  centered?: boolean;
};

export function NumberObjectStrip({
  value,
  groupId,
  accessibleLabel,
  accessibleMode,
  scale = 1,
  gap = 4,
  minHeight = 40,
  centered = true,
}: NumberObjectStripProps) {
  const objects = createRenderNumberObjects(value, groupId);

  return (
    <View
      style={[styles.strip, centered ? styles.centered : null, { gap, minHeight }]}
      accessibilityLabel={accessibleLabel}
    >
      {objects.length === 0 ? (
        <Text style={[styles.zero, scale < 1 ? styles.smallZero : null]}>0</Text>
      ) : (
        objects.map((object) => (
          <NumberObjectView
            key={object.id}
            value={object.value}
            accessibleMode={accessibleMode}
            scale={scale}
          />
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  strip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  centered: {
    justifyContent: 'center',
  },
  zero: {
    color: '#746852',
    fontSize: 20,
    fontWeight: '800',
  },
  smallZero: {
    fontSize: 18,
  },
});
