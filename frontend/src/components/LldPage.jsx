import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import DesignDetails from './DesignDetails';
import ClassDiagram from './ClassDiagram';
import './LldPage.css';

export default function LldPage({ module, title, icon, tabs: customTabs, children }) {
  const defaultTabs = ['design', 'diagram'];
  const tabs = customTabs || defaultTabs;
  const tabLabels = {
    design: 'Design Details',
    details: 'Design Details',
    diagram: 'Class Diagram',
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
    history: 'Trip History'
  };

  const storageKey = `lld-tab-${module}`;
  const [tab, setTab] = useState(() => {
    const saved = sessionStorage.getItem(storageKey);
    return tabs.includes(saved) ? saved : tabs[0];
  });

  useEffect(() => {
    sessionStorage.setItem(storageKey, tab);
  }, [tab, storageKey]);

  const isBuiltIn = ['design', 'details', 'diagram'].includes(tab);

  return (
    <div className="lld-page">
      <nav className="lld-page-breadcrumb">
        <Link to="/">← Home</Link>
        <span>/</span>
        <span>{title}</span>
      </nav>

      <header className="lld-page-header">
        <h1>{icon && <span>{icon}</span>} {title}</h1>
        <p className="lld-page-subtitle">Low-Level Design Architecture & Demonstration</p>
        <nav className="lld-page-nav" role="tablist">
          {tabs.map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              className={tab === t ? 'active' : ''}
              onClick={() => setTab(t)}
            >
              {tabLabels[t] || t}
            </button>
          ))}
        </nav>
      </header>

      <main className="lld-page-main">
        {(tab === 'design' || tab === 'details') && <DesignDetails module={module} />}
        {tab === 'diagram' && <ClassDiagram module={module} />}
        {!isBuiltIn && (
          typeof children === 'function'
            ? (typeof children(tab) === 'function' ? children(tab)() : children(tab))
            : children
        )}
      </main>
    </div>
  );
}
