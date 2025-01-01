export function useMediaSession(isRecording: boolean, onStop: () => void) {
  const setupMediaSession = () => {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: 'Recording in Progress',
        artist: 'Note Ninja',
        album: 'Voice Recording',
        artwork: [
          {
            src: '/android-chrome-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/android-chrome-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      });

      navigator.mediaSession.setActionHandler('stop', () => {
        onStop();
      });
    }
  };

  const clearMediaSession = () => {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = null;
      navigator.mediaSession.setActionHandler('stop', null);
    }
  };

  return { setupMediaSession, clearMediaSession };
}