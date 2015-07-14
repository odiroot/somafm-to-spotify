const Spotify = require("spotify-web-api-node");

const api = new Spotify({
    clientId: process.env.SPOTIFY_CLIENT_ID,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
    accessToken:  process.env.SPOTIFY_ACCESS_TOKEN,
    refreshToken: process.env.SPOTIFY_REFRESH_TOKEN,
    redirectUri: "http://www.example.com/callback"
});

const argv = require("minimist")(process.argv.slice(2), {
    string: ["input", "playlist", "user"],
    alias: {
        "i": "input",  // Song list - JSON separated by newlines.
        "p": "playlist",  // Spotify playlist to save to.
        "u": "user"  // Spotify user ID.
    },
    default: {
        "input": "./songs.txt"
    }
});


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


function findPlaylist(user, name) {
    return api.getUserPlaylists(user)
        .then(data => data.body.items.find(
            list => list.name === name
        ));
}


// Combine playlist tracks from all pages.
function getAllPlaylistTracks(playlist) {
    // Fetch page and move forward if not the last.
    function _fetch(offset=0, store=[]) {
        return api.getPlaylistTracks(playlist.owner.id, playlist.id, { offset })
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


function getPlaylistWithContent(user, name) {
    return findPlaylist(user, name).then(
        playlist => getAllPlaylistTracks(playlist).then(
            content => ({ playlist, content })
        )
    );
}


function addToPlaylist(playlist, songs) {
    // Ignore empty results.
    const newUris = songs
        .filter(s => !!s)
        .map(s => s.uri);

    // Nothing to do
    if(!newUris.length) {
        return 0;
    }

    return api.addTracksToPlaylist(playlist.owner.id, playlist.id, newUris)
        .then(() => newUris.length);
}


function isSongNew(known, meta) {
    return findSong(meta).then(track => {
        if(!known.has(track.id)) {
            return track;
        }
    });
}


function updatePlaylist(user, name, songs) {
    return getPlaylistWithContent(user, name).then(({playlist, content}) => {
        const knownIds = new Set(
            content.map(t => t.track.id)
        );

        // Gather discovered songs.
        const found = songs.map(
            desc => isSongNew(knownIds, desc)
        );

        return Promise.all(found).then(
            values => addToPlaylist(playlist, values)
        );
    });
}


function loadSongsMeta() {
    // TODO: Implement actual reading from file.
    // const input = argv.input;
    return Promise.resolve([
        {
            "artist": "ABC",
            "title": "The Look of Love"
        },
        {
            "artist": "Spandau Ballet",
            "title": "True"
        }
    ]);
}


function getPreferredUser() {
    // Use custom if provided
    if(!!argv.user) {
        return Promise.resolve(argv.user);
    } else {
        return api.getMe().then(data => data.body.id);
    }
}


module.exports = function run() {
    if(!argv.playlist) {
        throw new Error("Please provide playlist name.");
    }

    const pInput = loadSongsMeta();

    // Refresh the access token just to be sure.
    const pUser = api.refreshAccessToken().then(data => {
        api.setAccessToken(data.body["access_token"]);
        // We need user ID to access playlists.
        return getPreferredUser();
    });

    Promise.all([pInput, pUser]).then(([songs, user]) => {
        return updatePlaylist(user, argv.playlist, songs);
    }).then(
        count => console.log("Success! Added songs:", count),
        err => console.error("Error in sync process:", err)
    );
};
