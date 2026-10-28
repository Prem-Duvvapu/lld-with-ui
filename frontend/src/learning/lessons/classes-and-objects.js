import classModel from '../class-models/classes-and-objects';
import modelSource from '../examples/StudyCard.java?raw';
import demoSource from '../examples/StudyCardDemo.java?raw';
import output from '../examples/classes-and-objects-output.txt?raw';
import snapshots from '../examples/classes-and-objects-snapshots.json';

export default {
  classModel,
  id: 'classes-and-objects',
  summary: 'Separate a class definition, an object, and a reference. Then explain which state changes when two variables refer to the same object.',
  prerequisites: 'Read a variable assignment and a method call in Java. No design-pattern knowledge is needed.',
  objectives: [
    'Identify fields, constructors, methods, and instances in a small Java program.',
    'Distinguish two objects with equal field values from two references to one object.',
    'Predict the state after a method call and explain why another instance stays unchanged.',
  ],
  problem: 'You are building a study app. Two learners create cards for the same topic. Reviewing one card must not increase the other card’s review count. What should be shared, and what should belong to each card?',
  explanation: [
    { title: 'One definition, independent instances', text: 'StudyCard defines the fields and operations each card has. new StudyCard("Objects") creates an instance and calls its constructor. The constructor sets that instance’s topic; its int reviewCount starts at Java’s default value of zero. Two new expressions create two distinct objects.' },
    { title: 'State and behavior belong together', text: 'topic and reviewCount are instance fields: every card has its own values. review() is an instance method and changes the count of the card on which it is called. private keeps direct field access inside the class; getters let callers inspect the values. Encapsulation is explored in a later lesson.' },
    { title: 'A reference is not the object itself', text: 'first and second are reference variables. StudyCard alias = first does not call a constructor or create another StudyCard. Both first and alias refer to Object A. Calling review() through either name changes that same object. == compares reference identity here, not topic text.' },
  ],
  visual: { title: 'Follow the references', typeLabel: 'StudyCard', showReferenceCount: true, summary: 'One class definition · two object instances', snapshots },
  code: [
    { filename: 'StudyCard.java', source: modelSource },
    { filename: 'StudyCardDemo.java', source: demoSource },
  ],
  output,
  run: 'javac -d out StudyCard.java StudyCardDemo.java\njava -cp out com.lld.learning.examples.StudyCardDemo',
  quiz: {
    prompt: 'After the demo, what do first and second report, and how many StudyCard objects exist?',
    options: [
      { id: 'independent', text: 'first: 1, second: 1; two objects', feedback: 'The alias does not point to second. Its review changes first’s object again. Revisit the third illustration.' },
      { id: 'alias', text: 'first: 2, second: 0; two objects', feedback: 'Exactly. first and alias share Object A; second refers to independent Object B. Copying the reference creates no third card.', correct: true },
      { id: 'copy', text: 'first: 1, second: 0; three objects', feedback: 'Assignment copies a reference here, not a StudyCard. Only the two new expressions create cards.' },
    ],
  },
  exercise: 'Design a ReadingSession class for two readers of the same book. Name the per-session fields and one behavior. Explain what should happen if another variable refers to the first session. Write a tiny example that proves the second reader’s state stays independent.',
  rubric: [
    'State which two new expressions create distinct sessions; a matching book title does not merge their identities.',
    'Keep each reader’s progress in instance fields, not a shared static counter.',
    'Explain that an alias refers to the same session and changes the same state.',
    'Include an assertion showing that changing one session leaves the other unchanged.',
  ],
  pitfalls: [
    'Do not make the review counter static: that would share one counter across the class rather than one per card.',
    'Equal field values do not make two objects identical. A domain ID is also different from Java reference identity.',
    'This small example is single-threaded and has no persistence or synchronization. It is not the production module-reviewed tracker or a thread-safe service.',
  ],
  module: {
    path: '/parking-lot',
    title: 'Find instances in Parking Lot',
    text: 'Open the class diagram and locate ParkingSpot. Its id, floorNumber, vehicleType, and occupied fields describe each spot. The initializer creates distinct spots; a second reference to a spot does not create another parking space. Repository locks—not this teaching example—protect the live module’s operations.',
    sources: [
      'backend/src/main/java/com/lld/parkinglot/model/ParkingSpot.java',
      'backend/src/main/java/com/lld/parkinglot/config/ParkingLotInitializer.java',
    ],
  },
  summaryPoints: [
    'A class declares a type’s fields and operations; an object is an instance of that class.',
    'Each new StudyCard creates independent instance state. Assigning a reference does not copy that state.',
    'Explain identity, state, and behavior before choosing a design pattern.',
  ],
  references: [
    { title: 'Oracle Java Tutorial: What Is an Object?', url: 'https://docs.oracle.com/javase/tutorial/java/concepts/object.html' },
    { title: 'Oracle Java Tutorial: What Is a Class?', url: 'https://docs.oracle.com/javase/tutorial/java/concepts/class.html' },
    { title: 'Oracle Java Tutorial: Creating Objects', url: 'https://docs.oracle.com/javase/tutorial/java/javaOO/objectcreation.html' },
  ],
};
