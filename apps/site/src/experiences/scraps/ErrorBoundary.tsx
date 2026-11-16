// Contains a render failure inside the island (contract M11): the fallback replaces the table,
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
      <div className="k-error" role="alert">
        <h2 ref={this.heading} tabIndex={-1}>The table fell over</h2>
        <p>Something went wrong on our side. Everything you made is still safe in this browser.</p>
        <p>
          <button type="button" className="k-button" onClick={() => this.setState((s) => ({ failed: false, attempt: s.attempt + 1 }))}>Set the table up again</button>
        </p>
      </div>
    );
  }
}
