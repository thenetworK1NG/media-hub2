// Spotify API credentials
const clientId = 'd91f367c3a62465db529d844a632846b';
const redirectUri = window.location.origin + window.location.pathname;
const scopes = [
    'user-read-playback-state',
    'user-modify-playback-state',
    'user-read-currently-playing',
    'streaming',
    'user-read-email',
    'user-read-private'
];

let accessToken = null;

function getAccessTokenFromUrl() {
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    return params.get('access_token');
}

function loginWithSpotify() {
    const authUrl = `https://accounts.spotify.com/authorize?client_id=${clientId}&response_type=token&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes.join(' '))}`;
    window.location = authUrl;
}

document.getElementById('login-btn').onclick = loginWithSpotify;

window.onload = function() {
    accessToken = getAccessTokenFromUrl();
    if (accessToken) {
        document.getElementById('login-btn').style.display = 'none';
        document.getElementById('player').style.display = 'block';
        getCurrentTrack();
    }
};

function getCurrentTrack() {
    fetch('https://api.spotify.com/v1/me/player/currently-playing', {
        headers: {
            'Authorization': 'Bearer ' + accessToken
        }
    })
    .then(res => res.json())
    .then(data => {
        if (data && data.item) {
            document.getElementById('track-info').innerText = `${data.item.name} - ${data.item.artists.map(a => a.name).join(', ')}`;
        } else {
            document.getElementById('track-info').innerText = 'No track playing.';
        }
    });
}

function play() {
    fetch('https://api.spotify.com/v1/me/player/play', {
        method: 'PUT',
        headers: {
            'Authorization': 'Bearer ' + accessToken
        }
    }).then(getCurrentTrack);
}

function pause() {
    fetch('https://api.spotify.com/v1/me/player/pause', {
        method: 'PUT',
        headers: {
            'Authorization': 'Bearer ' + accessToken
        }
    }).then(getCurrentTrack);
}

function next() {
    fetch('https://api.spotify.com/v1/me/player/next', {
        method: 'POST',
        headers: {
            'Authorization': 'Bearer ' + accessToken
        }
    }).then(getCurrentTrack);
}

function previous() {
    fetch('https://api.spotify.com/v1/me/player/previous', {
        method: 'POST',
        headers: {
            'Authorization': 'Bearer ' + accessToken
        }
    }).then(getCurrentTrack);
}

document.getElementById('play-btn').onclick = play;
document.getElementById('pause-btn').onclick = pause;
document.getElementById('next-btn').onclick = next;
document.getElementById('prev-btn').onclick = previous;
