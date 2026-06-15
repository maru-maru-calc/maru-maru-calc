import { createElement, useEffect, useRef, type ReactNode } from 'react';
import { Asset } from 'expo-asset';
import { useRouter } from 'expo-router';
import { Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View, type StyleProp, type ViewStyle } from 'react-native';
import type { TextStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandLogo } from '@/components/BrandLogo';

const TEXT_BASE_COLOR = '#12334A';
const TEXT_ACCENT_COLOR = '#0284C7';
const WATER_COLOR = '#C6E8F4';
const PANEL_COLOR = 'rgba(246, 253, 255, 0.62)';
const LATIN_FONT_FAMILY = 'Helvetica';
const PLAYFUL_FONT_FAMILY = 'Noto Sans Japanese';
const GRID = 8;
const SECTION_CONTENT_WIDTH = GRID * 123;
const RADIUS_LG = 16;
const RADIUS_XL = 24;
const RADIUS_PILL = 999;
const COPYRIGHT_TEXT = '© 2026 nozomitaguchi';
const DESKTOP_MIN_WIDTH = 900;
const LANDING_DESKTOP_MIN_WIDTH = 1100;
const BASE_PATH = process.env.EXPO_BASE_URL ?? '';
const demoVideoSource = require('../../assets/landing/maru-demo-field-wide-short.webm');
const operationAddVideoSource = require('../../assets/landing/operation-add.webm');
const operationSubtractVideoSource = require('../../assets/landing/operation-subtract.webm');
const operationMultiplyVideoSource = require('../../assets/landing/operation-multiply-short.webm');
const operationDivideVideoSource = require('../../assets/landing/operation-divide-short.webm');

type LandingLocale = 'ja' | 'en' | 'zh-hans' | 'zh-hant' | 'ko' | 'de';

const landingCopy = {
  ja: {
    siteTitle: 'まるまる電卓 | すうじをさわる計算あそび',
    siteDescription: 'まるをさわって、動かして。足し算から割り算まで、数を見た目で感じる子ども向け計算あそび。',
    heroTitleBefore: 'すうじ',
    heroTitleParticle: 'を',
    heroTitleJoiner: '',
    heroTitleAfter: 'さわろう',
    heroSubtitle: '"まる"がまるまる「まるまるでんたく」',
    playWeb: 'web であそぶ',
    playApp: 'アプリであそぶ',
    ageNote: '親子であそぶなら、3歳ごろから',
    featureTitle: '答えの前に発見を',
    features: [
      { title: 'さわって気づく', body: 'まるをさわって、動かして。数を見た目で感じよう。', variant: 'touch' },
      { title: 'まちがえてわかる', body: 'わざとまちがえてみよう。どうなるか見てみよう。', variant: 'mistake' },
      { title: '自分で進める', body: '音と動きが、次にしたいことを教えてくれるよ。', variant: 'solo' },
      { title: '一緒に見つける', body: 'おとなも子どもも、同じ変化をいっしょに見つけよう。', variant: 'together' },
    ],
    flowTitleBefore: '４つ',
    flowTitleParticle: 'の',
    flowTitleAfter: 'さわりかた',
    operationDemos: [
      { label: 'たす', expression: '8 + 5 = 13', description: 'ボウルに一緒に落ちた"まる"が10こを超えると、まとまって少し大きい"まる"になるよ。どんな種類の"まる"があるかな？', source: operationAddVideoSource, testID: 'operation-video-add', playbackRate: 1 },
      { label: 'ひく', expression: '12 - 5 = 7', description: '黒い"まる"は、同じ大きさの"まる"とぶつかると一緒に消えちゃうよ。残った"まる"は何個かな？', source: operationSubtractVideoSource, testID: 'operation-video-subtract', playbackRate: 1 },
      { label: 'かける', expression: '4 × 3 = 12', description: '"まる"をまとめた"あわ"が3つになったね。"あわ"が弾けたあとの"まる"は何個になったかな？', source: operationMultiplyVideoSource, testID: 'operation-video-multiply', playbackRate: 1 },
      { label: 'わる', expression: '12 ÷ 3 = 4', description: '"まる"を同じ数で分けた"あわ"が、一つだけ残ったね。"まる"は何個になったかな？', source: operationDivideVideoSource, testID: 'operation-video-divide', playbackRate: 1 },
    ],
    finalTitle: 'さがしてごらん',
    finalSegments: [
      { text: '魚は何種類いるかな？' },
      { text: '人魚にさわると歌をうたってくれるよ。' },
    ],
    underwaterSceneLabel: '水中の仕掛けのイメージ',
  },
  en: {
    siteTitle: 'Marumaru Calculator | A hands-on math playground',
    siteDescription: 'Touch, move, and discover numbers with little maru circles. A playful math experience for addition, subtraction, multiplication, and division.',
    heroTitleBefore: 'Touch',
    heroTitleParticle: '',
    heroTitleJoiner: ' ',
    heroTitleAfter: 'numbers',
    heroSubtitle: 'A hands-on math playground with little “maru” circles',
    playWeb: 'Play on web',
    playApp: 'Play in app',
    ageNote: 'Made for playing together, around age 3+',
    featureTitle: 'Discover before the answer',
    features: [
      { title: 'Touch to notice', body: 'Touch and move the maru. See numbers change right in front of you.', variant: 'touch' },
      { title: 'Learn from mistakes', body: 'Try a wrong answer on purpose. Watch what happens next.', variant: 'mistake' },
      { title: 'Move at your pace', body: 'Sound and motion gently guide the next thing to try.', variant: 'solo' },
      { title: 'Find it together', body: 'Children and grown-ups can spot the same changes together.', variant: 'together' },
    ],
    flowTitleBefore: '4',
    flowTitleParticle: '',
    flowTitleAfter: 'ways to play',
    operationDemos: [
      { label: 'Add', expression: '8 + 5 = 13', description: 'When more than 10 maru land in the bowl, they gather into a slightly bigger maru. What kinds can you find?', source: operationAddVideoSource, testID: 'operation-video-add', playbackRate: 1 },
      { label: 'Subtract', expression: '12 - 5 = 7', description: 'Black maru disappear when they meet a matching maru. How many are left?', source: operationSubtractVideoSource, testID: 'operation-video-subtract', playbackRate: 1 },
      { label: 'Multiply', expression: '4 × 3 = 12', description: 'Three bubbles each hold a group of maru. How many maru are there after the bubbles pop?', source: operationMultiplyVideoSource, testID: 'operation-video-multiply', playbackRate: 1 },
      { label: 'Divide', expression: '12 ÷ 3 = 4', description: 'The maru are split evenly, and one bubble remains. How many maru are inside?', source: operationDivideVideoSource, testID: 'operation-video-divide', playbackRate: 1 },
    ],
    finalTitle: 'Look around',
    finalSegments: [
      { text: 'How many kinds of fish can you find?' },
      { text: 'Tap the mermaid and she will sing.' },
    ],
    underwaterSceneLabel: 'An underwater play scene',
  },
  'zh-hans': {
    siteTitle: 'Marumaru 计算器 | 可触摸的数学游戏',
    siteDescription: '触摸、移动并观察小圆点的变化。通过加法、减法、乘法和除法来感受数字。',
    heroTitleBefore: '触摸',
    heroTitleParticle: '',
    heroTitleJoiner: '',
    heroTitleAfter: '数字',
    heroSubtitle: '和小小的“maru”圆点一起玩的数学游戏',
    playWeb: '网页版开始',
    playApp: '应用版开始',
    ageNote: '适合亲子一起玩，大约 3 岁起',
    featureTitle: '先发现，再找答案',
    features: [
      { title: '触摸中发现', body: '触摸并移动圆点，用眼睛感受数字的变化。', variant: 'touch' },
      { title: '从错误中理解', body: '也可以故意试错，看看接下来会发生什么。', variant: 'mistake' },
      { title: '按自己的节奏', body: '声音和动作会轻轻提示下一步可以尝试什么。', variant: 'solo' },
      { title: '一起寻找', body: '孩子和大人可以一起发现同一个变化。', variant: 'together' },
    ],
    flowTitleBefore: '4',
    flowTitleParticle: '',
    flowTitleAfter: '种玩法',
    operationDemos: [
      { label: '加法', expression: '8 + 5 = 13', description: '当落进碗里的圆点超过 10 个时，它们会聚成稍大一点的圆点。你能找到哪些种类？', source: operationAddVideoSource, testID: 'operation-video-add', playbackRate: 1 },
      { label: '减法', expression: '12 - 5 = 7', description: '黑色圆点碰到相同大小的圆点时会一起消失。最后还剩几个？', source: operationSubtractVideoSource, testID: 'operation-video-subtract', playbackRate: 1 },
      { label: '乘法', expression: '4 × 3 = 12', description: '3 个泡泡里各有一组圆点。泡泡破掉以后，一共有几个圆点？', source: operationMultiplyVideoSource, testID: 'operation-video-multiply', playbackRate: 1 },
      { label: '除法', expression: '12 ÷ 3 = 4', description: '圆点被平均分开，只留下一个泡泡。里面有几个圆点？', source: operationDivideVideoSource, testID: 'operation-video-divide', playbackRate: 1 },
    ],
    finalTitle: '找找看',
    finalSegments: [
      { text: '你能找到几种鱼？' },
      { text: '点一下美人鱼，她会唱歌。' },
    ],
    underwaterSceneLabel: '水中的互动场景',
  },
  'zh-hant': {
    siteTitle: 'Marumaru 計算機 | 可以觸摸的數學遊戲',
    siteDescription: '觸摸、移動並觀察小圓點的變化。透過加法、減法、乘法和除法來感受數字。',
    heroTitleBefore: '觸摸',
    heroTitleParticle: '',
    heroTitleJoiner: '',
    heroTitleAfter: '數字',
    heroSubtitle: '和小小的「maru」圓點一起玩的數學遊戲',
    playWeb: '網頁版開始',
    playApp: 'App 版開始',
    ageNote: '適合親子一起玩，大約 3 歲起',
    featureTitle: '先發現，再找答案',
    features: [
      { title: '觸摸中發現', body: '觸摸並移動圓點，用眼睛感受數字的變化。', variant: 'touch' },
      { title: '從錯誤中理解', body: '也可以故意試錯，看看接下來會發生什麼。', variant: 'mistake' },
      { title: '按自己的節奏', body: '聲音和動作會輕輕提示下一步可以嘗試什麼。', variant: 'solo' },
      { title: '一起尋找', body: '孩子和大人可以一起發現同一個變化。', variant: 'together' },
    ],
    flowTitleBefore: '4',
    flowTitleParticle: '',
    flowTitleAfter: '種玩法',
    operationDemos: [
      { label: '加法', expression: '8 + 5 = 13', description: '當落進碗裡的圓點超過 10 個時，它們會聚成稍大一點的圓點。你能找到哪些種類？', source: operationAddVideoSource, testID: 'operation-video-add', playbackRate: 1 },
      { label: '減法', expression: '12 - 5 = 7', description: '黑色圓點碰到相同大小的圓點時會一起消失。最後還剩幾個？', source: operationSubtractVideoSource, testID: 'operation-video-subtract', playbackRate: 1 },
      { label: '乘法', expression: '4 × 3 = 12', description: '3 個泡泡裡各有一組圓點。泡泡破掉以後，一共有幾個圓點？', source: operationMultiplyVideoSource, testID: 'operation-video-multiply', playbackRate: 1 },
      { label: '除法', expression: '12 ÷ 3 = 4', description: '圓點被平均分開，只留下一個泡泡。裡面有幾個圓點？', source: operationDivideVideoSource, testID: 'operation-video-divide', playbackRate: 1 },
    ],
    finalTitle: '找找看',
    finalSegments: [
      { text: '你能找到幾種魚？' },
      { text: '點一下美人魚，她會唱歌。' },
    ],
    underwaterSceneLabel: '水中的互動場景',
  },
  ko: {
    siteTitle: 'Marumaru Calculator | 만지며 배우는 수학 놀이',
    siteDescription: '작은 maru 원을 만지고 움직이며 숫자의 변화를 발견합니다. 덧셈, 뺄셈, 곱셈, 나눗셈을 놀이처럼 느껴 보세요.',
    heroTitleBefore: '숫자를',
    heroTitleParticle: '',
    heroTitleJoiner: ' ',
    heroTitleAfter: '만져 보자',
    heroSubtitle: '작은 “maru” 원으로 즐기는 수학 놀이터',
    playWeb: '웹에서 놀기',
    playApp: '앱에서 놀기',
    ageNote: '부모와 함께라면 만 3세쯤부터',
    featureTitle: '답보다 먼저 발견을',
    features: [
      { title: '만지며 알아차리기', body: '원을 만지고 움직이며 숫자의 변화를 눈으로 느껴요.', variant: 'touch' },
      { title: '틀리며 이해하기', body: '일부러 틀려 봐도 괜찮아요. 어떤 일이 일어나는지 살펴봐요.', variant: 'mistake' },
      { title: '내 속도로 진행하기', body: '소리와 움직임이 다음에 해 볼 일을 부드럽게 알려줘요.', variant: 'solo' },
      { title: '함께 찾아보기', body: '아이와 어른이 같은 변화를 함께 발견할 수 있어요.', variant: 'together' },
    ],
    flowTitleBefore: '4',
    flowTitleParticle: '',
    flowTitleAfter: '가지 놀이 방식',
    operationDemos: [
      { label: '더하기', expression: '8 + 5 = 13', description: '그릇에 들어간 원이 10개를 넘으면 조금 더 큰 원으로 모여요. 어떤 종류의 원이 있을까요?', source: operationAddVideoSource, testID: 'operation-video-add', playbackRate: 1 },
      { label: '빼기', expression: '12 - 5 = 7', description: '검은 원은 같은 크기의 원과 만나면 함께 사라져요. 몇 개가 남았을까요?', source: operationSubtractVideoSource, testID: 'operation-video-subtract', playbackRate: 1 },
      { label: '곱하기', expression: '4 × 3 = 12', description: '3개의 거품 안에 원 묶음이 있어요. 거품이 터지면 원은 모두 몇 개일까요?', source: operationMultiplyVideoSource, testID: 'operation-video-multiply', playbackRate: 1 },
      { label: '나누기', expression: '12 ÷ 3 = 4', description: '원이 똑같이 나뉘고 거품 하나만 남았어요. 안에는 원이 몇 개 있을까요?', source: operationDivideVideoSource, testID: 'operation-video-divide', playbackRate: 1 },
    ],
    finalTitle: '찾아봐요',
    finalSegments: [
      { text: '물고기는 몇 종류가 있을까요?' },
      { text: '인어를 누르면 노래를 불러요.' },
    ],
    underwaterSceneLabel: '물속 놀이 장면',
  },
  de: {
    siteTitle: 'Marumaru Calculator | Mathe zum Anfassen',
    siteDescription: 'Berühre, bewege und entdecke Zahlen mit kleinen maru-Kreisen. Ein spielerisches Mathe-Erlebnis für Addition, Subtraktion, Multiplikation und Division.',
    heroTitleBefore: 'Zahlen',
    heroTitleParticle: '',
    heroTitleJoiner: ' ',
    heroTitleAfter: 'anfassen',
    heroSubtitle: 'Ein Mathe-Spielplatz mit kleinen “maru”-Kreisen',
    playWeb: 'Im Web spielen',
    playApp: 'In der App spielen',
    ageNote: 'Für gemeinsames Spielen, etwa ab 3 Jahren',
    featureTitle: 'Erst entdecken, dann lösen',
    features: [
      { title: 'Durch Berühren verstehen', body: 'Berühre und bewege die maru-Kreise. Sieh, wie sich Zahlen verändern.', variant: 'touch' },
      { title: 'Aus Fehlern lernen', body: 'Probier ruhig auch eine falsche Antwort aus. Schau, was dann passiert.', variant: 'mistake' },
      { title: 'Im eigenen Tempo', body: 'Klänge und Bewegungen zeigen sanft, was du als Nächstes versuchen kannst.', variant: 'solo' },
      { title: 'Gemeinsam entdecken', body: 'Kinder und Erwachsene können dieselben Veränderungen zusammen entdecken.', variant: 'together' },
    ],
    flowTitleBefore: '4',
    flowTitleParticle: '',
    flowTitleAfter: 'Spielweisen',
    operationDemos: [
      { label: 'Plus', expression: '8 + 5 = 13', description: 'Wenn mehr als 10 maru im Becken landen, werden sie zu einem etwas größeren maru. Welche Arten findest du?', source: operationAddVideoSource, testID: 'operation-video-add', playbackRate: 1 },
      { label: 'Minus', expression: '12 - 5 = 7', description: 'Schwarze maru verschwinden, wenn sie ein passendes maru treffen. Wie viele bleiben übrig?', source: operationSubtractVideoSource, testID: 'operation-video-subtract', playbackRate: 1 },
      { label: 'Mal', expression: '4 × 3 = 12', description: 'In 3 Blasen steckt jeweils eine Gruppe maru. Wie viele maru sind es, nachdem die Blasen platzen?', source: operationMultiplyVideoSource, testID: 'operation-video-multiply', playbackRate: 1 },
      { label: 'Geteilt', expression: '12 ÷ 3 = 4', description: 'Die maru werden gleichmäßig aufgeteilt, und eine Blase bleibt übrig. Wie viele maru sind darin?', source: operationDivideVideoSource, testID: 'operation-video-divide', playbackRate: 1 },
    ],
    finalTitle: 'Schau dich um',
    finalSegments: [
      { text: 'Wie viele Fischarten findest du?' },
      { text: 'Tippe auf die Meerjungfrau, dann singt sie.' },
    ],
    underwaterSceneLabel: 'Eine Unterwasser-Spielszene',
  },
} as const;

function getPreferredLandingLocale(): LandingLocale {
  if (Platform.OS !== 'web' || typeof navigator === 'undefined') {
    return 'ja';
  }

  if (typeof window !== 'undefined') {
    const queryLocale = new URLSearchParams(window.location.search).get('lang')?.toLowerCase();
    const queryLocaleMap: Record<string, LandingLocale> = {
      ja: 'ja',
      en: 'en',
      de: 'de',
      ko: 'ko',
      kr: 'ko',
      zh: 'zh-hans',
      'zh-cn': 'zh-hans',
      'zh-sg': 'zh-hans',
      'zh-hans': 'zh-hans',
      'zh-hans-cn': 'zh-hans',
      'zh-tw': 'zh-hant',
      'zh-hk': 'zh-hant',
      'zh-mo': 'zh-hant',
      'zh-hant': 'zh-hant',
      'zh-hant-tw': 'zh-hant',
    };

    if (queryLocale && queryLocaleMap[queryLocale]) {
      return queryLocaleMap[queryLocale];
    }
  }

  const languages = navigator.languages?.length ? navigator.languages : [navigator.language];

  for (const language of languages) {
    const normalizedLanguage = language.toLowerCase();

    if (normalizedLanguage.startsWith('ja')) {
      return 'ja';
    }

    if (normalizedLanguage.startsWith('ko')) {
      return 'ko';
    }

    if (normalizedLanguage.startsWith('de')) {
      return 'de';
    }

    if (normalizedLanguage.startsWith('zh-hant') || normalizedLanguage.startsWith('zh-tw') || normalizedLanguage.startsWith('zh-hk') || normalizedLanguage.startsWith('zh-mo')) {
      return 'zh-hant';
    }

    if (normalizedLanguage.startsWith('zh')) {
      return 'zh-hans';
    }
  }

  return 'en';
}

export default function LandingPage() {
  const { width, height } = useWindowDimensions();
  const router = useRouter();
  const isCompact = width < LANDING_DESKTOP_MIN_WIDTH;
  const heroHeight = Math.max(600, Math.min(height * 0.82, 720));
  const locale = getPreferredLandingLocale();
  const copy = landingCopy[locale];

  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.documentElement.lang = locale;
      document.title = copy.siteTitle;
      document.querySelector('meta[name="description"]')?.setAttribute('content', copy.siteDescription);
    }
  }, [copy.siteDescription, copy.siteTitle, locale]);

  const openApp = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      if (width >= DESKTOP_MIN_WIDTH) {
        window.open(`${BASE_PATH}/play`, '_blank', 'noopener,noreferrer');
        return;
      }

      window.location.assign(`${BASE_PATH}/game`);
      return;
    }

    router.push('/game');
  };

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.pageContent} testID="landing-page">
      <View style={[styles.hero, isCompact ? styles.heroCompact : { minHeight: heroHeight }]}>
        <HeroWaterScene />
        <SafeAreaView style={styles.heroSafe}>
          <View style={styles.heroTopBar}>
            <Pressable accessibilityLabel="maru maru calc logo" accessibilityRole="link" onPress={() => router.push('/')} style={({ pressed }) => pressed && styles.pressedLogo}>
              <BrandLogo />
            </Pressable>
          </View>

          <View style={[styles.heroContent, isCompact && styles.heroContentCompact]}>
            {isCompact ? (
              <>
                <View style={[styles.heroCopy, styles.heroCopyCompact, styles.heroTitleGroupCompact]}>
                  <Text style={[styles.heroTitle, styles.heroTitleCompact]}>
                    {copy.heroTitleBefore}
                    {copy.heroTitleParticle ? <Text style={[styles.heroTitleParticle, styles.heroTitleParticleCompact]}>{copy.heroTitleParticle}</Text> : copy.heroTitleJoiner}
                    {copy.heroTitleAfter}
                  </Text>
                </View>
                <View style={[styles.heroCopy, styles.heroCopyCompact]}>
                  <RubyLine
                    align="center"
                    segments={[
                      { text: copy.heroSubtitle },
                    ]}
                    textStyle={[styles.heroSubtitle, styles.heroSubtitleCompact]}
                    rubyStyle={[styles.heroSubtitleRuby, styles.heroSubtitleRubyCompact]}
                    lineStyle={[styles.heroSubtitleLine, styles.heroSubtitleLineCompact]}
                  />
                </View>
                <AppPreview ageNote={copy.ageNote} compact={isCompact}>
                  <View style={[styles.heroActions, styles.heroActionsCompact]}>
                    <Pressable accessibilityRole="button" onPress={openApp} style={styles.primaryButton} testID="landing-play-button">
                      <Text style={styles.primaryButtonText}>{copy.playWeb}</Text>
                    </Pressable>
                    <View style={styles.storeBadge}>
                      <Text style={styles.storeBadgeText}>{copy.playApp}</Text>
                    </View>
                  </View>
                </AppPreview>
              </>
            ) : (
              <>
                <View style={styles.heroCopy}>
                  <Text style={styles.heroTitle}>
                    {copy.heroTitleBefore}
                    {copy.heroTitleParticle ? <Text style={styles.heroTitleParticle}>{copy.heroTitleParticle}</Text> : copy.heroTitleJoiner}
                    {copy.heroTitleAfter}
                  </Text>
                  <RubyLine
                    align="left"
                    segments={[
                      { text: copy.heroSubtitle },
                    ]}
                    textStyle={styles.heroSubtitle}
                    rubyStyle={styles.heroSubtitleRuby}
                    lineStyle={styles.heroSubtitleLine}
                  />
                  <View style={styles.heroActions}>
                    <Pressable accessibilityRole="button" onPress={openApp} style={styles.primaryButton} testID="landing-play-button">
                      <Text style={styles.primaryButtonText}>{copy.playWeb}</Text>
                    </Pressable>
                    <View style={styles.storeBadge}>
                      <Text style={styles.storeBadgeText}>{copy.playApp}</Text>
                    </View>
                  </View>
                </View>
                <AppPreview ageNote={copy.ageNote} compact={isCompact} />
              </>
            )}
          </View>
        </SafeAreaView>
      </View>

      <View style={[styles.section, styles.decoratedSection]}>
        <LandingSectionAmbient variant="features" />
        <Text style={styles.sectionTitle}>{copy.featureTitle}</Text>
        <View style={[styles.featureGrid, isCompact && styles.featureGridCompact]}>
          {copy.features.map((feature) => (
            <FeatureItem key={feature.title} compact={isCompact} title={feature.title} body={feature.body} variant={feature.variant} />
          ))}
        </View>
      </View>

      <View style={[styles.section, styles.flowSection, styles.decoratedSection]}>
        <LandingSectionAmbient variant="flow" />
        <Text style={styles.sectionTitle}>
          {copy.flowTitleBefore}
          {copy.flowTitleParticle ? <Text style={styles.sectionTitleParticle}>{copy.flowTitleParticle}</Text> : ' '}
          {copy.flowTitleAfter}
        </Text>
        <View style={styles.flowRows}>
          {copy.operationDemos.map((demo) => (
            <FlowRow key={demo.testID} {...demo} compact={isCompact} />
          ))}
        </View>
      </View>

      <View style={[styles.finalSection, styles.decoratedSection]}>
        <LandingSectionAmbient variant="final" />
        <View style={[styles.finalContent, isCompact && styles.finalContentCompact]}>
          {isCompact ? (
            <>
              <View style={[styles.finalCopy, styles.finalCopyCompact]}>
                <Text style={styles.finalTitle}>{copy.finalTitle}</Text>
              </View>
              <UnderwaterPlayScene accessibilityLabel={copy.underwaterSceneLabel} />
              <FinalDescription copy={copy} openApp={openApp} compact />
            </>
          ) : (
            <>
              <UnderwaterPlayScene accessibilityLabel={copy.underwaterSceneLabel} />
              <View style={styles.finalCopy}>
                <Text style={styles.finalTitle}>{copy.finalTitle}</Text>
                <FinalDescription copy={copy} openApp={openApp} compact={false} />
              </View>
            </>
          )}
        </View>
      </View>
      <View style={styles.footer}>
        <Text style={styles.copyright}>{COPYRIGHT_TEXT}</Text>
      </View>
    </ScrollView>
  );
}

function HeroWaterScene() {
  return (
    <View pointerEvents="none" style={styles.heroScene}>
      <FloatingBubble size={124} left="6%" top="18%" opacity={0.34} />
      <FloatingBubble size={72} left="74%" top="12%" opacity={0.38} />
      <FloatingBubble size={44} left="88%" top="44%" opacity={0.42} />
      <FloatingBubble size={36} left="18%" top="72%" opacity={0.42} />
      <FloatingBubble size={92} left="58%" top="70%" opacity={0.24} />
      <FloatingBubble size={26} left="40%" top="16%" opacity={0.32} />
      <FloatingBubble size={58} left="30%" top="84%" opacity={0.24} />
      <FloatingBubble size={140} left="92%" top="68%" opacity={0.14} />
      <LandingBlueTang style={{ position: 'absolute', right: '10%', bottom: '18%', opacity: 0.56, transform: [{ scaleX: -1 }, { rotate: '-8deg' }] }} />
      <LandingClownfish style={{ position: 'absolute', left: '9%', bottom: '26%', opacity: 0.58, transform: [{ rotate: '7deg' }] }} />
      <View style={styles.softWaterPatchLeft} />
      <View style={styles.softWaterPatchRight} />
    </View>
  );
}

function FloatingBubble({ size, left, top, opacity }: { size: number; left: `${number}%`; top: `${number}%`; opacity: number }) {
  return (
    <View style={[styles.floatingBubble, { width: size, height: size, borderRadius: size / 2, left, top, opacity }]}>
      <View style={[styles.floatingBubbleShine, { width: size * 0.25, height: size * 0.25, borderRadius: size * 0.125 }]} />
    </View>
  );
}

function AppPreview({ ageNote, children, compact }: { ageNote: string; children?: ReactNode; compact: boolean }) {
  const videoUri = Asset.fromModule(demoVideoSource).uri;

  return (
    <View style={[styles.previewBlock, compact && styles.previewBlockCompact]}>
      <View style={[styles.previewVideoFrame, compact && styles.previewVideoFrameCompact]} testID="landing-app-preview">
        <AutoPlayVideo
          borderRadius={RADIUS_XL}
          compact={compact}
          label="maru maru calc gameplay preview"
          testID="landing-gameplay-video"
          uri={videoUri}
        />
      </View>
      <Text style={[styles.heroAgeNote, compact && styles.heroAgeNoteCompact]}>{ageNote}</Text>
      {children ? <View style={[styles.previewActionsSlot, compact && styles.previewActionsSlotCompact]}>{children}</View> : null}
    </View>
  );
}

function FeatureItem({ title, body, variant, compact }: { title: string; body: ReactNode; variant: FeatureCardVariant; compact: boolean }) {
  return (
    <View style={[styles.featureItem, compact && styles.featureItemCompact]}>
      <FeatureCardBackground variant={variant} compact={compact} />
      <View style={[styles.featureForeground, compact && styles.featureForegroundCompact]}>
        <View style={styles.featureTextBlock}>
          <Text style={[styles.featureTitle, compact && styles.featureTitleCompact]}>{title}</Text>
        {typeof body === 'string' ? <Text style={styles.featureBody}>{body}</Text> : body}
        </View>
      </View>
    </View>
  );
}

type FeatureCardVariant = 'touch' | 'mistake' | 'solo' | 'together';

function FeatureCardBackground({ variant, compact }: { variant: FeatureCardVariant; compact: boolean }) {
  if (variant === 'touch') {
    return (
      <View pointerEvents="none" style={[styles.featureBackground, compact && styles.featureBackgroundCompact]}>
        <View style={[styles.featureBasinLine, styles.featureBasinLineTouch]} />
        <View style={[styles.featureMiniMaru, styles.featureMiniMaruOne]}>
          <View style={styles.featureMiniMaruShine} />
        </View>
        <View style={[styles.featureMiniMaru, styles.featureMiniMaruTwo]}>
          <View style={styles.featureMiniMaruShine} />
        </View>
        <View style={[styles.featureMiniBubble, styles.featureMiniBubbleTouch]} />
        <View style={[styles.featureTinyBubble, styles.featureTinyBubbleThree]} />
      </View>
    );
  }

  if (variant === 'mistake') {
    return (
      <View pointerEvents="none" style={[styles.featureBackground, compact && styles.featureBackgroundCompact]}>
        <LandingPuffer style={styles.featurePuffer} />
        <View style={[styles.featureTinyBubble, styles.featureTinyBubbleOne]} />
        <View style={[styles.featureTinyBubble, styles.featureTinyBubbleTwo]} />
        <Text style={styles.featureBackgroundQuestion}>?</Text>
      </View>
    );
  }

  if (variant === 'solo') {
    return (
      <View pointerEvents="none" style={[styles.featureBackground, compact && styles.featureBackgroundCompact]}>
        <FeaturePenguinChick style={styles.featureSoloPenguinChick} />
        <View style={[styles.featureStepDot, styles.featureSoloStepOne]} />
        <View style={[styles.featureStepDot, styles.featureSoloStepTwo]} />
        <View style={[styles.featureStepDot, styles.featureSoloStepThree]} />
      </View>
    );
  }

  return (
    <View pointerEvents="none" style={[styles.featureBackground, compact && styles.featureBackgroundCompact]}>
      <FeaturePenguinParent style={styles.featureParentPenguin} />
      <FeaturePenguinChick style={styles.featureChildPenguinChick} />
      <View style={[styles.featureStepDot, styles.featureTogetherStepOne]} />
      <View style={[styles.featureStepDot, styles.featureTogetherStepTwo]} />
      <View style={[styles.featureStepDot, styles.featureTogetherStepThree]} />
    </View>
  );
}

function FeaturePenguinChick({ style }: { style: StyleProp<ViewStyle> }) {
  return (
    <View pointerEvents="none" style={[styles.featurePenguinChick, style]}>
      <View style={styles.featurePenguinChickBody} />
      <View style={styles.featurePenguinChickBelly} />
      <View style={styles.featurePenguinChickFlipper} />
      <View style={styles.featurePenguinChickEye} />
      <View style={[styles.featurePenguinFoot, styles.featurePenguinFootFront]} />
      <View style={[styles.featurePenguinFoot, styles.featurePenguinFootBack]} />
    </View>
  );
}

function FeaturePenguinParent({ style }: { style: StyleProp<ViewStyle> }) {
  return (
    <View pointerEvents="none" style={[styles.featurePenguinParent, style]}>
      <View style={styles.featurePenguinParentBody} />
      <View style={styles.featurePenguinParentBelly} />
      <View style={styles.featurePenguinParentFace} />
      <View style={styles.featurePenguinParentGoldPatch} />
      <View style={styles.featurePenguinParentFlipper} />
      <View style={styles.featurePenguinParentBeak} />
      <View style={styles.featurePenguinParentEye} />
      <View style={[styles.featurePenguinFoot, styles.featurePenguinParentFootFront]} />
      <View style={[styles.featurePenguinFoot, styles.featurePenguinParentFootBack]} />
    </View>
  );
}

function FinalDescription({ copy, openApp, compact }: { copy: typeof landingCopy[LandingLocale]; openApp: () => void; compact: boolean }) {
  return (
    <View style={[styles.finalDescription, compact && styles.finalDescriptionCompact]}>
      <RubyLine
        align={compact ? 'center' : 'left'}
        segments={copy.finalSegments}
        textStyle={styles.finalBody}
        rubyStyle={styles.finalBodyRuby}
        lineStyle={[styles.finalBodyRubyLine, compact && styles.finalBodyRubyLineCompact]}
      />
      <View style={[styles.finalActions, compact && styles.finalActionsCompact]}>
        <Pressable accessibilityRole="button" onPress={openApp} style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>{copy.playWeb}</Text>
        </Pressable>
        <View style={styles.storeBadge}>
          <Text style={styles.storeBadgeText}>{copy.playApp}</Text>
        </View>
      </View>
    </View>
  );
}

function RubyLine({
  segments,
  textStyle,
  rubyStyle,
  lineStyle,
  align,
}: {
  segments: ReadonlyArray<{ text: string; ruby?: string }>;
  textStyle: StyleProp<TextStyle>;
  rubyStyle: StyleProp<TextStyle>;
  lineStyle?: StyleProp<ViewStyle>;
  align: 'left' | 'center';
}) {
  return (
    <View pointerEvents="none" style={[styles.rubyLine, align === 'center' && styles.rubyLineCenter, lineStyle]}>
      {segments.map((segment, index) => (
        <View key={`${segment.text}-${index}`} style={styles.rubySegment}>
          {segment.ruby ? <Text style={rubyStyle}>{segment.ruby}</Text> : <Text style={[styles.rubySpacer, rubyStyle]}> </Text>}
          <Text style={textStyle}>{segment.text}</Text>
        </View>
      ))}
    </View>
  );
}

function FlowRow({
  label,
  expression,
  description,
  source,
  testID,
  playbackRate,
  compact,
}: {
  label: string;
  expression: string;
  description: string;
  source: number;
  testID: string;
  playbackRate: number;
  compact: boolean;
}) {
  const videoUri = Asset.fromModule(source).uri;

  return (
    <View style={[styles.flowRow, compact && styles.flowRowCompact]}>
      <View style={[styles.flowTextGroup, compact && styles.flowTextGroupCompact]}>
        <View style={[styles.flowExpressionLine, compact && styles.flowExpressionLineCompact]}>
          <Text style={[styles.flowLabel, compact && styles.flowLabelCompact]}>{label}</Text>
          <Text style={[styles.flowExpression, compact && styles.flowExpressionCompact]}>{expression}</Text>
        </View>
        <Text style={styles.flowDescription}>{description}</Text>
      </View>
      <OperationVideo uri={videoUri} testID={testID} playbackRate={playbackRate} compact={compact} />
    </View>
  );
}

function OperationVideo({ uri, testID, playbackRate, compact }: { uri: string; testID: string; playbackRate: number; compact: boolean }) {
  return (
    <View style={[styles.operationVideoFrame, compact && styles.operationVideoFrameCompact]} testID={testID}>
      <AutoPlayVideo
        borderRadius={RADIUS_LG}
        compact={compact}
        label={testID}
        playbackRate={playbackRate}
        testID={`${testID}-media`}
        uri={uri}
      />
    </View>
  );
}

function AutoPlayVideo({
  borderRadius,
  compact,
  label,
  playbackRate = 1,
  testID,
  uri,
}: {
  borderRadius: number;
  compact: boolean;
  label: string;
  playbackRate?: number;
  testID: string;
  uri: string;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof IntersectionObserver === 'undefined') {
      return;
    }

    const video = videoRef.current;

    if (!video) {
      return;
    }

    let shouldPlay = false;
    const syncVideoOptions = () => {
      video.muted = true;
      video.defaultMuted = true;
      video.playsInline = true;
      video.playbackRate = playbackRate;
    };
    const play = () => {
      shouldPlay = true;
      syncVideoOptions();
      void video.play().catch(() => {});
    };
    const pause = () => {
      shouldPlay = false;
      video.pause();
    };

    syncVideoOptions();

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting && entry.intersectionRatio >= 0.35 && document.visibilityState === 'visible') {
          play();
          return;
        }

        pause();
      },
      { threshold: [0, 0.35, 0.6] }
    );
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && shouldPlay) {
        play();
        return;
      }

      video.pause();
    };

    observer.observe(video);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      video.pause();
    };
  }, [playbackRate]);

  if (Platform.OS !== 'web') {
    return null;
  }

  return createElement('video', {
    ref: videoRef,
    src: uri,
    autoPlay: true,
    muted: true,
    defaultMuted: true,
    loop: true,
    playsInline: true,
    preload: 'metadata',
    'aria-label': label,
    'data-testid': testID,
    onLoadedMetadata: () => {
      if (videoRef.current) {
        videoRef.current.playbackRate = playbackRate;
      }
    },
    onPlay: () => {
      if (videoRef.current) {
        videoRef.current.playbackRate = playbackRate;
      }
    },
    style: {
      width: '100%',
      height: '100%',
      objectFit: compact ? 'contain' : 'cover',
      display: 'block',
      borderRadius,
      pointerEvents: 'none',
    },
  });
}

function LandingSectionAmbient({ variant }: { variant: 'features' | 'flow' | 'final' }) {
  if (variant === 'features') {
    return (
      <View pointerEvents="none" testID="landing-features-ambient" style={styles.sectionAmbient}>
        <FloatingBubble size={84} left="82%" top="8%" opacity={0.24} />
        <FloatingBubble size={30} left="24%" top="18%" opacity={0.22} />
        <FloatingBubble size={132} left="92%" top="58%" opacity={0.12} />
        <FloatingBubble size={42} left="8%" top="72%" opacity={0.24} />
        <LandingClownfish style={styles.ambientClownfishFeatures} />
        <LandingPuffer style={{ position: 'absolute', left: '14%', top: '22%', opacity: 0.48, transform: [{ rotate: '-8deg' }] }} />
      </View>
    );
  }

  if (variant === 'flow') {
    return (
      <View pointerEvents="none" testID="landing-flow-ambient" style={styles.sectionAmbient}>
        <FloatingBubble size={110} left="4%" top="6%" opacity={0.18} />
        <FloatingBubble size={52} left="70%" top="12%" opacity={0.2} />
        <FloatingBubble size={26} left="18%" top="84%" opacity={0.28} />
        <FloatingBubble size={36} left="88%" top="76%" opacity={0.28} />
        <LandingBlueTang style={styles.ambientBlueTangFlow} />
        <LandingClownfish style={{ position: 'absolute', right: '16%', top: '18%', opacity: 0.45, transform: [{ scaleX: -1 }, { rotate: '-4deg' }] }} />
      </View>
    );
  }

  return (
    <View pointerEvents="none" testID="landing-final-ambient" style={styles.sectionAmbient}>
      <FloatingBubble size={72} left="78%" top="12%" opacity={0.25} />
      <FloatingBubble size={124} left="4%" top="18%" opacity={0.14} />
      <FloatingBubble size={44} left="54%" top="80%" opacity={0.22} />
      <FloatingBubble size={34} left="14%" top="76%" opacity={0.28} />
      <LandingPuffer style={styles.ambientPufferFinal} />
      <LandingBlueTang style={{ position: 'absolute', right: '10%', bottom: '14%', opacity: 0.48, transform: [{ rotate: '5deg' }] }} />
    </View>
  );
}

function UnderwaterPlayScene({ accessibilityLabel }: { accessibilityLabel: string }) {
  return (
    <View style={styles.underwaterScene} accessibilityLabel={accessibilityLabel}>
      <View style={[styles.sceneBubble, styles.sceneBubbleLarge]}>
        <View style={styles.sceneBubbleShine} />
      </View>
      <View style={[styles.sceneBubble, styles.sceneBubbleSmall]} />
      <View style={[styles.sceneBubble, styles.sceneBubbleTiny]} />
      <LandingClownfish style={styles.sceneClownfish} />
      <LandingClownfish style={styles.sceneClownfishSmall} />
      <LandingMermaid />
    </View>
  );
}

function LandingClownfish({ style }: { style: StyleProp<ViewStyle> }) {
  return (
    <View pointerEvents="none" style={[styles.landingFish, style]}>
      <View style={styles.landingClownfishBody} />
      <View style={[styles.landingClownfishStripe, { left: '20%' }]} />
      <View style={[styles.landingClownfishStripe, { left: '49%' }]} />
      <View style={styles.landingClownfishTail} />
      <View style={styles.landingClownfishFin} />
      <View style={styles.landingCreatureEye} />
    </View>
  );
}

function LandingBlueTang({ style }: { style: StyleProp<ViewStyle> }) {
  return (
    <View pointerEvents="none" style={[styles.landingFish, style]}>
      <View style={styles.landingBlueTangBody} />
      <View style={styles.landingBlueTangMark} />
      <View style={styles.landingBlueTangTail} />
      <View style={styles.landingBlueTangFin} />
      <View style={styles.landingCreatureEye} />
    </View>
  );
}

function LandingPuffer({ style }: { style: StyleProp<ViewStyle> }) {
  return (
    <View pointerEvents="none" style={[styles.landingPuffer, style]}>
      <View style={styles.landingPufferBody} />
      <View style={styles.landingPufferTail} />
      <View style={styles.landingPufferMouth} />
      <View style={styles.landingPufferSpotOne} />
      <View style={styles.landingPufferSpotTwo} />
      <View style={styles.landingPufferEye} />
    </View>
  );
}

function LandingMermaid() {
  return (
    <View pointerEvents="none" style={styles.sceneMermaid}>
      <View style={[styles.mermaidSongBubbleOne, styles.mermaidSongBubbleActive]} />
      <View style={[styles.mermaidSongBubbleTwo, styles.mermaidSongBubbleActive]} />
      <View style={[styles.mermaidSongBubbleThree, styles.mermaidSongBubbleActiveStrong]} />
      <View style={[styles.mermaidSongPulse, styles.mermaidSongPulseOne]} />
      <View style={[styles.mermaidSongPulse, styles.mermaidSongPulseTwo]} />
      <Text pointerEvents="none" style={[styles.mermaidMusicNote, styles.mermaidMusicNoteOne]}>♪</Text>
      <Text pointerEvents="none" style={[styles.mermaidMusicNote, styles.mermaidMusicNoteTwo]}>♫</Text>
      <Text pointerEvents="none" style={[styles.mermaidMusicNote, styles.mermaidMusicNoteThree]}>♪</Text>
      <View style={[styles.mermaidRockBack, styles.mermaidRockBackActive]} />
      <View style={[styles.mermaidRockLeft, styles.mermaidRockLeftActive]} />
      <View style={[styles.mermaidRockRight, styles.mermaidRockRightActive]} />
      <View style={[styles.mermaidTailFin, styles.mermaidTailFinActive]} />
      <View style={[styles.mermaidTail, styles.mermaidTailActive]} />
      <View style={[styles.mermaidBody, styles.mermaidBodyActive]} />
      <View style={[styles.mermaidArmBack, styles.mermaidSkinActive]} />
      <View style={[styles.mermaidArmFront, styles.mermaidSkinActive]} />
      <View style={[styles.mermaidHairBack, styles.mermaidHairActive]} />
      <View style={[styles.mermaidLongHair, styles.mermaidLongHairActive]} />
      <View style={[styles.mermaidHead, styles.mermaidHeadActive]} />
      <View style={[styles.mermaidHairFront, styles.mermaidHairFrontActive]} />
      <View style={styles.mermaidEye} />
      <View style={[styles.mermaidMouth, styles.mermaidMouthActive]} />
      <View style={[styles.mermaidHairShine, styles.mermaidHairShineActive]} />
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: WATER_COLOR,
  },
  pageContent: {
    backgroundColor: WATER_COLOR,
  },
  hero: {
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: WATER_COLOR,
  },
  heroCompact: {
    minHeight: 0,
  },
  heroScene: {
    ...StyleSheet.absoluteFillObject,
  },
  floatingBubble: {
    position: 'absolute',
    borderWidth: 6,
    borderColor: 'rgba(125, 211, 252, 0.42)',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  floatingBubbleShine: {
    position: 'absolute',
    left: '22%',
    top: '18%',
    backgroundColor: 'rgba(255, 255, 255, 0.62)',
  },
  softWaterPatchLeft: {
    position: 'absolute',
    left: -110,
    bottom: 0,
    width: 240,
    height: 160,
    borderTopRightRadius: 140,
    backgroundColor: 'rgba(153, 246, 228, 0.22)',
  },
  softWaterPatchRight: {
    position: 'absolute',
    right: -90,
    bottom: -30,
    width: 280,
    height: 210,
    borderTopLeftRadius: 160,
    backgroundColor: 'rgba(187, 247, 208, 0.2)',
  },
  heroSafe: {
    flex: 1,
    paddingHorizontal: GRID * 3,
  },
  heroTopBar: {
    width: '100%',
    maxWidth: SECTION_CONTENT_WIDTH,
    alignSelf: 'center',
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: GRID * 2,
  },
  pressedLogo: {
    opacity: 0.72,
  },
  heroContent: {
    flex: 1,
    width: '100%',
    maxWidth: SECTION_CONTENT_WIDTH,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: GRID * 5,
    paddingBottom: GRID * 5,
  },
  heroContentCompact: {
    flexDirection: 'column',
    justifyContent: 'flex-start',
    gap: GRID * 1.25,
    paddingTop: GRID,
    paddingBottom: GRID * 3,
  },
  heroCopy: {
    flex: 1,
    maxWidth: GRID * 62,
    alignItems: 'flex-start',
  },
  heroCopyCompact: {
    flex: 0,
    width: '100%',
    maxWidth: '100%',
    minHeight: GRID * 7,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  heroTitleGroupCompact: {
    marginBottom: 0,
  },
  heroTitle: {
    color: TEXT_BASE_COLOR,
    fontSize: 44,
    lineHeight: 54,
    fontWeight: '900',
    letterSpacing: 0.8,
    fontFamily: PLAYFUL_FONT_FAMILY,
    textAlign: 'left',
  },
  heroTitleCompact: {
    fontSize: 29,
    lineHeight: 35,
    textAlign: 'center',
  },
  heroTitleParticle: {
    fontSize: 38,
    lineHeight: 48,
    marginHorizontal: 4,
  },
  heroTitleParticleCompact: {
    fontSize: 24,
    lineHeight: 31,
    marginHorizontal: 3,
  },
  heroSubtitle: {
    color: TEXT_ACCENT_COLOR,
    fontSize: 25,
    lineHeight: 34,
    fontWeight: '500',
    letterSpacing: 0.7,
    fontFamily: PLAYFUL_FONT_FAMILY,
    textAlign: 'left',
  },
  heroSubtitleCompact: {
    fontSize: 18,
    lineHeight: 25,
    textAlign: 'center',
  },
  heroSubtitleLine: {
    marginTop: GRID * 2,
  },
  heroSubtitleLineCompact: {
    marginTop: 0,
  },
  heroSubtitleRuby: {
    color: TEXT_ACCENT_COLOR,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '500',
    fontFamily: PLAYFUL_FONT_FAMILY,
    textAlign: 'center',
  },
  heroSubtitleRubyCompact: {
    fontSize: 10,
    lineHeight: 13,
  },
  rubyLine: {
    zIndex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    flexWrap: 'wrap',
  },
  rubyLineCenter: {
    justifyContent: 'center',
  },
  rubySegment: {
    alignItems: 'center',
    maxWidth: '100%',
    flexShrink: 1,
  },
  rubySpacer: {
    color: 'transparent',
    fontSize: 11,
    lineHeight: 14,
  },
  heroActions: {
    marginTop: GRID * 5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: GRID * 2,
    flexWrap: 'wrap',
  },
  heroActionsCompact: {
    width: '100%',
    maxWidth: '100%',
    marginTop: 0,
    gap: GRID,
    flexWrap: 'nowrap',
  },
  heroAgeNote: {
    marginTop: GRID * 1.25,
    color: 'rgba(18, 51, 74, 0.68)',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '500',
    fontFamily: PLAYFUL_FONT_FAMILY,
    letterSpacing: 0.4,
  },
  heroAgeNoteCompact: {
    textAlign: 'center',
  },
  primaryButton: {
    width: GRID * 19,
    height: GRID * 7,
    borderRadius: RADIUS_LG,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0284C7',
    shadowOpacity: 0.16,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
  },
  primaryButtonText: {
    color: TEXT_BASE_COLOR,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '900',
    fontFamily: PLAYFUL_FONT_FAMILY,
    letterSpacing: 0.4,
  },
  storeBadge: {
    width: GRID * 19,
    height: GRID * 7,
    paddingHorizontal: GRID * 2,
    borderRadius: RADIUS_LG,
    backgroundColor: 'rgba(255, 255, 255, 0.34)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  storeBadgeText: {
    color: TEXT_BASE_COLOR,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '900',
    fontFamily: PLAYFUL_FONT_FAMILY,
    letterSpacing: 0.4,
  },
  previewBlock: {
    flex: 1,
    maxWidth: 440,
    alignItems: 'center',
  },
  previewBlockCompact: {
    flex: 0,
    width: '100%',
    maxWidth: '100%',
    height: GRID * 39,
    marginTop: GRID * 0.5,
    marginBottom: GRID,
  },
  previewActionsSlot: {
    width: '100%',
  },
  previewActionsSlotCompact: {
    marginTop: GRID * 1.5,
  },
  previewVideoFrame: {
    width: 440,
    aspectRatio: 16 / 9,
    borderRadius: RADIUS_XL,
    borderWidth: 4,
    borderColor: 'rgba(224, 247, 255, 0.92)',
    backgroundColor: 'rgba(198, 232, 244, 0.82)',
    overflow: 'hidden',
    shadowColor: '#0284C7',
    shadowOpacity: 0.14,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 18 },
  },
  previewVideoFrameCompact: {
    width: '100%',
    maxWidth: '100%',
    flexGrow: 0,
    flexShrink: 0,
    alignSelf: 'center',
    marginTop: 0,
    marginBottom: 0,
    height: GRID * 23,
    aspectRatio: undefined,
    zIndex: 1,
  },
  section: {
    position: 'relative',
    overflow: 'hidden',
    paddingHorizontal: GRID * 3,
    paddingVertical: GRID * 8,
    backgroundColor: 'rgba(224, 247, 255, 0.6)',
  },
  decoratedSection: {
  },
  sectionAmbient: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  sectionTitle: {
    zIndex: 1,
    color: TEXT_BASE_COLOR,
    fontSize: 32,
    lineHeight: 40,
    fontWeight: '900',
    fontFamily: PLAYFUL_FONT_FAMILY,
    textAlign: 'center',
    letterSpacing: 0.7,
  },
  sectionTitleParticle: {
    fontSize: 27,
    lineHeight: 36,
    marginHorizontal: 3,
  },
  sectionTitleRuby: {
    color: TEXT_BASE_COLOR,
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '900',
    fontFamily: PLAYFUL_FONT_FAMILY,
    textAlign: 'center',
  },
  sectionTitleRubyLine: {
    zIndex: 1,
    justifyContent: 'center',
  },
  featureGrid: {
    zIndex: 1,
    width: '100%',
    maxWidth: SECTION_CONTENT_WIDTH,
    alignSelf: 'center',
    marginTop: GRID * 5,
    flexDirection: 'row',
    gap: GRID * 2,
  },
  featureGridCompact: {
    flexDirection: 'column',
    gap: GRID * 1.5,
    marginTop: GRID * 4,
  },
  featureItem: {
    flex: 1,
    minHeight: 184,
    borderRadius: RADIUS_LG,
    padding: GRID * 3,
    backgroundColor: PANEL_COLOR,
    position: 'relative',
    overflow: 'hidden',
  },
  featureItemCompact: {
    minHeight: 0,
    paddingVertical: GRID * 2,
    paddingHorizontal: GRID * 2.5,
  },
  featureTextBlock: {
    flex: 1,
    minWidth: 0,
  },
  featureForeground: {
    position: 'relative',
    zIndex: 2,
    flex: 1,
  },
  featureForegroundCompact: {
    minHeight: GRID * 7,
    justifyContent: 'center',
  },
  featureTitle: {
    color: TEXT_BASE_COLOR,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '900',
    fontFamily: PLAYFUL_FONT_FAMILY,
    letterSpacing: 0.5,
  },
  featureTitleCompact: {
    marginTop: 0,
    fontSize: 21,
    lineHeight: 27,
  },
  featureBody: {
    marginTop: GRID,
    color: TEXT_BASE_COLOR,
    fontSize: 15,
    lineHeight: 25,
    fontWeight: '500',
    fontFamily: PLAYFUL_FONT_FAMILY,
    letterSpacing: 0.4,
  },
  featureBackground: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
    opacity: 0.72,
  },
  featureBackgroundCompact: {
    opacity: 0.34,
  },
  featureBasinLine: {
    position: 'absolute',
    width: 150,
    height: 100,
    borderBottomWidth: 4,
    borderColor: 'rgba(56, 189, 248, 0.14)',
    borderRadius: 90,
  },
  featureBasinLineTouch: {
    right: 10,
    bottom: -6,
    transform: [{ rotate: '-8deg' }],
  },
  featureMiniMaru: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 3,
    borderColor: 'rgba(203, 161, 33, 0.32)',
    backgroundColor: 'rgba(239, 245, 220, 0.38)',
  },
  featureMiniMaruOne: {
    right: 98,
    bottom: 46,
  },
  featureMiniMaruTwo: {
    right: 56,
    bottom: 58,
  },
  featureMiniMaruTogether: {
    right: 70,
    bottom: 34,
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  featureMiniBubble: {
    position: 'absolute',
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 5,
    borderColor: 'rgba(125, 211, 252, 0.16)',
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
  },
  featureMiniBubbleTouch: {
    right: 28,
    bottom: 36,
  },
  featureMiniMaruShine: {
    position: 'absolute',
    left: 5,
    top: 5,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: 'rgba(255, 255, 245, 0.42)',
  },
  featureTinyBubble: {
    position: 'absolute',
    borderWidth: 4,
    borderColor: 'rgba(125, 211, 252, 0.32)',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  featureTinyBubbleOne: {
    width: 32,
    height: 32,
    borderRadius: 16,
    right: 42,
    top: 42,
  },
  featureTinyBubbleTwo: {
    width: 20,
    height: 20,
    borderRadius: 10,
    right: 84,
    bottom: 46,
  },
  featureTinyBubbleThree: {
    width: 26,
    height: 26,
    borderRadius: 13,
    right: 34,
    bottom: 36,
  },
  featurePuffer: {
    position: 'absolute',
    right: 18,
    bottom: 28,
    opacity: 0.54,
    transform: [{ scale: 1.48 }, { rotate: '-7deg' }],
  },
  featureBackgroundQuestion: {
    position: 'absolute',
    right: 72,
    top: 54,
    color: 'rgba(2, 132, 199, 0.18)',
    fontSize: 74,
    lineHeight: 82,
    fontWeight: '900',
    fontFamily: LATIN_FONT_FAMILY,
  },
  featureStepDot: {
    position: 'absolute',
    width: 10,
    height: 4,
    borderRadius: 4,
    backgroundColor: 'rgba(18, 51, 74, 0.14)',
  },
  featureSoloStepOne: {
    right: 106,
    bottom: 42,
    transform: [{ rotate: '-8deg' }],
  },
  featureSoloStepTwo: {
    right: 84,
    bottom: 32,
    transform: [{ rotate: '8deg' }],
  },
  featureSoloStepThree: {
    right: 62,
    bottom: 24,
    transform: [{ rotate: '-8deg' }],
  },
  featureTogetherStepOne: {
    right: 122,
    bottom: 36,
    transform: [{ rotate: '-8deg' }],
  },
  featureTogetherStepTwo: {
    right: 100,
    bottom: 26,
    transform: [{ rotate: '8deg' }],
  },
  featureTogetherStepThree: {
    right: 78,
    bottom: 18,
    transform: [{ rotate: '-8deg' }],
  },
  featurePenguinChick: {
    position: 'absolute',
    width: 58,
    height: 62,
    opacity: 0.66,
  },
  featureSoloPenguinChick: {
    right: 26,
    bottom: 18,
    transform: [{ rotate: '-7deg' }],
  },
  featurePenguinChickBody: {
    position: 'absolute',
    left: 9,
    top: 8,
    width: 36,
    height: 48,
    borderRadius: 22,
    backgroundColor: 'rgba(115, 129, 139, 0.5)',
  },
  featurePenguinChickBelly: {
    position: 'absolute',
    left: 17,
    top: 22,
    width: 22,
    height: 28,
    borderRadius: 15,
    backgroundColor: 'rgba(239, 244, 246, 0.45)',
  },
  featurePenguinChickFlipper: {
    position: 'absolute',
    left: 8,
    top: 28,
    width: 10,
    height: 22,
    borderRadius: 8,
    backgroundColor: 'rgba(92, 107, 119, 0.34)',
    transform: [{ rotate: '18deg' }],
  },
  featurePenguinChickEye: {
    position: 'absolute',
    right: 18,
    top: 19,
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: TEXT_BASE_COLOR,
    opacity: 0.56,
  },
  featurePenguinParent: {
    position: 'absolute',
    width: 66,
    height: 86,
    opacity: 0.66,
  },
  featureParentPenguin: {
    right: 52,
    bottom: 6,
    transform: [{ scale: 0.92 }, { rotate: '-3deg' }],
  },
  featureChildPenguinChick: {
    right: 12,
    bottom: 10,
    transform: [{ scale: 0.58 }, { rotate: '-7deg' }],
  },
  featurePenguinParentBody: {
    position: 'absolute',
    left: 16,
    top: 6,
    width: 38,
    height: 72,
    borderRadius: 24,
    backgroundColor: 'rgba(18, 51, 74, 0.58)',
  },
  featurePenguinParentBelly: {
    position: 'absolute',
    left: 24,
    top: 28,
    width: 24,
    height: 44,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.74)',
  },
  featurePenguinParentFace: {
    position: 'absolute',
    left: 27,
    top: 12,
    width: 20,
    height: 20,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
  },
  featurePenguinParentGoldPatch: {
    position: 'absolute',
    left: 38,
    top: 18,
    width: 14,
    height: 18,
    borderRadius: 10,
    backgroundColor: 'rgba(250, 204, 21, 0.48)',
    transform: [{ rotate: '-20deg' }],
  },
  featurePenguinParentFlipper: {
    position: 'absolute',
    left: 10,
    top: 34,
    width: 13,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(18, 51, 74, 0.42)',
    transform: [{ rotate: '10deg' }],
  },
  featurePenguinParentBeak: {
    position: 'absolute',
    right: 8,
    top: 20,
    width: 0,
    height: 0,
    borderTopWidth: 4,
    borderBottomWidth: 4,
    borderLeftWidth: 11,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: 'rgba(203, 161, 33, 0.58)',
  },
  featurePenguinParentEye: {
    position: 'absolute',
    right: 18,
    top: 16,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: TEXT_BASE_COLOR,
    opacity: 0.62,
  },
  featurePenguinFoot: {
    position: 'absolute',
    bottom: 2,
    width: 10,
    height: 4,
    borderRadius: 4,
    backgroundColor: 'rgba(203, 161, 33, 0.44)',
  },
  featurePenguinFootFront: {
    left: 20,
    transform: [{ rotate: '-8deg' }],
  },
  featurePenguinFootBack: {
    left: 34,
    transform: [{ rotate: '8deg' }],
  },
  featurePenguinParentFootFront: {
    left: 26,
    bottom: 0,
    width: 12,
  },
  featurePenguinParentFootBack: {
    left: 40,
    bottom: 0,
    width: 12,
  },
  flowSection: {
    backgroundColor: WATER_COLOR,
  },
  flowRows: {
    zIndex: 1,
    width: '100%',
    maxWidth: SECTION_CONTENT_WIDTH,
    alignSelf: 'center',
    marginTop: GRID * 5,
    gap: GRID * 2,
  },
  flowRow: {
    minHeight: GRID * 18,
    borderRadius: RADIUS_LG,
    backgroundColor: 'rgba(255, 255, 255, 0.48)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: GRID * 2.5,
    paddingHorizontal: GRID * 5,
    gap: GRID * 5,
  },
  flowRowCompact: {
    minHeight: 0,
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: GRID * 1.5,
    padding: GRID * 2.5,
  },
  flowTextGroup: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: GRID * 52,
    minWidth: GRID * 36,
    maxWidth: GRID * 56,
    gap: GRID,
  },
  flowTextGroupCompact: {
    width: '100%',
    flexGrow: 0,
    flexShrink: 0,
    flexBasis: 'auto',
    minWidth: 0,
    maxWidth: '100%',
  },
  flowExpressionLine: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: GRID * 0.75,
  },
  flowExpressionLineCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: GRID * 2,
  },
  flowLabel: {
    color: TEXT_ACCENT_COLOR,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '900',
    fontFamily: PLAYFUL_FONT_FAMILY,
    letterSpacing: 0.4,
  },
  flowLabelCompact: {
    width: 72,
  },
  flowExpression: {
    color: TEXT_BASE_COLOR,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '900',
    fontFamily: LATIN_FONT_FAMILY,
  },
  flowExpressionCompact: {
    flex: 1,
  },
  flowDescription: {
    color: TEXT_BASE_COLOR,
    fontSize: 15,
    lineHeight: 24,
    fontWeight: '500',
    fontFamily: PLAYFUL_FONT_FAMILY,
    letterSpacing: 0.4,
  },
  operationVideoFrame: {
    flexGrow: 0,
    flexShrink: 0,
    flexBasis: GRID * 46,
    width: GRID * 46,
    height: GRID * 26,
    minWidth: 0,
    maxWidth: GRID * 46,
    aspectRatio: 16 / 9,
    borderRadius: RADIUS_LG,
    borderWidth: 4,
    borderColor: 'rgba(224, 247, 255, 0.9)',
    backgroundColor: 'rgba(198, 232, 244, 0.7)',
    overflow: 'hidden',
  },
  operationVideoFrameCompact: {
    width: '100%',
    flexGrow: 0,
    flexShrink: 0,
    flexBasis: 'auto',
    maxWidth: '100%',
    height: GRID * 24,
  },
  finalSection: {
    position: 'relative',
    overflow: 'hidden',
    paddingHorizontal: GRID * 3,
    paddingVertical: GRID * 9,
    alignItems: 'center',
    backgroundColor: 'rgba(224, 247, 255, 0.72)',
  },
  finalContent: {
    zIndex: 1,
    width: '100%',
    maxWidth: SECTION_CONTENT_WIDTH,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: GRID * 6,
  },
  finalContentCompact: {
    flexDirection: 'column',
    gap: GRID * 3,
  },
  finalCopy: {
    flex: 1,
    maxWidth: GRID * 62,
    alignItems: 'flex-start',
  },
  finalCopyCompact: {
    width: '100%',
    alignItems: 'center',
  },
  finalDescription: {
    width: '100%',
  },
  finalDescriptionCompact: {
    alignItems: 'center',
  },
  finalTitle: {
    color: TEXT_BASE_COLOR,
    fontSize: 30,
    lineHeight: 40,
    fontWeight: '900',
    fontFamily: PLAYFUL_FONT_FAMILY,
    letterSpacing: 0.6,
  },
  finalBody: {
    maxWidth: GRID * 58,
    color: TEXT_BASE_COLOR,
    fontSize: 18,
    lineHeight: 30,
    fontWeight: '500',
    fontFamily: PLAYFUL_FONT_FAMILY,
    letterSpacing: 0.4,
  },
  finalBodyRuby: {
    color: TEXT_BASE_COLOR,
    fontSize: 9,
    lineHeight: 8,
    fontWeight: '500',
    fontFamily: PLAYFUL_FONT_FAMILY,
    textAlign: 'center',
  },
  finalBodyRubyLine: {
    marginTop: GRID * 2,
    maxWidth: GRID * 58,
  },
  finalBodyRubyLineCompact: {
    justifyContent: 'center',
  },
  finalActions: {
    marginTop: GRID * 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: GRID * 2,
    flexWrap: 'wrap',
  },
  finalActionsCompact: {
    justifyContent: 'center',
    marginTop: GRID * 3,
  },
  footer: {
    paddingHorizontal: GRID * 3,
    paddingTop: GRID * 3,
    paddingBottom: GRID * 4,
    alignItems: 'center',
    backgroundColor: 'rgba(224, 247, 255, 0.72)',
  },
  copyright: {
    color: 'rgba(18, 51, 74, 0.68)',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
    fontFamily: LATIN_FONT_FAMILY,
  },
  underwaterScene: {
    width: GRID * 54,
    height: GRID * 34,
    borderRadius: RADIUS_XL,
    borderWidth: 4,
    borderColor: 'rgba(224, 247, 255, 0.9)',
    backgroundColor: 'rgba(198, 232, 244, 0.72)',
    overflow: 'hidden',
    position: 'relative',
  },
  sceneBubble: {
    position: 'absolute',
    borderWidth: 5,
    borderColor: 'rgba(125, 211, 252, 0.42)',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  sceneBubbleLarge: {
    width: 96,
    height: 96,
    borderRadius: 48,
    left: 38,
    top: 32,
  },
  sceneBubbleSmall: {
    width: 40,
    height: 40,
    borderRadius: 20,
    right: 86,
    top: 46,
  },
  sceneBubbleTiny: {
    width: 28,
    height: 28,
    borderRadius: 14,
    left: 186,
    top: 106,
  },
  sceneBubbleShine: {
    width: 22,
    height: 22,
    borderRadius: 11,
    marginLeft: 18,
    marginTop: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.62)',
  },
  landingFish: {
    position: 'absolute',
    width: 56,
    height: 24,
    opacity: 0.9,
  },
  sceneClownfish: {
    left: 58,
    bottom: 72,
    transform: [{ scaleX: -1 }],
  },
  sceneClownfishSmall: {
    right: 54,
    top: 92,
    opacity: 0.72,
  },
  ambientClownfishFeatures: {
    right: 58,
    bottom: 36,
    opacity: 0.34,
    transform: [{ scale: 1.25 }],
  },
  ambientBlueTangFlow: {
    left: 48,
    bottom: 28,
    opacity: 0.3,
    transform: [{ scale: 1.35 }],
  },
  ambientPufferFinal: {
    right: 78,
    bottom: 46,
    opacity: 0.32,
    transform: [{ scale: 1.12 }],
  },
  landingCreatureEye: {
    position: 'absolute',
    left: '17%',
    top: '31%',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.82)',
  },
  landingClownfishBody: {
    position: 'absolute',
    left: '4%',
    top: '15%',
    width: '72%',
    height: '70%',
    borderRadius: RADIUS_PILL,
    backgroundColor: 'rgba(251, 146, 60, 0.56)',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.38)',
    transform: [{ scaleY: 0.78 }],
  },
  landingClownfishStripe: {
    position: 'absolute',
    top: '16%',
    width: '12%',
    height: '68%',
    borderRadius: RADIUS_PILL,
    backgroundColor: 'rgba(255, 255, 255, 0.62)',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.18)',
  },
  landingClownfishTail: {
    position: 'absolute',
    right: '1%',
    top: '20%',
    width: 0,
    height: 0,
    borderTopWidth: 8,
    borderBottomWidth: 8,
    borderRightWidth: 13,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderRightColor: 'rgba(251, 146, 60, 0.56)',
  },
  landingClownfishFin: {
    position: 'absolute',
    left: '42%',
    bottom: '-2%',
    width: 10,
    height: 7,
    borderRadius: 8,
    backgroundColor: 'rgba(253, 186, 116, 0.5)',
    transform: [{ rotate: '-18deg' }],
  },
  landingBlueTangBody: {
    position: 'absolute',
    left: '5%',
    top: '12%',
    width: '72%',
    height: '74%',
    borderRadius: RADIUS_PILL,
    backgroundColor: 'rgba(96, 165, 250, 0.56)',
    borderWidth: 1,
    borderColor: 'rgba(191, 219, 254, 0.42)',
    transform: [{ scaleY: 0.74 }],
  },
  landingBlueTangMark: {
    position: 'absolute',
    left: '20%',
    top: '22%',
    width: '40%',
    height: '32%',
    borderRadius: RADIUS_PILL,
    backgroundColor: 'rgba(7, 89, 133, 0.36)',
    transform: [{ rotate: '-10deg' }],
  },
  landingBlueTangTail: {
    position: 'absolute',
    right: '0%',
    top: '20%',
    width: 0,
    height: 0,
    borderTopWidth: 8,
    borderBottomWidth: 8,
    borderRightWidth: 14,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderRightColor: 'rgba(250, 204, 21, 0.56)',
  },
  landingBlueTangFin: {
    position: 'absolute',
    left: '42%',
    bottom: '-1%',
    width: 11,
    height: 7,
    borderRadius: 8,
    backgroundColor: 'rgba(147, 197, 253, 0.5)',
    transform: [{ rotate: '-16deg' }],
  },
  landingPuffer: {
    position: 'absolute',
    width: 44,
    height: 36,
  },
  landingPufferBody: {
    position: 'absolute',
    left: 3,
    top: 2,
    width: 34,
    height: 30,
    borderRadius: 17,
    backgroundColor: 'rgba(250, 204, 21, 0.52)',
    borderWidth: 1,
    borderColor: 'rgba(254, 240, 138, 0.44)',
  },
  landingPufferTail: {
    position: 'absolute',
    right: 0,
    top: 11,
    width: 0,
    height: 0,
    borderTopWidth: 7,
    borderBottomWidth: 7,
    borderRightWidth: 11,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderRightColor: 'rgba(250, 204, 21, 0.48)',
  },
  landingPufferMouth: {
    position: 'absolute',
    left: 1,
    top: 17,
    width: 7,
    height: 4,
    borderRadius: 4,
    backgroundColor: 'rgba(7, 89, 133, 0.22)',
  },
  landingPufferSpotOne: {
    position: 'absolute',
    left: 16,
    top: 9,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.54)',
  },
  landingPufferSpotTwo: {
    position: 'absolute',
    left: 25,
    top: 18,
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.44)',
  },
  landingPufferEye: {
    position: 'absolute',
    left: 11,
    top: 11,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(7, 89, 133, 0.48)',
  },
  sceneMermaid: {
    position: 'absolute',
    right: 48,
    bottom: 24,
    width: 176,
    height: 138,
    opacity: 1,
    shadowColor: '#FDE68A',
    shadowOpacity: 0.22,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
  },
  mermaidSongBubbleOne: {
    position: 'absolute',
    right: 30,
    top: 14,
    width: 15,
    height: 15,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'rgba(125, 211, 252, 0.56)',
    backgroundColor: 'rgba(255, 255, 255, 0.28)',
  },
  mermaidSongBubbleTwo: {
    position: 'absolute',
    right: 14,
    top: 34,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: 'rgba(125, 211, 252, 0.44)',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  mermaidSongBubbleThree: {
    position: 'absolute',
    right: 50,
    top: 4,
    width: 9,
    height: 9,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: 'rgba(125, 211, 252, 0.4)',
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
  },
  mermaidSongBubbleActive: {
    borderColor: 'rgba(56, 189, 248, 0.78)',
    backgroundColor: 'rgba(224, 247, 255, 0.5)',
    shadowColor: '#7DD3FC',
    shadowOpacity: 0.34,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  mermaidSongBubbleActiveStrong: {
    borderColor: 'rgba(45, 212, 191, 0.82)',
    backgroundColor: 'rgba(204, 251, 241, 0.52)',
    shadowColor: '#2DD4BF',
    shadowOpacity: 0.36,
    shadowRadius: 9,
    shadowOffset: { width: 0, height: 0 },
  },
  mermaidSongPulse: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: 'rgba(125, 211, 252, 0.36)',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  mermaidSongPulseOne: {
    right: 22,
    top: 6,
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  mermaidSongPulseTwo: {
    right: 2,
    top: 26,
    width: 25,
    height: 25,
    borderRadius: 13,
  },
  mermaidMusicNote: {
    position: 'absolute',
    zIndex: 3,
    color: TEXT_ACCENT_COLOR,
    fontFamily: LATIN_FONT_FAMILY,
    fontWeight: '900',
    textShadowColor: 'rgba(255, 255, 255, 0.82)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  mermaidMusicNoteOne: {
    right: 36,
    top: -2,
    fontSize: 18,
    lineHeight: 20,
    transform: [{ rotate: '-10deg' }],
  },
  mermaidMusicNoteTwo: {
    right: 11,
    top: 13,
    fontSize: 20,
    lineHeight: 22,
    color: TEXT_ACCENT_COLOR,
    transform: [{ rotate: '8deg' }],
  },
  mermaidMusicNoteThree: {
    right: 55,
    top: 24,
    fontSize: 15,
    lineHeight: 18,
    color: TEXT_ACCENT_COLOR,
    opacity: 0.9,
    transform: [{ rotate: '-18deg' }],
  },
  mermaidRockBack: {
    position: 'absolute',
    left: 18,
    bottom: 2,
    width: 138,
    height: 38,
    borderRadius: 24,
    backgroundColor: 'rgba(56, 189, 248, 0.22)',
    borderWidth: 2,
    borderColor: 'rgba(224, 247, 255, 0.28)',
  },
  mermaidRockBackActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.3)',
    borderColor: 'rgba(224, 247, 255, 0.4)',
  },
  mermaidRockLeft: {
    position: 'absolute',
    left: 8,
    bottom: 4,
    width: 76,
    height: 34,
    borderRadius: 22,
    backgroundColor: 'rgba(14, 165, 233, 0.24)',
    transform: [{ rotate: '-7deg' }],
  },
  mermaidRockLeftActive: {
    backgroundColor: 'rgba(14, 165, 233, 0.32)',
  },
  mermaidRockRight: {
    position: 'absolute',
    right: 8,
    bottom: 0,
    width: 78,
    height: 42,
    borderRadius: 26,
    backgroundColor: 'rgba(6, 182, 212, 0.2)',
    transform: [{ rotate: '8deg' }],
  },
  mermaidRockRightActive: {
    backgroundColor: 'rgba(6, 182, 212, 0.3)',
  },
  mermaidTail: {
    position: 'absolute',
    left: 70,
    bottom: 35,
    width: 58,
    height: 24,
    borderRadius: 20,
    backgroundColor: 'rgba(45, 212, 191, 0.68)',
    borderWidth: 2,
    borderColor: 'rgba(153, 246, 228, 0.72)',
    transform: [{ rotate: '15deg' }, { scaleY: 0.72 }],
  },
  mermaidTailActive: {
    backgroundColor: 'rgba(45, 212, 191, 0.68)',
    borderColor: 'rgba(153, 246, 228, 0.72)',
  },
  mermaidTailFin: {
    position: 'absolute',
    right: 23,
    bottom: 42,
    width: 0,
    height: 0,
    borderTopWidth: 13,
    borderBottomWidth: 13,
    borderLeftWidth: 24,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: 'rgba(45, 212, 191, 0.66)',
    transform: [{ rotate: '14deg' }],
  },
  mermaidTailFinActive: {
    borderLeftColor: 'rgba(45, 212, 191, 0.66)',
  },
  mermaidBody: {
    position: 'absolute',
    left: 67,
    bottom: 58,
    width: 30,
    height: 38,
    borderRadius: 16,
    backgroundColor: 'rgba(244, 114, 182, 0.58)',
    borderWidth: 2,
    borderColor: 'rgba(251, 207, 232, 0.62)',
    transform: [{ rotate: '-5deg' }],
  },
  mermaidBodyActive: {
    backgroundColor: 'rgba(244, 114, 182, 0.58)',
    borderColor: 'rgba(251, 207, 232, 0.62)',
  },
  mermaidArmBack: {
    position: 'absolute',
    left: 54,
    bottom: 58,
    width: 28,
    height: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(253, 224, 197, 0.72)',
    transform: [{ rotate: '22deg' }],
  },
  mermaidArmFront: {
    position: 'absolute',
    left: 88,
    bottom: 61,
    width: 31,
    height: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(253, 224, 197, 0.72)',
    transform: [{ rotate: '-18deg' }],
  },
  mermaidSkinActive: {
    backgroundColor: 'rgba(253, 224, 197, 0.72)',
  },
  mermaidHairBack: {
    position: 'absolute',
    left: 54,
    bottom: 80,
    width: 52,
    height: 47,
    borderRadius: 28,
    backgroundColor: 'rgba(250, 204, 21, 0.76)',
    transform: [{ rotate: '-8deg' }],
  },
  mermaidHairActive: {
    backgroundColor: 'rgba(250, 204, 21, 0.76)',
  },
  mermaidLongHair: {
    position: 'absolute',
    left: 52,
    bottom: 61,
    width: 29,
    height: 60,
    borderRadius: 22,
    backgroundColor: 'rgba(234, 179, 8, 0.66)',
    transform: [{ rotate: '10deg' }],
  },
  mermaidLongHairActive: {
    backgroundColor: 'rgba(234, 179, 8, 0.66)',
  },
  mermaidHead: {
    position: 'absolute',
    left: 68,
    bottom: 87,
    width: 31,
    height: 31,
    borderRadius: 16,
    backgroundColor: 'rgba(253, 224, 197, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.62)',
  },
  mermaidHeadActive: {
    backgroundColor: 'rgba(253, 224, 197, 0.8)',
    borderColor: 'rgba(255, 255, 255, 0.62)',
  },
  mermaidHairFront: {
    position: 'absolute',
    left: 56,
    bottom: 89,
    width: 34,
    height: 26,
    borderRadius: 18,
    backgroundColor: 'rgba(253, 224, 71, 0.82)',
    transform: [{ rotate: '-20deg' }],
  },
  mermaidHairFrontActive: {
    backgroundColor: 'rgba(253, 224, 71, 0.82)',
  },
  mermaidHairShine: {
    position: 'absolute',
    left: 62,
    bottom: 105,
    width: 14,
    height: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    transform: [{ rotate: '-22deg' }],
  },
  mermaidHairShineActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  mermaidEye: {
    position: 'absolute',
    left: 91,
    bottom: 103,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(7, 89, 133, 0.52)',
  },
  mermaidMouth: {
    position: 'absolute',
    left: 94,
    bottom: 95,
    width: 10,
    height: 6,
    borderRadius: 6,
    borderBottomWidth: 2,
    borderBottomColor: 'rgba(236, 72, 153, 0.76)',
  },
  mermaidMouthActive: {
    width: 10,
    height: 6,
    borderBottomColor: 'rgba(236, 72, 153, 0.76)',
  },
});
