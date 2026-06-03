import { BeadSnapshot } from './types';

export type OperatorSymbol = '+' | '-' | '×' | '÷';

export function getDisplayBeadsForPendingPriorityExpression(beads: BeadSnapshot[], expressionTokens: string[]) {
  const normalizedTokens = normalizeExpressionTokens(expressionTokens);
  if (!isPriorityOperator(normalizedTokens[normalizedTokens.length - 1])) {
    return beads;
  }

  const expressionValue = getPendingOperationExpressionValue(normalizedTokens);
  if (expressionValue === undefined || expressionValue <= 0 || !Number.isInteger(expressionValue)) {
    return beads;
  }

  const positiveBeads = beads.filter((bead) => bead.sign > 0);
  if (positiveBeads.length === 0) {
    return beads;
  }

  if (positiveBeads.length === 1 && positiveBeads[0].role === 'multiplicand' && getBeadUnitCount(positiveBeads[0]) === expressionValue) {
    return beads;
  }

  const center = getSnapshotCenter(positiveBeads);
  const negativeBeads = beads.filter((bead) => bead.sign < 0);
  return [
    ...negativeBeads,
    {
      id: 'expression-wrap-preview',
      value: 1,
      count: expressionValue,
      sign: 1,
      role: 'multiplicand',
      x: center.x,
      y: center.y,
    } satisfies BeadSnapshot,
  ];
}

export function getPendingOperationExpressionValue(tokens: string[]) {
  const strippedTokens = stripExpressionResult(normalizeExpressionTokens(tokens));
  const expressionTokens = isOperatorToken(strippedTokens[strippedTokens.length - 1]) ? strippedTokens.slice(0, -1) : strippedTokens;
  return evaluateExpressionTokens(expressionTokens);
}

export function replaceTrailingOperator(tokens: string[], operator: OperatorSymbol) {
  if (tokens.length === 0) {
    return tokens;
  }

  if (operator === '×' || operator === '÷') {
    return appendPriorityOperator(tokens, operator);
  }

  const nextTokens = stripExpressionResult(tokens);
  if (isOperatorToken(nextTokens[nextTokens.length - 1])) {
    nextTokens[nextTokens.length - 1] = operator;
    return nextTokens;
  }

  return [...nextTokens, operator];
}

export function evaluateExpressionOnEquals(tokens: string[]) {
  const expressionTokens = stripExpressionResult(tokens);
  const normalizedTokens = unwrapPendingPriorityExpression(expressionTokens);
  if (normalizedTokens.length === 0 || isOperatorToken(normalizedTokens[normalizedTokens.length - 1])) {
    const withoutTrailingOperator = normalizedTokens.slice(0, -1);
    const value = evaluateExpressionTokens(withoutTrailingOperator);
    return value === undefined ? tokens : [...withoutTrailingOperator, '=', String(value)];
  }

  const value = evaluateExpressionTokens(normalizedTokens);
  return value === undefined ? tokens : [...normalizedTokens, '=', String(value)];
}

export function stripExpressionResult(tokens: string[]) {
  const normalizedTokens = normalizeExpressionTokens(tokens);
  const equalsIndex = normalizedTokens.indexOf('=');
  return equalsIndex >= 0 ? normalizedTokens.slice(0, equalsIndex) : normalizedTokens;
}

export function isOperatorToken(token: string | undefined): token is OperatorSymbol {
  return token === '+' || token === '-' || token === '×' || token === '÷';
}

export function isPriorityOperator(token: string | undefined) {
  return token === '×' || token === '÷';
}

export function normalizeExpressionTokens(tokens: string[]): string[] {
  return tokens.flatMap((token) => {
    const trimmedToken = token.trim();
    if (trimmedToken.length === 0) {
      return [];
    }
    if (isOperatorToken(trimmedToken) || trimmedToken === '=') {
      return [trimmedToken];
    }

    const trailingOperator = trimmedToken.at(-1);
    if (isOperatorToken(trailingOperator)) {
      const expression = trimmedToken.slice(0, -1).trim();
      return expression.length > 0 ? [...normalizeExpressionTokens([expression]), trailingOperator] : [trailingOperator];
    }

    const equalsMatch = trimmedToken.match(/^(.*)\s=\s(-?\d+(?:\.\d+)?)$/);
    if (equalsMatch) {
      return [...normalizeExpressionTokens([equalsMatch[1].trim()]), '=', equalsMatch[2]];
    }

    if (!hasSingleOuterParentheses(trimmedToken) && /\s/.test(trimmedToken)) {
      return trimmedToken.split(/\s+/);
    }

    return [trimmedToken];
  });
}

export function evaluateExpressionTokens(tokens: string[]) {
  const normalizedTokens = normalizeExpressionTokens(tokens);
  if (normalizedTokens.length === 0 || isOperatorToken(normalizedTokens[normalizedTokens.length - 1])) {
    return undefined;
  }

  const expandedTokens = normalizedTokens.flatMap((token) => unwrapParenthesizedToken(token) ?? [token]);
  const firstValue = Number(expandedTokens[0]);
  if (!Number.isFinite(firstValue)) {
    return undefined;
  }

  let total = firstValue;
  for (let index = 1; index < expandedTokens.length; index += 2) {
    const operator = expandedTokens[index];
    const value = Number(expandedTokens[index + 1]);
    if (!isOperatorToken(operator) || !Number.isFinite(value)) {
      return undefined;
    }

    if (operator === '+') {
      total += value;
    } else if (operator === '-') {
      total -= value;
    } else if (operator === '×') {
      total *= value;
    } else if (operator === '÷') {
      total /= value;
    }
  }

  return total;
}

function appendPriorityOperator(tokens: string[], operator: OperatorSymbol) {
  const nextTokens = [...tokens];
  if (isOperatorToken(nextTokens[nextTokens.length - 1])) {
    nextTokens[nextTokens.length - 1] = operator;
    return nextTokens;
  }

  const equalsIndex = nextTokens.indexOf('=');
  const expressionTokens = equalsIndex >= 0 ? nextTokens.slice(0, equalsIndex) : nextTokens;
  if (expressionTokens.length === 0) {
    return tokens;
  }

  const normalizedExpressionTokens =
    expressionTokens.length === 1 ? (unwrapParenthesizedToken(expressionTokens[0]) ?? expressionTokens) : expressionTokens;

  return [`(${normalizedExpressionTokens.join(' ')})`, operator];
}

function unwrapPendingPriorityExpression(tokens: string[]) {
  if (tokens.length !== 2 || !isPriorityOperator(tokens[1])) {
    return tokens;
  }

  const wrappedExpression = unwrapParenthesizedToken(tokens[0]);
  return wrappedExpression ?? tokens;
}

function unwrapParenthesizedToken(token: string) {
  const unwrappedToken = unwrapOuterParentheses(token);
  if (unwrappedToken === token) {
    return undefined;
  }

  return unwrappedToken.split(' ');
}

function unwrapOuterParentheses(token: string) {
  let currentToken = token.trim();
  while (hasSingleOuterParentheses(currentToken)) {
    currentToken = currentToken.slice(1, -1).trim();
  }

  return currentToken;
}

function hasSingleOuterParentheses(token: string) {
  if (!token.startsWith('(') || !token.endsWith(')')) {
    return false;
  }

  let depth = 0;
  for (let index = 0; index < token.length; index += 1) {
    const character = token[index];
    if (character === '(') {
      depth += 1;
    } else if (character === ')') {
      depth -= 1;
      if (depth === 0 && index < token.length - 1) {
        return false;
      }
    }
  }

  return depth === 0;
}

function getSnapshotCenter(beads: Pick<BeadSnapshot, 'x' | 'y'>[]) {
  const total = beads.reduce(
    (center, bead) => ({
      x: center.x + bead.x,
      y: center.y + bead.y,
    }),
    { x: 0, y: 0 },
  );

  return {
    x: total.x / beads.length,
    y: total.y / beads.length,
  };
}

function getBeadUnitCount(bead: Pick<BeadSnapshot, 'value' | 'count'>) {
  return bead.value * bead.count;
}
