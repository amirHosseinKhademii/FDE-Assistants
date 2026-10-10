import { Component, type ReactNode } from "react";

/**
 * Keeps a failing map from taking the profile page down: on any render error
 * the fallback (the plain placeholder card) is shown instead. Remounts when
 * `resetKey` changes, so a new address gets a fresh attempt.
 */
export class MapBoundary extends Component<{ fallback: ReactNode; resetKey: string; children: ReactNode }, { failed: string | null }> {
  state: { failed: string | null } = { failed: null };

  static getDerivedStateFromError() {
    return { failed: "error" };
  }

  componentDidCatch(error: unknown) {
    console.warn("Map failed; showing the placeholder instead.", error);
  }

  componentDidUpdate(prev: { resetKey: string }) {
    if (prev.resetKey !== this.props.resetKey && this.state.failed) this.setState({ failed: null });
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
