
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

type ClaimViewerContextValue = {
  activeClaimId: number | null;
  claimIds: number[];
  totalClaims: number;
  canPrevious: boolean;
  canNext: boolean;
  openClaim: (id: number) => void;
  closeClaim: () => void;
  navigate: (direction: -1 | 1) => void;
};

const ClaimViewerContext = createContext<ClaimViewerContextValue | null>(null);

type Props = {
  claimIds: number[];
  totalClaims: number;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  loadMore: () => Promise<unknown>;
  children: ReactNode;
};

export function ClaimViewerProvider({
  claimIds,
  totalClaims,
  hasNextPage,
  isFetchingNextPage,
  loadMore,
  children,
}: Props) {
  const [activeClaimId, setActiveClaimId] = useState<number | null>(null);
  const [pendingNextFromId, setPendingNextFromId] = useState<number | null>(null);

  const index = activeClaimId === null ? -1 : claimIds.indexOf(activeClaimId);

  const openClaim = useCallback((id: number) => {
    setPendingNextFromId(null);
    setActiveClaimId(id);
  }, []);

  const closeClaim = useCallback(() => {
    setPendingNextFromId(null);
    setActiveClaimId(null);
  }, []);

  // When the next page arrives, switch to its first claim without closing the modal.
  useEffect(() => {
    if (pendingNextFromId === null || activeClaimId !== pendingNextFromId) return;

    const previousIndex = claimIds.indexOf(pendingNextFromId);

    if (previousIndex < 0) {
      setPendingNextFromId(null);
      return;
    }

    if (previousIndex + 1 < claimIds.length) {
      setActiveClaimId(claimIds[previousIndex + 1]);
      setPendingNextFromId(null);
    } else if (!hasNextPage && !isFetchingNextPage) {
      setPendingNextFromId(null);
    }
  }, [activeClaimId, claimIds, hasNextPage, isFetchingNextPage, pendingNextFromId]);

  const navigate = useCallback(
    (direction: -1 | 1) => {
      if (activeClaimId === null) return;

      const currentIndex = claimIds.indexOf(activeClaimId);
      if (currentIndex < 0) return;

      const nextIndex = currentIndex + direction;

      if (nextIndex >= 0 && nextIndex < claimIds.length) {
        setPendingNextFromId(null);
        setActiveClaimId(claimIds[nextIndex]);
      } else if (direction === 1 && hasNextPage) {
        setPendingNextFromId(activeClaimId);

        if (!isFetchingNextPage) void loadMore();
      }
    },
    [activeClaimId, claimIds, hasNextPage, isFetchingNextPage, loadMore]
  );

  return (
    <ClaimViewerContext.Provider
      value={{
        activeClaimId,
        claimIds,
        totalClaims,
        canPrevious: index > 0,
        canNext: index >= 0 && (index < claimIds.length - 1 || hasNextPage),
        openClaim,
        closeClaim,
        navigate,
      }}
    >
      {children}
    </ClaimViewerContext.Provider>
  );
}

export function useClaimViewer() {
  return useContext(ClaimViewerContext);
}
