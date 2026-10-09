export type VisitInvoker = <T>(name: string, body: Record<string, unknown>) => Promise<T>;
export type VisitActionGuard = { isCurrent?: () => boolean; invoke?: VisitInvoker };
export const alwaysCurrent = () => true;
