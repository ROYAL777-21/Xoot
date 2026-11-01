import { Component, type ErrorInfo, type ReactNode } from "react";
import { RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { reportClientError } from "@/lib/monitoring";
import { HandoffFlowerField } from "@/components/xoot/HeroArtwork";
import { Logo } from "@/components/kit/Logo";
import "@/styles/recovery-handoff.css";

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
    reportClientError(error, {
      source: "app-boundary",
      componentStack: info.componentStack,
    });
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="xoot-recovery">
        <HandoffFlowerField className="xoot-recovery-flowers" />
        <Card className="xoot-recovery-card">
          <Logo size={34} />
          <div className="xoot-recovery-bloom"><HandoffFlowerField items={[{size:92,palette:"lilac",left:"0",top:"0",opacity:1}]} className="xoot-recovery-single-flower" /></div>
          <h1>Xoot needs a quick refresh</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Something interrupted this screen. Refresh to pick up where you left off. Details you have already saved stay in your account.
          </p>
          <Button className="mt-6 rounded-full" onClick={() => window.location.reload()}>
            <RotateCw className="mr-2 h-4 w-4" /> Refresh Xoot
          </Button>
        </Card>
      </div>
    );
  }
}
