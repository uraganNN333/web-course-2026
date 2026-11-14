// ---------- Настройки ----------
const FLASH_TIME = 500;   // сколько горит кнопка при показе, мс
const PAUSE_TIME = 250;   // пауза между кнопками, мс
const TONES = [329.63, 261.63, 220.0, 164.81]; // частоты звуков для 4 кнопок

// ---------- Состояние игры (хранится в объекте, а не в CSS-классах) ----------
const state = {
  sequence: [],       // последовательность компьютера, например [2, 0, 3]
  playerStep: 0,      // какой по счёту шаг сейчас должен нажать игрок
  isPlaying: false,   // идёт ли игра
  isShowing: false,   // идёт ли показ (тогда клики игнорируются)
  level: 0,
  best: 0,
};

let gameId = 0;                 // номер текущей игры: старые «показы» по нему понимают, что устарели
const activeTimers = new Set(); // все запущенные таймеры, чтобы их можно было остановить
let audioContext = null;

// ---------- Элементы страницы ----------
const pads = document.querySelectorAll('.pad');
const startButton = document.getElementById('start');
const levelElement = document.getElementById('level');
const bestElement = document.getElementById('best');
const statusElement = document.getElementById('status');
const soundCheckbox = document.getElementById('sound');

// ---------- Таймеры ----------

// Пауза, которую можно «ждать» через await. Таймер запоминается в activeTimers
function wait(ms) {
  return new Promise(function (resolve) {
    const id = setTimeout(function () {
      activeTimers.delete(id);
      resolve();
    }, ms);
    activeTimers.add(id);
  });
}

// Останавливает все таймеры: после ошибки или рестарта ничего не продолжает тикать
function clearAllTimers() {
  activeTimers.forEach(function (id) { clearTimeout(id); });
  activeTimers.clear();
}

// ---------- Звук (по желанию, не блокирует игру) ----------
function playTone(frequency, duration) {
  if (!soundCheckbox.checked || !audioContext) return;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = 'triangle';
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(0.2, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration / 1000);
  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start();
  oscillator.stop(audioContext.currentTime + duration / 1000);
}

// ---------- Работа с кнопками ----------
function randomPad() {
  return Math.floor(Math.random() * 4);
}

function setPadsEnabled(enabled) {
  pads.forEach(function (pad) { pad.disabled = !enabled; });
}

function resetPads() {
  pads.forEach(function (pad) { pad.classList.remove('active'); });
}

// Подсвечивает одну кнопку на заданное время
async function flashPad(index, duration) {
  pads[index].classList.add('active');
  playTone(TONES[index], duration);
  await wait(duration);
  pads[index].classList.remove('active');
}

// ---------- Отображение ----------
function updateScore() {
  levelElement.textContent = state.level;
  bestElement.textContent = state.best;
}

function setStatus(text, isLose) {
  statusElement.textContent = text;
  statusElement.classList.toggle('lose', Boolean(isLose));
}

// ---------- Ход игры ----------

// Показывает всю последовательность с начала. Возвращает false, если игру перезапустили
async function playSequence(myGameId) {
  state.isShowing = true;
  setPadsEnabled(false);
  await wait(600);

  for (const padIndex of state.sequence) {
    if (myGameId !== gameId) return false;
    await flashPad(padIndex, FLASH_TIME);
    if (myGameId !== gameId) return false;
    await wait(PAUSE_TIME);
  }

  state.isShowing = false;
  setPadsEnabled(true);
  return true;
}

// Новый раунд: добавляем один случайный шаг и показываем всё заново
async function nextRound() {
  const myGameId = gameId;
  state.sequence.push(randomPad());
  state.level = state.sequence.length;
  state.playerStep = 0;
  updateScore();
  setStatus('Смотри 👀');

  const finished = await playSequence(myGameId);
  if (finished) setStatus('Твой ход 👆');
}

function startGame() {
  if (!audioContext && (window.AudioContext || window.webkitAudioContext)) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }

  clearAllTimers();   // гасим всё, что могло остаться от прошлой игры
  resetPads();
  gameId++;

  state.sequence = [];
  state.playerStep = 0;
  state.isPlaying = true;
  state.level = 0;
  startButton.textContent = 'Заново';

  nextRound();
}

function gameOver() {
  clearAllTimers();
  resetPads();
  gameId++;           // останавливает все незавершённые показы

  state.isPlaying = false;
  state.isShowing = false;
  setPadsEnabled(false);

  state.best = Math.max(state.best, state.level);
  updateScore();
  setStatus('Ошибка! Вы дошли до уровня ' + state.level + ' 💥', true);
  startButton.textContent = 'Старт';
  playTone(110, 600);
}

// Обработка нажатия игрока
async function handlePadClick(index) {
  if (!state.isPlaying || state.isShowing) return; // во время показа клики не считаются

  flashPad(index, 200); // короткая подсветка, не ждём её

  if (index !== state.sequence[state.playerStep]) {
    gameOver();
    return;
  }

  state.playerStep++;

  if (state.playerStep === state.sequence.length) {
    // Последовательность повторена целиком
    const myGameId = gameId;
    state.isShowing = true;
    setPadsEnabled(false);
    setStatus('Отлично! 🔥');
    await wait(700);
    if (myGameId === gameId) nextRound();
  }
}

// ---------- Обработчики событий ----------
pads.forEach(function (pad) {
  pad.addEventListener('click', function () {
    handlePadClick(Number(pad.dataset.pad));
  });
});

startButton.addEventListener('click', startGame);

// Клавиши 1–4 дублируют кнопки
document.addEventListener('keydown', function (event) {
  const keys = ['1', '2', '3', '4'];
  const index = keys.indexOf(event.key);
  if (index !== -1) handlePadClick(index);
});

updateScore();
