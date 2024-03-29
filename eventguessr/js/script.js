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
    overlay = document.getElementById('overlay'),
    popup = document.getElementById('popup'),
    quizContainer = document.getElementById('quiz'),
    slider = document.getElementById('year');

const menu = `<h2>EventGuessr</h2>
    <br />
    <p>Guess the event that took place at the location shown on the map.</p>
    <br />
    <button onclick="removePopup()">Start Game</button>`;

popup.innerHTML = menu;
document.body.classList.toggle('dark-mode');
slider.max = new Date().getFullYear();
slider.value = 1900 + Math.round((slider.max - 1900) / 2);

function resetMap() {
    if (guessMarker) map.removeLayer(guessMarker);
    if (correctMarker) map.removeLayer(correctMarker);
    if (polyline) map.removeLayer(polyline);
    if (marker) map.removeLayer(marker);

    if (!map) {
        map = L.map('map', { maxZoom: 18, attributionControl: false }).setView([0, 0], 2);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

        map.on('click', function (e) {
            if (marker) map.removeLayer(marker);
            canGuess = true;
            marker = L.marker(e.latlng).addTo(map);
        });
    }
}

function handleGuess() {
    if (roundCompleted == true) return initRound();
    canGuess = false;
    roundCompleted = true;
    window.scroll({
        top: 0,
        behavior: 'smooth'
    });
    const chosenName = quizContainer.querySelector('input[name="quiz"]:checked')?.value;

    if (!marker) {
        displayPopup('Please mark a position on the map first.', true);
        return;
    } else if (!slider.value) {
        displayPopup('Please choose a year on the slider first.', true);
        return;
    } else if (!chosenName) {
        displayPopup('Please choose an option for the event name first.', true);
        return;
    }

    const correctLocation = L.latLng([currentEvent.location[1], currentEvent.location[0]]);
    const guessedLocation = marker.getLatLng();
    const distance = correctLocation.distanceTo(guessedLocation);
    const rawLocationScore = distance / 20037500;
    const roundLocationScore = 1000 - Math.floor(rawLocationScore * rawLocationScore * rawLocationScore * 1000);

    const correctYear = new Date(currentEvent.date).getFullYear();
    const guessedYear = parseInt(slider.value);
    const yearDifference = Math.abs(correctYear - guessedYear);
    const yearScore = 1000 - 10 * Math.floor(100 - Math.exp(-(yearDifference - 115.129) / 25));

    const answerScore = chosenName === currentEvent.name ? 1000 : 0;

    const roundScore = roundLocationScore + yearScore + answerScore;
    score += roundScore;

    document.body.classList.add('in-round');
    document.getElementById('score').textContent = `Score: ${score.toLocaleString('en')} / 15,000`;
    document.getElementById('title-submit').textContent = 'Next Round';

    `You were ${Math.round(distance).toLocaleString('en')} meters away from the correct location and earned ${roundLocationScore.toLocaleString('en')} / 1,000 points.`;
    document.getElementById('title-when').textContent = `You were ${yearDifference} years off and earned ${yearScore.toLocaleString(
        'en'
    )} / 1,000 points. The correct answer was ${correctYear}.`;
    `${currentEvent.name} (${new Date(currentEvent.date).toLocaleDateString('en')})`;

    generatePoints(guessedLocation, correctLocation);
    map.flyToBounds([guessedLocation, correctLocation], { padding: [50, 50] });

    guesses.push({
        round,
        event,
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
    document.getElementById('round').textContent = `Round ${round} of 5`;
    document.body.classList.remove('in-round');

    currentEvent = getRandomEvent();
    while (guesses.map((a) => a.event.name).includes(currentEvent.name)) {
        currentEvent = getRandomEvent();
    }
    const correctIndex = Math.floor(Math.random() * 4);
    const options = getCloseEvents(currentEvent);
    options.splice(correctIndex, 0, currentEvent);
    displayQuestion(options.map((event) => event.name));

    document.getElementById('image').src = currentEvent.image;
    document.getElementById('title-reference').textContent = 'Reference image:';
    document.getElementById('title-where').textContent = 'Where is this?';
    document.getElementById('title-when').textContent = 'When was this event?';
    document.getElementById('title-quiz').textContent = "What's this event's name?";
    document.getElementById('title-submit').textContent = 'Submit Guess';

    setBubble();
    resetMap();
}

function generatePoints(guessed, correct) {
    guessMarker = L.marker(guessed, {
        icon: L.icon({
            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34]
        }),
        title: 'Your Guess'
    }).addTo(map);
    correctMarker = L.marker(correct, {
        icon: L.icon({
            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
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

function displayPopup(message, deleteAfter) {
    popup.innerHTML = message;
    document.getElementById('popupWrapper').style.display = 'block';
    overlay.style.display = 'block';

    setTimeout(function () {
        if (deleteAfter) removePopup();
    }, 4000);
}

function removePopup() {
    document.getElementById('popupWrapper').style.display = 'none';
    overlay.style.display = 'none';
}

panzoom(document.getElementById('image'), {
    bounds: true,
    contain: 'inside',
    minZoom: 1,
    maxZoom: 5
});

function darkMode() {
    document.body.classList.toggle('dark-mode');
    if (document.body.classList.contains('dark-mode')) document.getElementById('dark-mode-toggle').className = 'fa fa-sun-o';
    else document.getElementById('dark-mode-toggle').className = 'fa fa-moon-o';
}

window.addEventListener('load', function () {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.body.classList.add('dark-mode');
        document.getElementById('dark-mode-toggle').className = 'fa fa-sun-o';
    }
});

initRound();

function displayQuestion(options) {
    const optionsElement = document.createElement('div');
    optionsElement.className = 'options';

    for (let i = 0; i < options.length; i++) {
        const option = document.createElement('label');
        option.className = 'option';

        const radio = document.createElement('input');
        radio.type = 'radio';
        radio.name = 'quiz';
        radio.value = options[i];

        const optionText = document.createTextNode(options[i]);

        option.appendChild(radio);
        option.appendChild(optionText);
        optionsElement.appendChild(option);
    }

    quizContainer.innerHTML = '';
    quizContainer.appendChild(optionsElement);
}

const bubble = document.getElementById('bubble');
slider.addEventListener('input', () => {
    setBubble();
});
window.addEventListener('resize', () => {
    setBubble();
});
setBubble();

function setBubble() {
    const val = slider.value;
    bubble.innerHTML = val;

    const sliderWidth = document.getElementById('relative').getBoundingClientRect().width;
    const bubbleWidth = bubble.getBoundingClientRect().width;

    const minLeft = bubbleWidth / 1.25;
    const maxLeft = sliderWidth - bubbleWidth / 4;
    const left = ((val - slider.min) / (slider.max - slider.min)) * sliderWidth + 20;

    bubble.style.left = `${Math.max(minLeft, Math.min(maxLeft, left))}px`;
}
