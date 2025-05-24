import { useRouter } from "next/router";
import {
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { API_URL } from "@suilend/frontend-sui";
import { shallowPushQuery } from "@suilend/frontend-sui-next";

import { AppData, useLoadedAppContext } from "@/contexts/AppContext";

enum QueryParams {
  LENDING_MARKET_ID = "lendingMarketId",
}

interface AdminContext {
  appData: AppData;
  setSelectedLendingMarketId: (lendingMarketId: string) => void;

  steammPoolInfos: any[] | undefined;
}

const defaultContextValue: AdminContext = {
  appData: {} as AppData,
  setSelectedLendingMarketId: () => {
    throw Error("AdminContextProvider not initialized");
  },

  steammPoolInfos: undefined,
};

const AdminContext = createContext<AdminContext>(defaultContextValue);

export const useAdminContext = () => useContext(AdminContext);

export function AdminContextProvider({ children }: PropsWithChildren) {
  const router = useRouter();
  const queryParams = useMemo(
    () => ({
      [QueryParams.LENDING_MARKET_ID]: router.query[
        QueryParams.LENDING_MARKET_ID
      ] as string,
    }),
    [router.query],
  );

  const { allAppData } = useLoadedAppContext();

  // Lending market
  const [selectedLendingMarketId, setSelectedLendingMarketId] =
    useState<string>(queryParams[QueryParams.LENDING_MARKET_ID] ?? "");

  const onSelectedLendingMarketIdChange = useCallback(
    (lendingMarketId: string) => {
      setSelectedLendingMarketId(lendingMarketId);

      shallowPushQuery(router, {
        ...router.query,
        [QueryParams.LENDING_MARKET_ID]: lendingMarketId,
      });
    },
    [router],
  );

  const appData = useMemo(
    () =>
      allAppData.allLendingMarketData[selectedLendingMarketId] ??
      Object.values(allAppData.allLendingMarketData)[0],
    [allAppData.allLendingMarketData, selectedLendingMarketId],
  );

  // STEAMM pools
  const [steammPoolInfos, setSteammPoolInfos] = useState<any[] | undefined>(
    undefined,
  );

  useEffect(() => {
    (async () => {
      try {
        const poolsRes = await fetch(`${API_URL}/steamm/pools/all`);
        const poolsJson: any[] = await poolsRes.json();
        if ((poolsJson as any)?.statusCode === 500)
          throw new Error("Failed to fetch pools");

        setSteammPoolInfos(poolsJson.map((poolObj) => poolObj.poolInfo));
      } catch (err) {
        console.error(err);
      }
    })();
  }, []);

  // Context
  const contextValue: AdminContext = useMemo(
    () => ({
      appData,
      setSelectedLendingMarketId: onSelectedLendingMarketIdChange,

      steammPoolInfos,
    }),
    [appData, onSelectedLendingMarketIdChange, steammPoolInfos],
  );

  return (
    <AdminContext.Provider value={contextValue}>
      {children}
    </AdminContext.Provider>
  );
}
