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
    PLAYLIST_NAME = "80s dev",
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

/* TODO: Wrapping this up.
    0.1. Refresh access token on startup.
    0.2. Fetch user object for user ID (optionally use parameter).

    1. Prepare context (ugh, state!) with target playlist songs.
        1.1. Possibly throw the playlist content into map (by id).
    2. Look for songs by their metadata.
    3. Check found song ID (in-memory) against playlist content.
        3.1. Gather together songs missing from playlist.
    4. Add missing songs in bulk to the playlist.

    5*. Separate source playlist from target playlist.
    6*. Check against both source and target playlist (avoid adding duplicates).

    7. Add CLI arguments.
        7.1. Song list input file.
        7.2. Target playlist name.
        7.3. Source playlist name.
        7.4. Optional username.
*/


module.exports = function run() {
    // api.refreshAccessToken()
    //     .then((data) => console.log(data.body));

    _isSongInPlaylist(SONG_META, PLAYLIST_NAME).then(
        result => {
            if(result) {
                console.log("Song already in playlist");
            } else {
                console.log("TODO: Add song to the playlist.");
            }
        },
        err => console.error(err)
    );
};
