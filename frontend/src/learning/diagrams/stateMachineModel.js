// Validate the authored subset, not arbitrary UML or reservation business rules.
export function validateStateMachineModel(model) {
  const fail = reason => { throw new Error(`Invalid state machine diagram: ${reason}`); };
  const text = value => typeof value === 'string' && value.trim().length > 0;
  const finite = value => typeof value === 'number' && Number.isFinite(value);
  if (model?.kind !== 'state-machine' || !text(model.title) || !text(model.summary)
    || !finite(model.width) || model.width <= 0 || !finite(model.height) || model.height <= 0
    || !Array.isArray(model.nodes) || !Array.isArray(model.transitions)
    || !Array.isArray(model.definitions) || !model.definitions.every(text)) fail('missing model data');
  const nodes = new Map();
  for (const node of model.nodes) {
    if (!text(node.id) || nodes.has(node.id) || !text(node.label) || !text(node.description) || !text(node.source)
      || !['state', 'initial', 'final'].includes(node.kind) || !finite(node.x) || !finite(node.y)) fail('invalid node');
    const isState = node.kind === 'state';
    if (isState ? !finite(node.width) || node.width <= 0 || !finite(node.height) || node.height <= 0
      : !finite(node.radius) || node.radius <= 0) fail('invalid node size');
    const left = isState ? node.x : node.x - node.radius;
    const top = isState ? node.y : node.y - node.radius;
    const right = isState ? node.x + node.width : node.x + node.radius;
    const bottom = isState ? node.y + node.height : node.y + node.radius;
    if (left < 0 || top < 0 || right > model.width || bottom > model.height) fail('node outside canvas');
    nodes.set(node.id, node);
  }
  if (model.nodes.filter(n => n.kind === 'initial').length !== 1
    || model.nodes.filter(n => n.kind === 'final').length !== 1) fail('one initial and one final required in this subset');
  const ids = new Set();
  const kinds = ['initial', 'external', 'external-self', 'internal', 'completion'];
  for (const edge of model.transitions) {
    const from = nodes.get(edge.from), to = nodes.get(edge.to);
    if (!text(edge.id) || ids.has(edge.id) || !from || !to || !kinds.includes(edge.kind)
      || !text(edge.description) || !text(edge.source) || !Array.isArray(edge.labelLines)
      || !edge.labelLines.every(text)) fail('invalid transition');
    ids.add(edge.id);
    if (from.kind === 'final' || to.kind === 'initial') fail('final has no outgoing; initial has no incoming');
    if (edge.kind === 'initial') {
      if (from.kind !== 'initial' || to.kind !== 'state') fail('invalid initial target');
    } else if (from.kind !== 'state') fail('transition source must be a state');
    if (edge.kind === 'completion' && to.kind !== 'final') fail('completion must reach final in this subset');
    const implicit = ['initial', 'completion'].includes(edge.kind);
    if (implicit ? edge.event !== '' || edge.guard !== '' || edge.effect !== '' || edge.labelLines.length !== 0
      : !text(edge.event) || !text(edge.guard) || !text(edge.effect) || edge.labelLines.length === 0) fail('invalid event/guard/effect');
    if (['internal', 'external-self'].includes(edge.kind) && (edge.from !== edge.to || from.kind !== 'state')) fail('self endpoint mismatch');
    if (edge.kind === 'external' && (edge.from === edge.to || to.kind !== 'state')) fail('invalid external target');
    if (edge.kind === 'internal') {
      if (edge.points !== undefined) fail('internal transition has no loop arrow');
    } else if (!Array.isArray(edge.points) || edge.points.length < 2 || edge.points.some(point =>
      !Array.isArray(point) || point.length !== 2 || !point.every(finite)
      || point[0] < 0 || point[0] > model.width || point[1] < 0 || point[1] > model.height)) fail('invalid arrow geometry');
    if (edge.labelLines.length && (!finite(edge.labelPosition?.x) || !finite(edge.labelPosition?.y))) fail('missing label position');
  }
  const initial = model.nodes.find(node => node.kind === 'initial');
  if (model.transitions.filter(edge => edge.from === initial.id).length !== 1) fail('initial needs exactly one outgoing transition');
  return nodes;
}
