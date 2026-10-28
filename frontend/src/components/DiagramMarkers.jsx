// Shape definitions only. Each rendered SVG supplies its own unique prefix.
export default function DiagramMarkers({ prefix, hollowClassName }) {
  return <defs>
    <marker id={`${prefix}-triangle`} markerUnits="userSpaceOnUse" markerWidth="20" markerHeight="20" viewBox="0 0 20 20" refX="20" refY="10" orient="auto">
      <path d="M1 1 L20 10 L1 19 Z" className={hollowClassName} fill="var(--bg-secondary)" />
    </marker>
    <marker id={`${prefix}-arrow`} markerUnits="userSpaceOnUse" markerWidth="18" markerHeight="20" viewBox="0 0 18 20" refX="17" refY="10" orient="auto">
      <path d="M1 1 L17 10 L1 19" fill="none" />
    </marker>
    <marker id={`${prefix}-aggregation`} markerUnits="userSpaceOnUse" markerWidth="24" markerHeight="20" viewBox="0 0 24 20" refX="0" refY="10" orient="auto">
      <path d="M0 10 L12 2 L24 10 L12 18 Z" className={hollowClassName} fill="var(--bg-secondary)" />
    </marker>
    <marker id={`${prefix}-composition`} markerUnits="userSpaceOnUse" markerWidth="24" markerHeight="20" viewBox="0 0 24 20" refX="0" refY="10" orient="auto">
      <path d="M0 10 L12 2 L24 10 L12 18 Z" fill="currentColor" />
    </marker>
  </defs>;
}
