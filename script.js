// Song search functionality
document.getElementById('song-search-btn').onclick = searchSongs;
document.getElementById('song-search-input').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') searchSongs();
});

async function searchSongs() {
    const query = document.getElementById('song-search-input').value.trim();
    if (!query) return;
    const results = await spotifyApi(`search?q=${encodeURIComponent(query)}&type=track&limit=20`);
    const list = document.getElementById('track-list');
    list.innerHTML = '';
    if (results.tracks && results.tracks.items.length > 0) {
        results.tracks.items.forEach(track => {
            const li = document.createElement('li');
            li.textContent = `${track.name} - ${track.artists.map(a => a.name).join(', ')}`;
            li.onclick = () => playTrack(track.uri);
            list.appendChild(li);
        });
    } else {
        const li = document.createElement('li');
        li.textContent = 'No results found.';
        list.appendChild(li);
    }
}
// Spotify API credentials
const clientId = 'd91f367c3a62465db529d844a632846b';
const redirectUri = window.location.origin + window.location.pathname;
let accessToken = '';

// PKCE helpers
function generateCodeVerifier(length = 128) {
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    let codeVerifier = '';
    for (let i = 0; i < length; i++) {
        codeVerifier += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return codeVerifier;
}

async function generateCodeChallenge(codeVerifier) {
    const data = new TextEncoder().encode(codeVerifier);
    const digest = await window.crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode(...new Uint8Array(digest)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

// Auth flow
async function loginWithSpotify() {
    const codeVerifier = generateCodeVerifier();
    localStorage.setItem('code_verifier', codeVerifier);
    const codeChallenge = await generateCodeChallenge(codeVerifier);
    const scope = 'user-read-playback-state user-modify-playback-state user-read-currently-playing playlist-read-private playlist-read-collaborative';
    const authUrl = `https://accounts.spotify.com/authorize?response_type=code&client_id=${clientId}&scope=${encodeURIComponent(scope)}&redirect_uri=${encodeURIComponent(redirectUri)}&code_challenge_method=S256&code_challenge=${codeChallenge}`;
    window.location = authUrl;
}

document.getElementById('login-btn').onclick = loginWithSpotify;

// Handle redirect
async function handleRedirect() {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (!code) return;
    const codeVerifier = localStorage.getItem('code_verifier');
    const body = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        code_verifier: codeVerifier
    });
    const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body
    });
    const data = await response.json();
    accessToken = data.access_token;
    window.history.replaceState({}, document.title, redirectUri);
    document.getElementById('login-btn').style.display = 'none';
    document.getElementById('player-main').style.display = 'block';
    loadUserPlaylists();
    getCurrentPlayback();
}

handleRedirect();

// Spotify API helpers
async function spotifyApi(endpoint, method = 'GET', body = null) {
    const url = `https://api.spotify.com/v1/${endpoint}`;
    const options = {
        method,
        headers: { 'Authorization': `Bearer ${accessToken}` }
    };
    if (body) {
        options.headers['Content-Type'] = 'application/json';
        options.body = JSON.stringify(body);
    }
    const res = await fetch(url, options);
    return await res.json();
}

// Load playlists
async function loadUserPlaylists() {
    const playlists = await spotifyApi('me/playlists');
    const list = document.getElementById('playlist-list');
    list.innerHTML = '';
    // Only user playlists
    playlists.items.forEach(pl => {
        const li = document.createElement('li');
        li.textContent = pl.name;
        li.onclick = () => loadPlaylistTracks(pl.id);
        list.appendChild(li);
    });
    // Load liked songs into its own section
    loadLikedSongs();
}

// Load tracks from playlist
async function loadPlaylistTracks(playlistId) {
    const tracks = await spotifyApi(`playlists/${playlistId}/tracks`);
    const list = document.getElementById('track-list');
    list.innerHTML = '';
    tracks.items.forEach(item => {
        const track = item.track;
        const li = document.createElement('li');
        li.textContent = `${track.name} - ${track.artists.map(a => a.name).join(', ')}`;
        li.onclick = () => playTrack(track.uri);
        list.appendChild(li);
    });
}

// Load liked songs
async function loadLikedSongs() {
    const liked = await spotifyApi('me/tracks?limit=50');
    const likedList = document.getElementById('liked-list');
    likedList.innerHTML = '';
    liked.items.forEach(item => {
        const track = item.track;
        const li = document.createElement('li');
        li.textContent = `${track.name} - ${track.artists.map(a => a.name).join(', ')}`;
        li.onclick = () => playTrack(track.uri);
        likedList.appendChild(li);
    });
}

// Playback controls
async function playTrack(uri) {
    await spotifyApi('me/player/play', 'PUT', { uris: [uri] });
    // Wait a moment for Spotify to update playback, then refresh info
    setTimeout(getCurrentPlayback, 700);
}
async function nextTrack() {
    await spotifyApi('me/player/next', 'POST');
    getCurrentPlayback();
}
async function prevTrack() {
    await spotifyApi('me/player/previous', 'POST');
    getCurrentPlayback();
}
async function pauseTrack() {
    await spotifyApi('me/player/pause', 'PUT');
    getCurrentPlayback();
}
async function resumeTrack() {
    await spotifyApi('me/player/play', 'PUT');
    getCurrentPlayback();
}

// Playback button event listeners
const playBtn = document.getElementById('play-btn');
const nextBtn = document.getElementById('next-btn');
const prevBtn = document.getElementById('prev-btn');
const repeatBtn = document.getElementById('repeat-btn');
const shuffleBtn = document.getElementById('shuffle-btn');

let isPlaying = false;

playBtn.onclick = async function() {
    if (isPlaying) {
        await pauseTrack();
    } else {
        await resumeTrack();
    }
};
nextBtn.onclick = nextTrack;
prevBtn.onclick = prevTrack;
repeatBtn.onclick = async function() {
    // Toggle repeat mode
    await spotifyApi('me/player/repeat?state=context', 'PUT');
    getCurrentPlayback();
};
shuffleBtn.onclick = async function() {
    // Toggle shuffle mode
    await spotifyApi('me/player/shuffle?state=true', 'PUT');
    getCurrentPlayback();
};

// Playback info
async function getCurrentPlayback() {
    const playback = await spotifyApi('me/player');
    if (!playback || !playback.item) return;
    // Update footer info
    document.getElementById('track-name').textContent = playback.item.name;
    document.getElementById('artist-name').textContent = playback.item.artists.map(a => a.name).join(', ');
    document.getElementById('current-time').textContent = formatTime(playback.progress_ms);
    document.getElementById('duration').textContent = formatTime(playback.item.duration_ms);
    // Update main player info
    document.getElementById('track-name-main').textContent = playback.item.name;
    document.getElementById('artist-name-main').textContent = playback.item.artists.map(a => a.name).join(', ');
    document.getElementById('album-art').src = playback.item.album.images[0]?.url || '';
    document.getElementById('player-main').style.display = 'block';
    isPlaying = playback.is_playing;
    // Change play button icon
    const playIcon = playBtn.querySelector('i');
    if (isPlaying) {
        playIcon.classList.remove('fa-play');
        playIcon.classList.add('fa-pause');
    } else {
        playIcon.classList.remove('fa-pause');
        playIcon.classList.add('fa-play');
    }
}

function formatTime(ms) {
    const min = Math.floor(ms / 60000);
    const sec = Math.floor((ms % 60000) / 1000);
    return `${min}:${sec.toString().padStart(2, '0')}`;
}
