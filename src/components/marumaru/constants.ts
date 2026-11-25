// Sizes, timings and tuning values of the game screen.
import type { OperatorButtonSymbol } from '@/components/marumaru/types';
import { PlaceValue } from '@/game/types';

export const FIELD_MARGIN = 0;
export const OPERATOR_TABS_HEIGHT = 64;
export const HEADER_HEIGHT = 112;
export const FOOTER_HEIGHT = 96;
export const PREVIEW_Y = 38;
export const ATTRACTION_RADIUS = 220;
export const ATTRACTION_FORCE = 0.000095;
export const ANNIHILATION_ATTRACTION_RADIUS = 360;
export const ANNIHILATION_ATTRACTION_FORCE = 0.00032;
export const SEPARATION_RADIUS = 92;
export const SEPARATION_FORCE = 0.000075;
export const BASIN_BODY_THICKNESS = 18;
export const BASIN_FRAME_THICKNESS = 5;
export const FIELD_ENTITY_INSET = 10;
export const BASIN_ENTITY_GUARD_MARGIN = 3;
export const BUBBLE_ROW_Y = 56;
// Bubbles go in one row until their widths add up to more than this share of the board's width.
export const PENDING_BUBBLE_ROW_FILL_LIMIT = 1.15;
// How far below the first row the second one sits: about one big bubble.
export const PENDING_BUBBLE_SECOND_ROW_OFFSET = 118;
export const MERGE_ANIMATION_MS = 520;
export const UNIT_MERGE_ANIMATION_MS = 560;
export const MERGE_COOLDOWN_MS = 420;
export const UNIT_MERGE_COOLDOWN_MS = 540;
export const UNIT_MERGE_READY_DELAY_MS = 360;
export const UNIT_MERGE_MIN_SETTLED_Y_RATIO = 0.34;
export const UNIT_MERGE_MAX_CLUSTER_SPEED = 5.2;
export const LAUNCH_INITIAL_TOTAL = 8;
export const LAUNCH_BUBBLE_COUNT = 5;
export const LAUNCH_TARGET = 13;
export const BUBBLE_BURST_ANIMATION_MS = 120;
export const ANNIHILATION_ANIMATION_MS = 420;
export const DIVISION_SPLIT_ANIMATION_MS = 760;
export const DIVISION_FAILED_ANIMATION_MS = 980;
export const MULTIPLICATION_EXPANSION_HOLD_MS = 1100;
export const PRODUCT_BUBBLE_BURST_DELAY_MS = 1250;
export const BACKGROUND_BUBBLE_TICK_MS = 90;
export const RESULT_TICK_MS = 90;
export const IDLE_HINT_DELAY_MS = 2200;
export const IDLE_HINT_PULSE_MS = 720;
export const FEEDBACK_TICK_MS = 90;
export const IDLE_CHECK_MS = 90;
export const RESULT_READY_DELAY_MS = 1400;
// でんたく and くく: after this many wrong answers to one question, the maru act the calculation out.
export const WRONG_ANSWERS_BEFORE_MARU = 2;
// How long those maru stay in full view before the answer pad comes back over them by itself.
export const LOOK_AT_MARU_MS = 8000;
export const QUEUED_MOVE_CHECK_MS = 80;
export const STUCK_AFTER_REFUSAL_MS = 700;
export const STUCK_WITHOUT_TRYING_MS = 5000;
export const LONG_FORM_QUESTION_TRANSITION_MS = 420;
export const FAILED_VEIL_FADE_IN_MS = 3200;
export const FIELD_BUBBLE_AUTO_BURST_IDLE_MS = 650;
export const FIELD_BUBBLE_AUTO_BURST_STEP_MS = 360;
export const BASIN_POINT_COUNT = 45;
export const BUBBLE_BURST_DROP_COUNT = 6;
export const BUBBLE_BURST_SHARD_COUNT = 3;
export const MERGE_POP_PARTICLE_COUNT = 4;
export const OPERATORS: OperatorButtonSymbol[] = ['+', '-', '×', '÷'];
export const OPERATOR_NAMES: Record<OperatorButtonSymbol, string> = { '+': 'plus', '-': 'minus', '×': 'times', '÷': 'divided by' };
export const PLAYFUL_FONT_FAMILY = 'Noto Sans Japanese';
export const LATIN_FONT_FAMILY = 'Helvetica';
export const TEXT_BASE_COLOR = '#12334A';
export const TEXT_ACCENT_COLOR = '#0284C7';
export const GRID = 8;
export const RADIUS_SM = 8;
export const RADIUS_LG = 16;
export const RADIUS_PILL = 999;
export const HEADER_ACTION_BUTTON_SIZE = 48;
export const MIN_TOUCH_TARGET_SIZE = 88;
export const KUKU_QUESTION_BASE_FONT_SIZE = 38;
export const KUKU_QUESTION_MIN_FONT_SIZE = 14;
export const TAP_DRIFT_TO_BURST_THRESHOLD = 24;
export const DETAILED_RELEASE_BEAD_LIMIT = 10;
export const MULTIPLIER_BUBBLE_X_STEP = 0.34;
export const MULTIPLIER_BUBBLE_Y_STEP = 0.28;
export const COLLISION_CATEGORY_WORLD = 0x0001;
export const COLLISION_CATEGORY_BY_VALUE: Record<PlaceValue, number> = {
  1: 0x0002,
  10: 0x0004,
  100: 0x0008,
  1000: 0x0010,
  10000: 0x0020,
  100000: 0x0040,
};
