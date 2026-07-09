type CapacitorRuntime = {
  getPlatform?: () => string;
  isNativePlatform?: () => boolean;
};

type CapacitorGlobal = {
  Capacitor?: CapacitorRuntime;
};

const getRuntime = (): CapacitorRuntime | null => {
  if (typeof window === "undefined") return null;
  return (window as Window & CapacitorGlobal).Capacitor ?? null;
};

export const getOptionalNativePlatform = () => getRuntime()?.getPlatform?.() ?? "web";

export const isOptionalNativePlatform = () => {
  const runtime = getRuntime();
  if (!runtime) return false;
  if (typeof runtime.isNativePlatform === "function") return runtime.isNativePlatform();
  return runtime.getPlatform?.() !== "web";
};

export const importOptionalNativePlugin = async <TModule>(specifier: string): Promise<TModule | null> => {
  try {
    return (await import(/* @vite-ignore */ specifier)) as TModule;
  } catch {
    return null;
  }
};
