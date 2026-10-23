import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() { return { failed: true }; }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Nexora Studio error:", error, info);
  }

  render() {
    if (this.state.failed) return <div className="fatal-error"><AlertTriangle size={32} /><h1>Something went wrong</h1><p>Your work is stored locally. Reload the page to reopen your last saved project.</p><button className="primary-button" onClick={() => location.reload()}>Reload studio</button></div>;
    return this.props.children;
  }
}