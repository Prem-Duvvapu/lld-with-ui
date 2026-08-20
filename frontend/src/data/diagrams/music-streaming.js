// classDiagrams — musicStreaming
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.

export default {
  title: 'Music Streaming — Class Diagram',
  classes: [
    {
      name: 'Song',
      fields: [
        '- id: String',
        '- title: String',
        '- duration: int',
        '- album: Album',
        '- artists: List<Artist>',
        '- genre: String',
        '- playCount: int'
      ],
      methods: [
        '+ play(): void',
        '+ addToPlaylist(playlist): void'
      ]
    },
    {
      name: 'Album',
      fields: [
        '- id: String',
        '- title: String',
        '- artist: Artist',
        '- releaseYear: int',
        '- songs: List<Song>',
        '- coverArt: String'
      ],
      methods: [
        '+ addSong(song): void',
        '+ getDuration(): int'
      ]
    },
    {
      name: 'Artist',
      fields: [
        '- id: String',
        '- name: String',
        '- bio: String',
        '- albums: List<Album>',
        '- monthlyListeners: int'
      ],
      methods: [
        '+ releaseAlbum(title, songs): Album',
        '+ getTopSongs(n): List<Song>'
      ]
    },
    {
      name: 'Playlist',
      fields: [
        '- id: String',
        '- name: String',
        '- owner: User',
        '- songs: List<Song>',
        '- isPublic: boolean'
      ],
      methods: [
        '+ addSong(song): void',
        '+ removeSong(song): void',
        '+ shuffle(): void'
      ]
    },
    {
      name: 'User',
      fields: [
        '- id: String',
        '- name: String',
        '- email: String',
        '- subscription: Subscription',
        '- playlists: List<Playlist>',
        '- likedSongs: List<Song>'
      ],
      methods: [
        '+ createPlaylist(name): Playlist',
        '+ likeSong(song): void',
        '+ getRecommendedSongs(): List<Song>'
      ]
    },
    {
      name: 'Subscription',
      fields: [
        '- id: String',
        '- user: User',
        '- plan: SubscriptionPlan',
        '- startDate: LocalDate',
        '- renewalDate: LocalDate',
        '- isActive: boolean'
      ],
      methods: [
        '+ activate(): void',
        '+ cancel(): void',
        '+ upgrade(newPlan): void'
      ]
    },
    {
      name: 'SubscriptionPlan',
      stereotype: 'enum',
      fields: [
        'FREE',
        'PREMIUM',
        'FAMILY',
        'STUDENT'
      ],
      methods: []
    }
  ],
  relationships: [
    {
      from: 'Album',
      to: 'Song',
      label: 'contains'
    },
    {
      from: 'Album',
      to: 'Artist',
      label: 'by'
    },
    {
      from: 'Song',
      to: 'Artist',
      label: 'performed by'
    },
    {
      from: 'Playlist',
      to: 'Song',
      label: 'contains'
    },
    {
      from: 'Playlist',
      to: 'User',
      label: 'owned by'
    },
    {
      from: 'User',
      to: 'Subscription',
      label: 'has'
    },
    {
      from: 'Subscription',
      to: 'SubscriptionPlan',
      label: 'has plan'
    }
  ]
};
