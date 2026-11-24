// The result panel with its star.
import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import { styles } from '@/components/marumaru/styles';
import { NavImageIcon } from '@/components/NavImageIcon';
import { a11yLabel } from '@/i18n/a11y-label';

function StageResultOverlay({
  equation,
  result,
  onRetry,
  onStageSelect,
  onNextStage,
}: {
  equation: string;
  result: 'clear' | 'failed';
  onRetry: () => void;
  onStageSelect?: () => void;
  onNextStage?: () => void;
}) {
  const isClearResult = result === 'clear';
  const equationFontSize = getResultEquationFontSize(equation);

  return (
    <View style={[styles.resultPanel, !isClearResult && styles.resultPanelFailed]}>
      <View style={styles.resultMain}>
        {isClearResult ? <ResultStar /> : <BrokenResultStar />}
        <Text
          accessibilityLabel={a11yLabel(isClearResult ? 'clear equation' : 'failed equation')}
          style={[
            styles.resultEquation,
            { fontSize: equationFontSize, lineHeight: Math.round(equationFontSize * 1.2) },
            !isClearResult && styles.failedEquation,
          ]}
          numberOfLines={2}
          adjustsFontSizeToFit
          minimumFontScale={0.32}
          ellipsizeMode="clip"
        >
          {equation}
        </Text>
      </View>
      <View style={[styles.resultActions, !isClearResult && styles.resultActionsFailed]}>
        <ResultActionButton accessibilityLabel={a11yLabel(isClearResult ? 'Next stage' : 'Retry')} primary onPress={isClearResult && onNextStage ? onNextStage : onRetry}>
          <NavImageIcon kind={isClearResult ? 'next' : 'retry'} size={36} />
        </ResultActionButton>
      </View>
    </View>
  );
}

function getResultEquationFontSize(equation: string) {
  if (equation.length > 44) {
    return 18;
  }
  if (equation.length > 34) {
    return 21;
  }
  if (equation.length > 26) {
    return 25;
  }
  return 34;
}

function ResultStar() {
  return (
    <View accessibilityLabel={a11yLabel('clear starfish')} style={styles.resultStar}>
      <RoundedStarfish size={58} />
    </View>
  );
}

export function RoundedStarfish({ size, style }: { size: number; style?: StyleProp<ViewStyle> }) {
  const armWidth = size * 0.34;
  const armHeight = size * 0.5;
  const center = size / 2;
  const armRadius = size * 0.23;
  const dotSize = size * 0.12;

  return (
    <View style={[{ width: size, height: size }, style]}>
      {[0, 1, 2, 3, 4].map((index) => {
        const angle = -90 + index * 72;
        const radians = (angle * Math.PI) / 180;
        return (
          <View
            key={index}
            style={[
              styles.roundedStarfishArm,
              {
                width: armWidth,
                height: armHeight,
                borderRadius: armWidth,
                left: center + Math.cos(radians) * armRadius - armWidth / 2,
                top: center + Math.sin(radians) * armRadius - armHeight / 2,
                transform: [{ rotate: `${angle + 90}deg` }],
              },
            ]}
          />
        );
      })}
      <View
        style={[
          styles.roundedStarfishCenter,
          {
            width: size * 0.42,
            height: size * 0.42,
            borderRadius: size * 0.21,
            left: center - size * 0.21,
            top: center - size * 0.21,
          },
        ]}
      />
      {[0, 1, 2].map((index) => (
        <View
          key={index}
          style={[
            styles.roundedStarfishDot,
            {
              width: dotSize,
              height: dotSize,
              borderRadius: dotSize / 2,
              left: center + Math.cos((-72 + index * 72) * (Math.PI / 180)) * (size * 0.18) - dotSize / 2,
              top: center + Math.sin((-72 + index * 72) * (Math.PI / 180)) * (size * 0.18) - dotSize / 2,
            },
          ]}
        />
      ))}
    </View>
  );
}

function BrokenResultStar() {
  return (
    <View accessibilityLabel={a11yLabel('broken medal')} style={styles.brokenMedal}>
      <View style={[styles.brokenMedalHalf, styles.brokenMedalLeft]}>
        <View style={[styles.brokenMedalFace, styles.brokenMedalFaceLeft]}>
          <Text style={styles.brokenMedalStar}>★</Text>
        </View>
      </View>
      <View style={[styles.brokenMedalHalf, styles.brokenMedalRight]}>
        <View style={[styles.brokenMedalFace, styles.brokenMedalFaceRight]}>
          <Text style={styles.brokenMedalStar}>★</Text>
        </View>
      </View>
      <View style={styles.brokenMedalGapTop} />
      <View style={styles.brokenMedalGapBottom} />
    </View>
  );
}

function ResultActionButton({
  accessibilityLabel,
  children,
  onPress,
  primary = false,
}: {
  accessibilityLabel: string;
  children: ReactNode;
  onPress: () => void;
  primary?: boolean;
}) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.resultActionButton, primary && styles.resultActionButtonPrimary, pressed && styles.pressedButton]}
    >
      {children}
    </Pressable>
  );
}
