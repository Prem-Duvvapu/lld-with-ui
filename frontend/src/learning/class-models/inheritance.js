export default {
  title: 'Resource inheritance and a retained link',
  summary: 'InheritanceVideo is a resource; InheritancePlaylist instead holds a required next resource.',
  classes: [{
    name: 'InheritanceResource', kind: 'public class', source: 'inheritance/InheritanceResource.java', description: 'Stores a validated title and supplies a basic description.',
    fields: ['- title: String {final}'], methods: ['+ InheritanceResource(title: String, trace: List<String>)', '+ getTitle(): String {final}', '+ describe(): String'],
  }, {
    name: 'InheritanceVideo', kind: 'public final class', source: 'inheritance/InheritanceVideo.java', description: 'Adds a positive duration and overrides description.',
    fields: ['- minutes: int {final}'], methods: ['+ InheritanceVideo(title: String, minutes: int, trace: List<String>)', '+ getMinutes(): int', '+ describe(): String'],
  }, {
    name: 'InheritancePlaylist', kind: 'public final class', source: 'inheritance/InheritancePlaylist.java', description: 'Delegates describeNext through its required resource field.',
    fields: ['- next: InheritanceResource {final}'], methods: ['+ InheritancePlaylist(next: InheritanceResource)', '+ describeNext(): String'],
  }],
  relationships: [{ from: 'InheritanceVideo', to: 'InheritanceResource', kind: 'Generalization', explanation: 'extends makes a video usable through the resource type. describe overrides; getTitle is inherited unchanged.' }, { from: 'InheritancePlaylist', to: 'InheritanceResource', kind: 'Association', explanation: 'The constructor rejects null and stores next. Multiple playlists may receive the same resource; there is no exclusive ownership or deletion protocol.', multiplicity: 'Each playlist → exactly 1 resource; each resource ← 0..* playlists.', navigation: 'Playlist → resource through next. Resource stores no reverse playlist link.' }],
  notes: ['The playlist is not a resource subtype. A has-a field does not by itself establish UML composition.', 'Base title remains private, accessible through inherited getTitle. Only declarations on each type are listed.', 'trace parameters and demo methods are omitted from relationships. An extends declaration alone does not certify behavioral substitutability.'],
};
