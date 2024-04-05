let score = 0,
    round = 0,
    day = null,
    game,
    currentEvent = null,
    options = null,
    guesses = [],
    map,
    demoMap,
    listener,
    marker,
    guessMarker,
    correctMarker,
    polyline,
    roundCompleted = false,
    correctIndex,
    mode,
    slider = document.getElementById('year');

document.body.classList.toggle('dark-mode');
slider.max = new Date().getFullYear();
slider.value = 1900 + Math.round((slider.max - 1900) / 2);
const icons = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣'];

//stages of the game
async function initRound() {
    if (mode == 'daily') {
        round++;
        if (round > 5) return endGame();

        currentEvent = game[round - 1].event;
        options = game[round - 1].options;
    } else if (roundCompleted || round == 0) {
        const current = await getGame();
        currentEvent = current.event;
        options = current.options;
    }

    roundCompleted = false;
    document.getElementById('map').style.display = 'block';
    document.getElementById('round').textContent = `Round ${round} of 5`;
    document.getElementById('current-round').textContent = round;
    slider.value = 1900 + Math.round((slider.max - 1900) / 2);
    document.body.classList.remove('in-round');

    const correctIndex = Math.floor(Math.random() * 4);
    options.splice(correctIndex, 0, currentEvent.name);
    displayQuestion(options);

    document.getElementById('image').src = currentEvent.image;
    document.getElementById('title-submit').textContent = 'Submit Guess';

    setBubble();
    resetMap();
}

function handleGuess() {
    if (roundCompleted == true) return initRound();
    const chosenName = document.getElementById('quiz').querySelector('input[name="quiz"]:checked')?.value;

    if (!marker) {
        displayPopup('Please mark a position on the map first.', true);
        return;
    } else if (!chosenName) {
        displayPopup('Please choose an option for the event name first.', true);
        return;
    }

    roundCompleted = true;

    const correctLocation = L.latLng([currentEvent.location[1], currentEvent.location[0]]);
    const guessedLocation = marker.getLatLng();
    const distance = correctLocation.distanceTo(guessedLocation);
    const roundLocationScore = distance < 25 ? 1000 : Math.ceil(1000 * Math.exp(-distance / 2000000));

    const correctYear = new Date(currentEvent.date).getFullYear();
    const guessedYear = parseInt(slider.value);
    const yearDifference = Math.abs(correctYear - guessedYear);
    const yearScore = Math.ceil(1000 * Math.exp(-0.065 * yearDifference));

    const answerScore = chosenName === currentEvent.name ? 1000 : 0;

    const roundScore = roundLocationScore + yearScore + answerScore;
    score += roundScore;

    document.body.classList.add('in-round');
    document.getElementById('score').textContent = `Score: ${score.toLocaleString('en')} / ${round * 3},000`;
    document.getElementById('title-submit').textContent = 'Next Round';
    document.getElementById('location-score').textContent = roundLocationScore;
    document.getElementById('year-score').textContent = yearScore;
    document.getElementById('name-score').textContent = answerScore;
    document.getElementById('total-score').textContent = roundScore;
    document.getElementById('result-name').textContent = `${currentEvent.name} (${new Date(currentEvent.date).toLocaleDateString('en')})`;
    document.getElementById('result-text').textContent = `You were ${Number((distance / 1000).toFixed(2)).toLocaleString('en')} km away from the correct location and were ${
        yearDifference == 0 ? 'spot on with' : `${yearDifference.toLocaleString('en')} year${yearDifference == 1 ? '' : 's'} off from`
    } ${correctYear}.`;

    showCorrectAnswer(currentEvent.name, chosenName);
    adjustGrid();
    generatePoints(guessedLocation, correctLocation);
    map.flyToBounds([guessedLocation, correctLocation], { padding: [50, 50] });

    guesses.push({
        round,
        event: currentEvent,
        correct: correctLocation,
        guessed: guessedLocation,
        distance,
        yearDifference,
        correctAnswer: chosenName === currentEvent.name,
        score: roundScore
    });
    setUserDaily();
}

function endGame() {
    if (this.mode == 'random') return startRandom();
    document.body.classList.add('end-game');
    map = createMap('map-overlay');
    const bounds = L.latLngBounds();
    guesses.forEach((guess) => {
        generatePoints(guess.guessed, guess.correct);
        bounds.extend(guess.correct);
        bounds.extend(guess.guessed);
    });
    map.invalidateSize();
    map.flyToBounds(bounds, {
        padding: [50, 50]
    });
    document.getElementById('overall-score').textContent = score.toLocaleString('en');
    document.getElementById('overlay').style.display = 'block';
}

//start game in respective mode
function startRandom() {
    document.getElementById('round-progress-text').style.display = 'none';
    document.getElementById('score-box').style.display = 'none';

    round = 0;
    mode = 'random';
    initRound();
}

function startDaily() {
    mode = 'daily';
    round = 0;
    score = 0;
    guesses = [];
    document.getElementById('round-progress-text').style.display = 'block';
    document.getElementById('score-box').style.display = 'block';

    importGame();
    initRound();
}

//get game from api
async function getGame(modeOverride) {
    const url = `https://bob16077.netlify.app/api/eventguessr/${(modeOverride || mode) == 'daily' ? 'daily' : `randomEvent`}`;
    const response = await fetch(url).catch((error) => {
        console.error('Error:', error);
    });

    if (!response.ok) {
        displayPopup('Error fetching data. Please try again later.', true);
        throw new Error('Network response was not ok');
    }
    const res = await response.json();
    if ((modeOverride || mode) == 'daily') day = res?.number;
    return (modeOverride || mode) == 'daily' ? res?.game : res;
}

//map creation functions
const createMap = (element) => {
    let m = L.map(element, {
        maxZoom: 18,
        attributionControl: false,
        minZoom: 2
    }).setView([0, 0], 2);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(m);
    L.control.fullscreen().addTo(m);
    return m;
};

function resetMap() {
    if (guessMarker) {
        map.removeLayer(guessMarker);
        guessMarker = undefined;
    }

    if (correctMarker) {
        map.removeLayer(correctMarker);
        correctMarker = undefined;
    }

    if (polyline) {
        map.removeLayer(polyline);
        polyline = undefined;
    }

    if (marker) {
        map.removeLayer(marker);
        marker = undefined;
    }

    if (!map) {
        map = createMap('map');

        listener = map.on('click', function (e) {
            if (marker) map.removeLayer(marker);
            if (!roundCompleted) marker = L.marker(e.latlng).addTo(map);
        });
    } else map.setView([0, 0], 2);
}

//map helper functions for when rounds are over
function generatePoints(guessed, correct) {
    guessMarker = L.marker(guessed, {
        icon: L.icon({
            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34]
        }),
        title: 'Your Guessed Location'
    })
        .bindPopup('This is the location you guessed.')
        .addTo(map);

    correctMarker = L.marker(correct, {
        icon: L.icon({
            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34]
        }),
        title: 'Correct Location'
    })
        .bindPopup('This is the actual correct location.')
        .addTo(map);

    polyline = L.polyline([guessed, correct], {
        color: 'red',
        dashArray: '10, 8'
    }).addTo(map);
}

function zoomIntoRound(round) {
    const location = guesses[round];
    if (!location) return;
    map.flyToBounds([location.guessed, location.correct], { padding: [50, 50] });
}

//for the popup things
function displayPopup(message, deleteAfter) {
    document.getElementById('popup').innerHTML = message;
    document.getElementById('popupWrapper').style.display = 'block';
    document.getElementById('overlay').style.display = 'block';

    setTimeout(function () {
        if (deleteAfter) {
            removePopup();
            document.querySelectorAll('.popupWrapper').forEach((element) => (element.style.display = 'none'));
        }
    }, 4000);
}

function displayMenu(dontResetButtons) {
    document.getElementById('menu').style.display = 'block';
    document.getElementById('overlay').style.display = 'block';
    if (!dontResetButtons) {
        document.getElementById('start-menu-btns').innerHTML = `<button class="start-btn" onclick="startDaily(); removePopup()">Play Daily</button>
        <button class="start-btn" onclick="${document.body.classList.contains('end-game') ? 'playCasualMode()' : 'startRandom(); removePopup()'}">Play Casual</button>`;
    }
}

function removePopup() {
    document.querySelectorAll('.popupWrapper').forEach((element) => (element.style.display = 'none'));
    if (!document.body.classList.contains('end-game')) document.getElementById('overlay').style.display = 'none';
    resetMap();
}

function tryClosePopup() {
    if (!document.body.classList.contains('end-game')) removePopup();
}

//init the image panzoom
const Panzoom = panzoom(document.getElementById('image'), {
    animate: true,
    bounds: true,
    contain: 'automatic',
    minZoom: 0,
    maxZoom: 5
});

//toggle dark mode
function darkMode() {
    document.body.classList.toggle('dark-mode');
    if (document.body.classList.contains('dark-mode')) document.getElementById('dark-mode-toggle').className = 'fa-solid fa-sun';
    else document.getElementById('dark-mode-toggle').className = 'fa-regular fa-moon';
}

//for name quiz
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

    document.getElementById('quiz').innerHTML = '';
    document.getElementById('quiz').appendChild(optionsElement);
}

function showCorrectAnswer(correctAnswer, userAnswer) {
    const options = document.querySelectorAll('.option');

    for (let i = 0; i < options.length; i++) {
        const radio = options[i].querySelector('input[type="radio"]');
        const optionText = radio.value;

        radio.disabled = true;

        const result = document.createElement('span');
        result.style.paddingRight = '10px';

        if (optionText === correctAnswer) {
            result.innerHTML = '<i class="fa fa-check"></i>';
            result.style.color = 'green';
            options[i].replaceChild(result, radio);
        } else if (optionText === userAnswer) {
            result.innerHTML = '<i class="fa fa-times"></i>';
            result.style.color = 'red';
            options[i].replaceChild(result, radio);
        }
    }
}

//bubble slider
const bubble = document.getElementById('bubble');
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

//change result/score grid on window resize
function adjustGrid() {
    const resultBox = document.querySelector('#result-box');

    if (resultBox.offsetWidth >= 430) {
        resultBox.style.gridTemplateColumns = 'repeat(2, 1fr)';
    } else {
        resultBox.style.gridTemplateColumns = 'repeat(1, 1fr)';
    }
}

//share game
function shareGame() {
    let msg = `#EventGuessr #${day} (${new Date().toLocaleDateString('en')})\n\n🎉 I scored ${score} / 15,000 today!\n`;

    for (const i in guesses) {
        const guessRound = guesses[i];
        msg += `\n ${icons[i]} 🚩 ${Number((guessRound.distance / 1000).toFixed(2)).toLocaleString('en')} km | ⏰ ${guessRound.yearDifference} ${
            guessRound.yearDifference == 1 ? 'yr' : 'yrs'
        } | ${guessRound.correctAnswer ? '✅' : '❌'} | 🏆 ${guessRound.score.toLocaleString('en')} / 3,000\n\n🌍 https://games.bob16077.is-a.dev/eventguessr`;
    }

    navigator.clipboard.writeText(msg);
    displayPopup('Game results copied to clipboard!', true);
}

//when users finish daily, go to random events
function playCasualMode() {
    const queryString = new URLSearchParams(window.location.search);
    queryString.set('mode', 'random');
    queryString.set('skipMenu', 'true');
    window.location.search = queryString.toString();
}

//for keeping track of daily game progress
function getUserDaily() {
    const gameData = localStorage.getItem('game_data');
    return gameData ? JSON.parse(gameData) : [];
}

function setUserDaily() {
    const data = { date: new Date().toUTCString(), game: guesses, number: day };

    localStorage.setItem('game_data', JSON.stringify(data));
}

function importGame() {
    const queryString = new URLSearchParams(window.location.search);
    if (!queryString.has('ignoreStorage') || queryString.get('ignoreStorage') != 'true') {
        const gameData = getUserDaily();
        if (gameData && gameData.game && gameData.number == day) {
            guesses = gameData.game;
            round = guesses.length;
            guesses.map((guess) => (score += guess.score));
            day = gameData.number;
            if (round != 0 && round <= 5) removePopup();
        }
    }
}

//change the bubbles in the footer
const bubbles = document.querySelectorAll('.score-bubble');
bubbles.forEach((bubble, index) => {
    bubble.addEventListener('click', () => {
        zoomIntoRound(index);
        for (let i = 0; i < index; i++) {
            bubbles[i].classList.remove('active');
            bubbles[i].classList.add('inactive');
        }
        for (let i = index + 1; i < bubbles.length; i++) {
            bubbles[i].classList.remove('active');
            bubbles[i].classList.remove('inactive');
        }
        bubbles[index].classList.remove('inactive');
        bubbles[index].classList.add('active');
    });
});

slider.addEventListener('input', () => {
    setBubble();
});
window.addEventListener('resize', () => {
    setBubble();
    adjustGrid();
});
window.addEventListener('load', async () => {
    const queryString = new URLSearchParams(window.location.search);
    if (queryString.has('mode')) {
        mode = queryString.get('mode');
        if (mode == 'random') document.getElementById('start-menu-btns').innerHTML = `<button class="start-btn" onclick="removePopup()">Play Casual</button>`;
        else document.getElementById('start-menu-btns').innerHTML = `<button class="start-btn" onclick="removePopup()">Play Daily</button>`;
    }
    if (!queryString.has('skipMenu') || queryString.get('skipMenu') != 'true') displayMenu(true);
    game = await getGame('daily');

    if (mode == 'random') startRandom();
    else startDaily();
});

setBubble();
adjustGrid();
