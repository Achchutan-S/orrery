// Contains a render failure inside the island (contract M11): the fallback replaces the chart,
// the Beacon keeps working, and nothing from the error is shown. The pattern is sample-app's;
// the copy is local because an experience never imports another (contract M9).
// What was written is safe: every change was already in the browser's storage before any render.
import { Component, createRef, type ReactNode } from 'react';

type State = { failed: boolean; attempt: number };

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { failed: false, attempt: 0 };
  heading = createRef<HTMLHeadingElement>();

  static getDerivedStateFromError(): Partial<State> {
    return { failed: true };
  }

  componentDidUpdate(_: unknown, prev: State) {
    if (this.state.failed && (!prev.failed || prev.attempt !== this.state.attempt)) this.heading.current?.focus();
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="s-error" role="alert">
        <h2 ref={this.heading} tabIndex={-1}>The chart stopped working</h2>
        <p>Something went wrong while drawing it. What you wrote is still stored in this browser.</p>
        <p>
          <button type="button" className="s-button" onClick={() => this.setState((s) => ({ failed: false, attempt: s.attempt + 1 }))}>Open the chart again</button>
        </p>
      </div>
    );
  }
}
