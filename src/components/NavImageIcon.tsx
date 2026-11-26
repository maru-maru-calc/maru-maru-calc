import { StyleSheet, View } from 'react-native';

type NavImageIconKind = 'back' | 'next' | 'play' | 'retry' | 'share' | 'skip' | 'undo';

const TEXT_BASE_COLOR = '#12334A';

// Every icon is drawn from the same parts (a rounded stroke, an arrowhead of two strokes), so they
// look like one family whatever fonts the device has.
export function NavImageIcon({ kind, size }: { kind: NavImageIconKind; size: number }) {
  if (kind === 'retry') {
    return <RetryIcon size={size} />;
  }
  if (kind === 'undo') {
    return <UndoIcon size={size} />;
  }
  if (kind === 'skip') {
    return <SkipIcon size={size} />;
  }
  if (kind === 'share') {
    return <ShareIcon size={size} />;
  }
  if (kind === 'play') {
    return <PlayIcon size={size} />;
  }

  return <ArrowIcon direction={kind === 'back' ? -1 : 1} size={size} />;
}

/** A clock face: the sign of the one-minute game. */
export function ClockIcon({ size, color = TEXT_BASE_COLOR }: { size: number; color?: string }) {
  const stroke = Math.max(3, Math.round(size * 0.1));
  return (
    <View testID="clock-icon" style={{ width: size, height: size, borderRadius: size / 2, borderWidth: stroke, borderColor: color, alignItems: 'center' }}>
      <View style={{ position: 'absolute', top: size * 0.16, width: stroke, height: size * 0.3, borderRadius: stroke / 2, backgroundColor: color }} />
      <View style={{ position: 'absolute', top: size / 2 - stroke * 1.5, left: size / 2 - stroke * 1.5, width: size * 0.26, height: stroke, borderRadius: stroke / 2, backgroundColor: color }} />
    </View>
  );
}

/** A pencil, point down to the left: the sign of a puzzle somebody made. */
export function PencilIcon({ size, color = TEXT_BASE_COLOR }: { size: number; color?: string }) {
  const width = Math.max(5, Math.round(size * 0.3));
  const body = Math.round(size * 0.62);
  const tip = Math.round(width * 0.9);

  return (
    <View testID="pencil-icon" style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {/* Drawn upright (eraser end up, point down), then leaned over. */}
      <View style={{ alignItems: 'center', transform: [{ rotate: '45deg' }] }}>
        <View style={{ width, height: Math.round(width * 0.5), borderTopLeftRadius: width * 0.3, borderTopRightRadius: width * 0.3, backgroundColor: color, marginBottom: Math.max(1, Math.round(size * 0.06)) }} />
        <View style={{ width, height: body, backgroundColor: color }} />
        <View style={{ width: 0, height: 0, borderLeftWidth: width / 2, borderRightWidth: width / 2, borderTopWidth: tip, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: color }} />
      </View>
    </View>
  );
}

/** An arrowhead pointing up or down: "one more", "one less". */
export function ChevronIcon({ direction, size }: { direction: 'up' | 'down'; size: number }) {
  const stroke = Math.max(4, Math.round(size * 0.16));
  const head = Math.round(size * 0.5);

  return (
    <View pointerEvents="none" testID={`nav-icon-${direction}`} style={{ width: size, height: size }}>
      <View
        style={[
          styles.arrowHead,
          {
            width: head,
            height: head,
            borderLeftWidth: stroke,
            borderTopWidth: stroke,
            borderRadius: Math.max(1, Math.round(stroke * 0.38)),
            left: (size - head) / 2,
            top: direction === 'up' ? size * 0.36 : size * 0.14,
            transform: [{ rotate: direction === 'up' ? '45deg' : '225deg' }],
          },
        ]}
      />
    </View>
  );
}

/** A ring open at the top right with an arrowhead where it ends: "again, from the start". */
function RetryIcon({ size }: { size: number }) {
  const stroke = Math.max(4, Math.round(size * 0.14));
  const ring = Math.round(size * 0.78);
  const head = Math.round(size * 0.32);
  const top = (size - ring) / 2 + size * 0.05;

  return (
    <View pointerEvents="none" testID="nav-icon-retry" style={{ width: size, height: size }}>
      <View
        style={[
          styles.arrowHead,
          {
            width: ring,
            height: ring,
            left: (size - ring) / 2,
            top,
            borderWidth: stroke,
            borderTopColor: 'transparent',
            borderRadius: ring / 2,
            transform: [{ rotate: '45deg' }],
          },
        ]}
      />
      <View
        style={[
          styles.arrowHead,
          {
            width: head,
            height: head,
            borderLeftWidth: stroke,
            borderTopWidth: stroke,
            borderRadius: Math.max(1, Math.round(stroke * 0.38)),
            left: size / 2 - head * 0.72,
            top: top + stroke / 2 - head / 2,
            transform: [{ rotate: '135deg' }],
          },
        ]}
      />
    </View>
  );
}

/** An arrow to the left that comes round from below: "one step back". */
function UndoIcon({ size }: { size: number }) {
  const stroke = Math.max(4, Math.round(size * 0.14));
  const head = Math.round(size * 0.36);
  const shaftY = Math.round(size * 0.34);
  const hookHeight = Math.round(size * 0.52);
  const hookWidth = Math.round(size * 0.5);
  const right = Math.round(size * 0.1);

  return (
    <View pointerEvents="none" testID="nav-icon-undo" style={{ width: size, height: size }}>
      <View
        style={[
          styles.arrowHead,
          {
            width: hookWidth,
            height: hookHeight,
            right,
            top: shaftY - stroke / 2,
            borderTopWidth: stroke,
            borderRightWidth: stroke,
            borderBottomWidth: stroke,
            borderTopRightRadius: hookHeight / 2,
            borderBottomRightRadius: hookHeight / 2,
          },
        ]}
      />
      <View style={[styles.navStroke, { width: Math.round(size * 0.34), height: stroke, borderRadius: stroke / 2, left: Math.round(size * 0.14), top: shaftY - stroke / 2 }]} />
      <View
        style={[
          styles.arrowHead,
          {
            width: head,
            height: head,
            borderLeftWidth: stroke,
            borderTopWidth: stroke,
            borderRadius: Math.max(1, Math.round(stroke * 0.38)),
            left: Math.round(size * 0.1),
            top: shaftY - head / 2,
            transform: [{ rotate: '-45deg' }],
          },
        ]}
      />
      <View
        style={[
          styles.navStroke,
          { width: Math.round(size * 0.2), height: stroke, borderRadius: stroke / 2, left: size - right - hookWidth - Math.round(size * 0.18), top: shaftY - stroke / 2 + hookHeight - stroke },
        ]}
      />
    </View>
  );
}

function ArrowIcon({ direction, size }: { direction: -1 | 1; size: number }) {
  const stroke = Math.max(4, Math.round(size * 0.14));
  const shaftWidth = Math.round(size * 0.58);
  const head = Math.round(size * 0.38);
  const center = size / 2;

  return (
    <View pointerEvents="none" testID={direction < 0 ? 'nav-icon-back' : 'nav-icon-next'} style={{ width: size, height: size }}>
      <View
        style={[
          styles.navStroke,
          {
            width: shaftWidth,
            height: stroke,
            borderRadius: stroke / 2,
            left: (size - shaftWidth) / 2,
            top: center - stroke / 2,
          },
        ]}
      />
      <View
        style={[
          styles.arrowHead,
          {
            width: head,
            height: head,
            borderLeftWidth: stroke,
            borderTopWidth: stroke,
            borderRadius: Math.max(1, Math.round(stroke * 0.38)),
            left: direction < 0 ? size * 0.18 : size * 0.44,
            top: center - head / 2,
            transform: [{ rotate: direction < 0 ? '-45deg' : '135deg' }],
          },
        ]}
      />
    </View>
  );
}

/** A triangle pointing right: "play". */
function PlayIcon({ size }: { size: number }) {
  const height = Math.round(size * 0.72);
  const width = Math.round(size * 0.6);

  return (
    <View pointerEvents="none" testID="nav-icon-play" style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          width: 0,
          height: 0,
          marginLeft: Math.round(size * 0.1),
          borderTopWidth: height / 2,
          borderBottomWidth: height / 2,
          borderLeftWidth: width,
          borderTopColor: 'transparent',
          borderBottomColor: 'transparent',
          borderLeftColor: TEXT_BASE_COLOR,
        }}
      />
    </View>
  );
}

/** An arrow going up out of an open tray: "send this out". */
function ShareIcon({ size }: { size: number }) {
  const stroke = Math.max(4, Math.round(size * 0.14));
  const head = Math.round(size * 0.34);
  const trayWidth = Math.round(size * 0.8);
  const trayHeight = Math.round(size * 0.4);
  const shaftHeight = Math.round(size * 0.56);

  return (
    <View pointerEvents="none" testID="nav-icon-share" style={{ width: size, height: size }}>
      <View
        style={[
          styles.arrowHead,
          {
            width: trayWidth,
            height: trayHeight,
            left: (size - trayWidth) / 2,
            top: size - trayHeight,
            borderLeftWidth: stroke,
            borderRightWidth: stroke,
            borderBottomWidth: stroke,
            borderBottomLeftRadius: stroke * 1.4,
            borderBottomRightRadius: stroke * 1.4,
          },
        ]}
      />
      <View style={[styles.navStroke, { width: stroke, height: shaftHeight, borderRadius: stroke / 2, left: (size - stroke) / 2, top: Math.round(size * 0.08) }]} />
      <View
        style={[
          styles.arrowHead,
          {
            width: head,
            height: head,
            borderLeftWidth: stroke,
            borderTopWidth: stroke,
            borderRadius: Math.max(1, Math.round(stroke * 0.38)),
            left: (size - head) / 2,
            // Turned, its corner is the arrow's tip, just inside the top of the icon.
            top: Math.round(size * 0.04 + head * 0.21),
            transform: [{ rotate: '45deg' }],
          },
        ]}
      />
    </View>
  );
}

/** Two arrowheads pointing right: "fast forward". */
function SkipIcon({ size }: { size: number }) {
  const stroke = Math.max(4, Math.round(size * 0.14));
  const head = Math.round(size * 0.38);

  return (
    <View pointerEvents="none" testID="nav-icon-skip" style={{ width: size, height: size }}>
      {[0.08, 0.42].map((left) => (
        <View
          key={left}
          style={[
            styles.arrowHead,
            {
              width: head,
              height: head,
              borderLeftWidth: stroke,
              borderTopWidth: stroke,
              borderRadius: Math.max(1, Math.round(stroke * 0.38)),
              left: size * left,
              top: size / 2 - head / 2,
              transform: [{ rotate: '135deg' }],
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  navStroke: {
    position: 'absolute',
    backgroundColor: TEXT_BASE_COLOR,
  },
  arrowHead: {
    position: 'absolute',
    borderColor: TEXT_BASE_COLOR,
  },
});
