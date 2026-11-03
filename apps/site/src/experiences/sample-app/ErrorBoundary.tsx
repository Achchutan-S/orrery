// Contains a render failure inside this island (blueprint 7.1): the fallback replaces the
// explorer, the rest of the page (Beacon, palette) keeps working. React error boundaries catch
// errors thrown while rendering, in lifecycle methods and in effects of the components below;
// not errors in event handlers, in async code (timers, promises) or during server rendering.
// Local to sample-app until a second island needs one (AGENTS.md: kernel needs two users).
import { Component, createRef, type ReactNode, type Ref } from 'react';
import { BASE } from './views.ts';

type State = { failed: boolean; attempt: number };

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { failed: false, attempt: 0 };
  heading = createRef<HTMLHeadingElement>();

  static getDerivedStateFromError(): Partial<State> {
    return { failed: true };
  }

  componentDidUpdate(_: unknown, prev: State) {
    // Move focus to the message, so keyboard and screen-reader users land on it.
    if (this.state.failed && (!prev.failed || prev.attempt !== this.state.attempt)) this.heading.current?.focus();
  }

  render() {
    if (!this.state.failed) return this.props.children;
    // Nothing from the error itself is shown: no message, stack or file path.
    return <Fallback heading={this.heading} retry={() => this.setState((s) => ({ failed: false, attempt: s.attempt + 1 }))} />;
  }
}

export function Fallback({ heading, retry }: { heading?: Ref<HTMLHeadingElement>; retry: () => void }) {
  return (
    <div className="island-error" role="alert">
      <h1 ref={heading} tabIndex={-1}>The explorer stopped working</h1>
      <p>Something went wrong while showing this view. The rest of the page still works.</p>
      <p>
        <button type="button" onClick={retry}>Try again</button>{' '}
        or <a href={`${BASE}/states`}>start from all states</a>.
      </p>
    </div>
  );
}
