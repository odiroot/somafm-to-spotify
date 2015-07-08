const Spotify = require("spotify-web-api-node");


const api = new Spotify({
    clientId: process.env.SPOTIFY_CLIENT_ID,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
    accessToken:  process.env.SPOTIFY_ACCESS_TOKEN,
    refreshToken: process.env.SPOTIFY_REFRESH_TOKEN,
    redirectUri: "http://www.example.com/callback"
});


// XXX: Static data for development.
const SONG_META = {
        artist: "ABC",
        title: "The Look of Love"
    },
    PLAYLIST_NAME = "My 80s",
    USER_ID = "odiroot";


// Get first song found for given meta data.
function findSong(meta) {
    const query = `${meta.artist} - ${meta.title}`;

    return api.searchTracks(query).then(function(data) {
        const results = data.body.tracks.items;
        if(!!results) {
            return results[0];
        }
    });
}


function findPlaylist(name) {
    return api.getUserPlaylists(USER_ID)
        .then((data) => data.body.items)
        .then(playlists => playlists.find(
            list => list.name === name
        ));
}


// Combine playlist tracks from all pages.
function getAllPlaylistTracks(id) {
    // Fetch page and move forward if not the last.
    function _fetch(offset=0, store=[]) {
        return api.getPlaylistTracks(USER_ID, id, { offset })
            .then(function(data) {
                let {items, next, limit} = data.body;
                store = [...store, ...items];

                // Still more songs to fetch.
                if(!!next) {
                    return _fetch(offset + limit, store);
                } else {
                    return store;
                }
            });
    }

    // Start with first page.
    return _fetch();
}


function getPlaylistContent(name) {
    return findPlaylist(name)
        .then(list => getAllPlaylistTracks(list.id));
}

// XXX: Really inefficient - just PoC.
function _isSongInPlaylist(songMeta, playlistName) {
    return Promise.all([
        findSong(songMeta),
        getPlaylistContent(playlistName)
    ]).then(function([song, content]) {
        // For faster lookup.
        const contentIds = new Set(
            content.map(s => s.track.id)
        );

        return contentIds.has(song.id);
    });
}
// TODO: Either memoization for heavy lookups / cache in state.


module.exports = function run() {
    // api.refreshAccessToken()
    //     .then((data) => console.log(data.body));

    _isSongInPlaylist(SONG_META, PLAYLIST_NAME).then(
        result => console.log(`${SONG_META.artist} - ${SONG_META.title}
                              in ${PLAYLIST_NAME}:`, result),
        err => console.error(err)
    );
};
