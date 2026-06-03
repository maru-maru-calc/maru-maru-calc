import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MarumaruGame } from '@/components/MarumaruGame';
import { getStageIndexById, STAGE_ISLANDS, STAGES } from '@/game/stages';
import { Stage } from '@/game/types';

export default function IndexScreen() {
  const [selectedIslandId, setSelectedIslandId] = useState<Stage['islandId']>('addition');
  const [playingStageIndex, setPlayingStageIndex] = useState<number | undefined>(undefined);

  const selectedIsland = STAGE_ISLANDS.find((island) => island.id === selectedIslandId) ?? STAGE_ISLANDS[0];
  const stagesBySet = useMemo(() => {
    return selectedIsland.stageSetTitles.map((setTitle) => ({
      setTitle,
      stages: STAGES.filter((stage) => stage.islandId === selectedIslandId && stage.setTitle === setTitle),
    }));
  }, [selectedIsland.stageSetTitles, selectedIslandId]);

  if (playingStageIndex !== undefined) {
    return <MarumaruGame initialStageIndex={playingStageIndex} onBack={() => setPlayingStageIndex(undefined)} />;
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.appTitle}>まるまる電卓</Text>
          <Text style={styles.appSubtitle}>島をえらんで、まるで計算しよう</Text>
        </View>

        <View style={styles.islandTabs}>
          {STAGE_ISLANDS.map((island) => {
            const isSelected = island.id === selectedIslandId;
            return (
              <Pressable
                key={island.id}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                testID={`island-${island.id}`}
                onPress={() => setSelectedIslandId(island.id)}
                style={({ pressed }) => [styles.islandTab, isSelected && styles.selectedIslandTab, pressed && styles.pressed]}
              >
                <Text style={[styles.islandTitle, isSelected && styles.selectedIslandTitle]}>{island.title}</Text>
                <Text style={[styles.islandDescription, isSelected && styles.selectedIslandDescription]}>{island.description}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.stageArea}>
          <Text style={styles.sectionTitle}>{selectedIsland.title}</Text>
          {stagesBySet.map(({ setTitle, stages }) => (
            <View key={setTitle} style={styles.stageSet}>
              <Text style={styles.stageSetTitle}>{setTitle}</Text>
              <View style={styles.stageGrid}>
                {stages.map((stage, index) => (
                  <Pressable
                    key={stage.id}
                    accessibilityRole="button"
                    testID={`stage-${stage.id}`}
                    onPress={() => setPlayingStageIndex(getStageIndexById(stage.id))}
                    style={({ pressed }) => [styles.stageCard, pressed && styles.pressed]}
                  >
                    <Text style={styles.stageNumber}>{index + 1}</Text>
                    <Text style={styles.stageTitle}>{stage.title}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F6F1E8',
  },
  content: {
    padding: 18,
    paddingBottom: 36,
    gap: 18,
  },
  header: {
    paddingTop: 8,
  },
  appTitle: {
    color: '#25342C',
    fontSize: 34,
    fontWeight: '900',
  },
  appSubtitle: {
    marginTop: 4,
    color: '#4E5D54',
    fontSize: 15,
    fontWeight: '800',
  },
  islandTabs: {
    flexDirection: 'row',
    gap: 10,
  },
  islandTab: {
    flex: 1,
    minHeight: 92,
    padding: 14,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#B8AD9C',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
  },
  selectedIslandTab: {
    borderColor: '#2F7D68',
    backgroundColor: '#2F7D68',
  },
  islandTitle: {
    color: '#25342C',
    fontSize: 22,
    fontWeight: '900',
  },
  selectedIslandTitle: {
    color: '#FFFFFF',
  },
  islandDescription: {
    marginTop: 6,
    color: '#5B665F',
    fontSize: 13,
    fontWeight: '700',
  },
  selectedIslandDescription: {
    color: '#EAF7F2',
  },
  stageArea: {
    gap: 14,
  },
  sectionTitle: {
    color: '#25342C',
    fontSize: 26,
    fontWeight: '900',
  },
  stageSet: {
    gap: 10,
  },
  stageSetTitle: {
    color: '#2F473A',
    fontSize: 20,
    fontWeight: '900',
  },
  stageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  stageCard: {
    width: 156,
    minHeight: 98,
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#D1C8B9',
    backgroundColor: '#FFFFFF',
    justifyContent: 'space-between',
  },
  stageNumber: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F7D56B',
    borderWidth: 2,
    borderColor: '#C8992F',
    color: '#25342C',
    fontSize: 16,
    fontWeight: '900',
    textAlign: 'center',
    lineHeight: 26,
  },
  stageTitle: {
    marginTop: 10,
    color: '#25342C',
    fontSize: 19,
    fontWeight: '900',
  },
  pressed: {
    opacity: 0.78,
  },
});
