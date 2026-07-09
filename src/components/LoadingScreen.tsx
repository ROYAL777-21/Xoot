import { Sparkles } from "lucide-react";

type LoadingScreenProps = {
  label?: string;
};

export const LoadingScreen = ({ label = "Preparing Zoot" }: LoadingScreenProps) => (
  <div className="min-h-screen bg-background">
    <div className="mx-auto grid min-h-screen w-full max-w-md place-items-center px-6 text-center">
      <div className="w-full">
        <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-2xl border border-primary/20 bg-primary/10 text-primary shadow-soft">
          <Sparkles className="h-6 w-6 animate-pulse" />
        </div>
        <p className="font-display text-2xl font-bold tracking-tight text-foreground">{label}</p>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Your booking, Care+ and support details are loading securely.
        </p>
        <div className="mx-auto mt-6 h-1.5 w-40 overflow-hidden rounded-full bg-muted">
          <div className="h-full w-1/2 animate-[pulse_1.1s_ease-in-out_infinite] rounded-full bg-primary" />
        </div>
      </div>
    </div>
  </div>
);
