type CarePlusMarkProps = {
  className?: string;
  plusClassName?: string;
};

export const CarePlusMark = ({ className = "", plusClassName = "text-primary" }: CarePlusMarkProps) => (
  <span className={className}>
    Care<span className={plusClassName}>+</span>
  </span>
);
