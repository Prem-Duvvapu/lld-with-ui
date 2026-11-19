import policy from './examples/solid/FeePolicy.java?raw';
import standard from './examples/solid/StandardFee.java?raw';
import pickup from './examples/solid/PickupFee.java?raw';
import free from './examples/solid/FreeFee.java?raw';
import broken from './examples/solid/BulkyOnlyFee.java?raw';
import counters from './examples/solid/CounterExamples.java?raw';
import demo from './examples/solid/SolidDemo.java?raw';
import output from './examples/solid-output.txt?raw';
import snapshots from './examples/solid-snapshots.json';
import diagram from './diagrams/solid-principles';

const files = [['FeePolicy', policy], ['StandardFee', standard], ['PickupFee', pickup], ['FreeFee', free], ['BulkyOnlyFee', broken], ['CounterExamples', counters], ['SolidDemo', demo]];
export const code = files.map(([name, source]) => ({ filename: `solid/${name}.java`, source }));
export const run = `javac --release 17 -d out ${files.map(([name]) => `solid/${name}.java`).join(' ')}\njava -cp out com.lld.learning.examples.solid.SolidDemo`;
export { output, snapshots, diagram };
export const references = [
  { title: 'Robert C. Martin: The Single Responsibility Principle', url: 'https://blog.cleancoder.com/uncle-bob/2014/05/08/SingleReponsibilityPrinciple.html' },
  { title: 'Robert C. Martin: The Open Closed Principle', url: 'https://blog.cleancoder.com/uncle-bob/2014/05/12/TheOpenClosedPrinciple.html' },
  { title: 'Liskov and Wing: A Behavioral Notion of Subtyping (1994)', url: 'https://www.cs.cmu.edu/~wing/publications/LiskovWing94.pdf' },
  { title: 'Robert C. Martin: The Interface Segregation Principle (1996)', url: 'https://www.cs.utexas.edu/~downing/papers/ISP-1996.pdf' },
  { title: 'Robert C. Martin: The Dependency Inversion Principle (1996)', url: 'https://www.cs.utexas.edu/~downing/papers/DIP-1996.pdf' },
];
