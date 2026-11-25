// The part of YouTube's Playables SDK (the global `ytgame`) that the game uses.
// https://developers.google.com/youtube/gaming/playables/reference/sdk
export type YtGameSdk = {
  IN_PLAYABLES_ENV: boolean;
  game: {
    firstFrameReady: () => void;
    gameReady: () => void;
    loadData: () => Promise<string>;
    saveData: (data: string) => Promise<void>;
  };
  system: {
    onPause: (callback: () => void) => () => void;
    onResume: (callback: () => void) => () => void;
    isAudioEnabled: () => boolean;
    onAudioEnabledChange: (callback: (isAudioEnabled: boolean) => void) => () => void;
    getLanguage: () => Promise<string>;
  };
  engagement: {
    sendScore: (score: { value: number }) => Promise<void>;
  };
};

/** The SDK when the page really runs inside YouTube; undefined anywhere else (opened by hand, say). */
export function getYtGameSdk(scope: { ytgame?: YtGameSdk } = globalThis as { ytgame?: YtGameSdk }): YtGameSdk | undefined {
  const sdk = scope.ytgame;
  return sdk && sdk.IN_PLAYABLES_ENV ? sdk : undefined;
}
