import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { MarumaruGame } from '@/components/MarumaruGame';
import { createDentakuQuestions, DentakuQuestion, DentakuStage } from '@/game/dentaku';
import { getKukuFactId } from '@/game/kuku-weak-facts';
import { createLongFormQuestions } from '@/game/long-form-questions';

// A missed times-table question comes back at most this often, so a stage always ends.
const MAX_REPEATS_PER_QUESTION = 2;
const REPEAT_ID_MARK = '-again-';

type DentakuGameProps = {
  stage: DentakuStage;
  longFormMode?: boolean;
  /** Times-table facts missed on earlier visits; the mixed stage brings them back. */
  weakKukuFacts?: string[];
  /** A times-table fact was answered: missed, or right at the first try. */
  onKukuFactAnswered?: (factId: string, answer: 'missed' | 'rightAtFirstTry', showsKnowing: boolean) => void;
  onBack: () => void;
  onNextStage: () => void;
  onStageClear: (stageId: string) => void;
};

const NO_FACTS: string[] = [];

export function DentakuGame({ stage, longFormMode = false, weakKukuFacts = NO_FACTS, onKukuFactAnswered, onBack, onNextStage, onStageClear }: DentakuGameProps) {
  const [seed, setSeed] = useState(() => Date.now());
  const [endlessQuestionIndex, setEndlessQuestionIndex] = useState(0);
  // The remembered misses as they were when this round began. A miss made during the round must
  // not redraw the round's questions under the child's hands.
  const [weakFactsOfRound, setWeakFactsOfRound] = useState(weakKukuFacts);
  const latestWeakFactsRef = useRef(weakKukuFacts);
  useEffect(() => {
    latestWeakFactsRef.current = weakKukuFacts;
  }, [weakKukuFacts]);
  const stageQuestions = useMemo(() => (
    longFormMode
      ? createLongFormQuestions(stage, seed + endlessQuestionIndex * 9973)
      : createDentakuQuestions(stage, seed + endlessQuestionIndex * 9973, weakFactsOfRound)
  ), [endlessQuestionIndex, longFormMode, stage, seed, weakFactsOfRound]);
  // Times-table questions that took more than one try come round again after the others.
  const [repeatedQuestions, setRepeatedQuestions] = useState<DentakuQuestion[]>([]);
  const questions = useMemo(() => [...stageQuestions, ...repeatedQuestions], [repeatedQuestions, stageQuestions]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const question = questions[Math.min(questionIndex, questions.length - 1)];
  const repeatsWrongAnswers = stage.worldId === 'kuku' && !longFormMode;
  const wasAnsweredWrongRef = useRef(false);

  useEffect(() => {
    setSeed(Date.now());
    setEndlessQuestionIndex(0);
    setQuestionIndex(0);
    setWeakFactsOfRound(latestWeakFactsRef.current);
  }, [stage.id]);

  useEffect(() => {
    setRepeatedQuestions((current) => (current.length === 0 ? current : []));
  }, [stageQuestions]);

  useEffect(() => {
    wasAnsweredWrongRef.current = false;
  }, [question.id, stage.id]);

  // Only noted here: the list grows when the question is finally answered, so that the question
  // on screen (and the "wrong" shake playing on it) is not replaced in the middle.
  const noteWrongAnswer = useCallback(() => {
    wasAnsweredWrongRef.current = true;
  }, []);

  const goNextQuestion = useCallback(() => {
    const factId = repeatsWrongAnswers ? getKukuFactId(question.operands, question.operators) : null;
    if (factId) {
      // Right on a second asking, just after seeing the answer, says little; only a miss counts there.
      const isFirstAsking = !question.id.includes(REPEAT_ID_MARK);
      const showsKnowing = stage.kind === 'kukuRandomAll' || stage.isShuffled === true;
      if (wasAnsweredWrongRef.current) {
        onKukuFactAnswered?.(factId, 'missed', showsKnowing);
      } else if (isFirstAsking) {
        onKukuFactAnswered?.(factId, 'rightAtFirstTry', showsKnowing);
      }
    }

    const firstAskedId = question.id.split(REPEAT_ID_MARK)[0];
    const timesRepeated = repeatedQuestions.filter((repeated) => repeated.id.split(REPEAT_ID_MARK)[0] === firstAskedId).length;
    if (repeatsWrongAnswers && wasAnsweredWrongRef.current && timesRepeated < MAX_REPEATS_PER_QUESTION) {
      wasAnsweredWrongRef.current = false;
      setRepeatedQuestions((current) => [...current, { ...question, id: `${firstAskedId}${REPEAT_ID_MARK}${current.length + 1}` }]);
      setQuestionIndex((current) => current + 1);
      return;
    }

    if (questionIndex >= questions.length - 1) {
      if (stage.isEndless) {
        onStageClear(stage.id);
        setSeed(Date.now());
        setEndlessQuestionIndex((current) => current + 1);
        setQuestionIndex(0);
        return;
      }
      onStageClear(stage.id);
      onNextStage();
      return;
    }

    setQuestionIndex((current) => current + 1);
  }, [onKukuFactAnswered, onNextStage, onStageClear, question, questionIndex, questions.length, repeatedQuestions, repeatsWrongAnswers, stage.id, stage.isEndless, stage.isShuffled, stage.kind]);

  const dentakuPractice = useMemo(
    () => ({
      // The round is part of the key, so an endless stage that draws the same question twice in a row still starts it afresh.
      questionKey: `${stage.id}-${endlessQuestionIndex}-${question.id}`,
      operands: question.operands,
      operators: question.operators,
      answer: question.answer,
      prompt: question.prompt,
      stageLabel: stage.label,
      questionNumber: questionIndex + 1,
      questionTotal: questions.length,
      autoAdvance: stage.worldId === 'kuku',
      longFormMode,
      onNextQuestion: goNextQuestion,
      onWrongAnswer: noteWrongAnswer,
    }),
    [endlessQuestionIndex, goNextQuestion, noteWrongAnswer, longFormMode, question.answer, question.id, question.operands, question.operators, question.prompt, questionIndex, questions.length, stage.id, stage.label, stage.worldId],
  );

  return <MarumaruGame onBack={onBack} dentakuPractice={dentakuPractice} />;
}
