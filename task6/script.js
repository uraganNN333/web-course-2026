// ---------- Настройки ----------
const CELL = 20;            // размер клетки в пикселях
const GRID = 20;            // поле 20×20 клеток (400×400 px)
const MOVE_INTERVAL = 150;  // змейка делает шаг раз в 150 мс

const DIRECTIONS = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

const KEY_TO_DIRECTION = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
};

// ---------- Состояние игры (отдельно от отрисовки) ----------
const state = {
  snake: [],                    // сегменты: [{ x, y }, ...], первый — голова
  direction: DIRECTIONS.right,  // куда змейка двигалась на последнем шаге
  nextDirection: DIRECTIONS.right, // куда повернёт на следующем шаге
  apple: { x: 0, y: 0 },
  score: 0,
  best: 0,
  isRunning: false,             // игра запущена
  gameOver: false,
};

let lastMoveTime = 0;

// ---------- Элементы страницы ----------
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const bestElement = document.getElementById('best');
const startButton = document.getElementById('start');
const dpadButtons = document.querySelectorAll('.dpad-button');

// ---------- Логика игры ----------

function resetGame() {
  // Змейка из 3 сегментов в середине поля, смотрит вправо
  state.snake = [
    { x: 8, y: 10 },
    { x: 7, y: 10 },
    { x: 6, y: 10 },
  ];
  state.direction = DIRECTIONS.right;
  state.nextDirection = DIRECTIONS.right;
  state.score = 0;
  state.gameOver = false;
  state.isRunning = false;
  spawnApple();
  updateScoreboard();
}

function isOnSnake(cell) {
  return state.snake.some(function (segment) {
    return segment.x === cell.x && segment.y === cell.y;
  });
}

// Ставит яблоко в случайную свободную клетку (не на змейку)
function spawnApple() {
  const freeCells = [];
  for (let x = 0; x < GRID; x++) {
    for (let y = 0; y < GRID; y++) {
      if (!isOnSnake({ x: x, y: y })) freeCells.push({ x: x, y: y });
    }
  }
  if (freeCells.length === 0) return false; // поле заполнено — ставить некуда
  state.apple = freeCells[Math.floor(Math.random() * freeCells.length)];
  return true;
}

// Поворот: разворот на 180° игнорируется
function changeDirection(name) {
  const newDirection = DIRECTIONS[name];
  const isOpposite = newDirection.x === -state.direction.x && newDirection.y === -state.direction.y;
  if (!isOpposite) state.nextDirection = newDirection;
}

// Возвращает новую клетку головы
function moveSnake() {
  const head = state.snake[0];
  return { x: head.x + state.direction.x, y: head.y + state.direction.y };
}

// Проверяет, врежется ли голова в стену или в хвост
function checkCollision(head, willEat) {
  const hitsWall = head.x < 0 || head.x >= GRID || head.y < 0 || head.y >= GRID;
  // Если яблоко не съедено, хвост на этом шаге уйдёт, поэтому последний сегмент не считаем
  const body = willEat ? state.snake : state.snake.slice(0, -1);
  const hitsSelf = body.some(function (segment) {
    return segment.x === head.x && segment.y === head.y;
  });
  return hitsWall || hitsSelf;
}

// Один шаг игры: только меняет состояние, ничего не рисует
function update() {
  state.direction = state.nextDirection;
  const head = moveSnake();
  const willEat = head.x === state.apple.x && head.y === state.apple.y;

  if (checkCollision(head, willEat)) {
    endGame();
    return;
  }

  state.snake.unshift(head);   // добавляем новую голову

  if (willEat) {
    state.score++;              // хвост не убираем — змейка выросла на 1
    updateScoreboard();
    if (!spawnApple()) endGame();
  } else {
    state.snake.pop();          // убираем хвост — длина не меняется
  }
}

function startGame() {
  if (state.gameOver) resetGame();
  state.isRunning = true;
  lastMoveTime = performance.now();
  startButton.hidden = true;
}

function endGame() {
  state.gameOver = true;
  state.isRunning = false;
  state.best = Math.max(state.best, state.score);
  updateScoreboard();
  startButton.textContent = 'Начать заново';
  startButton.hidden = false;
}

function updateScoreboard() {
  scoreElement.textContent = state.score;
  bestElement.textContent = state.best;
}

// ---------- Отрисовка (только рисует текущее состояние) ----------

function drawCell(x, y, color, radius) {
  ctx.fillStyle = color;
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(x * CELL + 1, y * CELL + 1, CELL - 2, CELL - 2, radius);
  } else {
    ctx.rect(x * CELL + 1, y * CELL + 1, CELL - 2, CELL - 2);
  }
  ctx.fill();
}

function drawGrid() {
  ctx.fillStyle = '#0d0d1a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
  ctx.lineWidth = 1;
  for (let i = 1; i < GRID; i++) {
    ctx.beginPath();
    ctx.moveTo(i * CELL + 0.5, 0);
    ctx.lineTo(i * CELL + 0.5, canvas.height);
    ctx.moveTo(0, i * CELL + 0.5);
    ctx.lineTo(canvas.width, i * CELL + 0.5);
    ctx.stroke();
  }
}

function drawApple() {
  const centerX = state.apple.x * CELL + CELL / 2;
  const centerY = state.apple.y * CELL + CELL / 2;
  ctx.shadowColor = '#ff4ecd';
  ctx.shadowBlur = 16;
  ctx.fillStyle = '#ff4ecd';
  ctx.beginPath();
  ctx.arc(centerX, centerY, CELL / 2 - 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
}

function drawSnake() {
  state.snake.forEach(function (segment, index) {
    const color = index === 0 ? '#c4ff3d' : (index % 2 === 0 ? '#22d3ee' : '#1fb8d0');
    drawCell(segment.x, segment.y, color, index === 0 ? 7 : 5);
  });
}

function drawOverlay(title, subtitle) {
  ctx.fillStyle = 'rgba(10, 10, 20, 0.75)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#f1f1f8';
  ctx.font = 'bold 32px "Segoe UI", Arial, sans-serif';
  ctx.fillText(title, canvas.width / 2, canvas.height / 2 - 10);
  ctx.fillStyle = '#c4ff3d';
  ctx.font = '18px "Segoe UI", Arial, sans-serif';
  ctx.fillText(subtitle, canvas.width / 2, canvas.height / 2 + 24);
}

function draw() {
  drawGrid();
  drawApple();
  drawSnake();

  if (state.gameOver) {
    drawOverlay('Игра окончена', 'Итоговый счёт: ' + state.score);
  } else if (!state.isRunning) {
    drawOverlay('Змейка', 'Нажми стрелку или «Старт»');
  }
}

// ---------- Игровой цикл ----------
// requestAnimationFrame вызывается ~60 раз в секунду (или чаще), но змейка
// шагает только раз в MOVE_INTERVAL мс — поэтому скорость одинакова на любом экране
function gameLoop(currentTime) {
  if (state.isRunning && currentTime - lastMoveTime >= MOVE_INTERVAL) {
    lastMoveTime = currentTime;
    update();
  }
  draw();
  requestAnimationFrame(gameLoop);
}

// ---------- Управление ----------
function handleDirection(name) {
  if (state.gameOver) return;           // после проигрыша — только кнопка «Начать заново»
  if (!state.isRunning) startGame();    // первая стрелка запускает игру
  changeDirection(name);
}

document.addEventListener('keydown', function (event) {
  const name = KEY_TO_DIRECTION[event.key];
  if (name) {
    event.preventDefault();             // чтобы стрелки не прокручивали страницу
    handleDirection(name);
  }
});

dpadButtons.forEach(function (button) {
  button.addEventListener('click', function () {
    handleDirection(button.dataset.direction);
  });
});

startButton.addEventListener('click', startGame);

resetGame();
requestAnimationFrame(gameLoop);       // цикл запускается один раз на всё время работы страницы
