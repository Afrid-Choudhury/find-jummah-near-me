import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/** Catches render errors below the shell so one broken page doesn't blank the app. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Unhandled render error:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="px-4 pt-8 text-center">
          <p className="font-display text-lg font-semibold text-night">Something went wrong</p>
          <p className="mt-1 text-sm text-ink-muted">
            This page hit an unexpected error. Reloading usually fixes it.
          </p>
          <Button className="mt-4" onClick={() => window.location.reload()}>
            Reload
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
