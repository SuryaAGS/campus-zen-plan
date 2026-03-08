import { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorMessage: "" };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error?.message || "Unknown error" };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ErrorBoundary caught:", error?.message, error?.stack, info?.componentStack);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="flex min-h-screen items-center justify-center bg-background p-6 text-center">
          <div>
            <h2 className="mb-2 text-xl font-bold text-foreground">Something went wrong</h2>
            <p className="mb-2 text-muted-foreground">Please restart the app.</p>
            <p className="mb-4 max-w-md text-xs text-muted-foreground/60 break-all">
              {this.state.errorMessage}
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, errorMessage: "" });
                window.location.reload();
              }}
              className="rounded-lg bg-primary px-6 py-2 text-primary-foreground"
            >
              Reload
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
