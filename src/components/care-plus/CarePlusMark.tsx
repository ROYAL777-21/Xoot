import { CarePlusSymbol } from "./CarePlusSymbol";

type CarePlusMarkProps = {
  className?: string;
  plusClassName?: string;
};

export const CarePlusMark = ({ className = "", plusClassName = "text-primary" }: CarePlusMarkProps) => (
  <span className={`inline-flex items-center gap-[.35em] whitespace-nowrap ${className}`}>
    <CarePlusSymbol width="1.1em" className={plusClassName} />
    <span>Care<span className={plusClassName}>+</span></span>
  </span>
);
