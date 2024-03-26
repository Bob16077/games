let score = 0,
    round = 0,
    currentLocation = null,
    canGuess = false,
    guesses = [],
    guessMap,
    map,
    marker,
    guessMarker,
    correctMarker,
    polyline,
    roundCompleted = false,
    overlay = document.querySelector('.overlay');
overlay.style.display = 'none';

function initMap() {
    if (guessMarker) map.removeLayer(guessMarker);
    if (correctMarker) map.removeLayer(correctMarker);
    if (polyline) map.removeLayer(polyline);
    if (marker) guessMap.removeLayer(marker);

    if (!map) {
        map = L.map('map', { attributionControl: false, maxBoundsViscosity: 1.0 });
        L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}').addTo(map);
    }

    if (!guessMap) {
        guessMap = L.map('guess-map', { maxZoom: 18 }).setView([0, 0], 2);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
        }).addTo(guessMap);

        guessMap.on('click', function (e) {
            if (marker) guessMap.removeLayer(marker);
            canGuess = true;
            marker = L.marker(e.latlng, {
                icon: L.icon({
                    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
                    iconSize: [25, 41],
                    iconAnchor: [12, 41],
                    popupAnchor: [1, -34]
                })
            }).addTo(guessMap);
        });
    }

    map.setView(currentLocation, 10);
    map.setMaxBounds(map.getBounds());
    map.setMinZoom(10);
    map.setMaxZoom(15);
}

function handleGuess() {
    canGuess = false;
    roundCompleted = true;
    if (!marker) {
        displayPopup('Please mark a position on the map first.', true);
        return;
    }

    const correct = L.latLng(currentLocation);
    const guessed = marker.getLatLng();
    const distance = correct.distanceTo(guessed);
    const rawScore = 1 - distance / 20037500;
    const roundScore = Math.ceil(rawScore * rawScore * rawScore * 1000);
    score += roundScore;

    document.getElementById('score').textContent = `Score: ${score.toLocaleString('en')} / 5,000`;

    generatePoints(guessed, correct);
    map.setMinZoom(null);
    map.setMaxBounds(null);
    map.flyToBounds([guessed, correct], { padding: [50, 50] });
    document.getElementById('guessMap').style.display = 'none';

    displayPopup(`You were ${Math.round(distance).toLocaleString('en')} meters off and scored ${roundScore.toLocaleString('en')} points out of 1,000.`, false, true);
    guesses.push({
        round: round,
        correct: currentLocation,
        guessed: guessed,
        distance: distance,
        score: roundScore
    });
}

function endGame() {
    document.getElementById('guessMap').style.display = 'none';
    document.getElementById('round').textContent = 'Game Over';
    document.getElementById('popup').innerHTML = `<h1>Game Over</h1><p>Your final score is ${score.toLocaleString(
        'en'
    )} / 5,000</p><br><button onclick="location.reload()">New Game</button>`;
    const bounds = L.latLngBounds();
    guesses.forEach((guess) => {
        bounds.extend(guess.correct);
        bounds.extend(guess.guessed);
        generatePoints(guess.guessed, guess.correct);
    });
    map.flyToBounds(bounds, {
        padding: [50, 50]
    });
    document.getElementById('popupWrapper').style.display = 'block';
    overlay.style.display = 'block';
}

function initRound() {
    round++;
    if (round > 5) return endGame();
    roundCompleted = false;
    document.getElementById('guessMap').style.display = 'block';
    document.getElementById('round').textContent = `Round: ${round} / 5`;

    getRandomPoint();
    initMap();
}
initRound();

function generatePoints(guessed, correct) {
    guessMarker = L.marker(guessed, {
        icon: L.icon({
            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34]
        }),
        title: 'Your Guess'
    }).addTo(map);
    correctMarker = L.marker(correct, {
        icon: L.icon({
            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34]
        }),
        title: 'Correct Location'
    }).addTo(map);
    polyline = L.polyline([guessed, correct], {
        color: 'red',
        dashArray: '10, 8'
    }).addTo(map);
}

document.getElementById('guess-button').addEventListener('click', handleGuess);

function displayPopup(message, deleteAfter, button) {
    var popupWrapper = document.getElementById('popupWrapper');
    var popup = document.getElementById('popup');

    if (button) {
        popup.innerHTML = message + '<br><button onclick="removePopup();">Next Round</button>';
    } else popup.innerHTML = message;
    popupWrapper.style.display = 'block';
    overlay.style.display = 'block';

    setTimeout(function () {
        if (deleteAfter) removePopup();
    }, 4000);
}

function removePopup() {
    popupWrapper.style.display = 'none';
    overlay.style.display = 'none';
    if (roundCompleted && round <= 5) initRound();
}
