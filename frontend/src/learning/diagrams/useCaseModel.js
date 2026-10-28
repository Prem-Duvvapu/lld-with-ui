export const USE_CASE_RELATIONSHIPS = {
  association: { name: 'Participation', explanation: 'Plain solid line. Participation does not specify navigation, initiation or time order.' },
  include: { name: 'Include', dashed: true, marker: 'arrow', label: '«include»', explanation: 'Dashed line with an open arrow pointing from the including case to the included case.' },
  extend: { name: 'Extend', dashed: true, marker: 'arrow', label: '«extend»', explanation: 'Dashed line with an open arrow pointing from the extension to the independent base case.' },
  generalization: { name: 'Generalization', marker: 'triangle', explanation: 'Solid line with a hollow triangle pointing from the specialized role or case to the general one.' },
};

// Validate authored visual metadata. This does not evaluate Java, permissions or use-case behavior.
export function validateUseCaseModel(model) {
  const require = (condition, message) => { if (!condition) throw new Error(`Invalid use case diagram: ${message}`); };
  const text = value => typeof value === 'string' && value.trim().length > 0;
  const finite = value => typeof value === 'number' && Number.isFinite(value);
  require(model?.kind === 'use-case', 'kind must be use-case');
  require(text(model.title) && text(model.summary), 'title and summary are required');
  require(finite(model.width) && model.width > 0 && finite(model.height) && model.height > 0, 'positive canvas dimensions are required');
  const within = (x, y) => finite(x) && finite(y) && x >= 0 && x <= model.width && y >= 0 && y <= model.height;
  const boundary = model.boundary;
  require(boundary && text(boundary.label) && text(boundary.description), 'a named subject boundary is required');
  require(within(boundary.x, boundary.y) && finite(boundary.width) && boundary.width > 0 && finite(boundary.height) && boundary.height > 0
    && within(boundary.x + boundary.width, boundary.y + boundary.height), 'boundary must fit inside the canvas');
  require(Array.isArray(model.actors) && model.actors.length > 0 && Array.isArray(model.useCases) && model.useCases.length > 0, 'actors and use cases are required');
  require(Array.isArray(model.relationships) && Array.isArray(model.notes) && model.notes.every(text), 'relationships and reading notes are required');
  const nodes = new Map();
  for (const [type, entries] of [['actor', model.actors], ['case', model.useCases]]) for (const node of entries) {
    require(text(node.id) && !nodes.has(node.id), 'node IDs must be unique');
    require(text(node.label) && text(node.description), 'every node needs a label and description');
    require(within(node.x, node.y), 'node positions must fit inside the canvas');
    if (type === 'actor') require(node.x < boundary.x || node.x > boundary.x + boundary.width || node.y < boundary.y || node.y > boundary.y + boundary.height, 'actors must be outside the subject boundary');
    else {
      require(finite(node.rx) && node.rx > 0 && finite(node.ry) && node.ry > 0, 'use cases need positive ellipse radii');
      require(node.x - node.rx >= boundary.x && node.x + node.rx <= boundary.x + boundary.width
        && node.y - node.ry >= boundary.y && node.y + node.ry <= boundary.y + boundary.height, 'use cases must fit inside the subject boundary');
      require(node.labelLines === undefined || (Array.isArray(node.labelLines) && node.labelLines.length > 0 && node.labelLines.every(text)), 'label lines must contain text');
      require(node.extensionPoints === undefined || (Array.isArray(node.extensionPoints) && node.extensionPoints.every(text)), 'extension points must contain text');
    }
    nodes.set(node.id, { ...node, type });
  }
  const edges = new Set();
  for (const edge of model.relationships) {
    require(text(edge.id) && !edges.has(edge.id), 'relationship IDs must be unique'); edges.add(edge.id);
    const from = nodes.get(edge.from), to = nodes.get(edge.to);
    require(from && to && from.id !== to.id, 'relationships need distinct declared endpoints');
    require(Object.hasOwn(USE_CASE_RELATIONSHIPS, edge.kind) && text(edge.description), 'relationships need a known kind and explanation');
    require(Array.isArray(edge.points) && edge.points.length >= 2 && edge.points.every(p => Array.isArray(p) && p.length === 2 && within(p[0], p[1])), 'relationship paths must contain canvas points');
    require(!edge.labelPosition || within(edge.labelPosition.x, edge.labelPosition.y), 'relationship labels must fit inside the canvas');
    if (edge.kind === 'association') require(from.type !== to.type, 'participation connects an actor and a use case');
    else if (edge.kind === 'generalization') require(from.type === to.type, 'generalization endpoints must have the same kind');
    else require(from.type === 'case' && to.type === 'case', 'include and extend connect use cases');
    if (edge.kind === 'extend') require(text(edge.condition) && text(edge.extensionPoint) && to.extensionPoints?.includes(edge.extensionPoint), 'extend needs a condition and a declared base extension point');
  }
  return nodes;
}
