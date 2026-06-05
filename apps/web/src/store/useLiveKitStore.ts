import { create } from 'zustand';

interface LiveKitState {
  token: string | null;
  serverUrl: string | null;
  isMicEnabled: boolean;
  isCameraEnabled: boolean;
  setConnectionDetails: (url: string, token: string) => void;
  toggleMic: () => void;
  toggleCamera: () => void;
  clearConnection: () => void;
}

export const useLiveKitStore = create<LiveKitState>((set) => ({
  token: null,
  serverUrl: null,
  isMicEnabled: false,
  isCameraEnabled: false,
  setConnectionDetails: (serverUrl, token) => set({ serverUrl, token }),
  toggleMic: () => set((state) => ({ isMicEnabled: !state.isMicEnabled })),
  toggleCamera: () => set((state) => ({ isCameraEnabled: !state.isCameraEnabled })),
  clearConnection: () => set({ token: null, serverUrl: null, isMicEnabled: false, isCameraEnabled: false }),
}));
