import { useCallback, useEffect, useMemo, useState } from 'react';

import { MarumaruGame } from '@/components/MarumaruGame';
import { createDentakuQuestions, DentakuStage } from '@/game/dentaku';

type DentakuGameProps = {
  stage: DentakuStage;
  onBack: () => void;
  onNextStage: () => void;
  onStageClear: (stageId: string) => void;
};

export function DentakuGame({ stage, onBack, onNextStage, onStageClear }: DentakuGameProps) {
  const [seed, setSeed] = useState(() => Date.now());
  const [endlessQuestionIndex, setEndlessQuestionIndex] = useState(0);
  const questions = useMemo(() => createDentakuQuestions(stage, seed + endlessQuestionIndex * 9973), [endlessQuestionIndex, stage, seed]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const question = questions[Math.min(questionIndex, questions.length - 1)];

  useEffect(() => {
    setSeed(Date.now());
    setEndlessQuestionIndex(0);
    setQuestionIndex(0);
  }, [stage.id]);

  const goNextQuestion = useCallback(() => {
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
  }, [onNextStage, onStageClear, questionIndex, questions.length, stage.id, stage.isEndless]);

  const dentakuPractice = useMemo(
    () => ({
      questionKey: `${stage.id}-${question.id}`,
      operands: question.operands,
      operators: question.operators,
      answer: question.answer,
      prompt: question.prompt,
      autoAdvance: stage.worldId === 'kuku',
      onNextQuestion: goNextQuestion,
    }),
    [goNextQuestion, question.answer, question.id, question.operands, question.operators, question.prompt, stage.id, stage.worldId],
  );

  return <MarumaruGame onBack={onBack} dentakuPractice={dentakuPractice} />;
}
