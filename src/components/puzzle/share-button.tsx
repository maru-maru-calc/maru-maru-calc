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
// their own proportions, and never drawn here. The names are for screen readers.
const SHARE_PLACES: Array<{ id: ShareLinkId; name: string; mark: ImageSourcePropType; width: number; height: number }> = [
  { id: 'x', name: 'X', mark: require('../../../assets/share/x.png'), width: 25, height: 25.6 },
  { id: 'line', name: 'LINE', mark: require('../../../assets/share/line.png'), width: 32, height: 32 },
  { id: 'facebook', name: 'Facebook', mark: require('../../../assets/share/facebook.png'), width: 32, height: 32 },
  { id: 'bluesky', name: 'Bluesky', mark: require('../../../assets/share/bluesky.svg'), width: 32, height: 28.2 },
  // Its picture is 40 across, made for a button of 20: shown no bigger than this, it stays sharp enough.
  { id: 'hatena', name: 'Hatena Bookmark', mark: require('../../../assets/share/hatena.png'), width: 28, height: 28 },
];

/**
 * The ways of sending: the picture itself on top, then a row of places that post the link, and
 * under it the link to copy, the picture to keep, and the device's own share (which is the one
 * way the picture goes along). It lies over the whole screen, at the screen's own size.
 */
function SharePanel({ share, onClose }: { share: PictureShare; onClose: () => void }) {
  const [hasCopied, setHasCopied] = useState(false);
  const { width, height } = useWindowDimensions();
  // On a screen too short for the picture above the buttons (a phone held sideways), the buttons go beside it.
  const isShort = height < 520;
  const pictureHeight = isShort
    ? Math.max(100, Math.min(height - 64, 300))
    : Math.max(120, Math.min(height - 300, 360, ((Math.min(width, 380) - 48) * RESULT_CARD_HEIGHT) / RESULT_CARD_WIDTH));

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

  // Smaller buttons where three of the usual size do not fit in a row: beside the picture, or on a narrow phone.
  const isTight = isShort || width < 372;
  const tileStyle = isTight ? [styles.shareTile, styles.shareTileSmall] : styles.shareTile;
  const picture = (
    <Image accessibilityLabel={a11yLabel('the picture that is sent')} testID="share-picture" source={{ uri: share.previewUrl }} style={[styles.sharePicture, { height: pictureHeight, width: (pictureHeight * RESULT_CARD_WIDTH) / RESULT_CARD_HEIGHT }]} />
  );
  const closeButton = (
    <Pressable accessibilityLabel={a11yLabel('close')} accessibilityRole="button" testID="share-close" onPress={onClose} style={({ pressed }) => [styles.shareClose, pressed && styles.pressed]}>
      <NavImageIcon kind="close" size={18} />
    </Pressable>
  );
  const buttons = (
    <>
      <View style={[styles.shareRow, isTight && styles.shareRowSmall]}>
        {SHARE_PLACES.map((place) => (
          <Pressable
            key={place.id}
            accessibilityLabel={`${place.name}: ${a11yLabel('post the link')}`}
            accessibilityRole="button"
            testID={`share-${place.id}`}
            onPress={() => share.openLink(place.id)}
            style={({ pressed }) => [styles.sharePlace, isTight && styles.sharePlaceSmall, pressed && styles.pressed]}
          >
            <Image source={place.mark} resizeMode="contain" style={{ width: place.width * (isTight ? 0.8 : 1), height: place.height * (isTight ? 0.8 : 1) }} />
          </Pressable>
        ))}
      </View>
      <View style={[styles.shareRow, isTight && styles.shareRowSmall]}>
        <Pressable
          accessibilityLabel={a11yLabel('copy the link')}
          accessibilityRole="button"
          testID="share-copy"
          onPress={() => {
            void share.copyAddress().then(setHasCopied);
          }}
          style={({ pressed }) => [tileStyle, pressed && styles.pressed]}
        >
          <NavImageIcon kind={hasCopied ? 'check' : 'link'} size={29} />
        </Pressable>
        <Pressable accessibilityLabel={a11yLabel('save the picture')} accessibilityRole="button" testID="share-save" onPress={share.save} style={({ pressed }) => [tileStyle, pressed && styles.pressed]}>
          <NavImageIcon kind="save" size={29} />
        </Pressable>
        {share.shareWithDevice ? (
          <Pressable accessibilityLabel={a11yLabel('send with another app')} accessibilityRole="button" testID="share-device" onPress={share.shareWithDevice} style={({ pressed }) => [tileStyle, pressed && styles.pressed]}>
            <NavImageIcon kind="more" size={29} />
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
