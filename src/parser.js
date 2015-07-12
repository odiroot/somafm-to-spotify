const cheerio = require("cheerio");


function loadSource(html) {
    const $ = cheerio.load(html);
    return $;
}

// Adjusted for SHOUTcast format.
function getRows($) {
    // TODO: Add option for variable selector.
    const rows = $("table").eq(2).find("tr").slice(1);
    return rows;
}

function extractTrackInfo(row, $) {
    const text = $("td", row).eq(1).text(),
        [artist, title] = text.split("-");

    if(!artist || !title) {
        return null;
    }

    return {
        artist: artist.trim(),
        title: title.trim()
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
