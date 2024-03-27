let score = 0,
    round = 0,
    currentEvent = null,
    canGuess = false,
    guesses = [],
    map,
    marker,
    guessMarker,
    correctMarker,
    polyline,
    roundCompleted = false,
    correctIndex,
    overlay = document.querySelector('.overlay');
overlay.style.display = 'none';

function resetMap() {
    if (guessMarker) map.removeLayer(guessMarker);
    if (correctMarker) map.removeLayer(correctMarker);
    if (polyline) map.removeLayer(polyline);
    if (marker) map.removeLayer(marker);

    if (!map) {
        map = L.map('map', { maxZoom: 18 }).setView([0, 0], 2);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
        }).addTo(map);

        map.on('click', function (e) {
            if (marker) map.removeLayer(marker);
            canGuess = true;
            marker = L.marker(e.latlng).addTo(map);
        });
    }
}

function handleGuess() {
    canGuess = false;
    roundCompleted = true;
    if (!marker) {
        displayPopup('Please mark a position on the map first.', true);
        return;
    }

    const correctLocation = L.latLng(currentEvent.location);
    const guessedLocation = marker.getLatLng();
    const distance = correctLocation.distanceTo(guessedLocation);
    const rawLocationScore = distance / 20037500;
    const roundLocationScore = 1000 - Math.floor(rawLocationScore * rawLocationScore * rawLocationScore * 1000);

    const roundScore = roundLocationScore;
    score += roundScore;

    document.getElementById('score').textContent = `Score: ${score.toLocaleString('en')} / 5,000`;

    generatePoints(guessedLocation, correctLocation);
    map.flyToBounds([guessedLocation, correctLocation], { padding: [50, 50] });

    displayPopup(`You were ${Math.round(distance).toLocaleString('en')} meters off and scored ${roundScore.toLocaleString('en')} points out of 1,000.`, false, true);
    guesses.push({
        round,
        correct: correctLocation,
        guessed: guessedLocation,
        distance: distance,
        score: roundScore
    });
}

function endGame() {
    document.getElementById('guessMap').style.display = 'none';
    document.getElementById('round').textContent = 'Game Over';
    document.getElementById('popup').innerHTML = `<h1>Game Over</h1><p>Your final score is ${score.toLocaleString(
        'en'
    )} / 15,000</p><br><button onclick="location.reload()">New Game</button>`;
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
    canGuess = true;
    if (round > 5) return endGame();
    roundCompleted = false;
    document.getElementById('map').style.display = 'block';
    document.getElementById('round').textContent = `Round: ${round} / 5`;

    currentEvent = getRandomEvent();
    const allOptions = getCloseEvents(new Date(currentEvent.date).getFullYear());
    correctIndex = Math.floor(Math.random() * 4);
    for (let i = 0; i < 4; i++) {
        if (i === correctIndex) {
            // document.getElementById(`option${i + 1}`).textContent = currentEvent.name;
        } else {
            // document.getElementById(`option${i + 1}`).textContent = allOptions[0].name;
            allOptions.shift();
        }
    }

    document.getElementById('image').src = currentEvent.image;

    resetMap();
}

function startGame() {
    showMenu();
    initRound();
}
startGame();

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

function showMenu() {
    // displayPopup(
    //     `<h2>Welcome to SatelliteSeeker!</h2>
    // <h3 style="text-align:left">How to Play:</h3>
    // <p style="text-align:left">
    // Study the Satellite Image: Examine the zoomed-in satellite image provided. Look for distinctive landmarks, terrains, or other identifiable features.
    // <br><br>
    // Make Your Guess: Use the freely maneuverable map to pinpoint your location based on the details you observed in the satellite image. Zoom in, zoom out, and move around to find the perfect match.
    // <br><br>
    // Submit Your Guess: Once you're confident about your location, submit your guess by marking it on the map.
    // <br><br>
    // Score Points: The closer your guess is to the actual location, the more points you'll earn! Challenge yourself to get as close as possible for maximum points.
    // <br><br>
    // Repeat and Compete: Test your skills across multiple rounds and challenge your friends to see who can become the ultimate SatelliteSeeker!
    // <br><br>
    // Are you ready to explore and guess your way to victory? Let's begin!</p>`,
    //     false,
    //     null
    // );
}

document.getElementById('guess-button').addEventListener('click', handleGuess);

function displayPopup(message, deleteAfter, button) {
    var popupWrapper = document.getElementById('popupWrapper');
    var popup = document.getElementById('popup');

    if (button) {
        popup.innerHTML = message + '<br><button onclick="removePopup();">Next Round</button>';
    } else if (button == null) {
        popup.innerHTML = message + '<br><button onclick="removePopup();">Start Game</button>';
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
    if (roundCompleted && round <= 5 && (round != 1 || !canGuess)) initRound();
}

const image = document.getElementById('image');
panzoom(image, {
    bounds: true,
    contain: 'inside',
    minZoom: 1,
    maxZoom: 5
});
