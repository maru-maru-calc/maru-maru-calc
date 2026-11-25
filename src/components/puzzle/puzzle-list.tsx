// The list of the numbered puzzles: every one can be opened, solved or not, so nobody is held up
// by a puzzle they cannot crack. No words: a row of small circles says how many bubbles the
// puzzles below it have, a filled cell is a solved puzzle, a ringed one is the next to solve.
import { useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { LayoutChangeEvent } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HEADER_ACTION_BUTTON_SIZE, RADIUS_LG } from '@/components/marumaru/constants';
import { NavImageIcon } from '@/components/NavImageIcon';
import { getPuzzleSections, PUZZLE_GAME_STAGES } from '@/game/puzzle-game';
import { a11yLabel } from '@/i18n/a11y-label';

const INK = '#12334A';
const ACCENT = '#0284C7';
const WATER = '#C6E8F4';
const FONT = 'Helvetica';
const CELL = 56;
const GAP = 10;
// Five cells and their gaps: the list keeps this width on any screen and sits in the middle.
const LIST_WIDTH = CELL * 5 + GAP * 4;
// How far above the next puzzle the list is scrolled, so the row before it shows too.
const ROOM_ABOVE_NEXT = CELL + GAP * 3;

const SECTIONS = getPuzzleSections();

export function PuzzleList({
  solvedIds,
  nextPuzzle,
  onPick,
  onBack,
}: {
  solvedIds: string[];
  /** The first puzzle not solved yet, if any: the list opens there. */
  nextPuzzle: number | undefined;
  onPick: (number: number) => void;
  onBack: () => void;
}) {
  const solved = new Set(solvedIds);
  const scrollRef = useRef<ScrollView>(null);
  const sectionTopRef = useRef(new Map<number, number>());
  const nextSection = SECTIONS.find((section) => nextPuzzle !== undefined && section.numbers.includes(nextPuzzle));

  const showNext = () => {
    if (!nextSection || nextPuzzle === undefined) {
      return;
    }
    const sectionTop = sectionTopRef.current.get(nextSection.bubbleCount);
    if (sectionTop === undefined) {
      return;
    }
    const row = Math.floor(nextSection.numbers.indexOf(nextPuzzle) / 5);
    scrollRef.current?.scrollTo({ y: Math.max(0, sectionTop + SECTION_HEAD_HEIGHT + row * (CELL + GAP) - ROOM_ABOVE_NEXT), animated: false });
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Pressable accessibilityLabel={a11yLabel('Back')} accessibilityRole="button" testID="puzzle-list-back" onPress={onBack} style={({ pressed }) => [styles.headerButton, pressed && styles.pressed]}>
          <NavImageIcon kind="back" size={29} />
        </Pressable>
      </View>
      <ScrollView ref={scrollRef} testID="puzzle-list" contentContainerStyle={styles.content}>
        {SECTIONS.map((section) => (
          <View
            key={section.bubbleCount}
            style={styles.section}
            onLayout={(event: LayoutChangeEvent) => {
              sectionTopRef.current.set(section.bubbleCount, event.nativeEvent.layout.y);
              if (section === nextSection) {
                showNext();
              }
            }}
          >
            <View testID={`puzzle-list-section-${section.bubbleCount}`} style={styles.sectionHead}>
              {Array.from({ length: section.bubbleCount }, (_, index) => (
                <View key={index} style={styles.bubbleDot} />
              ))}
            </View>
            <View style={styles.grid}>
              {section.numbers.map((number) => {
                const isSolved = solved.has(PUZZLE_GAME_STAGES[number - 1].id);
                const isNext = number === nextPuzzle;
                return (
                  <Pressable
                    key={number}
                    accessibilityLabel={a11yLabel(isSolved ? `puzzle ${number}, solved` : `puzzle ${number}`)}
                    accessibilityRole="button"
                    testID={`pick-puzzle-${number}`}
                    onPress={() => onPick(number)}
                    style={({ pressed }) => [styles.cell, isSolved && styles.cellSolved, isNext && styles.cellNext, pressed && styles.pressed]}
                  >
                    <Text style={[styles.cellNumber, isSolved && styles.cellNumberSolved]}>{number}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const SECTION_HEAD_HEIGHT = 40;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: WATER,
  },
  // "Back" sits exactly where it does on the board (24 from the left, 37 from the top).
  header: {
    height: HEADER_ACTION_BUTTON_SIZE,
    marginTop: 37,
    marginBottom: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
  },
  // The same button, in the same place, as "back" on the board.
  headerButton: {
    width: HEADER_ACTION_BUTTON_SIZE,
    height: HEADER_ACTION_BUTTON_SIZE,
    borderRadius: RADIUS_LG,
    backgroundColor: 'rgba(255, 255, 255, 0.26)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    paddingBottom: 40,
  },
  section: {
    width: LIST_WIDTH,
    marginBottom: 12,
  },
  sectionHead: {
    height: SECTION_HEAD_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bubbleDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: ACCENT,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GAP,
  },
  cell: {
    width: CELL,
    height: CELL,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.62)',
    borderWidth: 3,
    borderColor: 'rgba(186, 230, 253, 0.72)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellSolved: {
    backgroundColor: ACCENT,
    borderColor: ACCENT,
  },
  cellNext: {
    borderColor: INK,
  },
  cellNumber: {
    color: INK,
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '900',
    fontFamily: FONT,
  },
  cellNumberSolved: {
    color: '#FFFFFF',
  },
  pressed: {
    opacity: 0.6,
  },
});
