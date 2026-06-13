import { createContext, useContext } from 'react';

type BgmController = {
  isVocalEnabled: boolean;
  toggleVocal: () => void;
};

export const BgmControlContext = createContext<BgmController>({
  isVocalEnabled: false,
  toggleVocal: () => {},
});

export function useBgmControl() {
  return useContext(BgmControlContext);
}
