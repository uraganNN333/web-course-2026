// ---------- Состояние приложения ----------
// Все задачи хранятся в массиве объектов: { id, text, completed }
let todos = [];
let nextId = 1;            // счётчик для уникальных id
let currentFilter = 'all'; // 'all' | 'active' | 'completed'

// ---------- Элементы страницы ----------
const form = document.getElementById('todo-form');
const input = document.getElementById('todo-input');
const warning = document.getElementById('warning');
const list = document.getElementById('todo-list');
const counter = document.getElementById('counter');
const filterButtons = document.querySelectorAll('.filter');

// ---------- Работа с данными ----------
function addTodo(text) {
  todos.push({ id: nextId++, text: text, completed: false });
}

function toggleTodo(id) {
  todos = todos.map(function (todo) {
    // у нужной задачи меняем completed, остальные оставляем как есть
    return todo.id === id ? { ...todo, completed: !todo.completed } : todo;
  });
}

function deleteTodo(id) {
  todos = todos.filter(function (todo) {
    return todo.id !== id;
  });
}

function getVisibleTodos() {
  return todos.filter(function (todo) {
    if (currentFilter === 'active') return !todo.completed;
    if (currentFilter === 'completed') return todo.completed;
    return true;
  });
}

// ---------- Отрисовка ----------
function createTodoElement(todo) {
  const li = document.createElement('li');
  li.className = 'todo-item' + (todo.completed ? ' completed' : '');
  li.dataset.id = todo.id;

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = todo.completed;
  checkbox.className = 'toggle';

  const span = document.createElement('span');
  span.className = 'text';
  span.textContent = todo.text; // textContent безопаснее, чем innerHTML

  const deleteButton = document.createElement('button');
  deleteButton.type = 'button';
  deleteButton.className = 'delete';
  deleteButton.textContent = 'Удалить';

  li.append(checkbox, span, deleteButton);
  return li;
}

function render() {
  list.innerHTML = ''; // очищаем список и рисуем заново из массива

  getVisibleTodos().forEach(function (todo) {
    list.append(createTodoElement(todo));
  });

  const done = todos.filter(function (todo) { return todo.completed; }).length;
  const left = todos.length - done;
  counter.textContent = 'Осталось: ' + left + ', Выполнено: ' + done;

  filterButtons.forEach(function (button) {
    button.classList.toggle('active', button.dataset.filter === currentFilter);
  });
}

// ---------- Обработчики событий ----------
// Отправка формы срабатывает и по кнопке «Добавить», и по Enter
form.addEventListener('submit', function (event) {
  event.preventDefault();
  const text = input.value.trim();

  if (text === '') {
    warning.hidden = false; // пустую задачу не добавляем
    return;
  }

  warning.hidden = true;
  addTodo(text);
  input.value = '';
  render();
});

// Один обработчик на весь список (делегирование событий):
// определяем, по какой задаче и по какому элементу кликнули
list.addEventListener('click', function (event) {
  const item = event.target.closest('.todo-item');
  if (!item) return;
  const id = Number(item.dataset.id);

  if (event.target.classList.contains('delete')) {
    deleteTodo(id);
    render();
  } else if (event.target.classList.contains('toggle')) {
    toggleTodo(id);
    render();
  }
});

filterButtons.forEach(function (button) {
  button.addEventListener('click', function () {
    currentFilter = button.dataset.filter;
    render();
  });
});

render();
