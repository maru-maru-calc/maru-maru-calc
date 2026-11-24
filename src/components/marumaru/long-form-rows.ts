// ひっさん (written calculation): the steps of a problem and the rows and cells drawn for it.
import { LAUNCH_INITIAL_TOTAL } from '@/components/marumaru/constants';
import { createPendingBubbles } from '@/components/marumaru/field-layout';
import type {
  DentakuAutomationPractice,
  DentakuPractice,
  LongFormCell,
  LongFormProblem,
  LongFormRow,
  LongFormStep,
  PendingBubble,
} from '@/components/marumaru/types';

export function getLongFormProblem(practice: DentakuPractice): LongFormProblem | undefined {
  if (practice.autoAdvance || practice.operators.length !== 1 || practice.operands.length !== 2) {
    return undefined;
  }

  const operator = practice.operators[0];
  if (operator !== '+' && operator !== '-' && operator !== '×' && operator !== '÷') {
    return undefined;
  }

  return {
    left: practice.operands[0],
    right: practice.operands[1],
    operator,
    answer: practice.answer,
  };
}

export function getLongFormStep(practice: DentakuPractice, stepIndex: number): LongFormStep | undefined {
  const problem = practice.longFormMode ? getLongFormProblem(practice) : undefined;
  if (!problem || (problem.operator !== '+' && problem.operator !== '-' && problem.operator !== '×' && problem.operator !== '÷')) {
    return undefined;
  }

  if (problem.operator === '×') {
    return getLongFormMultiplicationStep(problem, stepIndex);
  }

  if (problem.operator === '÷') {
    return getLongFormDivisionStep(problem, stepIndex);
  }

  const placeStep = getLongFormPlaceStep(problem);
  if (!placeStep) {
    return undefined;
  }

  if (stepIndex <= 0) {
    return {
      expectedAnswer: placeStep.onesAnswer,
      isFinal: false,
      maxInputLength: 2,
      acceptsWrittenDigit: problem.operator === '+',
    };
  }

  return {
    expectedAnswer: placeStep.tensAnswer,
    isFinal: true,
    maxInputLength: String(placeStep.tensAnswer).length,
  };
}

export function isLongFormPlaceValuePractice(practice: DentakuPractice) {
  const problem = practice.longFormMode ? getLongFormProblem(practice) : undefined;
  return problem?.operator === '+' || problem?.operator === '-';
}

export function getLongFormStepAutomation(practice: DentakuPractice, stepIndex: number): DentakuAutomationPractice | undefined {
  const problem = practice.longFormMode ? getLongFormProblem(practice) : undefined;
  const parts = problem ? getLongFormPlaceParts(problem) : undefined;
  if (!problem || !parts || (problem.operator !== '+' && problem.operator !== '-')) {
    return undefined;
  }

  if (stepIndex <= 0) {
    return {
      operands: [parts.onesLeft, parts.onesRight],
      operators: [problem.operator],
    };
  }

  return {
    operands: [parts.tensLeft, parts.tensRight],
    operators: [problem.operator],
  };
}

export function getLongFormStepPendingBubbles(practice: DentakuPractice, stepIndex: number, fieldWidth: number): PendingBubble[] | undefined {
  const problem = practice.longFormMode ? getLongFormProblem(practice) : undefined;
  const parts = problem ? getLongFormPlaceParts(problem) : undefined;
  if (!parts || (problem?.operator !== '+' && problem?.operator !== '-')) {
    return undefined;
  }

  const counts = stepIndex <= 0
    ? [parts.onesLeft, parts.onesRight]
    : [parts.tensLeft, parts.tensRight];

  return createPendingBubbles(fieldWidth, counts.filter((count) => count > 0));
}

function getLongFormPlaceStep(problem: LongFormProblem) {
  if (problem.operator === '+') {
    const onesAnswer = problem.left % 10 + problem.right % 10;
    const carry = Math.floor(onesAnswer / 10);
    const tensAnswer = Math.floor(problem.left / 10) + Math.floor(problem.right / 10) + carry;
    return { onesAnswer, tensAnswer };
  }

  if (problem.operator === '-') {
    const needsBorrow = problem.left % 10 < problem.right % 10;
    const onesAnswer = (needsBorrow ? problem.left % 10 + 10 : problem.left % 10) - (problem.right % 10);
    const tensAnswer = Math.floor(problem.left / 10) - (needsBorrow ? 1 : 0) - Math.floor(problem.right / 10);
    return { onesAnswer, tensAnswer };
  }

  return undefined;
}

function getLongFormPlaceParts(problem: LongFormProblem) {
  if (problem.operator === '+') {
    return {
      onesLeft: problem.left % 10,
      onesRight: problem.right % 10,
      tensLeft: Math.floor(problem.left / 10) * 10,
      tensRight: Math.floor(problem.right / 10) * 10,
    };
  }

  if (problem.operator === '-') {
    return {
      onesLeft: problem.left % 10,
      onesRight: problem.right % 10,
      tensLeft: Math.floor(problem.left / 10) * 10,
      tensRight: Math.floor(problem.right / 10) * 10,
    };
  }

    return undefined;
}

function getLongFormMultiplicationStep(problem: LongFormProblem, stepIndex: number): LongFormStep | undefined {
  const state = getLongFormMultiplicationState(problem);
  if (!state) {
    return undefined;
  }

  const partial = state.partialProducts[stepIndex];
  if (partial) {
    return {
      expectedAnswer: partial.inputValue,
      isFinal: false,
      maxInputLength: String(partial.inputValue).length,
    };
  }

  const additionStep = state.additionSteps[stepIndex - state.partialProducts.length];
  if (!additionStep) {
    return undefined;
  }

  const isFinal = stepIndex - state.partialProducts.length >= state.additionSteps.length - 1;
  return {
    expectedAnswer: additionStep.expectedAnswer,
    isFinal,
    maxInputLength: String(additionStep.expectedAnswer).length,
    // The last column has nowhere to carry to, so its whole sum is written.
    acceptsWrittenDigit: !isFinal,
  };
}

function getLongFormMultiplicationState(problem: LongFormProblem) {
  if (problem.operator !== '×' || problem.left < 10 || problem.left > 99 || problem.right < 2 || problem.right > 99) {
    return undefined;
  }

  const leftTens = Math.floor(problem.left / 10);
  const leftOnes = problem.left % 10;
  const rightTens = Math.floor(problem.right / 10);
  const rightOnes = problem.right % 10;
  const partialProducts = [
    { inputValue: leftOnes * rightOnes, value: leftOnes * rightOnes, leftColumn: 1, rightColumn: 1 },
    { inputValue: leftTens * rightOnes, value: leftTens * 10 * rightOnes, leftColumn: 0, rightColumn: 1 },
    // A multiplier of one digit has no tens to multiply by.
    ...(rightTens > 0
      ? [
        { inputValue: leftOnes * rightTens, value: leftOnes * rightTens * 10, leftColumn: 1, rightColumn: 0 },
        { inputValue: leftTens * rightTens, value: leftTens * 10 * rightTens * 10, leftColumn: 0, rightColumn: 0 },
      ]
      : []),
  ];
  const partialValues = partialProducts.map((partial) => partial.value);
  const answerWidth = Math.max(String(problem.answer).length, ...partialValues.map((value) => String(value).length), 3);
  const additionSteps = buildLongFormColumnAdditionSteps(partialValues, answerWidth);

  return {
    answerWidth,
    partialProducts,
    additionSteps,
  };
}

function buildLongFormColumnAdditionSteps(values: number[], width: number) {
  const steps: { column: number; expectedAnswer: number; carryIn: number }[] = [];
  let carry = 0;

  for (let column = width - 1; column >= 0; column -= 1) {
    const place = 10 ** (width - 1 - column);
    const expectedAnswer = values.reduce((sum, value) => sum + Math.floor(value / place) % 10, carry);
    steps.push({ column, expectedAnswer, carryIn: carry });
    carry = Math.floor(expectedAnswer / 10);
  }

  while (steps.length > 1 && steps[steps.length - 1].expectedAnswer === 0 && steps[steps.length - 1].carryIn === 0) {
    steps.pop();
  }

  return steps;
}

function getLongFormDivisionStep(problem: LongFormProblem, stepIndex: number): LongFormStep | undefined {
  const state = getLongFormDivisionState(problem);
  const step = state?.steps[stepIndex];
  if (!step) {
    return undefined;
  }

  return {
    expectedAnswer: step.expectedAnswer,
    isFinal: stepIndex >= state.steps.length - 1,
    maxInputLength: String(step.expectedAnswer).length,
  };
}

function getLongFormDivisionState(problem: LongFormProblem) {
  if (problem.operator !== '÷' || problem.left < 10 || problem.left > 99 || problem.right < 2 || problem.right > 9 || !Number.isInteger(problem.answer) || problem.answer < 10 || problem.answer > 99) {
    return undefined;
  }

  const dividendTens = Math.floor(problem.left / 10);
  const dividendOnes = problem.left % 10;
  const quotientTens = Math.floor(problem.answer / 10);
  const quotientOnes = problem.answer % 10;
  const firstProduct = problem.right * quotientTens;
  const firstRemainder = dividendTens - firstProduct;
  const loweredValue = firstRemainder * 10 + dividendOnes;
  const secondProduct = problem.right * quotientOnes;
  const finalRemainder = loweredValue - secondProduct;

  if (quotientTens <= 0 || firstProduct > dividendTens || finalRemainder !== 0) {
    return undefined;
  }

  return {
    dividendOnes,
    dividendTens,
    finalRemainder,
    firstProduct,
    firstRemainder,
    loweredValue,
    quotientOnes,
    quotientTens,
    secondProduct,
    steps: [
      { expectedAnswer: quotientTens },
      { expectedAnswer: firstProduct },
      { expectedAnswer: firstRemainder },
      { expectedAnswer: quotientOnes },
      { expectedAnswer: secondProduct },
      { expectedAnswer: finalRemainder },
    ],
  };
}

export function getFooterExpressionTokens({
  dentakuPractice,
  expressionTokens,
  isClear,
  mode,
  pendingBubbles,
}: {
  dentakuPractice?: DentakuPractice;
  expressionTokens: string[];
  isClear: boolean;
  mode: 'stage' | 'launch';
  pendingBubbles: PendingBubble[];
}) {
  const problem = dentakuPractice?.longFormMode ? getLongFormProblem(dentakuPractice) : undefined;
  if (problem && isClear) {
    return [String(problem.left), problem.operator, String(problem.right), '=', String(problem.answer)];
  }

  if (mode === 'launch' && pendingBubbles.length > 0) {
    return [String(LAUNCH_INITIAL_TOTAL), '+'];
  }

  return expressionTokens;
}

export function buildLongFormRows(problem: LongFormProblem, answerText: string, showGuideRows: boolean, stepIndex: number): LongFormRow[] {
  if (problem.operator === '÷') {
    return buildDivisionLongFormRows(problem, answerText, stepIndex);
  }

  if (problem.operator === '×') {
    return buildMultiplicationLongFormRows(problem, answerText, stepIndex);
  }

  const operandWidth = Math.max(String(problem.left).length, String(problem.right).length, String(problem.answer).length);
  const shouldShowGuideRows = (problem.operator === '+' || problem.operator === '-')
    ? stepIndex > 0
    : showGuideRows;
  const guideRows = shouldShowGuideRows ? buildPlaceValueGuideRows(problem, operandWidth) : [];
  const answerCells = buildLongFormAnswerCells(problem, answerText, operandWidth, stepIndex);
  const activePlaceColumn = getLongFormActivePlaceColumn(problem, operandWidth, stepIndex);
  const leftCells = activePlaceColumn == null
    ? formatLongFormNumber(problem.left)
    : formatLongFormPlaceNumber(problem.left, operandWidth, activePlaceColumn);
  const displayedLeftCells = markLongFormBorrowedTensCell(problem, leftCells, operandWidth, stepIndex);
  const rightCells = activePlaceColumn == null
    ? formatLongFormNumber(problem.right)
    : formatLongFormPlaceNumber(problem.right, operandWidth, activePlaceColumn);

  return [
    ...guideRows,
    { id: 'left', cells: displayedLeftCells },
    { id: 'right', operatorLabel: problem.operator, hasDivider: true, cells: rightCells },
    { id: 'answer', cells: answerCells },
  ];
}

function buildMultiplicationLongFormRows(problem: LongFormProblem, answerText: string, stepIndex: number): LongFormRow[] {
  const state = getLongFormMultiplicationState(problem);
  if (!state) {
    return [
      { id: 'left', cells: formatLongFormNumber(problem.left) },
      { id: 'right', operatorLabel: problem.operator, hasDivider: true, cells: formatLongFormNumber(problem.right) },
      { id: 'answer', cells: formatLongFormNumber(answerText, { unknown: answerText === '?' }) },
    ];
  }

  const width = state.answerWidth;
  const activeOperandColumns = getMultiplicationActiveOperandColumns(state, stepIndex);
  const leftCells = activeOperandColumns.left == null
    ? padLongFormCells(formatLongFormNumber(problem.left), width)
    : formatLongFormPlaceNumber(problem.left, width, activeOperandColumns.left);
  const rightCells = activeOperandColumns.right == null
    ? padLongFormCells(formatLongFormNumber(problem.right), width)
    : formatLongFormPlaceNumber(problem.right, width, activeOperandColumns.right);
  const additionGuideRows = buildMultiplicationAdditionGuideRows(state, stepIndex);
  const partialRows = buildMultiplicationPartialRows(state, answerText, stepIndex);
  const answerCells = buildMultiplicationAnswerCells(problem, state, answerText, stepIndex);
  const isAdditionStage = stepIndex >= state.partialProducts.length;

  return [
    { id: 'left', cells: leftCells },
    { id: 'right', operatorLabel: problem.operator, hasDivider: true, cells: rightCells },
    ...additionGuideRows,
    ...partialRows.map((row, index) => ({
      id: `partial-${index}`,
      cells: row,
      operatorLabel: isAdditionStage && index === state.partialProducts.length - 1 ? '+' : undefined,
      hasDivider: isAdditionStage && index === state.partialProducts.length - 1,
    })),
    ...(isAdditionStage ? [{ id: 'answer', cells: answerCells }] : []),
  ];
}

function getMultiplicationActiveOperandColumns(state: NonNullable<ReturnType<typeof getLongFormMultiplicationState>>, stepIndex: number) {
  const partial = state.partialProducts[stepIndex];
  if (!partial) {
    return {};
  }

  return {
    left: state.answerWidth - 2 + partial.leftColumn,
    right: state.answerWidth - 2 + partial.rightColumn,
  };
}

function buildMultiplicationAdditionGuideRows(state: NonNullable<ReturnType<typeof getLongFormMultiplicationState>>, stepIndex: number): LongFormRow[] {
  const additionStep = state.additionSteps[stepIndex - state.partialProducts.length];
  if (!additionStep || additionStep.carryIn <= 0) {
    return [];
  }

  return [{
    id: 'multiply-addition-carry',
    isGuide: true,
    cells: placeLongFormGuideCell(state.answerWidth, additionStep.column, String(additionStep.carryIn)),
  }];
}

function buildMultiplicationPartialRows(state: NonNullable<ReturnType<typeof getLongFormMultiplicationState>>, answerText: string, stepIndex: number): LongFormCell[][] {
  const width = state.answerWidth;
  const rows: LongFormCell[][] = [];
  const visibleRowCount = stepIndex >= state.partialProducts.length ? state.partialProducts.length : stepIndex + 1;
  const additionStep = state.additionSteps[stepIndex - state.partialProducts.length];

  for (let index = 0; index < visibleRowCount; index += 1) {
    const partial = state.partialProducts[index];
    if (index < stepIndex || stepIndex >= state.partialProducts.length) {
      rows.push(markActiveLongFormColumn(formatLongFormNumberToWidth(partial.value, width), additionStep?.column));
      continue;
    }

    const placeMultiplier = getMultiplicationPartialPlaceMultiplier(partial);
    const visibleValue = answerText === '?' ? getMultiplicationPartialPlaceholder(placeMultiplier) : String(Number(answerText) * placeMultiplier);
    rows.push(placeInputTextInLongFormCells(width, width - 1, visibleValue, true));
  }

  return rows;
}

function markActiveLongFormColumn(cells: LongFormCell[], activeColumn: number | undefined): LongFormCell[] {
  if (activeColumn == null) {
    return cells;
  }

  return cells.map((cell, index) => ({
    ...cell,
    isActive: cell.value !== '' && index === activeColumn,
  }));
}

function getMultiplicationPartialPlaceMultiplier(partial: { leftColumn: number; rightColumn: number }) {
  return 10 ** ((1 - partial.leftColumn) + (1 - partial.rightColumn));
}

function getMultiplicationPartialPlaceholder(placeMultiplier: number) {
  const zeroCount = Math.max(0, String(placeMultiplier).length - 1);
  return `${'?'}${'0'.repeat(zeroCount)}`;
}

function buildMultiplicationAnswerCells(problem: LongFormProblem, state: NonNullable<ReturnType<typeof getLongFormMultiplicationState>>, answerText: string, stepIndex: number): LongFormCell[] {
  const width = state.answerWidth;
  if (stepIndex < state.partialProducts.length) {
    return placeLongFormGuideCell(width, width - 1, '?').map((cell) => ({
      ...cell,
      isActive: false,
      isUnknown: cell.value === '?',
    }));
  }

  const completedDigits = String(problem.answer).padStart(width, ' ').split('');
  const activeColumn = state.additionSteps[stepIndex - state.partialProducts.length]?.column ?? 0;
  const currentAnswerText = answerText === '?' ? '?' : answerText;
  return Array.from({ length: width }, (_, index) => {
    if (index < activeColumn) {
      return { value: '' };
    }
    if (index === activeColumn) {
      return {
        value: currentAnswerText,
        isActive: true,
        isUnknown: currentAnswerText === '?',
      };
    }
    const value = completedDigits[index] === ' ' ? '' : completedDigits[index];
    return { value };
  });
}

function markLongFormBorrowedTensCell(problem: LongFormProblem, cells: LongFormCell[], width: number, stepIndex: number) {
  if (problem.operator !== '-' || stepIndex <= 0 || width < 2 || problem.left % 10 >= problem.right % 10) {
    return cells;
  }

  return cells.map((cell, index) => (
    index === width - 2
      ? { ...cell, isStruck: true }
      : cell
  ));
}

function getLongFormActivePlaceColumn(problem: LongFormProblem, width: number, stepIndex: number) {
  if (problem.operator !== '+' && problem.operator !== '-') {
    return undefined;
  }

  if (stepIndex <= 0) {
    return width - 1;
  }

  return width >= 2 ? width - 2 : undefined;
}

function buildLongFormAnswerCells(problem: LongFormProblem, answerText: string, width: number, stepIndex: number): LongFormCell[] {
  if (problem.operator !== '+' && problem.operator !== '-') {
    return formatLongFormNumber(answerText, { unknown: answerText === '?' });
  }

  if (stepIndex > 0) {
    const placeStep = getLongFormPlaceStep(problem);
    const onesDigit = placeStep ? placeStep.onesAnswer % 10 : 0;
    const placeAnswerText = answerText === '?' ? '?' : answerText;
    const answerPrefixCells = formatLongFormNumber(placeAnswerText, {
      active: true,
      unknown: answerText === '?',
    });
    const maxPrefixWidth = Math.max(1, width - 1);
    const trimmedPrefixCells = answerPrefixCells.slice(-maxPrefixWidth);
    return [
      ...Array.from({ length: Math.max(0, width - 1 - trimmedPrefixCells.length) }, () => ({ value: '' })),
      ...trimmedPrefixCells,
      { value: String(onesDigit) },
    ];
  }

  if (answerText !== '?') {
    return formatLongFormNumber(answerText);
  }

  if (stepIndex <= 0) {
    return placeLongFormGuideCell(width, width - 1, '?').map((cell) => ({
      ...cell,
      isActive: cell.value === '?',
      isUnknown: cell.value === '?',
    }));
  }

  return formatLongFormNumber(answerText, { unknown: answerText === '?' });
}

function buildDivisionLongFormRows(problem: LongFormProblem, answerText: string, stepIndex: number): LongFormRow[] {
  const state = getLongFormDivisionState(problem);
  if (state) {
    return buildStructuredDivisionLongFormRows(problem, state, answerText, stepIndex);
  }

  return [
    {
      id: 'division-question',
      cells: [
        ...formatLongFormNumber(problem.left),
        { value: '÷' },
        ...formatLongFormNumber(problem.right),
      ],
    },
    {
      id: 'division-answer',
      operatorLabel: '=',
      hasDivider: true,
      cells: formatLongFormNumber(answerText, { unknown: answerText === '?' }),
    },
  ];
}

function buildStructuredDivisionLongFormRows(problem: LongFormProblem, state: NonNullable<ReturnType<typeof getLongFormDivisionState>>, answerText: string, stepIndex: number): LongFormRow[] {
  const width = 2;
  const quotientCells = buildDivisionQuotientCells(problem, state, answerText, stepIndex);
  const dividendCells = markActiveLongFormColumn(formatLongFormNumberToWidth(problem.left, width), stepIndex <= 0 ? 0 : undefined);
  const rows: LongFormRow[] = [
    { id: 'division-quotient', cells: quotientCells },
    { id: 'division-dividend', operatorLabel: `${problem.right})`, hasTopDivider: true, isDivisionBar: true, cells: dividendCells },
  ];

  if (stepIndex >= 1) {
    rows.push({ id: 'division-first-product', operatorLabel: '-', hasDivider: true, cells: buildDivisionStepCells(width, 0, state.firstProduct, answerText, 1, stepIndex) });
  }

  if (stepIndex >= 2) {
    rows.push({ id: 'division-first-remainder', cells: buildDivisionFirstRemainderCells(state, answerText, stepIndex) });
  }

  if (stepIndex >= 4) {
    rows.push({ id: 'division-second-product', operatorLabel: '-', hasDivider: true, cells: buildDivisionStepCells(width, 1, state.secondProduct, answerText, 4, stepIndex) });
  }

  if (stepIndex >= 5) {
    rows.push({ id: 'division-final-remainder', cells: buildDivisionStepCells(width, 1, state.finalRemainder, answerText, 5, stepIndex) });
  }

  return rows;
}

function buildDivisionQuotientCells(problem: LongFormProblem, state: NonNullable<ReturnType<typeof getLongFormDivisionState>>, answerText: string, stepIndex: number): LongFormCell[] {
  if (stepIndex <= 0) {
    return placeInputTextInLongFormCells(2, 0, answerText, true);
  }

  if (stepIndex <= 3) {
    return [
      { value: String(state.quotientTens) },
      { value: stepIndex === 3 ? answerText : '', isActive: stepIndex === 3, isUnknown: stepIndex === 3 && answerText === '?' },
    ];
  }

  return formatLongFormNumberToWidth(problem.answer, 2);
}

function buildDivisionStepCells(width: number, endColumn: number, completedValue: number, answerText: string, activeStep: number, stepIndex: number): LongFormCell[] {
  if (stepIndex < activeStep) {
    return placeInputTextInLongFormCells(width, endColumn, '?', false);
  }

  if (stepIndex === activeStep) {
    return placeInputTextInLongFormCells(width, endColumn, answerText, true);
  }

  return placeInputTextInLongFormCells(width, endColumn, String(completedValue), false);
}

function buildDivisionFirstRemainderCells(state: NonNullable<ReturnType<typeof getLongFormDivisionState>>, answerText: string, stepIndex: number): LongFormCell[] {
  if (stepIndex < 2) {
    return placeInputTextInLongFormCells(2, 0, '?', false);
  }

  if (stepIndex === 2) {
    return placeInputTextInLongFormCells(2, 0, answerText, true);
  }

  return [
    { value: String(state.firstRemainder) },
    { value: String(state.dividendOnes) },
  ];
}

function buildPlaceValueGuideRows(problem: LongFormProblem, width: number): LongFormRow[] {
  if (problem.operator === '+') {
    const onesSum = problem.left % 10 + problem.right % 10;
    if (onesSum >= 10 && width >= 2) {
      return [{ id: 'carry', isGuide: true, cells: placeLongFormGuideCell(width, width - 2, '1') }];
    }
    return [];
  }

  if (problem.operator === '-') {
    const needsBorrow = problem.left >= 10 && problem.left % 10 < problem.right % 10;
    if (needsBorrow && width >= 2) {
      const tensAfterBorrow = Math.floor(problem.left / 10) - 1;
      return [{ id: 'borrow', isGuide: true, cells: placeLongFormGuideCell(width, width - 2, String(tensAfterBorrow)) }];
    }
  }

  return [];
}

function formatLongFormNumber(value: number | string, options: { active?: boolean; unknown?: boolean } = {}): LongFormCell[] {
  return Array.from(String(value)).map((digit) => ({
    value: digit,
    isActive: options.active,
    isUnknown: options.unknown || digit === '?',
  }));
}

function formatLongFormNumberToWidth(value: number | string, width: number, options: { active?: boolean; unknown?: boolean } = {}): LongFormCell[] {
  return padLongFormCells(formatLongFormNumber(value, options), width);
}

function placeInputTextInLongFormCells(width: number, endColumn: number, value: string, active: boolean): LongFormCell[] {
  const text = value || '?';
  const digits = Array.from(text);
  const cells: LongFormCell[] = Array.from({ length: width }, () => ({ value: '' }));
  const firstColumn = Math.max(0, endColumn - digits.length + 1);

  digits.forEach((digit, index) => {
    const column = firstColumn + index;
    if (column > endColumn || column >= width) {
      return;
    }
    cells[column] = {
      value: digit,
      isActive: active,
      isUnknown: digit === '?',
    };
  });

  return cells;
}

function formatLongFormPlaceNumber(value: number | string, width: number, activeColumn: number): LongFormCell[] {
  const digits = Array.from(String(value));
  const leadingBlankCount = Math.max(0, width - digits.length);
  return Array.from({ length: width }, (_, cellIndex) => {
    const digitIndex = cellIndex - leadingBlankCount;
    const digit = digitIndex >= 0 ? digits[digitIndex] : '';
    return {
      value: digit,
      isActive: digit !== '' && cellIndex === activeColumn,
    };
  });
}

export function padLongFormCells(cells: LongFormCell[], width: number): LongFormCell[] {
  if (cells.length >= width) {
    return cells;
  }

  return [
    ...Array.from({ length: width - cells.length }, () => ({ value: '' })),
    ...cells,
  ];
}

function placeLongFormGuideCell(width: number, index: number, value: string): LongFormCell[] {
  return Array.from({ length: width }, (_, cellIndex) => ({
    value: cellIndex === index ? value : '',
    isActive: cellIndex === index,
  }));
}
