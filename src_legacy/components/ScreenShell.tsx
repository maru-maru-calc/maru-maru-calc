import { router } from 'expo-router';
import { PropsWithChildren } from 'react';
import { Platform, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/AppButton';

type ScreenShellProps = PropsWithChildren<{
  title: string;
  backTo?: string;
  backLabel?: string;
}>;

export function ScreenShell({ title, backTo, backLabel = '戻る', children }: ScreenShellProps) {
  return (
    <SafeAreaView style={[styles.safeArea, Platform.OS === 'web' ? styles.webSafeArea : null]}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.content}>{children}</View>
        {backTo ? <AppButton label={backLabel} variant="secondary" onPress={() => router.replace(backTo)} /> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fffaf1',
  },
  webSafeArea: {
    minHeight: '100%',
  },
  container: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 24,
  },
  title: {
    color: '#25201a',
    fontSize: 32,
    fontWeight: '700',
  },
  content: {
    width: '100%',
    maxWidth: 420,
    gap: 12,
  },
});
