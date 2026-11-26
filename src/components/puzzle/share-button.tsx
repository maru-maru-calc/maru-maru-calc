// The share button and the ways of sending it opens. Web only: it comes to the game through its
// host (platform/browser-host.ts), so a build where nothing can be shared does not carry it, nor
// the names of the places it posts to.
import { useEffect, useRef, useState } from 'react';
import { Image, Modal, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import type { ImageSourcePropType } from 'react-native';

import { HEADER_ACTION_BUTTON_SIZE, RADIUS_LG } from '@/components/marumaru/constants';
import { NavImageIcon } from '@/components/NavImageIcon';
import { RESULT_CARD_HEIGHT, RESULT_CARD_WIDTH } from '@/game/result-card';
import { a11yLabel } from '@/i18n/a11y-label';
import type { PictureShare, ShareButtonProps, ShareLinkId } from '@/platform/game-host';

const WATER = '#C6E8F4';

/**
 * The share button. The picture is drawn as soon as there is something to show (a browser only
 * opens the share sheet in the moment of a tap, with nothing to wait for), and the button appears
 * once there is a picture. A press opens the ways of sending it. `shareKey` says what the picture
 * shows: a new key draws a new picture.
 */
export function ShareButton({ label, testID, shareKey, prepare }: ShareButtonProps) {
  const [ready, setReady] = useState<{ key: string; share: PictureShare } | undefined>(undefined);
  const [isOpen, setIsOpen] = useState(false);
  const prepareRef = useRef(prepare);
  prepareRef.current = prepare;
  useEffect(() => {
    let isCurrent = true;
    let made: PictureShare | undefined;
    void prepareRef.current().then(
      (share) => {
        if (!share) {
          return;
        }
        if (isCurrent) {
          made = share;
          setReady({ key: shareKey, share });
        } else {
          // Drawn too late to be of use: the screen has moved on.
          share.release();
        }
      },
      () => {},
    );
    return () => {
      isCurrent = false;
      setIsOpen(false);
      // A picture is kept in memory until it is let go: one for every puzzle played would add up.
      made?.release();
    };
  }, [shareKey]);

  // A picture of something else (the puzzle before this one) is not sent.
  if (!ready || ready.key !== shareKey) {
    return null;
  }
  return (
    <>
      <Pressable accessibilityLabel={a11yLabel(label)} accessibilityRole="button" testID={testID} onPress={() => setIsOpen(true)} style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
        <NavImageIcon kind="share" size={29} />
      </Pressable>
      {isOpen ? <SharePanel share={ready.share} onClose={() => setIsOpen(false)} /> : null}
    </>
  );
}

// The places a link can be posted to, each shown by its own mark (assets/share/SOURCES.md says
// where the pictures come from). The marks are theirs: they are shown as they are, whole and in
// their own proportions, and never drawn here. The names are for screen readers. The first three
// are where most players are; they are the big buttons where the places lead.
type SharePlace = { id: ShareLinkId; name: string; mark: ImageSourcePropType; width: number; height: number };
const MAIN_PLACES = 3;
const SHARE_PLACES: SharePlace[] = [
  { id: 'x', name: 'X', mark: require('../../../assets/share/x.png'), width: 25, height: 25.6 },
  { id: 'line', name: 'LINE', mark: require('../../../assets/share/line.png'), width: 32, height: 32 },
  { id: 'facebook', name: 'Facebook', mark: require('../../../assets/share/facebook.png'), width: 32, height: 32 },
  { id: 'bluesky', name: 'Bluesky', mark: require('../../../assets/share/bluesky.svg'), width: 32, height: 28.2 },
  // Its picture is 40 across, made for a button of 20: shown no bigger than this, it stays sharp enough.
  { id: 'hatena', name: 'Hatena Bookmark', mark: require('../../../assets/share/hatena.png'), width: 28, height: 28 },
];

/**
 * The ways of sending, under the picture itself: two rows, as wide as each other. What comes
 * first depends on what is sent (PictureShare's `lead`).
 *
 * A puzzle, sent to be solved: the three places most players use are the big buttons, and under
 * them the small ones: the other places, the address to copy, the picture to keep, and the
 * device's own share where there is one.
 *
 * A result, shown to somebody: where the device can pass a picture on, that is the one big
 * button (it is the only way the picture goes along), with all five places small under it and
 * the address and the picture last. Where it cannot, the places lead as for a puzzle.
 *
 * It lies over the whole screen, at the screen's own size.
 */
function SharePanel({ share, onClose }: { share: PictureShare; onClose: () => void }) {
  const [hasCopied, setHasCopied] = useState(false);
  const { width, height } = useWindowDimensions();
  // On a screen too short for the picture above the buttons (a phone held sideways), the buttons go beside it.
  const isShort = height < 520;
  // Smaller buttons where the usual size does not fit in a row: beside the picture, or on a narrow phone.
  const isTight = isShort || width < 372;
  const deviceLeads = share.lead === 'device' && share.shareWithDevice !== undefined;
  // What the buttons under the picture take of the screen's height: three rows where the device's share leads, else two.
  const buttonsHeight = 308 + (deviceLeads ? (isTight ? 52 : 60) : 0);
  const pictureHeight = isShort
    ? Math.max(100, Math.min(height - 64, 300))
    : Math.max(120, Math.min(height - buttonsHeight, 360, ((Math.min(width, 380) - 48) * RESULT_CARD_HEIGHT) / RESULT_CARD_WIDTH));

  // Escape closes it, as it closes any sheet laid over a page.
  useEffect(() => {
    if (typeof document === 'undefined') {
      return undefined;
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const tileStyle = isTight ? [styles.shareTile, styles.shareTileSmall] : styles.shareTile;
  const picture = (
    <Image accessibilityLabel={a11yLabel('the picture that is sent')} testID="share-picture" source={{ uri: share.previewUrl }} style={[styles.sharePicture, { height: pictureHeight, width: (pictureHeight * RESULT_CARD_WIDTH) / RESULT_CARD_HEIGHT }]} />
  );
  const closeButton = (
    <Pressable accessibilityLabel={a11yLabel('close')} accessibilityRole="button" testID="share-close" onPress={onClose} style={({ pressed }) => [styles.shareClose, pressed && styles.pressed]}>
      <NavImageIcon kind="close" size={18} />
    </Pressable>
  );
  const placeButton = (place: SharePlace, isBig: boolean) => (
    <Pressable
      key={place.id}
      accessibilityLabel={`${place.name}: ${a11yLabel('post the link')}`}
      accessibilityRole="button"
      testID={`share-${place.id}`}
      onPress={() => share.openLink(place.id)}
      style={({ pressed }) => [styles.sharePlace, isTight && styles.sharePlaceSmall, isBig && (isTight ? styles.sharePlaceBigSmall : styles.sharePlaceBig), pressed && styles.pressed]}
    >
      <Image source={place.mark} resizeMode="contain" style={{ width: place.width * (isTight ? 0.8 : 1), height: place.height * (isTight ? 0.8 : 1) }} />
    </Pressable>
  );
  const smallTile = isTight ? [styles.sharePlace, styles.sharePlaceSmall] : styles.sharePlace;
  const copyButton = (
    <Pressable
      accessibilityLabel={a11yLabel('copy the link')}
      accessibilityRole="button"
      testID="share-copy"
      onPress={() => {
        void share.copyAddress().then(setHasCopied);
      }}
      style={({ pressed }) => [deviceLeads ? tileStyle : smallTile, pressed && styles.pressed]}
    >
      <NavImageIcon kind={hasCopied ? 'check' : 'link'} size={deviceLeads ? 29 : isTight ? 22 : 26} />
    </Pressable>
  );
  const saveButton = (
    <Pressable accessibilityLabel={a11yLabel('save the picture')} accessibilityRole="button" testID="share-save" onPress={share.save} style={({ pressed }) => [deviceLeads ? tileStyle : smallTile, pressed && styles.pressed]}>
      <NavImageIcon kind="save" size={deviceLeads ? 29 : isTight ? 22 : 26} />
    </Pressable>
  );
  const rowStyle = [styles.shareRow, isTight && styles.shareRowSmall];
  const buttons = deviceLeads ? (
    <>
      <Pressable
        accessibilityLabel={a11yLabel('send with another app')}
        accessibilityRole="button"
        testID="share-device"
        onPress={share.shareWithDevice}
        style={({ pressed }) => [styles.shareDevice, isTight && styles.shareDeviceSmall, pressed && styles.pressed]}
      >
        <NavImageIcon kind="share" size={isTight ? 26 : 30} color="#FFFFFF" />
      </Pressable>
      <View style={rowStyle}>{SHARE_PLACES.map((place) => placeButton(place, false))}</View>
      <View style={rowStyle}>
        {copyButton}
        {saveButton}
      </View>
    </>
  ) : (
    <>
      <View style={[styles.shareRow, styles.shareRowBig]}>{SHARE_PLACES.slice(0, MAIN_PLACES).map((place) => placeButton(place, true))}</View>
      <View style={rowStyle}>
        {SHARE_PLACES.slice(MAIN_PLACES).map((place) => placeButton(place, false))}
        {copyButton}
        {saveButton}
        {share.shareWithDevice ? (
          <Pressable accessibilityLabel={a11yLabel('send with another app')} accessibilityRole="button" testID="share-device" onPress={share.shareWithDevice} style={({ pressed }) => [smallTile, pressed && styles.pressed]}>
            <NavImageIcon kind="share" size={isTight ? 22 : 26} />
          </Pressable>
        ) : null}
      </View>
    </>
  );

  return (
    <Modal transparent visible animationType="fade" onRequestClose={onClose}>
      <Pressable accessibilityLabel={a11yLabel('close')} testID="share-panel-backdrop" onPress={onClose} style={styles.shareBackdrop}>
        {/* A press on the sheet itself is not a press on what lies behind it. */}
        {isShort ? (
          <Pressable testID="share-panel" onPress={() => {}} style={[styles.shareSheet, styles.shareSheetSideways]}>
            {picture}
            <View style={styles.shareSide}>
              {closeButton}
              {buttons}
            </View>
          </Pressable>
        ) : (
          <Pressable testID="share-panel" onPress={() => {}} style={[styles.shareSheet, { width: '100%', maxWidth: Math.min(width - 24, 380) }]}>
            {closeButton}
            {picture}
            {buttons}
          </Pressable>
        )}
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  // The same button as on the board.
  button: {
    width: HEADER_ACTION_BUTTON_SIZE,
    height: HEADER_ACTION_BUTTON_SIZE,
    borderRadius: RADIUS_LG,
    backgroundColor: 'rgba(255, 255, 255, 0.26)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
  shareBackdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(18, 51, 74, 0.45)',
    padding: 12,
  },
  shareSheetSideways: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
  },
  shareSide: {
    alignItems: 'center',
    gap: 8,
  },
  shareRowSmall: {
    gap: 6,
  },
  shareTileSmall: {
    width: 74,
    height: 48,
  },
  // The three big places fill the width of the five small tiles under them (3 × 104 + 2 × 8 = 5 × 56 + 4 × 12).
  sharePlaceBig: {
    width: 104,
    height: 64,
  },
  sharePlaceBigSmall: {
    width: 76,
    height: 48,
  },
  shareRowBig: {
    gap: 8,
  },
  // As wide as the row of five places under it, and filled: the one button that stands out.
  shareDevice: {
    width: 5 * 56 + 4 * 12,
    height: 56,
    borderRadius: RADIUS_LG,
    backgroundColor: '#0284C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareDeviceSmall: {
    width: 5 * 44 + 4 * 6,
    height: 48,
  },
  shareSheet: {
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 20,
    borderRadius: 24,
    backgroundColor: WATER,
    borderWidth: 3,
    borderColor: 'rgba(125, 211, 252, 0.9)',
  },
  shareClose: {
    alignSelf: 'flex-end',
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sharePicture: {
    borderRadius: 12,
    borderWidth: 3,
    borderColor: 'rgba(186, 230, 253, 0.9)',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  shareRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  shareTile: {
    width: 88,
    height: 56,
    borderRadius: RADIUS_LG,
    backgroundColor: 'rgba(255, 255, 255, 0.86)',
    borderWidth: 3,
    borderColor: 'rgba(186, 230, 253, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // A white square with room around the mark, as the places ask for theirs.
  sharePlace: {
    width: 56,
    height: 56,
    borderRadius: RADIUS_LG,
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
    borderColor: 'rgba(186, 230, 253, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sharePlaceSmall: {
    width: 44,
    height: 44,
  },
});
