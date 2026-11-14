// ---------- Настройки ----------
const API_URL = 'https://jsonplaceholder.typicode.com/posts';
const PAGE_SIZE = 10;           // сколько постов в одной порции
const DEBOUNCE_DELAY = 300;     // задержка перед применением поиска, мс

// ---------- Состояние ----------
const state = {
  posts: [],          // все загруженные посты — источник данных для отрисовки и фильтра
  page: 0,            // сколько порций уже загружено
  total: null,        // сколько постов всего на сервере (из заголовка ответа)
  isLoading: false,
  hasMore: true,
  error: '',
  query: '',          // текущая строка поиска (в нижнем регистре)
};

let debounceTimer = null;

// ---------- Элементы страницы ----------
const postsElement = document.getElementById('posts');
const searchInput = document.getElementById('search');
const counter = document.getElementById('counter');
const searchNote = document.getElementById('search-note');
const noResults = document.getElementById('no-results');
const loader = document.getElementById('loader');
const errorBox = document.getElementById('error');
const errorText = document.getElementById('error-text');
const retryButton = document.getElementById('retry');
const endMessage = document.getElementById('end');
const sentinel = document.getElementById('sentinel');

// ---------- Работа с сервером ----------

// Загружает одну порцию постов. Ошибку сети или плохой ответ пробрасывает дальше
async function fetchPosts(page) {
  const response = await fetch(API_URL + '?_page=' + page + '&_limit=' + PAGE_SIZE);
  if (!response.ok) {
    throw new Error('Сервер ответил с ошибкой ' + response.status);
  }
  const posts = await response.json();
  const total = Number(response.headers.get('x-total-count')) || null;
  return { posts: posts, total: total };
}

// Подгружает следующую порцию и добавляет её в общий массив
async function loadMorePosts() {
  // Не грузим, если уже грузим, всё загружено, была ошибка или идёт поиск
  if (state.isLoading || !state.hasMore || state.error || state.query) return;

  state.isLoading = true;
  renderStatus();

  try {
    const nextPage = state.page + 1;
    const result = await fetchPosts(nextPage);

    state.posts = state.posts.concat(result.posts);
    state.page = nextPage;
    if (result.total) state.total = result.total;

    // Постов больше нет, если пришла неполная порция или загружено всё
    const loadedAll = state.total !== null && state.posts.length >= state.total;
    if (result.posts.length < PAGE_SIZE || loadedAll) {
      state.hasMore = false;
    }
  } catch (error) {
    state.error = 'Не удалось загрузить посты 😕 Проверьте подключение к интернету и попробуйте ещё раз. (' + error.message + ')';
  } finally {
    state.isLoading = false;
  }

  renderPosts();
  renderStatus();
  loadIfSentinelVisible(); // если экран ещё не заполнен — грузим следующую порцию
}

// ---------- Фильтр ----------
function getVisiblePosts() {
  if (!state.query) return state.posts;
  return state.posts.filter(function (post) {
    return post.title.toLowerCase().includes(state.query);
  });
}

// ---------- Отрисовка ----------

// Добавляет текст в элемент и подсвечивает найденную подстроку тегом <mark>
function appendHighlighted(element, text, query) {
  if (!query) {
    element.textContent = text;
    return;
  }
  const lowerText = text.toLowerCase();
  let position = 0;
  let index = lowerText.indexOf(query);
  while (index !== -1) {
    element.append(text.slice(position, index));
    const mark = document.createElement('mark');
    mark.textContent = text.slice(index, index + query.length);
    element.append(mark);
    position = index + query.length;
    index = lowerText.indexOf(query, position);
  }
  element.append(text.slice(position));
}

function createPostCard(post) {
  const article = document.createElement('article');
  article.className = 'post';

  const meta = document.createElement('div');
  meta.className = 'post-meta';

  const id = document.createElement('span');
  id.textContent = 'Пост #' + post.id;

  const author = document.createElement('span');
  author.className = 'post-author';
  author.textContent = 'Автор: ' + post.userId;

  meta.append(id, author);

  const title = document.createElement('h2');
  title.className = 'post-title';
  appendHighlighted(title, post.title, state.query);

  const body = document.createElement('p');
  body.className = 'post-body';
  body.textContent = post.body;

  article.append(meta, title, body);
  return article;
}

function renderPosts() {
  postsElement.innerHTML = '';
  const visible = getVisiblePosts();
  visible.forEach(function (post) {
    postsElement.append(createPostCard(post));
  });
  noResults.hidden = !(state.query && visible.length === 0 && state.posts.length > 0);
}

function renderStatus() {
  loader.hidden = !state.isLoading;

  errorBox.hidden = !state.error;
  errorText.textContent = state.error;

  endMessage.hidden = state.hasMore || state.isLoading || Boolean(state.error) || Boolean(state.query);

  counter.textContent = 'Загружено: ' + state.posts.length + (state.total ? ' из ' + state.total : '');

  if (state.query) {
    const found = getVisiblePosts().length;
    searchNote.textContent = 'Найдено ' + found + ' среди загруженных постов.' +
      (state.hasMore ? ' Очисти поиск, чтобы подгрузить ещё.' : '');
    searchNote.hidden = false;
  } else {
    searchNote.hidden = true;
  }
}

// ---------- Бесконечный скролл ----------

// Если «метка» внизу списка видна (или ближе 200px к экрану) — подгружаем ещё
function loadIfSentinelVisible() {
  const rect = sentinel.getBoundingClientRect();
  if (rect.top <= window.innerHeight + 200) {
    loadMorePosts();
  }
}

const observer = new IntersectionObserver(function (entries) {
  if (entries[0].isIntersecting) loadMorePosts();
}, { rootMargin: '0px 0px 200px 0px' });

observer.observe(sentinel);

// ---------- Обработчики событий ----------

// Дебаунс: фильтр применяется через 300 мс после того, как пользователь перестал печатать
searchInput.addEventListener('input', function () {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(function () {
    state.query = searchInput.value.trim().toLowerCase();
    renderPosts();
    renderStatus();
    if (!state.query) loadIfSentinelVisible(); // поиск очищен — можно снова подгружать
  }, DEBOUNCE_DELAY);
});

retryButton.addEventListener('click', function () {
  state.error = '';
  loadMorePosts();
});

loadMorePosts(); // первая порция при загрузке страницы
