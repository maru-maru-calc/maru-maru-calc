// The sea creatures, the mermaid, the divers and the penguins: one drawing each, in assets/creatures.
//
// They are vector pictures and not shapes put together from views, so that each one can have curves
// (a fin, a tail, flowing hair) and still look the same at every size.
import { Image } from 'react-native';
import type { ImageStyle, StyleProp } from 'react-native';

// Each drawing faces left. `width` and `height` are the picture's own size, which gives its shape.
const CREATURES = {
  angler: { source: require('../../assets/creatures/angler.svg'), width: 140, height: 108 },
  blueTang: { source: require('../../assets/creatures/blue-tang.svg'), width: 124, height: 80 },
  clownfish: { source: require('../../assets/creatures/clownfish.svg'), width: 120, height: 76 },
  diverBoy: { source: require('../../assets/creatures/diver-boy.svg'), width: 124, height: 86 },
  diverGirl: { source: require('../../assets/creatures/diver-girl.svg'), width: 124, height: 86 },
  flatfish: { source: require('../../assets/creatures/flatfish.svg'), width: 132, height: 84 },
  jelly: { source: require('../../assets/creatures/jelly.svg'), width: 92, height: 120 },
  mermaid: { source: require('../../assets/creatures/mermaid.svg'), width: 176, height: 138 },
  mermaidSinging: { source: require('../../assets/creatures/mermaid-singing.svg'), width: 176, height: 138 },
  penguinChick: { source: require('../../assets/creatures/penguin-chick.svg'), width: 64, height: 72 },
  penguinParent: { source: require('../../assets/creatures/penguin-parent.svg'), width: 80, height: 108 },
  puffer: { source: require('../../assets/creatures/puffer.svg'), width: 108, height: 92 },
  ray: { source: require('../../assets/creatures/ray.svg'), width: 150, height: 96 },
  seahorse: { source: require('../../assets/creatures/seahorse.svg'), width: 84, height: 124 },
  shark: { source: require('../../assets/creatures/shark.svg'), width: 160, height: 84 },
  squid: { source: require('../../assets/creatures/squid.svg'), width: 88, height: 124 },
  tuna: { source: require('../../assets/creatures/tuna.svg'), width: 150, height: 72 },
  turtle: { source: require('../../assets/creatures/turtle.svg'), width: 128, height: 92 },
  whale: { source: require('../../assets/creatures/whale.svg'), width: 180, height: 104 },
} as const;

export type CreatureKind = keyof typeof CREATURES;

/** How tall a creature is when it is drawn `width` wide. */
export function getCreatureHeight(kind: CreatureKind, width: number) {
  const art = CREATURES[kind];
  return (width * art.height) / art.width;
}

export function CreatureArt({ kind, width, style, testID }: { kind: CreatureKind; width: number; style?: StyleProp<ImageStyle>; testID?: string }) {
  return <Image source={CREATURES[kind].source} resizeMode="contain" style={[{ width, height: getCreatureHeight(kind, width) }, style]} testID={testID} />;
}
