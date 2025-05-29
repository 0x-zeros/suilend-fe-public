import BigNumber from "bignumber.js";

import { ParsedRateLimiter } from "@suilend/sdk/parsers/rateLimiter";
import { MAX_U64, formatDuration, formatUsd } from "@suilend/sui-fe";

export const getFormattedMaxOutflow = (rateLimiter: ParsedRateLimiter) => {
  const {
    config: { windowDuration, maxOutflow },
    remainingOutflow,
  } = rateLimiter;

  const isMax = new BigNumber(maxOutflow.toString()).eq(MAX_U64);

  const formattedMaxOutflow = isMax
    ? "∞"
    : `${formatUsd(new BigNumber(maxOutflow.toString()))} per ${formatDuration(new BigNumber(windowDuration.toString()))}`;
  const maxOutflowTooltip = isMax
    ? "There is no limit on the amounts being withdrawn or borrowed from the lending market."
    : `For the safety of the lending market, amounts being withdrawn or borrowed from the lending market are limited by this rate. Remaining outflow this window: ${remainingOutflow ? formatUsd(remainingOutflow) : "N/A"}`;

  return {
    formattedMaxOutflow,
    maxOutflowTooltip,
  };
};
