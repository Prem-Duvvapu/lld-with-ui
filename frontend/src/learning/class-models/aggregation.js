export default {
  title: 'Playlist shared aggregation',
  summary: 'The playlist domain explicitly allows one catalog Track to participate in multiple playlists without owning its existence.',
  classes: [{
    name: 'Playlist', kind: 'public final class', source: 'aggregation/Playlist.java', description: 'Controls membership and logical playlist deletion.',
    fields: ['- name: String {final}', '- tracks: List<Track> {final}', '- deleted: boolean'],
    methods: ['+ Playlist(name: String)', '+ getName(): String', '+ isDeleted(): boolean', '+ getTracks(): List<Track>', '+ add(track: Track): void', '+ remove(track: Track): boolean', '+ delete(): void', '- requireActive(): void', '- requireTrack(track: Track): void {static}'],
  }, {
    name: 'Track', kind: 'public final class', source: 'aggregation/Track.java', description: 'A catalog object with independently mutable title.',
    fields: ['- title: String'], methods: ['+ Track(title: String)', '+ getTitle(): String', '+ rename(title: String): void'],
  }],
  relationships: [{ from: 'Playlist', to: 'Track', kind: 'Shared aggregation', explanation: 'Playlist is the whole for membership; Track is a shared part. add rejects null and duplicate identity within one playlist. remove and delete change membership only; a catalog track remains usable in other playlists and through saved references.', multiplicity: 'Each playlist → 0..* tracks; each track ← 0..* playlists.', navigation: 'Playlist → tracks via its list/getTracks. Track stores no reverse playlist links.' }],
  notes: ['The shared-part interpretation comes from this domain’s sharing and playlist-only deletion rules, not from List or final syntax.', 'getTracks returns detached unmodifiable membership with the same mutable Track elements. Renaming a shared track is visible through all aliases.', 'delete is logical state change, not JVM destruction. No exclusive ownership or concurrent mutation guarantees are implied.'],
};
