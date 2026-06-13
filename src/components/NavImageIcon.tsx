import { Image, StyleSheet, View } from 'react-native';

type NavImageIconKind = 'back' | 'next' | 'retry';

const NAV_ICON_SOURCES = {
  back: require('../../assets/ui/nav-back.png'),
  next: require('../../assets/ui/nav-next.png'),
  retry: require('../../assets/ui/nav-retry.png'),
} as const;

export function NavImageIcon({ kind, size }: { kind: NavImageIconKind; size: number }) {
  return (
    <View pointerEvents="none" testID={`nav-icon-${kind}`} style={{ width: size, height: size }}>
      <Image source={NAV_ICON_SOURCES[kind]} style={[styles.icon, { width: size, height: size }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  icon: {
    resizeMode: 'contain',
  },
});
