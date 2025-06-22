import { LENDING_MARKETS } from "@suilend/sdk";
import { NORMALIZED_SEND_COINTYPE, getToken } from "@suilend/sui-fe";

import TokenLogo from "@/components/shared/TokenLogo";
import { useLoadedAppContext } from "@/contexts/AppContext";

interface SendTokenLogoProps {
  size: number;
}

export default function SendTokenLogo({ size }: SendTokenLogoProps) {
  const { allAppData } = useLoadedAppContext();

  const appData = allAppData.allLendingMarketData[LENDING_MARKETS[0].id];

  return (
    <TokenLogo
      token={getToken(
        NORMALIZED_SEND_COINTYPE,
        appData.coinMetadataMap[NORMALIZED_SEND_COINTYPE],
      )}
      size={size}
    />
  );
}
