import { useState } from "react";

import { ChevronDown, ChevronUp, ExternalLink } from "lucide-react";

import { ADMIN_ADDRESS } from "@suilend/sdk";
import { getMsafeAppStoreUrl, isInMsafeApp } from "@suilend/sui-fe";
import { useWalletContext } from "@suilend/sui-fe-next";

import Link from "@/components/shared/Link";
import Popover from "@/components/shared/Popover";
import { TBodySans } from "@/components/shared/Typography";
import {
  ABOUT_URL,
  ADMIN_URL,
  BRIDGE_URL,
  LEADERBOARD_URL,
  ROOT_URL,
  SEND_URL,
  SPRINGSUI_URL,
  STEAMM_URL,
  STRATEGIES_URL,
  SWAP_URL,
} from "@/lib/navigation";
import { cn } from "@/lib/utils";

function More() {
  return (
    <>
      <Link href={LEADERBOARD_URL}>Leaderboard</Link>
      <Link href={SEND_URL}>SEND</Link>
      <Link href={ABOUT_URL}>About</Link>

      {/* External */}
      <Link
        href={
          !isInMsafeApp() ? SPRINGSUI_URL : getMsafeAppStoreUrl("SpringSui")
        }
        isExternal
        endIcon={<ExternalLink className="h-3 w-3" />}
      >
        SpringSui
      </Link>
      <Link
        href={STEAMM_URL}
        isExternal
        endIcon={<ExternalLink className="h-3 w-3" />}
      >
        STEAMM
      </Link>
    </>
  );
}

export default function NavigationLinks() {
  const { address } = useWalletContext();

  // More
  const [isMoreOpen, setIsMoreOpen] = useState<boolean>(false);
  const Icon = isMoreOpen ? ChevronUp : ChevronDown;

  return (
    <>
      {/* Internal */}
      <Link href={ROOT_URL}>Lend</Link>
      {/* {!isInMsafeApp() && <Link href={STRATEGIES_URL}>Strategies</Link>} */}
      {!isInMsafeApp() && (
        <Link href={SWAP_URL} startsWithHref={SWAP_URL}>
          Swap
        </Link>
      )}
      {!isInMsafeApp() && <Link href={BRIDGE_URL}>Bridge</Link>}
      {address === ADMIN_ADDRESS && !isInMsafeApp() && (
        <Link href={ADMIN_URL}>Admin</Link>
      )}

      {/* More */}
      <Popover
        className="max-lg:hidden"
        id="more"
        rootProps={{ open: isMoreOpen, onOpenChange: setIsMoreOpen }}
        trigger={
          <div className="group flex h-8 cursor-pointer flex-row items-center gap-1">
            <TBodySans
              className={cn(
                "transition-colors",
                isMoreOpen
                  ? "text-foreground"
                  : "text-muted-foreground group-hover:text-foreground",
              )}
            >
              More
            </TBodySans>
            <Icon
              className={cn(
                "h-3 w-3 transition-colors",
                isMoreOpen
                  ? "text-foreground"
                  : "text-muted-foreground group-hover:text-foreground",
              )}
            />
          </div>
        }
        contentProps={{
          className: "w-max rounded-lg bg-background py-2 px-4",
        }}
      >
        <div className="flex flex-col gap-3">
          <More />
        </div>
      </Popover>

      <div className="flex flex-col gap-6 lg:hidden">
        <More />
      </div>
    </>
  );
}
