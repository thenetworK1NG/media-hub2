const clientId = 'd91f367c3a62465db529d844a632846b';
const redirectUri = 'https://thenetwork1ng.github.io/media-hub2/';
const scopes = [
    'user-read-playback-state',
    'user-modify-playback-state',
    'user-read-currently-playing',
    'streaming',
    'user-read-email',
    'user-read-private'
];

let accessToken = null;

function getLoginUrl() {
    return `https://accounts.spotify.com/authorize?client_id=${clientId}&response_type=token&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scopes.join('%20')}`;
}

function getHashParams() {
    const hash = window.location.hash.substring(1);
    const params = {};
    hash.split('&').forEach(kv => {
        const [key, value] = kv.split('=');
        params[key] = value;
    });
    return params;
}

function showPlayer() {
    document.getElementById('login-btn').style.display = 'none';
    document.getElementById('controls').style.display = 'block';
    fetchCurrentTrack();
}

function fetchCurrentTrack() {
    fetch('https://api.spotify.com/v1/me/player/currently-playing', {
        headers: {
            'Authorization': 'Bearer ' + accessToken
        }
    })
    .then(res => res.json())
    .then(data => {
        if (data && data.item) {
            document.getElementById('album-art').src = data.item.album.images[0].url;
            document.getElementById('track-name').textContent = data.item.name;
            document.getElementById('artist-name').textContent = data.item.artists.map(a => a.name).join(', ');
        }
    });
}

function playTrack() {
    fetch('https://api.spotify.com/v1/me/player/play', {
        method: 'PUT',
        headers: {
            'Authorization': 'Bearer ' + accessToken
        }
    });
}

function pauseTrack() {
    fetch('https://api.spotify.com/v1/me/player/pause', {
        method: 'PUT',
        headers: {
            'Authorization': 'Bearer ' + accessToken
        }
    });
}

function nextTrack() {
    fetch('https://api.spotify.com/v1/me/player/next', {
        method: 'POST',
        headers: {
            'Authorization': 'Bearer ' + accessToken
        }
    }).then(fetchCurrentTrack);
}

function prevTrack() {
    fetch('https://api.spotify.com/v1/me/player/previous', {
        method: 'POST',
        headers: {
            'Authorization': 'Bearer ' + accessToken
        }
    }).then(fetchCurrentTrack);
}

document.getElementById('login-btn').onclick = function() {
    window.location = getLoginUrl();
};

document.getElementById('play-btn').onclick = playTrack;
document.getElementById('pause-btn').onclick = pauseTrack;
document.getElementById('next-btn').onclick = nextTrack;
document.getElementById('prev-btn').onclick = prevTrack;

window.onload = function() {
    const params = getHashParams();
    if (params.access_token) {
        accessToken = params.access_token;
        showPlayer();
    }
};
