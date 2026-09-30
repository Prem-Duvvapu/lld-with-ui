import { useState, useEffect, useRef, useId } from 'react';
import { Link } from 'react-router-dom';
import DesignDetails from './DesignDetails';
import ClassDiagram from './ClassDiagram';
import SequenceDiagram from './SequenceDiagram';
import GithubSourceLinks from './GithubSourceLinks';
import SolutionGate from './SolutionGate';
import './LldPage.css';

export default function LldPage({ module, title, icon, tabs: customTabs, children }) {
  const defaultTabs = ['design', 'diagram'];
  const tabs = customTabs || defaultTabs;
  const getTabId = (t) => (typeof t === 'object' ? t.id : t);
  const getTabLabel = (t) => (typeof t === 'object' ? t.label : (tabLabels[t] || t));
  const tabIds = tabs.map(getTabId);

  const tabLabels = {
    design: 'Design Details',
    details: 'Design Details',
    diagram: 'Class Diagram',
    sequence: 'Sequence Diagram',
    app: 'App',
    simulation: 'Interactive 2D Simulation',
    demo: 'Animated Demo',
    solution: 'Solution',
    entry: 'Entry',
    exit: 'Exit',
    spots: 'Spots',
    tickets: 'Tickets',
    browse: '🍕 Food Ordering',
    restaurant: '🏪 Restaurant Dashboard',
    driver: '🛵 Delivery Partner',
    book: 'Passenger Booking',
    drivers: 'Driver Dashboard',
    history: 'Trip History',
    operations: '⚡ Operations',
    telemetry: '📊 Telemetry',
    logs: '📜 Logs'
  };

  const storageKey = `lld-tab-${module}`;
  const navRef = useRef(null);
  const panelId = useId();
  const [tab, setTab] = useState(() => {
    let saved;
    try { saved = sessionStorage.getItem(storageKey); } catch { saved = null; }
    return tabIds.includes(saved) ? saved : tabIds[0];
  });

  useEffect(() => {
    try { sessionStorage.setItem(storageKey, tab); } catch { return; }
  }, [tab, storageKey]);

  useEffect(() => {
    const nav = navRef.current;
    const active = nav?.querySelector('[aria-selected="true"]');
    if (!active) return;
    const keepVisible = () => {
      const bounds = nav.getBoundingClientRect();
      const selected = active.getBoundingClientRect();
      if (selected.left < bounds.left) nav.scrollLeft -= bounds.left - selected.left;
      else if (selected.right > bounds.right) nav.scrollLeft += selected.right - bounds.right;
    };
    keepVisible();
    window.addEventListener('resize', keepVisible);
    return () => window.removeEventListener('resize', keepVisible);
  }, [tab]);

  const navigateTabs = (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const current = tabIds.indexOf(tab);
    const next = {
      ArrowRight: (current + 1) % tabIds.length,
      ArrowLeft: (current - 1 + tabIds.length) % tabIds.length,
      Home: 0,
      End: tabIds.length - 1,
    }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    setTab(tabIds[next]);
    navRef.current.querySelectorAll('[role="tab"]')[next]?.focus();
  };

  const isBuiltIn = ['design', 'details', 'diagram', 'sequence'].includes(tab);

  return (
    <div className="lld-page">
      <nav className="lld-page-breadcrumb">
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <Link to="/">← Module library</Link>
          <span>/</span>
          <span>{title}</span>
        </div>
        <span data-tour="source-links">
          <GithubSourceLinks module={module} />
        </span>
      </nav>

      <header className="lld-page-header">
        <h1>{icon && <span>{icon}</span>} {title}</h1>
        <p className="lld-page-subtitle">Low-Level Design Architecture & Demonstration</p>
        <nav className="lld-page-nav" role="tablist" aria-label={`${title} sections`} ref={navRef} onKeyDown={navigateTabs}>
          {tabs.map((t) => {
            const tabId = getTabId(t);
            const label = getTabLabel(t);
            return (
              <button
                key={tabId}
                role="tab"
                type="button"
                id={`${panelId}-${tabId}`}
                aria-controls={panelId}
                tabIndex={tab === tabId ? 0 : -1}
                aria-selected={tab === tabId}
                className={tab === tabId ? 'active' : ''}
                onClick={() => setTab(tabId)}
                data-tour={`tab-${tabId}`}
              >
                {label}
              </button>
            );
          })}
        </nav>
      </header>

      <main className="lld-page-main">
        <div className="lld-page-panel" role="tabpanel" id={panelId} aria-labelledby={`${panelId}-${tab}`} tabIndex={0}>
        {(tab === 'design' || tab === 'details') && <DesignDetails module={module} />}
        {tab === 'diagram' && (
          <SolutionGate module={module} label="the class diagram">
            <ClassDiagram module={module} />
          </SolutionGate>
        )}
        {tab === 'sequence' && (
          <SolutionGate module={module} label="the sequence diagram">
            <SequenceDiagram module={module} />
          </SolutionGate>
        )}
        {!isBuiltIn && (
          typeof children === 'function'
            ? children(tab, setTab)
            : Array.isArray(children)
              ? children.map((c) => (typeof c === 'function' ? c(tab, setTab) : c))
              : children
        )}
        </div>
      </main>
    </div>
  );
}
