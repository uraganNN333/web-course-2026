// ---------- Состояние игры ----------
let secret = '';       // загаданное число (строка из 4 цифр)
let history = [];      // попытки: { guess, bulls, cows }
let isGameOver = false;

// ---------- Элементы страницы ----------
const form = document.getElementById('guess-form');
const input = document.getElementById('guess-input');
const checkButton = document.getElementById('check-button');
const message = document.getElementById('message');
const attemptsElement = document.getElementById('attempts');
const newGameButton = document.getElementById('new-game');
const historyList = document.getElementById('history');
const empty = document.getElementById('empty');

// ---------- Логика игры ----------

// Генерирует строку из 4 разных случайных цифр, например "0384"
function generateSecret() {
  const digits = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
  let result = '';
  while (result.length < 4) {
    const index = Math.floor(Math.random() * digits.length);
    result += digits[index];
    digits.splice(index, 1); // убираем цифру, чтобы она не повторилась
  }
  return result;
}

// Проверяет ввод. Возвращает текст ошибки или пустую строку, если всё верно
function validateGuess(guess) {
  if (guess === '') return 'Введи 4 цифры.';
  if (!/^\d+$/.test(guess)) return 'Можно вводить только цифры.';
  if (guess.length !== 4) return 'Нужно ровно 4 цифры.';
  if (new Set(guess).size !== 4) return 'Все цифры должны быть разными.';
  return '';
}

// Считает быков (цифра на своём месте) и коров (цифра есть, но на другом месте)
function countBullsAndCows(secretNumber, guess) {
  let bulls = 0;
  let cows = 0;
  for (let i = 0; i < 4; i++) {
    if (guess[i] === secretNumber[i]) {
      bulls++;
    } else if (secretNumber.includes(guess[i])) {
      cows++;
    }
  }
  return { bulls: bulls, cows: cows };
}

// Правильное окончание слова: 1 бык, 2 быка, 5 быков
function plural(n, one, few, many) {
  const lastTwo = n % 100;
  const last = n % 10;
  if (lastTwo >= 11 && lastTwo <= 14) return many;
  if (last === 1) return one;
  if (last >= 2 && last <= 4) return few;
  return many;
}

// ---------- Отрисовка ----------
function createHistoryItem(attempt, index) {
  const li = document.createElement('li');
  if (attempt.bulls === 4) li.classList.add('winner');
  if (index === history.length - 1) li.classList.add('new'); // анимация только у последней попытки

  const number = document.createElement('span');
  number.className = 'attempt-number';
  number.textContent = '#' + (index + 1);

  const guess = document.createElement('span');
  guess.className = 'attempt-guess';
  guess.textContent = attempt.guess;

  const result = document.createElement('span');
  result.className = 'attempt-result';

  const bulls = document.createElement('span');
  bulls.className = 'bulls';
  bulls.textContent = attempt.bulls + ' ' + plural(attempt.bulls, 'бык', 'быка', 'быков');

  const cows = document.createElement('span');
  cows.className = 'cows';
  cows.textContent = attempt.cows + ' ' + plural(attempt.cows, 'корова', 'коровы', 'коров');

  result.append('→ ', bulls, ', ', cows);
  li.append(number, guess, result);
  return li;
}

function render() {
  // История рисуется из массива: новые попытки сверху
  historyList.innerHTML = '';
  history
    .map(function (attempt, index) { return createHistoryItem(attempt, index); })
    .reverse()
    .forEach(function (li) { historyList.append(li); });

  empty.hidden = history.length > 0;
  attemptsElement.textContent = history.length;

  // После победы поле и кнопка блокируются до «Новой игры»
  input.disabled = isGameOver;
  checkButton.disabled = isGameOver;
}

function showMessage(text, type) {
  message.textContent = text;
  message.className = 'message ' + type;
  message.hidden = false;
}

function hideMessage() {
  message.hidden = true;
}

// ---------- Ход игрока ----------
function makeGuess(guess) {
  const error = validateGuess(guess);
  if (error) {
    showMessage(error, 'error'); // попытка не засчитывается
    return;
  }

  const result = countBullsAndCows(secret, guess);
  history.push({ guess: guess, bulls: result.bulls, cows: result.cows });

  if (result.bulls === 4) {
    isGameOver = true;
    const n = history.length;
    showMessage('Победа! 🎉 Угадано за ' + n + ' ' + plural(n, 'попытку', 'попытки', 'попыток'), 'win');
  } else {
    hideMessage();
  }

  render();
}

function startNewGame() {
  secret = generateSecret();
  history = [];
  isGameOver = false;
  hideMessage();
  input.value = '';
  render();
  input.focus();
}

// ---------- Обработчики событий ----------
form.addEventListener('submit', function (event) {
  event.preventDefault();
  makeGuess(input.value.trim());
  if (!isGameOver) {
    input.value = '';
    input.focus();
  }
});

newGameButton.addEventListener('click', startNewGame);

startNewGame();
