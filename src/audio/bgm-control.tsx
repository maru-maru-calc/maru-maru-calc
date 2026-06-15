import { createContext, useContext } from 'react';

type BgmController = {
  isVocalEnabled: boolean;
  pauseBgm: () => void;
  toggleVocal: () => void;
};

export const BgmControlContext = createContext<BgmController>({
  isVocalEnabled: false,
  pauseBgm: () => {},
  toggleVocal: () => {},
});

export function useBgmControl() {
  return useContext(BgmControlContext);
}
