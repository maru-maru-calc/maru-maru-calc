import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { MarumaruGame } from '@/components/MarumaruGame';
import { createDentakuQuestions, DentakuQuestion, DentakuStage } from '@/game/dentaku';
import { createLongFormQuestions } from '@/game/long-form-questions';

// A missed times-table question comes back at most this often, so a stage always ends.
const MAX_REPEATS_PER_QUESTION = 2;
const REPEAT_ID_MARK = '-again-';

type DentakuGameProps = {
  stage: DentakuStage;
  longFormMode?: boolean;
  onBack: () => void;
  onNextStage: () => void;
  onStageClear: (stageId: string) => void;
};

export function DentakuGame({ stage, longFormMode = false, onBack, onNextStage, onStageClear }: DentakuGameProps) {
  const [seed, setSeed] = useState(() => Date.now());
  const [endlessQuestionIndex, setEndlessQuestionIndex] = useState(0);
  const stageQuestions = useMemo(() => (
    longFormMode
      ? createLongFormQuestions(stage, seed + endlessQuestionIndex * 9973)
      : createDentakuQuestions(stage, seed + endlessQuestionIndex * 9973)
  ), [endlessQuestionIndex, longFormMode, stage, seed]);
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
  }, [onNextStage, onStageClear, question, questionIndex, questions.length, repeatedQuestions, repeatsWrongAnswers, stage.id, stage.isEndless]);

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
