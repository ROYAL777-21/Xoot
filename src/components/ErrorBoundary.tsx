import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type ErrorBoundaryProps = {
  children: ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
};

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error("Zoot app boundary caught an error", error, info);
    }
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen bg-background grid place-items-center p-6">
        <Card className="w-full max-w-md rounded-3xl border-border p-8 text-center shadow-warm">
          <div className="mx-auto mb-5 grid h-12 w-12 place-items-center rounded-2xl bg-destructive/10 text-destructive">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <h1 className="font-display text-3xl font-bold">Zoot needs a quick refresh</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Something interrupted this screen. Your Zoot account, bookings and saved home details remain protected.
          </p>
          <Button className="mt-6 rounded-full gradient-warm" onClick={() => window.location.reload()}>
            <RotateCw className="mr-2 h-4 w-4" /> Refresh Zoot
          </Button>
        </Card>
      </div>
    );
  }
}
