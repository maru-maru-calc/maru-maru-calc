import { createContext, useContext } from 'react';

type BgmController = {
  isVocalEnabled: boolean;
  isMuted: boolean;
  pauseBgm: () => void;
  toggleVocal: () => void;
  toggleMute: () => void;
};

export const BgmControlContext = createContext<BgmController>({
  isVocalEnabled: false,
  isMuted: false,
  pauseBgm: () => {},
  toggleVocal: () => {},
  toggleMute: () => {},
});

export function useBgmControl() {
  return useContext(BgmControlContext);
}
