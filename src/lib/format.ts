export const formatZAR = (n: number | string) =>
  `R${Number(n).toLocaleString("en-ZA", { maximumFractionDigits: 0 })}`;

export const formatZARDecimal = (n: number | string) =>
  `R${Number(n).toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
