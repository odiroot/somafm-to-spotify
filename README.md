# songs-to-spotify
Prepare Spotify playlist from songs played on Internet radio.

## Running

1. Install dependencies:

    npm install

2. Run track information dumper on a SHOUTCast source to gather a playlist:

    node src/dumper.js -u http://<shoutcast_server>/played.html -o playlist.txt

3. Set environment variables to authentice with your Spotify account:
    
    export SPOTIFY_CLIENT_ID=<your_spotify_client_id>
    export SPOTIFY_CLIENT_SECRET=<your_spotify_client_secret>
    export SPOTIFY_REFRESH_TOKEN=<spotify_api_refresh_token>

4. Sync your local playlist with one in your Spotify account:

    node src/syncer.js -p <spotify_playlist_name> -i playlist.txt

