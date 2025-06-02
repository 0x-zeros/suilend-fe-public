import Image from "next/image";
import Link from "next/link";
import { Fragment, useMemo, useState } from "react";

import { KioskItem } from "@mysten/kiosk";
import { Transaction } from "@mysten/sui/transactions";
import { SUI_DECIMALS } from "@mysten/sui/utils";
import BigNumber from "bignumber.js";
import { ClassValue } from "clsx";
import { formatDate, intervalToDuration } from "date-fns";
import { capitalize } from "lodash";
import { ArrowUpRight, Clock } from "lucide-react";
import { toast } from "sonner";

import { LENDING_MARKETS } from "@suilend/sdk";
import {
  NORMALIZED_SEND_COINTYPE,
  NORMALIZED_SUI_COINTYPE,
  NORMALIZED_mSEND_SERIES_1_COINTYPE,
  NORMALIZED_mSEND_SERIES_4_COINTYPE,
  formatInteger,
  formatPercent,
  formatToken,
  formatUsd,
  getBalanceChange,
  issSui,
} from "@suilend/sui-fe";
import {
  showErrorToast,
  useSettingsContext,
  useWalletContext,
} from "@suilend/sui-fe-next";

import Card from "@/components/dashboard/Card";
import MsendDropdownMenu from "@/components/send/MsendDropdownMenu";
import MsendTokenLogo from "@/components/send/MsendTokenLogo";
import PenaltyLineChart from "@/components/send/PenaltyLineChart";
import SectionHeading from "@/components/send/SectionHeading";
import SendTokenLogo from "@/components/send/SendTokenLogo";
import Button, { ButtonProps } from "@/components/shared/Button";
import Spinner from "@/components/shared/Spinner";
import Switch from "@/components/shared/Switch";
import TextLink from "@/components/shared/TextLink";
import TokenLogo from "@/components/shared/TokenLogo";
import Tooltip from "@/components/shared/Tooltip";
import {
  TBody,
  TBodySans,
  TLabel,
  TLabelSans,
} from "@/components/shared/Typography";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useLoadedAppContext } from "@/contexts/AppContext";
import { useLoadedSendContext } from "@/contexts/SendContext";
import { useLoadedUserContext } from "@/contexts/UserContext";
import { TX_TOAST_DURATION } from "@/lib/constants";
import {
  AllocationIdS1,
  AllocationIdS2,
  AllocationWithUserAllocation,
  ROOTLETS_TYPE,
  allocations,
  redeemPointsMsend,
  redeemRootletsMsend,
  redeemSuilendCapsulesMsend,
} from "@/lib/mSend";
import { ROOT_URL } from "@/lib/navigation";
import {
  S1_mSEND_REDEMPTION_END_TIMESTAMP_MS,
  SEND_TOTAL_SUPPLY,
  claimSend,
  formatCountdownDuration,
} from "@/lib/send";
import { SubmitButtonState } from "@/lib/types";
import { cn, hoverUnderlineClassName } from "@/lib/utils";

interface SubmitButtonProps {
  className?: ClassValue;
  labelClassName?: ClassValue;
  variant?: ButtonProps["variant"];
  spinnerSize?: "sm" | "md";
  state: SubmitButtonState;
  submit: () => Promise<void>;
}

function SubmitButton({
  className,
  labelClassName,
  variant,
  spinnerSize,
  state,
  submit,
}: SubmitButtonProps) {
  return (
    <Button
      className={cn("h-auto min-h-14 w-full rounded-md py-2", className)}
      labelClassName={cn("text-wrap", labelClassName)}
      variant={variant}
      style={{ overflowWrap: "anywhere" }}
      disabled={state.isDisabled}
      onClick={submit}
    >
      {state.isLoading ? <Spinner size={spinnerSize ?? "md"} /> : state.title}
    </Button>
  );
}

interface RedeemTabContentProps {
  userRedeemableAllocations: AllocationWithUserAllocation[];
  userTotalRedeemableMsend: BigNumber;
}

function RedeemTabContent({
  userRedeemableAllocations,
  userTotalRedeemableMsend,
}: RedeemTabContentProps) {
  const { explorer } = useSettingsContext();
  const { address, signExecuteAndWaitForTransaction } = useWalletContext();
  const { allAppData } = useLoadedAppContext();
  const { allUserData } = useLoadedUserContext();

  const {
    mSendCoinMetadata,
    kioskClient,
    ownedKiosks,
    refreshRawUserAllocations,
    ...restLoadedSendContext
  } = useLoadedSendContext();
  const rawUserAllocationsS1 = restLoadedSendContext.rawUserAllocationsS1!;
  const rawUserAllocationsS2 = restLoadedSendContext.rawUserAllocationsS2!;

  const appData = allAppData.allLendingMarketData[LENDING_MARKETS[0].id];
  const userData = allUserData[LENDING_MARKETS[0].id];

  // Redemption ends
  const redemptionEndsDuration = intervalToDuration({
    start: Date.now(),
    end: new Date(S1_mSEND_REDEMPTION_END_TIMESTAMP_MS),
  });

  // Submit
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const submitButtonState: SubmitButtonState = useMemo(() => {
    if (isSubmitting) return { isLoading: true, isDisabled: true };

    return {
      title: "REDEEM mSEND",
    };
  }, [isSubmitting]);

  const submit = async () => {
    if (!address) return;
    if (ownedKiosks === undefined) return;

    if (submitButtonState.isDisabled) return;

    setIsSubmitting(true);

    const transaction = new Transaction();

    try {
      // S1
      const hasSendPointsS1ToRedeem = userRedeemableAllocations.some(
        (allocation) => allocation.id === AllocationIdS1.SEND_POINTS_S1,
      );
      const hasSuilendCapsulesS1ToRedeem = userRedeemableAllocations.some(
        (allocation) => allocation.id === AllocationIdS1.SUILEND_CAPSULES_S1,
      );
      const hasRootletsToRedeem = userRedeemableAllocations.some(
        (allocation) => allocation.id === AllocationIdS1.ROOTLETS,
      );

      if (hasSendPointsS1ToRedeem)
        redeemPointsMsend(
          "SEND_POINTS_S1",
          appData.suilendClient,
          userData,
          address,
          transaction,
        ); // SERIES 1
      if (hasSuilendCapsulesS1ToRedeem)
        redeemSuilendCapsulesMsend(
          1,
          Object.values(
            rawUserAllocationsS1.suilendCapsulesS1.ownedObjectsMap,
          ).flat(),
          address,
          transaction,
        ); // SERIES 1
      if (hasRootletsToRedeem)
        redeemRootletsMsend(
          rawUserAllocationsS1.rootlets.ownedMsendObjectsMap,
          kioskClient,
          ownedKiosks,
          address,
          transaction,
        ); // SERIES 1 & 4

      // S2
      const hasSendPointsS2ToRedeem = userRedeemableAllocations.some(
        (allocation) => allocation.id === AllocationIdS2.SEND_POINTS_S2,
      );
      const hasSteamPointsToRedeem = userRedeemableAllocations.some(
        (allocation) => allocation.id === AllocationIdS2.STEAMM_POINTS,
      );
      const hasSuilendCapsulesS2ToRedeem = userRedeemableAllocations.some(
        (allocation) => allocation.id === AllocationIdS2.SUILEND_CAPSULES_S2,
      );

      if (hasSendPointsS2ToRedeem)
        redeemPointsMsend(
          "SEND_POINTS_S2",
          appData.suilendClient,
          userData,
          address,
          transaction,
        ); // SERIES 4
      if (hasSteamPointsToRedeem)
        redeemPointsMsend(
          "STEAMM_POINTS",
          appData.suilendClient,
          userData,
          address,
          transaction,
        ); // SERIES 4
      if (hasSuilendCapsulesS2ToRedeem)
        redeemSuilendCapsulesMsend(
          2,
          Object.values(
            rawUserAllocationsS2.suilendCapsulesS2.ownedObjectsMap,
          ).flat(),
          address,
          transaction,
        ); // SERIES 4

      const res = await signExecuteAndWaitForTransaction(transaction);
      const txUrl = explorer.buildTxUrl(res.digest);

      const balanceChangeSeries1 = getBalanceChange(res, address, {
        coinType: NORMALIZED_mSEND_SERIES_1_COINTYPE,
        ...mSendCoinMetadata,
      });
      const balanceChangeSeries4 = getBalanceChange(res, address, {
        coinType: NORMALIZED_mSEND_SERIES_4_COINTYPE,
        ...mSendCoinMetadata,
      });
      const balanceChange: BigNumber | undefined =
        balanceChangeSeries1 === undefined && balanceChangeSeries4 === undefined
          ? undefined
          : [
              balanceChangeSeries1 ?? new BigNumber(0),
              balanceChangeSeries4 ?? new BigNumber(0),
            ].reduce(
              (acc, balanceChange) => acc.plus(balanceChange),
              new BigNumber(0),
            );

      toast.success(
        [
          "Redeemed",
          balanceChange !== undefined
            ? formatToken(balanceChange, { dp: mSendCoinMetadata.decimals })
            : null,
          "mSEND",
        ]
          .filter(Boolean)
          .join(" "),
        {
          action: (
            <TextLink className="block" href={txUrl}>
              View tx on {explorer.name}
            </TextLink>
          ),
          duration: TX_TOAST_DURATION,
        },
      );
    } catch (err) {
      showErrorToast("Failed to redeem mSEND", err as Error, undefined, true);
    } finally {
      setIsSubmitting(false);
      await refreshRawUserAllocations();
    }
  };

  return (
    <>
      <div className="flex w-full flex-col gap-4">
        <div className="relative flex w-full flex-col">
          {/* Items */}
          <div className="relative z-[2] flex w-full flex-col gap-4 rounded-md border bg-background p-4">
            {userRedeemableAllocations.map((allocation, index) => (
              <Fragment key={allocation.id}>
                {allocation.id === AllocationIdS1.SUILEND_CAPSULES_S1 ||
                allocation.id === AllocationIdS2.SUILEND_CAPSULES_S2 ? (
                  Object.entries(allocation.ownedMap!)
                    .filter(([, owned]) => owned.gt(0))
                    .map(([rarityRaw, owned], index, array) => {
                      const rarity = rarityRaw.split("_")[0];

                      return (
                        <Fragment key={rarity}>
                          <div className="flex w-full flex-row items-center justify-between gap-4">
                            <div className="flex flex-row items-center gap-3">
                              <Image
                                src={allocation.redeemSrcMap![rarity]}
                                alt={[
                                  capitalize(rarity),
                                  allocation.title,
                                ].join(" ")}
                                width={24}
                                height={24}
                              />
                              <TBody>
                                {formatInteger(+owned)}{" "}
                                {[capitalize(rarity), allocation.title].join(
                                  " ",
                                )}
                              </TBody>
                            </div>

                            <div className="flex flex-row items-center gap-2">
                              <MsendTokenLogo className="h-5 w-5" />
                              <TBody>
                                {formatToken(
                                  owned.times(
                                    (allocation.id ===
                                    AllocationIdS1.SUILEND_CAPSULES_S1
                                      ? allocations.s1[
                                          AllocationIdS1.SUILEND_CAPSULES_S1
                                        ]
                                      : allocations.s2[
                                          AllocationIdS2.SUILEND_CAPSULES_S2
                                        ]
                                    ).totalAllocationBreakdownMap[
                                      rarityRaw
                                    ].percent
                                      .times(SEND_TOTAL_SUPPLY)
                                      .div(100),
                                  ),
                                  { exact: false },
                                )}
                              </TBody>
                            </div>
                          </div>

                          {index !== array.length - 1 && <Separator />}
                        </Fragment>
                      );
                    })
                ) : (
                  <div className="flex w-full flex-row items-center justify-between gap-4">
                    <div className="flex flex-row items-center gap-3">
                      <Image
                        src={allocation.redeemSrc!}
                        alt={allocation.title}
                        width={24}
                        height={24}
                      />
                      <div className="flex flex-col gap-1">
                        <TBody>
                          {allocation.id === AllocationIdS1.SEND_POINTS_S1 ||
                          allocation.id === AllocationIdS2.SEND_POINTS_S2 ||
                          allocation.id === AllocationIdS2.STEAMM_POINTS
                            ? formatToken(allocation.owned!, { exact: false })
                            : formatInteger(+allocation.owned!)}{" "}
                          {allocation.title}
                        </TBody>
                        {allocation.id === AllocationIdS1.ROOTLETS &&
                          (ownedKiosks ?? []).reduce(
                            (acc, { kiosk }) => [
                              ...acc,
                              ...kiosk.items.filter(
                                (item) =>
                                  item.type === ROOTLETS_TYPE && item.listing,
                              ),
                            ],
                            [] as KioskItem[],
                          ).length > 0 && (
                            <TLabelSans>
                              {
                                "Note: You'll need to unlist your listed Rootlets to redeem them"
                              }
                            </TLabelSans>
                          )}
                      </div>
                    </div>

                    <div className="flex flex-row items-center gap-2">
                      <MsendTokenLogo className="h-5 w-5" />
                      <TBody>
                        {formatToken(allocation.userEligibleSend!, {
                          exact: false,
                        })}
                      </TBody>
                    </div>
                  </div>
                )}

                {index !== userRedeemableAllocations.length - 1 && (
                  <Separator />
                )}
              </Fragment>
            ))}
          </div>

          {/* Total */}
          <div className="relative z-[1] -mt-2 flex w-full flex-row items-center justify-between rounded-b-md bg-border px-4 pb-2 pt-4">
            <TBodySans className="text-muted-foreground">Total</TBodySans>

            <div className="flex flex-row items-center gap-2">
              <MsendTokenLogo className="h-5 w-5" />
              <TBody>
                {formatToken(userTotalRedeemableMsend, { exact: false })}
              </TBody>
            </div>
          </div>
        </div>

        {/* Redemption ends in */}
        {userRedeemableAllocations.some(
          (allocation) =>
            allocation.id === AllocationIdS1.SEND_POINTS_S1 ||
            allocation.id === AllocationIdS1.SUILEND_CAPSULES_S1,
        ) && (
          <div className="flex w-full flex-row items-center justify-between gap-4">
            <TBodySans className="text-muted-foreground">
              S1 redemption ends in
            </TBodySans>

            <div className="flex flex-row items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <Tooltip
                title={formatDate(
                  new Date(S1_mSEND_REDEMPTION_END_TIMESTAMP_MS),
                  "yyyy-MM-dd HH:mm:ss",
                )}
              >
                <TBody
                  className={cn(
                    "decoration-foreground/50",
                    hoverUnderlineClassName,
                  )}
                >
                  {formatCountdownDuration(redemptionEndsDuration)}
                </TBody>
              </Tooltip>
            </div>
          </div>
        )}
      </div>

      {/* Submit */}
      <SubmitButton state={submitButtonState} submit={submit} />
    </>
  );
}

const INPUT_HEIGHT = 70; // px
const MAX_BUTTON_WIDTH = 60; // px
const MAX_BUTTON_HEIGHT = 40; // px

const DEFAULT_FLASH_LOAN_SLIPPAGE_PERCENT = 3;

function ClaimTabContent() {
  const { rpc, explorer } = useSettingsContext();
  const { address, signExecuteAndWaitForTransaction } = useWalletContext();
  const { allAppData } = useLoadedAppContext();
  const { allUserData, getBalance, obligationOwnerCap } =
    useLoadedUserContext();

  const {
    mSendObjectMap,
    mSendCoinMetadata,
    mSendBalanceMap,
    mSendCoinTypesWithBalance,
    selectedMsendCoinType,
  } = useLoadedSendContext();

  const appData = allAppData.allLendingMarketData[LENDING_MARKETS[0].id];
  const userData = allUserData[LENDING_MARKETS[0].id];

  // Reserves
  const suiReserve = appData.reserveMap[NORMALIZED_SUI_COINTYPE];
  const sendReserve = appData.reserveMap[NORMALIZED_SEND_COINTYPE];

  // Balances
  const suiBalance = getBalance(NORMALIZED_SUI_COINTYPE);
  const mSendBalance = mSendBalanceMap[selectedMsendCoinType];

  // Deposit sSUI
  const ssuiDepositedAmount = (userData.obligations ?? []).reduce(
    (acc, obligation) =>
      acc.plus(
        obligation.deposits.reduce(
          (acc2, d) => acc2.plus(issSui(d.coinType) ? d.depositedAmount : 0),
          new BigNumber(0),
        ),
      ),
    new BigNumber(0),
  );

  // Amount
  const [claimAmount, setClaimAmount] = useState<string>("");
  const useMaxAmount = address
    ? new BigNumber(claimAmount || 0).eq(mSendBalance)
    : false;

  // Penalty
  const claimPenaltyAmountSui = mSendObjectMap[
    selectedMsendCoinType
  ].currentPenaltySui.times(claimAmount || 0);

  // Flash loan
  const [isFlashLoan, setIsFlashLoan] = useState<boolean>(false);
  const [flashLoanSlippagePercent, setFlashLoanSlippagePercent] =
    useState<string>(`${DEFAULT_FLASH_LOAN_SLIPPAGE_PERCENT}`);

  const flashLoanDeductionAmountSend = claimPenaltyAmountSui.div(
    sendReserve.price.div(suiReserve.price),
  );
  const flashLoanDeductionPercent = new BigNumber(claimAmount || 0).gt(0)
    ? flashLoanDeductionAmountSend.div(claimAmount || 0).times(100)
    : new BigNumber(0);

  const flashLoanProceedsAmountSend = new BigNumber(claimAmount || 0).minus(
    flashLoanDeductionAmountSend,
  );

  // Submit
  const [isSubmitting_claim, setIsSubmitting_claim] = useState<boolean>(false);
  const [isSubmitting_claimAndDeposit, setIsSubmitting_claimAndDeposit] =
    useState<boolean>(false);

  const submitButtonState_claim: SubmitButtonState = useMemo(() => {
    if (isSubmitting_claim) return { isLoading: true, isDisabled: true };

    if (new BigNumber(claimAmount || 0).lte(0))
      return { title: "ENTER AN AMOUNT", isDisabled: true };
    if (new BigNumber(claimAmount).gt(mSendBalance))
      return { title: "INSUFFICIENT mSEND", isDisabled: true };

    if (!isFlashLoan && suiBalance.lt(claimPenaltyAmountSui))
      return {
        title: "INSUFFICIENT SUI TO PAY PENALTY",
        isDisabled: true,
      };

    return {
      title: "CLAIM SEND",
      isDisabled: isSubmitting_claimAndDeposit,
    };
  }, [
    isSubmitting_claim,
    claimAmount,
    mSendBalance,
    suiBalance,
    isFlashLoan,
    claimPenaltyAmountSui,
    isSubmitting_claimAndDeposit,
  ]);

  const submitButtonState_claimAndDeposit: SubmitButtonState = useMemo(() => {
    if (isSubmitting_claimAndDeposit)
      return { isLoading: true, isDisabled: true };

    return {
      title: "CLAIM AND DEPOSIT SEND",
      isDisabled: submitButtonState_claim.isDisabled || isSubmitting_claim,
    };
  }, [
    isSubmitting_claimAndDeposit,
    submitButtonState_claim.isDisabled,
    isSubmitting_claim,
  ]);

  const submit = async (isDepositing: boolean) => {
    if (!address) return;
    if (!obligationOwnerCap) return;

    if (isDepositing) {
      if (submitButtonState_claimAndDeposit.isDisabled) return;
    } else {
      if (submitButtonState_claim.isDisabled) return;
    }

    const setIsSubmitting = isDepositing
      ? setIsSubmitting_claimAndDeposit
      : setIsSubmitting_claim;
    setIsSubmitting(true);

    const transaction = new Transaction();

    try {
      await claimSend(
        rpc,
        appData.suilendClient,
        address,
        selectedMsendCoinType,
        claimAmount,
        claimPenaltyAmountSui,
        isFlashLoan,
        +flashLoanSlippagePercent,
        isDepositing,
        transaction,
        obligationOwnerCap.id,
      );

      const res = await signExecuteAndWaitForTransaction(transaction);
      const txUrl = explorer.buildTxUrl(res.digest);

      const balanceChange = getBalanceChange(res, address, sendReserve.token);

      toast.success(
        [
          "Claimed",
          formatToken(
            !isDepositing && balanceChange !== undefined
              ? balanceChange
              : new BigNumber(claimAmount),
            { dp: sendReserve.token.decimals },
          ),
          "SEND",
        ].join(" "),
        {
          description: isDepositing
            ? [
                "Deposited",
                formatToken(new BigNumber(claimAmount), {
                  dp: sendReserve.token.decimals,
                }),
                "SEND",
              ].join(" ")
            : undefined,
          action: (
            <TextLink className="block" href={txUrl}>
              View tx on {explorer.name}
            </TextLink>
          ),
          duration: TX_TOAST_DURATION,
        },
      );
    } catch (err) {
      showErrorToast("Failed to claim SEND", err as Error, undefined, true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Deposit sSUI */}
      <div
        className={cn(
          "flex w-full flex-row items-center gap-4",
          ssuiDepositedAmount.gt(0) && "pointer-events-none opacity-50",
        )}
      >
        <div className="flex flex-1 flex-col gap-1">
          <TBody className="text-[16px]">DEPOSIT sSUI</TBody>
          <TBodySans className="text-muted-foreground">
            Deposit any amount of Spring Staked SUI
          </TBodySans>
        </div>

        <Link href={`${ROOT_URL}?asset=sSUI`}>
          <Button labelClassName="uppercase" endIcon={<ArrowUpRight />}>
            Deposit
          </Button>
        </Link>
      </div>

      <Separator />

      <div
        className={cn(
          "flex w-full flex-col gap-6",
          !ssuiDepositedAmount.gt(0) && "pointer-events-none opacity-50",
        )}
      >
        <div className="flex w-full flex-col gap-4">
          <TBody className="text-[16px]">{"YOU'RE CLAIMING"}</TBody>

          {/* Select mSEND */}
          {mSendCoinTypesWithBalance.length > 1 && <MsendDropdownMenu />}

          {/* Input */}
          <div className="relative flex w-full flex-col">
            <div className="relative z-[2] w-full">
              <div className="absolute left-4 top-1/2 z-[2] -translate-y-2/4">
                <Button
                  className={cn(
                    useMaxAmount &&
                      "border-secondary bg-secondary/5 disabled:opacity-100",
                  )}
                  labelClassName={cn(
                    "uppercase",
                    useMaxAmount && "text-primary-foreground",
                  )}
                  variant="secondaryOutline"
                  onClick={() =>
                    setClaimAmount(
                      mSendBalance.toFixed(
                        mSendCoinMetadata.decimals,
                        BigNumber.ROUND_DOWN,
                      ),
                    )
                  }
                  disabled={useMaxAmount}
                  style={{
                    width: `${MAX_BUTTON_WIDTH}px`,
                    height: `${MAX_BUTTON_HEIGHT}px`,
                  }}
                >
                  Max
                </Button>
              </div>

              <Input
                className="relative z-[1] border-primary bg-card px-0 py-0 text-right text-2xl"
                type="number"
                value={claimAmount}
                onChange={(e) => setClaimAmount(e.target.value)}
                onWheel={(e) => e.currentTarget.blur()}
                style={{
                  height: `${INPUT_HEIGHT}px`,
                  paddingLeft: `${4 * 4 + MAX_BUTTON_WIDTH + 4 * 4}px`,
                  paddingRight: `${4 * 4 + "SEND".length * 14.4 + 4 * 4}px`,
                }}
                step="any"
              />

              <div
                className="absolute right-4 top-0 z-[2] flex flex-col items-end justify-center"
                style={{ height: `${INPUT_HEIGHT}px` }}
              >
                <TBody className="text-right text-2xl">SEND</TBody>
              </div>
            </div>

            <div className="relative z-[1] -mt-2 flex flex-row items-center justify-between rounded-b-md bg-primary/25 px-4 pb-2 pt-4">
              <TBodySans className="text-muted-foreground">Claimable</TBodySans>

              <div className="flex flex-row items-center gap-2">
                <SendTokenLogo />
                <TBody>
                  {formatToken(mSendBalance, {
                    dp: sendReserve.token.decimals,
                  })}
                </TBody>
              </div>
            </div>
          </div>

          {/* Penalty */}
          {mSendObjectMap[selectedMsendCoinType].currentPenaltySui.gt(0) && (
            <div className="flex w-full flex-row justify-between gap-4">
              <TBodySans className="text-muted-foreground">Penalty</TBodySans>

              <div className="flex flex-col items-end gap-1">
                <div className="flex flex-row items-center gap-2">
                  <TokenLogo className="h-4 w-4" token={suiReserve.token} />
                  <Tooltip
                    title={`${formatToken(claimPenaltyAmountSui, {
                      dp: SUI_DECIMALS,
                    })} SUI`}
                  >
                    <TBody
                      className={cn(
                        "decoration-foreground/50",
                        hoverUnderlineClassName,
                      )}
                    >
                      {formatToken(claimPenaltyAmountSui, { exact: false })}
                      {" SUI"}
                    </TBody>
                  </Tooltip>
                </div>
                <TLabel>
                  {formatUsd(claimPenaltyAmountSui.times(suiReserve.price))}
                </TLabel>
              </div>
            </div>
          )}

          {/* Flash loan */}
          {mSendObjectMap[selectedMsendCoinType].currentPenaltySui.gt(0) &&
            new BigNumber(sendReserve.price.div(suiReserve.price)).gt(
              mSendObjectMap[selectedMsendCoinType].currentPenaltySui,
            ) && (
              <>
                <div className="flex w-full flex-row justify-between gap-4">
                  <Tooltip title="Enabling this will swap a portion of your claimed SEND to SUI to pay the penalty, with the remaining SEND proceeds sent to your wallet.">
                    <TBodySans
                      className={cn(
                        "text-muted-foreground decoration-muted-foreground/50",
                        hoverUnderlineClassName,
                      )}
                    >
                      Use flash loan to pay penalty
                    </TBodySans>
                  </Tooltip>

                  <Switch
                    id="isFlashLoan"
                    isChecked={isFlashLoan}
                    onToggle={setIsFlashLoan}
                  />
                </div>
                {isFlashLoan && (
                  <div className="flex flex-col gap-3 rounded-md border p-4">
                    {/* Slippage */}
                    <div className="flex h-5 flex-row items-center justify-between gap-4">
                      <TBodySans className="text-muted-foreground">
                        Slippage
                      </TBodySans>

                      <div className="flex flex-row items-center gap-1">
                        <Input
                          className="h-6 w-12 rounded-sm border-border bg-transparent px-2 text-right"
                          type="number"
                          placeholder={`${DEFAULT_FLASH_LOAN_SLIPPAGE_PERCENT}`}
                          min={0}
                          max={100}
                          step={0.1}
                          value={flashLoanSlippagePercent ?? ""}
                          onChange={(e) =>
                            setFlashLoanSlippagePercent(e.target.value)
                          }
                        />
                        <TBody>%</TBody>
                      </div>
                    </div>

                    {/* Approximate deduction */}
                    <div className="flex flex-row justify-between gap-4">
                      <TBodySans className="text-muted-foreground">
                        Deduction (approx.)
                      </TBodySans>

                      <div className="flex flex-col items-end gap-1">
                        <div className="flex flex-row items-center gap-2">
                          <SendTokenLogo />
                          <TBody>
                            {formatToken(flashLoanDeductionAmountSend, {
                              exact: false,
                            })}
                            {" SEND"}
                            {flashLoanDeductionPercent.gt(0) &&
                              ` (${formatPercent(flashLoanDeductionPercent, { dp: 0 })})`}
                          </TBody>
                        </div>
                        <TLabel>
                          {formatUsd(
                            flashLoanDeductionAmountSend.times(
                              sendReserve.price,
                            ),
                          )}
                        </TLabel>
                      </div>
                    </div>

                    {/* Approximate proceeds */}
                    <div className="flex flex-row justify-between gap-4">
                      <TBodySans className="text-muted-foreground">
                        Proceeds (approx.)
                      </TBodySans>

                      <div className="flex flex-col items-end gap-1">
                        <div className="flex flex-row items-center gap-2">
                          <SendTokenLogo />
                          <TBody>
                            {formatToken(flashLoanProceedsAmountSend, {
                              exact: false,
                            })}
                            {" SEND"}
                          </TBody>
                        </div>
                        <TLabel>
                          {formatUsd(
                            flashLoanProceedsAmountSend.times(
                              sendReserve.price,
                            ),
                          )}
                        </TLabel>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
        </div>

        {/* Submit */}
        <div className="flex w-full flex-col gap-px">
          {/* Claim */}
          <SubmitButton
            className="rounded-b-none"
            state={submitButtonState_claim}
            submit={() => submit(false)}
          />

          {/* Claim and deposit */}
          <SubmitButton
            className="min-h-8 rounded-t-none"
            labelClassName="text-xs"
            variant="secondary"
            spinnerSize="sm"
            state={submitButtonState_claimAndDeposit}
            submit={() => submit(true)}
          />
        </div>
      </div>
    </>
  );
}

interface ClaimSectionProps {
  allocations: AllocationWithUserAllocation[];
}

export default function ClaimSection({ allocations }: ClaimSectionProps) {
  const { address } = useWalletContext();
  const { allAppData } = useLoadedAppContext();

  const {
    mSendObjectMap,
    mSendCoinMetadata,
    rawUserAllocationsS1,
    rawUserAllocationsS2,
    selectedMsendCoinType,
  } = useLoadedSendContext();

  const appData = allAppData.allLendingMarketData[LENDING_MARKETS[0].id];

  // Redeem
  const minMsendAmount = 10 ** (-1 * mSendCoinMetadata.decimals);

  const redeemableAllocations = allocations.filter(
    (allocation) =>
      // S1
      allocation.id === AllocationIdS1.SEND_POINTS_S1 ||
      allocation.id === AllocationIdS1.SUILEND_CAPSULES_S1 ||
      allocation.id === AllocationIdS1.ROOTLETS ||
      // S2
      // allocation.id === AllocationIdS2.SEND_POINTS_S2 ||
      // allocation.id === AllocationIdS2.STEAMM_POINTS ||
      // allocation.id === AllocationIdS2.SUILEND_CAPSULES_S2,
      false, // TEMP
  );

  const userRedeemableAllocations = redeemableAllocations.filter(
    (allocation) =>
      allocation.id === AllocationIdS1.SEND_POINTS_S1 ||
      allocation.id === AllocationIdS1.SUILEND_CAPSULES_S1
        ? allocation.userEligibleSend?.gte(minMsendAmount) &&
          Date.now() < S1_mSEND_REDEMPTION_END_TIMESTAMP_MS
        : allocation.userEligibleSend?.gte(minMsendAmount),
  );
  const userTotalRedeemableMsend = userRedeemableAllocations.reduce(
    (acc, allocation) => acc.plus(allocation.userEligibleSend ?? 0),
    new BigNumber(0),
  );

  // Tabs
  enum Tab {
    REDEEM = "redeem",
    CLAIM = "claim",
  }

  const tabs = [
    { id: Tab.REDEEM, title: "REDEEM mSEND" },
    { id: Tab.CLAIM, title: "CLAIM SEND" },
  ];

  const selectedTab =
    userRedeemableAllocations.length > 0 ? Tab.REDEEM : Tab.CLAIM;

  // Penalty
  const suiReserve = appData.reserveMap[NORMALIZED_SUI_COINTYPE];

  return (
    <div className="flex w-full max-w-[480px] flex-col items-center gap-12 py-16 md:py-20">
      <SectionHeading id="claim">Claim</SectionHeading>

      {address &&
      (rawUserAllocationsS1 === undefined ||
        rawUserAllocationsS2 === undefined) ? (
        <Skeleton className="h-80 w-full max-w-[480px] rounded-md" />
      ) : (
        <>
          <Card className="rounded-md">
            {/* Tabs */}
            <div className="flex w-full flex-row items-stretch">
              {tabs.map((tab, index) => (
                <div
                  key={tab.id}
                  className={cn(
                    "flex flex-1 flex-row items-center justify-center border-b px-4 py-4",
                    tab.id === selectedTab
                      ? "border-b-primary bg-primary/5"
                      : "pointer-events-none bg-background/50",
                  )}
                >
                  <div
                    className={cn(
                      "flex flex-row items-center gap-2.5",
                      tab.id !== selectedTab && "opacity-50",
                    )}
                  >
                    <div className="flex h-4 w-4 flex-row items-center justify-center rounded-sm bg-primary">
                      <TLabelSans className="text-foreground">
                        {index + 1}
                      </TLabelSans>
                    </div>
                    <TBody>{tab.title}</TBody>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex w-full flex-col gap-6 p-4 pt-6">
              {selectedTab === Tab.REDEEM && (
                <RedeemTabContent
                  userRedeemableAllocations={userRedeemableAllocations}
                  userTotalRedeemableMsend={userTotalRedeemableMsend}
                />
              )}
              {selectedTab === Tab.CLAIM && <ClaimTabContent />}
            </div>
          </Card>

          {selectedTab === Tab.CLAIM &&
            mSendObjectMap[selectedMsendCoinType].currentPenaltySui.gt(0) && (
              <div className="flex w-full flex-col gap-4">
                <TBody className="text-[16px]">PENALTY</TBody>

                <div className="flex w-full flex-col gap-3">
                  {/* Penalty ends in */}
                  {Date.now() <
                    +mSendObjectMap[selectedMsendCoinType].penaltyEndTimeS *
                      1000 && (
                    <div className="flex w-full flex-row justify-between gap-4">
                      <TBodySans className="text-muted-foreground">
                        Penalty ends in
                      </TBodySans>

                      <div className="flex flex-row items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <Tooltip
                          title={formatDate(
                            new Date(
                              +mSendObjectMap[selectedMsendCoinType]
                                .penaltyEndTimeS * 1000,
                            ),
                            "yyyy-MM-dd HH:mm:ss",
                          )}
                        >
                          <TBody
                            className={cn(
                              "decoration-foreground/50",
                              hoverUnderlineClassName,
                            )}
                          >
                            {formatCountdownDuration(
                              intervalToDuration({
                                start: Date.now(),
                                end: new Date(
                                  +mSendObjectMap[selectedMsendCoinType]
                                    .penaltyEndTimeS * 1000,
                                ),
                              }),
                            )}
                          </TBody>
                        </Tooltip>
                      </div>
                    </div>
                  )}

                  {/* Current penalty */}
                  <div className="flex w-full flex-row justify-between gap-4">
                    <TBodySans className="text-muted-foreground">
                      Current penalty
                    </TBodySans>

                    <div className="flex flex-col items-end gap-1">
                      <div className="flex flex-row items-center gap-2">
                        <TokenLogo
                          className="h-4 w-4"
                          token={suiReserve.token}
                        />
                        <TBody>
                          <Tooltip
                            title={`${formatToken(
                              mSendObjectMap[selectedMsendCoinType]
                                .currentPenaltySui,
                              { dp: SUI_DECIMALS },
                            )} SUI`}
                          >
                            <span
                              className={cn(
                                "decoration-foreground/50",
                                hoverUnderlineClassName,
                              )}
                            >
                              {formatToken(
                                mSendObjectMap[selectedMsendCoinType]
                                  .currentPenaltySui,
                                { exact: false },
                              )}
                              {" SUI"}
                            </span>
                          </Tooltip>
                          {" / SEND"}
                        </TBody>
                      </div>
                      <TLabel>
                        {formatUsd(
                          mSendObjectMap[
                            selectedMsendCoinType
                          ].currentPenaltySui.times(suiReserve.price),
                        )}
                        {" / SEND"}
                      </TLabel>
                    </div>
                  </div>
                </div>

                <PenaltyLineChart
                  mSendObject={mSendObjectMap[selectedMsendCoinType]}
                />
              </div>
            )}
        </>
      )}
    </div>
  );
}
