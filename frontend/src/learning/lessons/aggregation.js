import classModel from '../class-models/aggregation';
import trackSource from '../examples/aggregation/Track.java?raw';
import playlistSource from '../examples/aggregation/Playlist.java?raw';
import demoSource from '../examples/aggregation/AggregationDemo.java?raw';
import output from '../examples/aggregation-output.txt?raw';
import snapshots from '../examples/aggregation-snapshots.json';

export default {
  classModel,
  id: 'aggregation',
  summary: 'Model a playlist as a whole assembled from independently managed catalog tracks. Trace sharing, a visible mutation, rejected duplication, unlinking and deletion without inventing a Java lifetime rule.',
  prerequisites: 'Association: links, navigation, multiplicity and reference identity. Familiarity with constructors, private fields and instance methods; List operations are explained below.',
  objectives: [
    'Explain what a whole/part interpretation adds to an ordinary association, and why shared aggregation needs stated domain rules.',
    'Read a hollow diamond and multiplicities separately from the Java operations that enforce membership.',
    'Predict shared mutation, shallow membership snapshots and independent domain lifecycles from actual references.',
  ],
  problem: 'A music catalog offers one Dawn track. Focus and Commute playlists should both include it. Renaming the catalog entry should update both views, but removing or deleting Focus must leave Commute and the catalog entry usable. Would copying the track or treating every list element as exclusively owned express these requirements?',
  explanation: [
    { title: 'Start from association, then state the whole/part meaning', text: 'The association lesson established that objects can retain links without asserting ownership. Here a playlist is a curated whole and tracks are its musical parts. We choose shared aggregation to communicate that interpretation: the catalog manages the tracks independently and several playlists may include the same track. A learner knowing a tutor was not automatically a whole/part relationship. A field, a collection or an English “has a” sentence alone cannot choose this modeling meaning.' },
    { title: 'Shared aggregation is deliberately weak', text: 'UML 2.5.1 §9.5.3 leaves the precise semantics of shared aggregation to the application area and modeler. It does not impose one universal deletion, sharing or construction algorithm on Java programs. In this example we explicitly permit shared tracks, reject duplicate instances within one playlist, and delete only playlist memberships when a playlist ends. Those are documented and tested choices for this domain. If the diamond conveys no agreed rule to a team, an ordinary association plus written constraints may communicate more clearly.' },
    { title: 'Read the whole end and the counts independently', text: 'Playlist [0..*] ◇—tracks— [0..*] Track puts the hollow diamond beside the playlist whole. A playlist can have zero or more tracks; one track can participate in zero or more playlists. The counts are per object at the opposite end, not the number of objects currently drawn. The diamond is not an inheritance arrow or a navigation arrow. Java navigation here runs from Playlist.getTracks to Track; Track has no reverse playlist directory. Choosing a hollow diamond does not generate either API.' },
    { title: 'Inject references and enforce membership deliberately', text: 'The demo constructs dawn before either playlist and passes its reference into both add calls. Playlist stores those existing references; it never clones or constructs a Track. add checks that the playlist is active, rejects null and prevents the same object being listed twice. Track keeps Object’s equality, so contains and remove use identity in this example. Two separate Track objects with the same title can both be members. A production catalog might instead require stable IDs and an explicit duplicate-by-ID policy. Constructor injection by itself would not prove shared aggregation either; the domain contract supplies the interpretation.' },
    { title: 'A copied list can still expose shared mutable parts', text: 'getTracks returns List.copyOf(tracks): callers cannot add or remove through that returned list, and later playlist membership changes do not alter it. Its elements are the original Track objects. dawn.rename("Sunrise") therefore changes what both playlists and saved.get(0) report. final on the list field prevents rebinding that field; it does not freeze the ArrayList or its elements. If callers need isolated data, return immutable track values or detached views as a separate API decision. Shared aggregation alone guarantees neither isolation nor immutability.' },
    { title: 'Unlinking and ending a whole are explicit operations', text: 'remove removes only one playlist’s membership and reports false for an absent track. delete is idempotent: it clears that playlist’s list and marks it deleted; subsequent add or remove calls fail. Name, deletion status and the now-empty membership remain readable for inspection. No track deletion method is invoked. The saved list still records an earlier membership and points to the same mutable track. This distinction matters in APIs: historical membership is not current membership.' },
    { title: 'Keep lifecycle policy separate from Java reachability', text: 'In this domain, ending a playlist never retires a catalog track. That rule is encoded in delete, not in a hollow diamond, private field or garbage collector. The demo continues to use dawn through ordinary references after deletion. Java memory reclamation depends on reachability, not the label whole or part, and no collection time is predicted. The composition lesson adds an explicit exclusive-ownership and deletion contract; Java still needs code to enforce it. Both examples are single-threaded and in memory, with no database cascade or atomic cross-thread workflow.' },
  ],
  visual: { title: 'Follow playlist membership and shared tracks', summary: 'Hollow diamond at the whole · shared catalog identity · explicit playlist-only deletion', snapshots },
  code: [
    { filename: 'aggregation/Track.java', source: trackSource },
    { filename: 'aggregation/Playlist.java', source: playlistSource },
    { filename: 'aggregation/AggregationDemo.java', source: demoSource },
  ],
  output,
  run: 'javac -d out aggregation/Track.java aggregation/Playlist.java aggregation/AggregationDemo.java\njava -cp out com.lld.learning.examples.aggregation.AggregationDemo',
  quiz: {
    prompt: 'saved = focus.getTracks() is taken while both playlists contain dawn. After dawn.rename("Sunrise"), focus.remove(dawn) and focus.delete(), what does saved.get(0) identify?',
    options: [
      { id: 'same-track', text: 'The same Sunrise track still used by Commute; saved retains the old membership', feedback: 'Correct. The membership list is detached, but its element is the original mutable track. Focus deletion neither changes saved’s membership nor retires that track.', correct: true },
      { id: 'deep-copy', text: 'An independent Dawn track frozen when the list was copied', feedback: 'List.copyOf prevents list modification; it does not deep-copy Track objects. The saved element observes the rename to Sunrise.' },
      { id: 'deleted-part', text: 'A deleted track that cannot be used after its whole is deleted', feedback: 'Playlist.delete only clears its own list and marks the playlist deleted. The track lifecycle policy is independent in this example; a hollow diamond does not add a Java deletion mechanism.' },
    ],
  },
  exercise: 'Add copySelection(name) to your copy of Playlist. It must reject a deleted source and create a new active playlist with the same current Track references in the same order. Test copying an empty and a populated playlist, renaming a shared track, removing a track from just the copy, and deleting the source. Compare current membership with a previously saved list. Decide whether a second Track with an equal title is a duplicate under the existing policy; explain what would change if tracks had stable catalog IDs. Keep this single-threaded.',
  rubric: [
    'Construct a new Playlist and independent membership storage; preserve element identity rather than cloning tracks.',
    'Verify a rename is visible through every remaining reference while removals and deletion affect only the targeted playlist.',
    'Test empty input, deleted-source rejection, stable order and two distinct same-title tracks; use == for the identity assertions.',
    'Show the saved list is unmodifiable and detached in membership while its Track elements remain mutable and shared.',
    'State the domain whole/part meaning and deletion policy explicitly; do not present them as universal shared-aggregation or garbage-collection rules.',
  ],
  pitfalls: [
    'A List<Track> field demonstrates storage, not automatically UML aggregation. Name the intended whole, parts and domain rules.',
    'Creating a part outside a constructor is not a definition of aggregation; creation location alone cannot establish ownership.',
    'Shared aggregation does not mean every model must allow a part in arbitrarily many wholes. Multiplicity and domain validation remain separate decisions.',
    'List.copyOf is shallow. Unmodifiable membership does not stop mutation through an element reference, and saved membership can become historical.',
    'This example’s duplicate rule relies on Track not overriding equals. A later equality implementation would require reviewing contains and remove.',
    'There is no reverse Track-to-Playlist index, concurrency protocol, persistence or track-retirement policy in this example.',
  ],
  module: {
    path: '/parking',
    title: 'Inspect floor membership and the spot index in Parking Lot',
    text: 'Floor holds a List<ParkingSpot>. ParkingLotRepository.addFloor places each existing spot into a separate ID index, so getAllFloors and getAvailableSpots can reach the same mutable spot object. The focused lesson test verifies that identity and demonstrates that clearing a floor’s list does not remove the separately indexed spot. This is evidence of shared references and independently maintained membership, not proof that one physical spot should belong to several floors. The models expose setters and mutable lists; the floor number field is not an enforced ownership boundary. These sources provide no floor-deletion cascade, exclusive-owner protocol or general lifecycle guarantee. Treat the playlist interpretation as a teaching model and use this module to audit which rules are actually implemented.',
    sources: [
      'backend/src/main/java/com/lld/parkinglot/model/Floor.java',
      'backend/src/main/java/com/lld/parkinglot/model/ParkingSpot.java',
      'backend/src/main/java/com/lld/parkinglot/repository/ParkingLotRepository.java',
      'backend/src/test/java/com/lld/learning/AggregationLessonExampleTest.java',
    ],
  },
  summaryPoints: [
    'Shared aggregation adds a domain whole/part interpretation to an association; its precise rules need agreement and documentation.',
    'Separate the whole marker, multiplicities, navigation, identity and mutation policy. None substitutes for enforcement in Java.',
    'In this example, playlist memberships can end independently of catalog tracks; shallow snapshots retain shared parts without owning their lifecycle.',
  ],
  references: [
    { title: 'OMG UML 2.5.1: Properties (§9.5.3) and Association notation (§11.5.4)', url: 'https://www.omg.org/spec/UML/2.5.1' },
    { title: 'Java 17 Language Specification: Objects and References (§4.3.1)', url: 'https://docs.oracle.com/javase/specs/jls/se17/html/jls-4.html#jls-4.3.1' },
    { title: 'Java 17 List.copyOf: unmodifiable lists and mutable elements', url: 'https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/List.html#copyOf(java.util.Collection)' },
    { title: 'Java 17 Language Specification: final Variables (§4.12.4)', url: 'https://docs.oracle.com/javase/specs/jls/se17/html/jls-4.html#jls-4.12.4' },
    { title: 'Java 17 Language Specification: Reachability (§12.6.1)', url: 'https://docs.oracle.com/javase/specs/jls/se17/html/jls-12.html#jls-12.6.1' },
  ],
};
