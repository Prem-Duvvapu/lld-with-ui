// sequenceDiagrams — barrel index.
// Content lives in ./sequences/<module>.js, one file per module.
// Prototype: only modules whose flow is genuinely more understandable as a sequence
// than as a class diagram (a concurrency race, a multi-service handoff) get one —
// this is not meant to be authored for all 45 modules.
// Add a module by creating its file and registering it here.

import _uber from './sequences/uber.js';
import _zomato from './sequences/zomato.js';
import _splitwise from './sequences/splitwise.js';
import _taskManagement from './sequences/task-management.js';
import _wallet from './sequences/wallet.js';
import _auction from './sequences/auction.js';
import _socialNetwork from './sequences/social-network.js';
import _ludo from './sequences/ludo.js';
import _airline from './sequences/airline.js';
import _elevator from './sequences/elevator.js';
import _parking from './sequences/parking.js';
import _pubsub from './sequences/pubsub.js';

const sequenceDiagrams = {
  uber: _uber,
  zomato: _zomato,
  splitwise: _splitwise,
  'task-management': _taskManagement,
  wallet: _wallet,
  auction: _auction,
  socialNetwork: _socialNetwork,
  ludo: _ludo,
  airline: _airline,
  elevator: _elevator,
  parking: _parking,
  pubsub: _pubsub,
};

export default sequenceDiagrams;
