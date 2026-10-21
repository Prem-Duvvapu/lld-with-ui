const groups = [
  ['getting-started', 'Start here', [
    ['how-to-learn-lld', 'How to Learn LLD'],
    ['oop-overview', '15 Must-Know OOP Concepts'],
  ]],
  ['oop', 'OOP fundamentals', [
    ['classes-and-objects', 'Classes and Objects'],
    ['enums', 'Enums'],
    ['interfaces', 'Interfaces'],
    ['encapsulation', 'Encapsulation'],
    ['abstraction', 'Abstraction'],
    ['inheritance', 'Inheritance'],
    ['polymorphism', 'Polymorphism'],
    ['constructors', 'Constructors and Initialization', true],
    ['access-modifiers', 'Access Modifiers', true],
    ['overloading-and-overriding', 'Method Overloading vs Overriding', true],
    ['static-and-instance', 'Static vs Instance Members', true],
  ]],
  ['relationships', 'Class relationships', [
    ['association', 'Association'],
    ['aggregation', 'Aggregation'],
    ['composition', 'Composition'],
    ['dependency', 'Dependency'],
  ]],
  ['principles', 'Design principles', [
    ['dry', 'DRY Principle'],
    ['yagni', 'YAGNI Principle'],
    ['kiss', 'KISS Principle'],
    ['solid-pictures', 'SOLID Principles with Pictures'],
    ['solid-code', 'SOLID Principles with Code'],
  ]],
  ['creational', 'Creational patterns', [
    ['singleton', 'Singleton'],
    ['factory-method', 'Factory Method'],
    ['abstract-factory', 'Abstract Factory'],
    ['builder', 'Builder'],
    ['prototype', 'Prototype'],
  ]],
  ['structural', 'Structural patterns', [
    ['adapter', 'Adapter'],
    ['bridge', 'Bridge'],
    ['composite', 'Composite'],
    ['decorator', 'Decorator'],
    ['facade', 'Facade'],
    ['flyweight', 'Flyweight'],
    ['proxy', 'Proxy'],
  ]],
  ['behavioral', 'Behavioral patterns', [
    ['iterator', 'Iterator'],
    ['observer', 'Observer'],
    ['strategy', 'Strategy'],
    ['command', 'Command'],
    ['state', 'State'],
    ['template-method', 'Template Method'],
    ['visitor', 'Visitor'],
    ['mediator', 'Mediator'],
    ['memento', 'Memento'],
    ['chain-of-responsibility', 'Chain of Responsibility'],
    ['interpreter', 'Interpreter', true],
  ]],
  ['uml', 'UML', [
    ['class-diagram', 'Class Diagram'],
    ['use-case-diagram', 'Use Case Diagram'],
    ['sequence-diagram', 'Sequence Diagram'],
    ['activity-diagram', 'Activity Diagram'],
    ['state-machine-diagram', 'State Machine Diagram'],
  ]],
  ['concurrency-basics', 'Concurrency 101', [
    ['introduction-to-concurrency', 'Introduction to Concurrency'],
    ['concurrency-vs-parallelism', 'Concurrency vs Parallelism'],
    ['processes-vs-threads', 'Processes vs Threads'],
    ['thread-lifecycle', 'Thread Lifecycle and States'],
    ['race-conditions', 'Race Conditions and Critical Sections'],
  ]],
  ['synchronization', 'Synchronization primitives', [
    ['mutex', 'Mutex (Mutual Exclusion)'],
    ['semaphores', 'Semaphores'],
    ['condition-variables', 'Condition Variables'],
    ['locking-granularity', 'Coarse-grained vs Fine-grained Locking'],
    ['reentrant-locks', 'Reentrant Locks'],
    ['timed-locking', 'Try-Lock and Timed Locking'],
    ['compare-and-swap', 'Compare-and-Swap (CAS)'],
  ]],
  ['concurrency-challenges', 'Concurrency challenges', [
    ['deadlock', 'Deadlock'],
    ['livelock', 'Livelock'],
  ]],
  ['concurrency-patterns', 'Concurrency patterns', [
    ['signaling', 'Signaling Pattern'],
    ['thread-pool-pattern', 'Thread Pool Pattern'],
    ['producer-consumer', 'Producer-Consumer Pattern'],
    ['reader-writer', 'Reader-Writer Pattern'],
  ]],
  ['interview', 'Interview preparation', [
    ['answering-lld-interviews', 'How to Answer a LLD Interview Problem'],
  ]],
];

export const CURRICULUM_GROUPS = groups.map(([id, title]) => ({ id, title }));

export const LESSONS = groups.flatMap(([group, , entries]) => entries.map(([id, title, proposed = false]) => ({
  id,
  title,
  group,
  proposed,
  status: id === 'classes-and-objects' ? 'published' : 'planned',
  prerequisites: id === 'classes-and-objects' || group === 'getting-started' ? [] : ['classes-and-objects'],
})));

export const PUBLISHED_LESSONS = LESSONS.filter(lesson => lesson.status === 'published');

export function findLesson(id) {
  return LESSONS.find(lesson => lesson.id === id);
}
