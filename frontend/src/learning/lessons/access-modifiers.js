import classModel from '../class-models/access-modifiers';
import modelSource from '../examples/visibility/VisibilityRecord.java?raw';
import peerSource from '../examples/visibility/VisibilityPeer.java?raw';
import childSource from '../examples/outside/VisibilityChild.java?raw';
import demoSource from '../examples/outside/VisibilityDemo.java?raw';
import output from '../examples/access-modifiers-output.txt?raw';
import snapshots from '../examples/access-modifiers-snapshots.json';

export default {
  classModel,
  id: 'access-modifiers',
  summary: 'Choose which collaborators may use a member, then check the boundary with real classes in two Java packages.',
  prerequisites: 'Classes and Objects. A package is a named group of types. This example introduces a subclass to inspect protected access; deeper inheritance behavior is a later topic.',
  objectives: [
    'Compare public, protected, package-private and private member access for separate top-level classes.',
    'Apply the cross-package protected receiver restriction instead of treating protected as public-to-all-subclasses.',
    'Distinguish access control from validation, secrecy and an immutable object.',
  ],
  problem: 'A record has a public summary, a helper for package peers and a hook for subclasses. Which operations should a same-package helper, an external subclass and an unrelated caller be allowed to invoke?',
  explanation: [
    { title: 'Design the collaboration boundary', text: 'VisibilityRecord has a public summary, protected subclassHint, package-private packageHint and private secret. Its own inspectOwnMembers method calls all four. The separate VisibilityPeer type is in the same package and can call the first three. Private access also extends to nested types inside the same enclosing top-level type; the matrix here uses separate top-level classes.' },
    { title: 'A package is not a directory inheritance tree', text: 'The package declaration determines package membership. VisibilityRecord and VisibilityPeer share com.lld.learning.examples.visibility. VisibilityChild and VisibilityDemo are in a different package. A subpackage is a different package too; a similar folder name does not grant package-private access.' },
    { title: 'Be precise about protected', text: 'Inside the cross-package VisibilityChild subclass, subclassHint() and other.subclassHint() with a VisibilityChild-typed receiver are legal. Calling that member through an arbitrary VisibilityRecord-typed receiver is not permitted there. An unrelated class does not gain this privilege merely by being in VisibilityChild’s package.' },
    { title: 'Control access without overclaiming safety', text: 'A public method may intentionally expose a representation of private state. Access modifiers constrain Java member use; they do not validate the id, encrypt data or make concurrent updates safe. Ordinary top-level classes may be public or package-private. The InternalNote type has no public modifier and cannot be imported by the external caller.' },
  ],
  visual: { title: 'Inspect four caller contexts', summary: 'Compiler-checked access decisions · separate top-level classes in one unnamed module', snapshots },
  code: [
    { filename: 'visibility/VisibilityRecord.java', source: modelSource },
    { filename: 'visibility/VisibilityPeer.java', source: peerSource },
    { filename: 'outside/VisibilityChild.java', source: childSource },
    { filename: 'outside/VisibilityDemo.java', source: demoSource },
  ],
  output,
  run: 'javac -d out visibility/VisibilityRecord.java visibility/VisibilityPeer.java outside/VisibilityChild.java outside/VisibilityDemo.java\njava -cp out com.lld.learning.examples.outside.VisibilityDemo',
  quiz: {
    prompt: 'Inside VisibilityChild, why is other.subclassHint() legal when other has type VisibilityChild, but not when it has type VisibilityRecord?',
    options: [
      { id: 'any-object', text: 'Both are legal because every subclass can access protected on every base object', feedback: 'That omits the cross-package receiver restriction. Being a subclass does not grant access through every base-typed reference.' },
      { id: 'receiver', text: 'Cross-package protected access restricts the qualifying receiver type', feedback: 'Correct. In this subclass body, a child-typed receiver qualifies; an arbitrary base-typed receiver does not. The compiler checks this boundary.', correct: true },
      { id: 'package', text: 'VisibilityRecord and VisibilityChild are actually in the same package', feedback: 'Their package declarations differ. The example deliberately separates visibility from outside.' },
    ],
  },
  exercise: 'Add a public read-only label to VisibilityRecord while keeping its backing field private. In separate same-package and external callers, try public, protected, package-private and private member calls. Then compare protected calls through a child-typed and a base-typed parameter inside the subclass. Record which examples compile before running the successful ones.',
  rubric: [
    'Use distinct package declarations and compile the callers, rather than inferring access from file locations.',
    'Keep unrelated public API small; do not widen helpers simply to make a failed example compile.',
    'Explain both same-package protected access and the narrower cross-package subclass receiver rule.',
    'Distinguish member access from top-level type accessibility and from runtime data validation.',
  ],
  pitfalls: [
    'No access modifier means package-private here; there is no package-private keyword.',
    'Private members are not directly available to these separate peer/subclass types. Nested types of the same enclosing top-level type have a different private-access relationship.',
    'The matrix assumes accessible public types in one unnamed module. Named-module readability and exports can add further restrictions.',
    'VisibilityRecord deliberately focuses on access and does not validate its id. Choosing private fields alone does not establish domain invariants.',
  ],
  module: {
    path: '/kvstore',
    title: 'Inspect the KV read-template boundary',
    text: 'KvReadTemplate exposes a public final read algorithm and protected onMissing/onFound hooks. GetOperation implements those hooks, while repository callers use read. Locate the visibility choices and explain which collaborator each serves. CAS and log ordering use a separate write path; these access choices do not establish their concurrency guarantees.',
    sources: [
      'backend/src/main/java/com/lld/kvstore/template/KvReadTemplate.java',
      'backend/src/main/java/com/lld/kvstore/template/GetOperation.java',
      'backend/src/main/java/com/lld/kvstore/repository/KvStoreRepository.java',
    ],
  },
  summaryPoints: [
    'Choose access by the intended caller, package and extension boundary.',
    'Protected access across packages includes a receiver restriction; it is not unrestricted access to base objects.',
    'Compile representative callers and keep access, validation and mutability as separate questions.',
  ],
  references: [
    { title: 'Java 17 Language Specification: Access Control', url: 'https://docs.oracle.com/javase/specs/jls/se17/html/jls-6.html#jls-6.6' },
    { title: 'Java 17 Language Specification: Protected Member Access', url: 'https://docs.oracle.com/javase/specs/jls/se17/html/jls-6.html#jls-6.6.2.1' },
    { title: 'Oracle Java Tutorial: Controlling Access', url: 'https://docs.oracle.com/javase/tutorial/java/javaOO/accesscontrol.html' },
  ],
};
