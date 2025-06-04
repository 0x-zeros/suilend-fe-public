import { ReactNode } from "react";

import BigNumber from "bignumber.js";
import { ClassValue } from "clsx";

import LabelWithTooltip from "@/components/shared/LabelWithTooltip";
import Value from "@/components/shared/Value";
import { cn } from "@/lib/utils";

interface LabelWithValueProps {
  className?: ClassValue;
  labelClassName?: ClassValue;
  labelTooltip?: string;
  labelStartDecorator?: ReactNode;
  label: string;
  labelEndDecorator?: ReactNode;
  valueClassName?: ClassValue;
  valueStartDecorator?: ReactNode;
  value: string | number | BigNumber | ReactNode;
  valueEndDecorator?: ReactNode;
  isId?: boolean;
  isType?: boolean;
  isUsd?: boolean;
  url?: string;
  urlTooltip?: string;
  isExplorerUrl?: boolean;
  horizontal?: boolean;
  monoLabel?: boolean;
  customChild?: ReactNode;
}

export default function LabelWithValue({
  className,
  labelClassName,
  labelTooltip,
  labelStartDecorator,
  label,
  labelEndDecorator,
  valueClassName,
  valueStartDecorator,
  value,
  valueEndDecorator,
  isId,
  isType,
  isUsd,
  url,
  urlTooltip,
  isExplorerUrl,
  horizontal,
  monoLabel,
  customChild,
}: LabelWithValueProps) {
  return (
    <div
      className={cn(
        "flex w-full justify-between",
        horizontal ? "flex-row items-center gap-2" : "h-min flex-col gap-1",
        className,
      )}
    >
      <LabelWithTooltip
        className={labelClassName}
        tooltip={labelTooltip}
        startDecorator={labelStartDecorator}
        endDecorator={labelEndDecorator}
        isMono={monoLabel}
      >
        {label}
      </LabelWithTooltip>

      {customChild ?? (
        <Value
          className={valueClassName}
          valueStartDecorator={valueStartDecorator}
          value={value}
          valueEndDecorator={valueEndDecorator}
          isId={isId}
          isType={isType}
          isUsd={isUsd}
          url={url}
          urlTooltip={urlTooltip}
          isExplorerUrl={isExplorerUrl}
        />
      )}
    </div>
  );
}
