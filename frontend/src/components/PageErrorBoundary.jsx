import { Component, createRef } from 'react';
import './PageErrorBoundary.css';

export default class PageErrorBoundary extends Component {
  state = { failed: false };
  heading = createRef();

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch() {
    this.heading.current?.focus();
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main className="page-recovery">
        <section role="alert">
        <h1 ref={this.heading} tabIndex={-1}>This page could not be opened</h1>
        <p>The page may have failed to download, or encountered an unexpected error. Check your connection and reload to fetch a fresh copy.</p>
        <p>This recovery does not clear saved progress or notes. Unsaved changes may be lost when reloading.</p>
        <div className="page-recovery-actions">
          <button type="button" onClick={() => window.location.reload()}>Reload page</button>
          <a href="/">Return to module library</a>
        </div>
        </section>
      </main>
    );
  }
}
