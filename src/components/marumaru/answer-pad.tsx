// The number pad of the practice modes and the written calculation shown above it.
import { Pressable, Text, View } from 'react-native';

import { FEEDBACK_TICK_MS, LONG_FORM_QUESTION_TRANSITION_MS } from '@/components/marumaru/constants';
import { clamp } from '@/components/marumaru/field-layout';
import { buildLongFormRows, padLongFormCells } from '@/components/marumaru/long-form-rows';
import { styles } from '@/components/marumaru/styles';
import type { LongFormProblem } from '@/components/marumaru/types';
import { useTick, useTickUntil } from '@/game/use-tick';
import { a11yLabel } from '@/i18n/a11y-label';

function LongFormGoalTitle({
  problem,
  input,
  stepIndex,
  questionChangedAt,
  isWrong,
  maxWidth,
}: {
  problem: LongFormProblem;
  input: string;
  stepIndex: number;
  questionChangedAt: number;
  isWrong: boolean;
  maxWidth: number;
}) {
  // A new question settles in over a moment; after that this clock stops.
  const transitionTick = useTickUntil(FEEDBACK_TICK_MS, questionChangedAt + LONG_FORM_QUESTION_TRANSITION_MS);
  const transition = 1 - clamp((transitionTick - questionChangedAt) / LONG_FORM_QUESTION_TRANSITION_MS, 0, 1);
  const feedbackTick = useTick(FEEDBACK_TICK_MS, isWrong);
  const answerText = input || '?';
  const hasInput = input.length > 0;
  const promptText = `${problem.left} ${problem.operator} ${problem.right} = ${answerText}`;
  const rows = buildLongFormRows(problem, answerText, hasInput, stepIndex);
  const columnCount = Math.max(...rows.map((row) => row.cells.length), 1);
  const cellSize = Math.max(24, Math.min(30, Math.floor((maxWidth - 58) / Math.max(columnCount, 3))));
  const transitionScale = 1 + transition * 0.045;
  const transitionOpacity = 0.78 + (1 - transition) * 0.22;
  const wrongOffset = isWrong ? Math.sin(feedbackTick / 34) * 3 : 0;

  return (
    <View testID="long-form-panel" style={[styles.longFormPanel, { maxWidth }]}>
      <Text testID="long-form-question-prompt" style={styles.hiddenMetric}>{promptText}</Text>
      <View style={[styles.longFormBody, { opacity: transitionOpacity, transform: [{ translateX: -11 }, { scale: transitionScale }] }]}>
        {rows.map((row) => (
          <View key={row.id} style={styles.longFormRow}>
            <View style={[
              styles.longFormOperatorSlot,
              row.isDivisionBar && styles.longFormDivisionOperatorSlot,
              row.hasDivider && styles.longFormDividerOperatorSlot,
            ]}>
              <Text style={[
                styles.longFormOperatorText,
                row.isDivisionBar && styles.longFormDivisionOperatorText,
                row.isGuide && styles.longFormGuideText,
              ]}>{row.operatorLabel ?? ''}</Text>
            </View>
            <View style={[
              styles.longFormDigits,
              row.hasTopDivider && styles.longFormTopDivider,
              row.isDivisionBar && styles.longFormDivisionTopDivider,
              row.hasDivider && styles.longFormDivider,
              { width: cellSize * columnCount },
            ]}>
              {padLongFormCells(row.cells, columnCount).map((cell, index) => (
                <View
                  key={`${row.id}-${index}`}
                  style={[
                    styles.longFormCell,
                    { width: cellSize, height: row.isGuide ? Math.max(16, cellSize * 0.66) : cellSize },
                    cell.isActive && styles.longFormActiveCell,
                    cell.isActive && cell.isUnknown && styles.longFormActiveUnknownCell,
                    cell.isActive && isWrong && styles.longFormWrongCell,
                    cell.isActive && isWrong && { transform: [{ translateX: wrongOffset }] },
                  ]}
                >
                  <Text style={[
                    styles.longFormDigit,
                    row.isGuide && styles.longFormGuideText,
                    cell.isUnknown && styles.longFormUnknownText,
                  ]}>
                    {cell.value}
                  </Text>
                  {cell.isStruck ? <View pointerEvents="none" style={styles.longFormStrike} /> : null}
                </View>
              ))}
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

export function KukuAnswerPad({
  state,
  canSubmit,
  longFormProblem,
  longFormStepIndex,
  longFormQuestionChangedAt,
  input,
  onDigit,
  onDelete,
  onSubmit,
}: {
  state: 'input' | 'wrong' | 'running';
  canSubmit: boolean;
  longFormProblem?: LongFormProblem;
  longFormStepIndex: number;
  longFormQuestionChangedAt: number;
  input: string;
  onDigit: (digit: string) => void;
  onDelete: () => void;
  onSubmit: () => void;
}) {
  return (
    <View style={[styles.kukuAnswerPad, longFormProblem && styles.kukuAnswerPadWithLongForm, state === 'wrong' && styles.kukuAnswerPadWrong, state === 'running' && styles.kukuAnswerPadRunning]} testID="kuku-keypad">
      {longFormProblem ? (
        <View pointerEvents="none" style={styles.kukuPadLongFormArea}>
          <LongFormGoalTitle
            problem={longFormProblem}
            input={input}
            stepIndex={longFormStepIndex}
            questionChangedAt={longFormQuestionChangedAt}
            isWrong={state === 'wrong'}
            maxWidth={280}
          />
        </View>
      ) : null}
      <View style={styles.kukuKeyGrid}>
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
          <KukuKey key={digit} label={digit} disabled={state !== 'input'} onPress={() => onDigit(digit)} />
        ))}
        <KukuKey label="delete" disabled={state !== 'input'} onPress={onDelete} />
        <KukuKey label="0" disabled={state !== 'input'} onPress={() => onDigit('0')} />
        <KukuKey label="submit" testIDLabel="submit" accent disabled={!canSubmit} onPress={onSubmit} />
      </View>
    </View>
  );
}

function KukuKey({ label, testIDLabel = label, accent = false, disabled = false, onPress }: { label: string; testIDLabel?: string; accent?: boolean; disabled?: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityLabel={label === 'delete' ? a11yLabel('delete') : label === 'submit' ? a11yLabel('answer') : undefined}
      accessibilityRole="button"
      disabled={disabled}
      testID={`kuku-key-${testIDLabel}`}
      onPress={onPress}
      style={({ pressed }) => [styles.kukuKey, accent && styles.kukuKeyAccent, disabled && styles.kukuKeyDisabled, pressed && styles.pressedButton]}
    >
      {label === 'delete' ? (
        <Text>⌫</Text>
      ) : label === 'submit' ? (
        <Text>↵</Text>
      ) : (
        <Text style={styles.kukuKeyText}>{label}</Text>
      )}
    </Pressable>
  );
}
