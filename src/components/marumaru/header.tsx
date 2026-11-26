// The top of the game screen: the goal, the question, and the retry / next button.
import { useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';

import { BrandLogo } from '@/components/BrandLogo';
import {
  FEEDBACK_TICK_MS,
  KUKU_QUESTION_BASE_FONT_SIZE,
  KUKU_QUESTION_MIN_FONT_SIZE,
  RESULT_TICK_MS,
} from '@/components/marumaru/constants';
import { getFailedProgress } from '@/components/marumaru/effects';
import { getGoalParts, getSignedPalette, getTranslucentBeadColor } from '@/components/marumaru/field-layout';
import { styles } from '@/components/marumaru/styles';
import type { DentakuPractice, GoalPart } from '@/components/marumaru/types';
import { ClockIcon, NavImageIcon, PencilIcon } from '@/components/NavImageIcon';
import { getBeadKind } from '@/game/beads';
import { useTick } from '@/game/use-tick';
import { a11yLabel } from '@/i18n/a11y-label';

// The colour of the stage number (styles.stageGameNumber).
const STAGE_MARK_COLOR = '#0284C7';

export function LaunchLogo({ variant = 'header', onPress }: { variant?: 'header' | 'tada'; onPress?: () => void }) {
  const content = (
    <View accessibilityLabel={onPress ? undefined : a11yLabel('maru logo')} style={[styles.launchLogo, variant === 'tada' && styles.launchLogoTada]}>
      <BrandLogo size="medium" />
    </View>
  );

  if (!onPress) {
    return content;
  }

  return (
    <Pressable accessibilityLabel={a11yLabel('maru logo')} accessibilityRole="link" onPress={onPress} style={({ pressed }) => pressed && styles.pressedButton}>
      {content}
    </Pressable>
  );
}

/**
 * What stands before the goal: the stage's number ("#12"), a clock in the one-minute game, where
 * the puzzles have no numbers, or a pencil on a puzzle a player made.
 */
export type StageMark = number | 'clock' | 'pencil';

export function StageGoalTitle({
  stageMark,
  target,
  goalText,
  maxWidth,
  showsGoalParts = true,
}: {
  stageMark: StageMark;
  target: number;
  /** Shown instead of the goal ("?" while a puzzle is being made and has none yet). */
  goalText?: string;
  maxWidth: number;
  showsGoalParts?: boolean;
}) {
  return (
    <View testID="stage-goal-title" style={[styles.stageGameTitle, { maxWidth }]}>
      <View style={styles.stageGameNumberSlot}>
        {stageMark === 'clock' ? (
          <View testID="stage-goal-clock">
            <ClockIcon size={22} color={STAGE_MARK_COLOR} />
          </View>
        ) : stageMark === 'pencil' ? (
          <View testID="stage-goal-pencil">
            <PencilIcon size={24} color={STAGE_MARK_COLOR} />
          </View>
        ) : (
          <Text testID="stage-goal-number" style={styles.stageGameNumber}>#{stageMark}</Text>
        )}
      </View>
      {showsGoalParts ? <HeaderGoalParts target={target} maxWidth={Math.max(54, maxWidth - 118)} /> : null}
      <View style={styles.stageGameEqualsSlot}>
        <Text testID="stage-goal-equals" style={styles.stageGameEquals}>=</Text>
      </View>
      <View style={styles.stageGameTargetSlot}>
        <Text testID="stage-goal-target" style={styles.stageGameTarget}>{goalText ?? target}</Text>
      </View>
    </View>
  );
}

export function KukuGoalTitle({
  practice,
  input,
  maxWidth,
  isWrong,
}: {
  practice: DentakuPractice;
  input: string;
  maxWidth: number;
  isWrong: boolean;
}) {
  const feedbackTick = useTick(FEEDBACK_TICK_MS, isWrong && !practice.longFormMode);
  if (practice.longFormMode) {
    return <LongFormStageTitle label={practice.stageLabel} questionNumber={practice.questionNumber} questionTotal={practice.questionTotal} maxWidth={maxWidth} />;
  }

  const expression = practice.prompt.replace(' = ?', '');
  const answerText = input || '?';
  const questionText = `${expression} = ${answerText}`;
  const titleTextStyle = getKukuQuestionTitleTextStyle(questionText, maxWidth);

  // A wrong answer shakes and turns red where the player is looking, the same way a long-form cell does.
  const wrongOffset = isWrong ? Math.sin(feedbackTick / 34) * 4 : 0;
  const answerStyle = input.length === 0 ? styles.kukuQuestionUnknown : isWrong ? styles.kukuQuestionWrong : undefined;

  const progressText = practice.questionNumber !== undefined && practice.questionTotal !== undefined ? `${practice.questionNumber}/${practice.questionTotal}` : undefined;

  return (
    <View style={[styles.kukuGameTitle, { maxWidth }, isWrong && { transform: [{ translateX: wrongOffset }] }]}>
      <Text testID="kuku-question-title" numberOfLines={1} style={[styles.kukuQuestionText, titleTextStyle]}>
        {expression} = <Text testID={isWrong ? 'kuku-question-wrong-answer' : undefined} style={answerStyle}>{answerText}</Text>
      </Text>
      {progressText ? (
        <Text pointerEvents="none" testID="kuku-question-progress" style={styles.kukuQuestionProgress}>
          {progressText}
        </Text>
      ) : null}
    </View>
  );
}

function LongFormStageTitle({ label, questionNumber, questionTotal, maxWidth }: { label: string; questionNumber?: number; questionTotal?: number; maxWidth: number }) {
  const progressText = questionNumber !== undefined && questionTotal !== undefined ? ` ${questionNumber}/${questionTotal}` : '';
  return (
    <View style={[styles.kukuGameTitle, { maxWidth }]}>
      <Text testID="kuku-question-title" numberOfLines={1} style={styles.kukuQuestionText}>
        {label}{progressText}
      </Text>
    </View>
  );
}

function HeaderGoalParts({ target, maxWidth }: { target: number; maxWidth: number }) {
  const parts = useMemo(() => getGoalParts(target), [target]);
  const visibleParts = parts.slice(0, 5);
  const overflowCount = Math.max(0, parts.length - visibleParts.length);
  const beadSize = Math.max(22, Math.min(30, Math.floor((maxWidth - overflowCount * 24) / Math.max(visibleParts.length, 1)) - 5));

  return (
    <View pointerEvents="none" testID="stage-goal-parts" style={styles.headerGoalParts}>
      {visibleParts.map((part, index) => (
        <MiniGoalBead key={`header-goal-${part.value}-${part.count}-${index}`} part={part} size={beadSize} />
      ))}
      {overflowCount > 0 ? (
        <View style={styles.headerGoalOverflow}>
          <Text style={styles.headerGoalOverflowText}>+{overflowCount}</Text>
        </View>
      ) : null}
    </View>
  );
}

function MiniGoalBead({ part, size }: { part: GoalPart; size: number }) {
  const isGroup = part.value === 1 && part.count > 1;
  const palette = getSignedPalette(getBeadKind(part.value), part.sign);
  const dotCount = isGroup ? Math.min(part.count, 6) : 0;
  const dots = Array.from({ length: dotCount }, (_, index) => {
    const angle = -Math.PI / 2 + (Math.PI * 2 * index) / Math.max(dotCount, 1);
    const radius = size * 0.18;
    return {
      left: size / 2 + Math.cos(angle) * radius - size * 0.12,
      top: size / 2 + Math.sin(angle) * radius - size * 0.12,
    };
  });

  return (
    <View
      testID="stage-goal-bead"
      style={[
        styles.headerGoalBead,
        isGroup && styles.headerGoalGroupBead,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: isGroup ? 'rgba(215, 246, 255, 0.44)' : getTranslucentBeadColor(part.value, palette.color),
          borderColor: isGroup ? '#8ED8EF' : palette.rimColor,
        },
      ]}
    >
      <View style={styles.headerGoalBeadGlass} />
      <View style={[styles.headerGoalBeadShine, { width: size * 0.28, height: size * 0.2, borderRadius: size * 0.14 }]} />
      {isGroup
        ? dots.map((dot, index) => (
            <View
              key={`mini-dot-${index}`}
              style={[
                styles.headerGoalContainedDot,
                {
                  left: dot.left,
                  top: dot.top,
                  width: size * 0.24,
                  height: size * 0.24,
                  borderRadius: size * 0.12,
                },
              ]}
            />
          ))
        : null}
      {isGroup ? (
        <View style={styles.headerGoalBadge}>
          <Text style={styles.headerGoalBadgeText}>{part.count}</Text>
        </View>
      ) : null}
    </View>
  );
}

/**
 * The retry / next button in the header. It pulses on the result screens, and keeps the clock for
 * that to itself so the pulse does not redraw the game around it.
 */
export function HeaderActionButton({
  isClear,
  isFailed,
  failedAt,
  isLaunch,
  prefersReducedMotion,
  onPress,
}: {
  isClear: boolean;
  isFailed: boolean;
  failedAt?: number;
  isLaunch: boolean;
  prefersReducedMotion: boolean;
  onPress: () => void;
}) {
  const tick = useTick(RESULT_TICK_MS, isFailed || (isClear && !prefersReducedMotion));
  const clearActionPulse = isClear && !prefersReducedMotion ? 1 + Math.sin(tick / 170) * 0.08 : 1;
  const failedProgress = getFailedProgress(tick, failedAt);
  const failedActionPulse = isFailed && !prefersReducedMotion ? 1 + Math.sin(tick / 155) * (0.04 + failedProgress * 0.09) : 1;

  return (
    <Pressable
      accessibilityLabel={a11yLabel(isClear ? 'next stage' : 'retry')}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.headerRetryButton,
        isClear && styles.headerNextButton,
        isLaunch && isClear && styles.headerLaunchNextButton,
        isFailed && styles.headerRetryButtonFailed,
        isFailed && { transform: [{ scale: failedActionPulse }], shadowOpacity: 0.18 + failedProgress * 0.46, shadowRadius: 8 + failedProgress * 16 },
        pressed && styles.pressedButton,
      ]}
    >
      <View pointerEvents="none" style={isClear ? { transform: [{ scale: clearActionPulse }] } : undefined}>
        <NavImageIcon kind={isClear ? 'next' : 'retry'} size={isClear ? 31 : 29} />
      </View>
    </Pressable>
  );
}

function getKukuQuestionTitleTextStyle(text: string, maxWidth: number) {
  const estimatedWidth = estimateKukuQuestionTextWidth(text, KUKU_QUESTION_BASE_FONT_SIZE);
  const availableWidth = Math.max(80, maxWidth);

  if (estimatedWidth <= availableWidth) {
    return undefined;
  }

  const fontSize = Math.max(KUKU_QUESTION_MIN_FONT_SIZE, Math.floor((KUKU_QUESTION_BASE_FONT_SIZE * availableWidth) / estimatedWidth));
  return {
    fontSize,
    lineHeight: Math.ceil(fontSize * 1.12),
  };
}

function estimateKukuQuestionTextWidth(text: string, fontSize: number) {
  return Array.from(text).reduce((width, character) => {
    if (character === ' ') {
      return width + fontSize * 0.32;
    }
    if (character === '×' || character === '÷' || character === '+' || character === '-' || character === '=') {
      return width + fontSize * 0.72;
    }
    if (character === '(' || character === ')') {
      return width + fontSize * 0.42;
    }
    return width + fontSize * 0.62;
  }, 0);
}
