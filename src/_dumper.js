const fs = require("fs"),
    request = require("request-promise"),
    runInterval = require("runinterval");

const parser = require("./parser"),
    argv = require("minimist")(process.argv.slice(2), {
        string: ["station", "output", "interval"],
        alias: {
            "u": "url",  // The URL of song history page.
            "o": "output",  // File to write to.
            "i": "interval"  // Time between history refreshes.
        },
        default: {
            "output": null,
            "interval": null
        }
    });


function fetch() {
    if(!argv.url) {
        throw new Error("Song history page URL not provided");
    }

    return request({
            uri: argv.url,
            headers: {
                "User-Agent": "Mozilla/5.0"
            }
        })
        .catch(console.error);
}


function getCurrentPlaylist() {
    return fetch().then(parser);
}

function getKey(song) {
    return `${song.artist} - ${song.title}`;
}

function registerSongs(store, songs) {
    let fresh = [];

    for(let song of songs) {
        let key = getKey(song);

        if(!store.has(key)) {  // New song!
            fresh.push(song);
            store.add(key);
        }
    }

    return fresh;
}

function watcher(store, callback) {
    console.error("Fetching playlist state...");

    getCurrentPlaylist()
        .then((songs) => registerSongs(store, songs))
        .then(callback);
}

function writer(newSongs) {
    if(!newSongs.length) {
        return console.error("No new songs");
    }

    // Every line is a JSON of a single song.
    let lines = newSongs.map(JSON.stringify),
        content = lines.join("\n") + "\n";

    if(!!argv.output) {
        console.error(`Writing ${newSongs.length} fresh songs`);
        fs.appendFile(argv.output, content);
    }
    console.log(content);
}

function readInitial() {
    let content,
        store = new Set();

    try {
        content = fs.readFileSync(argv.output, {encoding: "utf8"});
    } catch(e) {
        return store;
    }

    for(let line of content.trim().split("\n")) {
        let song = JSON.parse(line);
        store.add(getKey(song));
    }
    return store;
}

function run() {
    let seen = readInitial();

    if(seen.length) {
        console.error(`Read ${seen.size} previously stored songs`);
    }

    // One shot.
    if(!argv.interval) {
        return watcher(seen, writer);
    } else {  
        let interval = Number.parseInt(argv.interval) * 1000;
    
        // Run continuously watching for new songs.
        runInterval(() => watcher(seen, writer), interval);
    }
}


module.exports = run;
