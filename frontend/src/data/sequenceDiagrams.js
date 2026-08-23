// sequenceDiagrams — barrel index.
// Content lives in ./sequences/<module>.js, one file per module.
// Prototype: only modules whose flow is genuinely more understandable as a sequence
// than as a class diagram (a concurrency race, a multi-service handoff) get one —
// this is not meant to be authored for all 45 modules.
// Add a module by creating its file and registering it here.

import _uber from './sequences/uber.js';
import _splitwise from './sequences/splitwise.js';

const sequenceDiagrams = {
  uber: _uber,
  splitwise: _splitwise,
};

export default sequenceDiagrams;
