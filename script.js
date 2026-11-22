(function () {
  "use strict";

  // ===== Réglages =====
  var EMOJIS = ["🚗", "🏆", "🎮", "🚀", "🎁", "🍕", "🐶", "🎸"]; // 8 paires = 16 cartes
  var POINTS_PAIRE = 100;      // points gagnés pour une paire trouvée
  var PENALITE_ERREUR = 10;    // points perdus pour une erreur
  var DELAI_RETOURNEMENT = 800; // millisecondes avant de recacher 2 cartes différentes
  var CLE_MEILLEUR = "memoryGameBestScore";

  // ===== Éléments de la page =====
  var boardEl = document.getElementById("board");
  var timeEl = document.getElementById("time");
  var attemptsEl = document.getElementById("attempts");
  var scoreEl = document.getElementById("score");
  var restartBtn = document.getElementById("restart-btn");
  var replayBtn = document.getElementById("replay-btn");
  var victoryEl = document.getElementById("victory");
  var finalTimeEl = document.getElementById("final-time");
  var finalAttemptsEl = document.getElementById("final-attempts");
  var finalScoreEl = document.getElementById("final-score");
  var bestScoreEl = document.getElementById("best-score");

  // ===== État du jeu =====
  var firstCard = null;
  var secondCard = null;
  var locked = false;
  var attempts = 0;
  var score = 0;
  var pairsFound = 0;
  var seconds = 0;
  var timerId = null;
  var pendingTimeout = null;

  // ===== Outils =====
  function shuffle(array) {
    var a = array.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = a[i];
      a[i] = a[j];
      a[j] = tmp;
    }
    return a;
  }

  function formatTime(total) {
    var m = Math.floor(total / 60);
    var s = total % 60;
    return (m < 10 ? "0" : "") + m + ":" + (s < 10 ? "0" : "") + s;
  }

  function readBest() {
    try {
      var v = parseInt(window.localStorage.getItem(CLE_MEILLEUR), 10);
      return isNaN(v) ? 0 : v;
    } catch (e) {
      return 0;
    }
  }

  function saveBest(value) {
    try {
      window.localStorage.setItem(CLE_MEILLEUR, String(value));
    } catch (e) {
      /* stockage indisponible : on ignore */
    }
  }

  // ===== Chronomètre =====
  function startTimer() {
    if (timerId !== null) { return; }
    timerId = setInterval(function () {
      seconds++;
      timeEl.textContent = formatTime(seconds);
    }, 1000);
  }

  function stopTimer() {
    if (timerId !== null) {
      clearInterval(timerId);
      timerId = null;
    }
  }

  // ===== Affichage =====
  function updateDisplay() {
    timeEl.textContent = formatTime(seconds);
    attemptsEl.textContent = String(attempts);
    scoreEl.textContent = String(score);
  }

  function createCard(emoji, index) {
    var card = document.createElement("button");
    card.type = "button";
    card.className = "card";
    card.setAttribute("data-emoji", emoji);
    card.setAttribute("aria-label", "Carte " + (index + 1));

    var inner = document.createElement("div");
    inner.className = "card-inner";

    var back = document.createElement("div");
    back.className = "card-face card-back";

    var front = document.createElement("div");
    front.className = "card-face card-front";
    front.textContent = emoji;

    inner.appendChild(back);
    inner.appendChild(front);
    card.appendChild(inner);

    card.addEventListener("click", function () {
      onCardClick(card);
    });
    return card;
  }

  // ===== Logique du jeu =====
  function onCardClick(card) {
    if (locked) { return; }
    if (card.classList.contains("flipped") || card.classList.contains("matched")) { return; }

    startTimer();
    card.classList.add("flipped");

    if (firstCard === null) {
      firstCard = card;
      return;
    }

    secondCard = card;
    attempts++;
    locked = true;

    if (firstCard.getAttribute("data-emoji") === secondCard.getAttribute("data-emoji")) {
      handleMatch();
    } else {
      handleMismatch();
    }
    updateDisplay();
  }

  function handleMatch() {
    firstCard.classList.add("matched");
    secondCard.classList.add("matched");
    score += POINTS_PAIRE;
    pairsFound++;
    resetTurn();
    updateDisplay();

    if (pairsFound === EMOJIS.length) {
      stopTimer();
      pendingTimeout = setTimeout(showVictory, 700);
    }
  }

  function handleMismatch() {
    score = Math.max(0, score - PENALITE_ERREUR);
    var a = firstCard;
    var b = secondCard;
    pendingTimeout = setTimeout(function () {
      a.classList.remove("flipped");
      b.classList.remove("flipped");
      resetTurn();
    }, DELAI_RETOURNEMENT);
  }

  function resetTurn() {
    firstCard = null;
    secondCard = null;
    locked = false;
  }

  function showVictory() {
    var best = readBest();
    if (score > best) {
      best = score;
      saveBest(best);
    }
    finalTimeEl.textContent = formatTime(seconds);
    finalAttemptsEl.textContent = String(attempts);
    finalScoreEl.textContent = String(score);
    bestScoreEl.textContent = String(best);
    victoryEl.classList.remove("hidden");
  }

  function hideVictory() {
    victoryEl.classList.add("hidden");
  }

  function newGame() {
    if (pendingTimeout !== null) {
      clearTimeout(pendingTimeout);
      pendingTimeout = null;
    }
    stopTimer();
    hideVictory();

    seconds = 0;
    attempts = 0;
    score = 0;
    pairsFound = 0;
    resetTurn();
    updateDisplay();

    var deck = shuffle(EMOJIS.concat(EMOJIS));
    boardEl.innerHTML = "";
    for (var i = 0; i < deck.length; i++) {
      boardEl.appendChild(createCard(deck[i], i));
    }
  }

  // ===== Boutons =====
  restartBtn.addEventListener("click", newGame);
  replayBtn.addEventListener("click", newGame);

  // ===== Mode hors ligne / installation (uniquement sur un vrai site https) =====
  if (typeof navigator !== "undefined" && "serviceWorker" in navigator &&
      window.location && /^https?:/.test(window.location.protocol)) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("sw.js").catch(function () {
        /* pas grave : le jeu fonctionne quand même */
      });
    });
  }

  // ===== Démarrage =====
  newGame();
})();
