import { Component, type ReactNode } from "react";

interface Props {
  name: string;
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Catches remote-load and remote-render failures (e.g. a microfrontend's
 * dev/preview server is down, or the remote throws during render) so that
 * one dead remote can never take down the host shell. See
 * docs/06-runtime-lifecycle.md.
 */
export class RemoteErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error(`[host] Remote "${this.props.name}" failed to load:`, error);
  }

  handleRetry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="host-max-w-md host-mx-auto host-mt-10 host-p-6 host-rounded-lg host-border host-border-red-200 host-bg-red-50 host-text-center">
          <p className="host-text-red-700 host-font-medium">{this.props.name} is currently unavailable.</p>
          <p className="host-text-red-600 host-text-sm host-mt-1">
            The remote service may be down, still building, or unreachable.
          </p>
          <button
            onClick={this.handleRetry}
            className="host-mt-4 host-bg-red-700 host-text-white host-rounded host-px-4 host-py-2 host-text-sm"
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
