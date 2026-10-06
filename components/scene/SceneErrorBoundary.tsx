// Catches WebGL/scene failures so SceneShell can switch to the static terrain fallback.
'use client';

import {Component, type ReactNode} from 'react';

type SceneErrorBoundaryProps = {
  children: ReactNode;
  onError: (error: Error) => void;
};

type SceneErrorBoundaryState = {
  failed: boolean;
};

export class SceneErrorBoundary extends Component<
  SceneErrorBoundaryProps,
  SceneErrorBoundaryState
> {
  state: SceneErrorBoundaryState = {failed: false};

  static getDerivedStateFromError() {
    return {failed: true};
  }

  componentDidCatch(error: Error) {
    this.props.onError(error);
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}
