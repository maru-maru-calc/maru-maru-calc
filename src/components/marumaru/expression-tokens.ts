// Building the expression shown under the field (for example "2 × 3 + 4") as the player goes.
import { OperatorSymbol, evaluateExpressionTokens, isOperatorToken, stripExpressionResult } from '@/game/expression';
import { BeadSign, PlaceValue } from '@/game/types';

export function formatResultExpression(tokens: string[], target: number) {
  const expressionTokens = stripExpressionResult(tokens);
  const meaningfulTokens = isOperatorToken(expressionTokens[expressionTokens.length - 1])
    ? expressionTokens.slice(0, -1)
    : expressionTokens;

  if (meaningfulTokens.length === 0) {
    return String(target);
  }

  return meaningfulTokens.join(' ');
}

export function getMergeMessage(from: PlaceValue, to: PlaceValue) {
  if (from === 1) {
    return `1のまる 10こで ${to}`;
  }
  return `${from}のまる 10こで ${to}`;
}

export function addNumberToExpression(tokens: string[], value: number, selectedOperator: OperatorSymbol, totalValue: number) {
  const expressionTokens = stripExpressionResult(tokens);
  const nextTokens = [...expressionTokens];

  if (nextTokens.length === 0) {
    return [formatSignedInitialValue(value, selectedOperator), selectedOperator];
  } else if (isOperatorToken(nextTokens[nextTokens.length - 1])) {
    nextTokens.push(String(value));
  } else {
    nextTokens.push(selectedOperator, String(value));
  }

  return completeExpression(nextTokens, totalValue);
}

function formatSignedInitialValue(value: number, selectedOperator: OperatorSymbol) {
  return selectedOperator === '-' ? `-${value}` : String(value);
}

export function formatSignedCount(value: number) {
  return value < 0 ? `-${Math.abs(value)}` : String(value);
}

export function multiplySigns(left: BeadSign, right: BeadSign): BeadSign {
  return left === right ? 1 : -1;
}

export function getMultiplicationExpressionTokens(
  previousTokens: string[],
  remainingTotal: number,
  multiplicand: number,
  multiplier: number,
  result: number,
) {
  const previousExpression = getPreviousExpressionForValue(previousTokens, multiplicand);
  const leftTokens = previousExpression ?? [String(multiplicand)];
  const multiplicationTokens = [...leftTokens, '×', String(multiplier)];
  if (previousExpression) {
    return [...multiplicationTokens, '=', String(multiplicand * multiplier)];
  }

  if (remainingTotal === 0) {
    return [...multiplicationTokens, '=', String(result)];
  }

  const connector = remainingTotal > 0 ? '+' : '-';
  return [String(Math.abs(remainingTotal)), connector, ...multiplicationTokens, '=', String(result)];
}

export function getDivisionExpressionTokens(
  previousTokens: string[],
  remainingTotal: number,
  dividend: number,
  divisor: number,
  result: number,
) {
  const previousExpression = getPreviousExpressionForValue(previousTokens, dividend);
  const leftTokens = previousExpression ?? [String(dividend)];
  const divisionTokens = [...leftTokens, '÷', String(divisor)];
  if (previousExpression) {
    return [...divisionTokens, '=', String(dividend / divisor)];
  }

  if (remainingTotal === 0) {
    return [...divisionTokens, '=', String(result)];
  }

  const connector = remainingTotal > 0 ? '+' : '-';
  return [String(Math.abs(remainingTotal)), connector, ...divisionTokens, '=', String(result)];
}

function getPreviousExpressionForValue(tokens: string[], value: number) {
  const strippedTokens = stripExpressionResult(tokens);
  const expressionTokens = isOperatorToken(strippedTokens[strippedTokens.length - 1]) ? strippedTokens.slice(0, -1) : strippedTokens;
  if (expressionTokens.length === 0) {
    return undefined;
  }

  const evaluatedValue = evaluateExpressionTokens(expressionTokens);
  if (evaluatedValue === undefined || Math.abs(evaluatedValue - value) > 0.00001) {
    return undefined;
  }

  if (expressionTokens.some((token) => token === '+' || token === '-')) {
    return [`(${expressionTokens.join(' ')})`];
  }

  return expressionTokens;
}

function getCurrentExpressionResult(tokens: string[]) {
  const expressionTokens = stripExpressionResult(tokens);
  if (expressionTokens.length === 0 || isOperatorToken(expressionTokens[expressionTokens.length - 1])) {
    return undefined;
  }
  return evaluateExpressionTokens(expressionTokens);
}

function completeExpression(tokens: string[], result: number) {
  if (tokens.length === 0 || tokens.includes('=')) {
    return tokens;
  }

  if (isOperatorToken(tokens[tokens.length - 1])) {
    return tokens;
  }

  return [...tokens, '=', String(result)];
}
