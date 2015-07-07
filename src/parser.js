const cheerio = require("cheerio");


function loadSource(html) {
    const $ = cheerio.load(html);
    return $;
}

function getRows($) {
    const rows = $("table tr").slice(2);
    return rows;
}

function extractTrackInfo(row, $) {
    const artist = $("td", row).eq(1).find("a").text(),
        title = $("td", row).eq(2).text(),
        album = $("td", row).eq(3).find("a").text();

    if(!artist) {
        return null;
    }

    return {
        artist: artist,
        title: title,
        album: album
    };
}

function process(html) {
    const dom = loadSource(html),
        rows = getRows(dom),
        songs = rows.map((i, row) => extractTrackInfo(row, dom));

    // Strip jQuery cruft.
    return [...songs];
}


module.exports = process;
