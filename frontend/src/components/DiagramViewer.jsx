import { useEffect, useId, useRef, useState } from 'react';
import './DiagramViewer.css';

export default function DiagramViewer({ title, width, children, legend, transcript, onLayout }) {
  const [scale, setScale] = useState(1);
  const [height, setHeight] = useState(600);
  const [expanded, setExpanded] = useState(false);
  const rootRef = useRef(null);
  const viewportRef = useRef(null);
  const contentRef = useRef(null);
  const expandRef = useRef(null);
  const wasExpanded = useRef(false);
  const titleId = useId();
  const Root = expanded ? 'dialog' : 'section';

  useEffect(() => {
    if (!expanded) {
      if (wasExpanded.current) expandRef.current?.focus();
      wasExpanded.current = false;
      return undefined;
    }
    wasExpanded.current = true;
    const root = rootRef.current;
    root.showModal();
    expandRef.current?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      root.close();
      document.body.style.overflow = overflow;
    };
  }, [expanded]);

  useEffect(() => {
    const measure = () => {
      setHeight(contentRef.current?.offsetHeight || 600);
      onLayout?.();
    };
    const observer = new ResizeObserver(measure);
    if (contentRef.current) observer.observe(contentRef.current);
    measure();
    return () => observer.disconnect();
  }, [expanded, width, onLayout]);

  const resize = next => setScale(Math.min(2, Math.max(0.1, Math.round(next * 100) / 100)));
  const reset = () => {
    setScale(1);
    viewportRef.current?.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  };

  return (
    <Root ref={rootRef} className={`diagram-viewer${expanded ? ' diagram-viewer-expanded' : ''}`} aria-labelledby={titleId}
      {...(expanded ? { onCancel: () => setExpanded(false), onClose: () => setExpanded(false) } : {})}>
      <div className="diagram-viewer-toolbar">
        <h4 id={titleId}>{title} viewer</h4>
        <div className="diagram-viewer-actions" role="group" aria-label="Diagram viewing controls">
          <button type="button" onClick={() => resize(scale - 0.1)} disabled={scale <= 0.1} aria-label="Zoom out">−</button>
          <output aria-live="polite" aria-label="Zoom level">{Math.round(scale * 100)}%</output>
          <button type="button" onClick={() => resize(scale + 0.1)} disabled={scale >= 2} aria-label="Zoom in">+</button>
          <button type="button" onClick={() => setScale(Math.min(1, (viewportRef.current?.clientWidth || width) / width))}>Fit width</button>
          <button type="button" onClick={reset}>Reset view</button>
          <button type="button" ref={expandRef} onClick={() => setExpanded(!expanded)}>{expanded ? 'Exit fullscreen' : 'Fullscreen'}</button>
        </div>
      </div>
      <p className="diagram-viewer-hint">Scroll to pan. Fit width shows the whole diagram across the viewport; use the text explanation for comfortable reading.</p>
      <div ref={viewportRef} className="diagram-viewer-viewport" tabIndex={0} role="region" aria-label={`${title} scrollable diagram`}>
        <div style={{ width: width * scale, height: height * scale, position: 'relative' }}>
          <div ref={contentRef} style={{ width, transform: `scale(${scale})`, transformOrigin: 'top left', position: 'absolute', top: 0, left: 0 }}>{children}</div>
        </div>
      </div>
      <details className="diagram-viewer-details"><summary>Diagram legend</summary>{legend}</details>
      <details className="diagram-viewer-details"><summary>Text explanation</summary>{transcript}</details>
    </Root>
  );
}
