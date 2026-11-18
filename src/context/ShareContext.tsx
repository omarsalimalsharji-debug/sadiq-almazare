import React, { createContext, useCallback, useContext, useState } from 'react';
import { SharePayload } from '../utils/shareUtils.ts';
import { ShareSheetModal } from '../components/ShareSheetModal.tsx';

interface ShareContextValue {
  openShare: (payload: SharePayload) => void;
  closeShare: () => void;
}

const ShareContext = createContext<ShareContextValue>({
  openShare: () => {},
  closeShare: () => {},
});

export const ShareProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [payload, setPayload] = useState<SharePayload | null>(null);
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const openShare = useCallback((nextPayload: SharePayload) => {
    setPayload(nextPayload);
    setIsOpen(true);
  }, []);

  const closeShare = useCallback(() => {
    setIsOpen(false);
  }, []);

  return (
    <ShareContext.Provider value={{ openShare, closeShare }}>
      {children}
      <ShareSheetModal isOpen={isOpen} payload={payload} onClose={closeShare} />
    </ShareContext.Provider>
  );
};

export function useShare(): ShareContextValue {
  return useContext(ShareContext);
}
