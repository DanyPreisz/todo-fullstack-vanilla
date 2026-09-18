import { api, setSession, clearSession, getToken } from "./api.js";

const authView = document.querySelector("#auth-view");
const appView = document.querySelector("#app-view");
const userChip = document.querySelector("#user-chip");
const userName = document.querySelector("#user-name");
const authForm = document.querySelector("#auth-form");
const authError = document.querySelector("#auth-error");
const authSubmit = document.querySelector("#auth-submit");
const authHint = document.querySelector("#auth-hint");
const todoForm = document.querySelector("#todo-form");
const todoInput = document.querySelector("#todo-input");
const todoList = document.querySelector("#todo-list");
const countsEl = document.querySelector("#counts");
const searchEl = document.querySelector("#search");

let mode = "login";
let filter = "all";
let search = "";
let searchTimer;

function showError(el, message) {
  el.hidden = !message;
  el.textContent = message || "";
}

function setAuthMode(next) {
  mode = next;
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.mode === mode);
  });
  authSubmit.textContent = mode === "login" ? "Entrar" : "Crear cuenta";
  authHint.textContent =
    mode === "register"
      ? "Usuario 3–20 chars (letras, números, _). Contraseña mínimo 6."
      : "Entrá con tu usuario para ver solo tus tareas.";
}

function renderAuth() {
  authView.classList.remove("hidden");
  appView.classList.add("hidden");
  userChip.classList.add("hidden");
}

function renderApp(user) {
  authView.classList.add("hidden");
  appView.classList.remove("hidden");
  userChip.classList.remove("hidden");
  userName.textContent = user.username;
}

function todoItem(todo) {
  const li = document.createElement("li");
  li.className = `todo${todo.completed ? " done" : ""}`;
  li.dataset.id = todo.id;
  li.innerHTML = `
    <button class="check" type="button" aria-label="Completar"></button>
    <div class="title-wrap">
      <input class="title" value="${escapeAttr(todo.title)}" />
      <div class="meta">${formatDate(todo.createdAt)}</div>
    </div>
    <button class="icon-btn" type="button" data-action="delete" aria-label="Borrar">×</button>
  `;
  return li;
}

function escapeAttr(value) {
  return String(value)
    .replaceAll("&", "&")
    .replaceAll('"', """)
    .replaceAll("<", "<");
}

function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso.includes("T") ? iso : iso.replace(" ", "T") + "Z");
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" });
}

async function loadTodos() {
  const params = new URLSearchParams({ filter });
  if (search) params.set("q", search);
  const data = await api(`/api/todos?${params}`);
  todoList.innerHTML = "";

  if (!data.todos.length) {
    const empty = document.createElement("li");
    empty.className = "empty";
    empty.textContent = search ? "Nada coincide con la búsqueda." : "No hay tareas en este filtro.";
    todoList.append(empty);
  } else {
    data.todos.forEach((todo) => todoList.append(todoItem(todo)));
  }

  const { active, completed, total } = data.counts;
  countsEl.textContent = `${active} pendiente${active === 1 ? "" : "s"} · ${total} en total`;
  document.querySelector("#clear-completed").hidden = completed === 0;
}

async function boot() {
  if (!getToken()) {
    renderAuth();
    return;
  }
  try {
    const { user } = await api("/api/auth/me");
    renderApp(user);
    await loadTodos();
  } catch {
    clearSession();
    renderAuth();
  }
}

document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => setAuthMode(tab.dataset.mode));
});

authForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  showError(authError, "");
  const fd = new FormData(authForm);
  const body = JSON.stringify({
    username: fd.get("username"),
    password: fd.get("password"),
  });
  try {
    const path = mode === "login" ? "/api/auth/login" : "/api/auth/register";
    const data = await api(path, { method: "POST", body });
    setSession(data.token);
    renderApp(data.user);
    await loadTodos();
    authForm.reset();
  } catch (err) {
    showError(authError, err.message);
  }
});

document.querySelector("#logout-btn").addEventListener("click", () => {
  clearSession();
  renderAuth();
});

todoForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const title = todoInput.value.trim();
  if (!title) return;
  await api("/api/todos", { method: "POST", body: JSON.stringify({ title }) });
  todoInput.value = "";
  await loadTodos();
});

todoList.addEventListener("click", async (e) => {
  const item = e.target.closest(".todo");
  if (!item) return;
  const id = item.dataset.id;

  if (e.target.classList.contains("check")) {
    const completed = !item.classList.contains("done");
    await api(`/api/todos/${id}`, { method: "PATCH", body: JSON.stringify({ completed }) });
    await loadTodos();
  }

  if (e.target.dataset.action === "delete") {
    await api(`/api/todos/${id}`, { method: "DELETE" });
    await loadTodos();
  }
});

todoList.addEventListener("change", async (e) => {
  if (!e.target.classList.contains("title")) return;
  const item = e.target.closest(".todo");
  const title = e.target.value.trim();
  if (!title) return loadTodos();
  await api(`/api/todos/${item.dataset.id}`, {
    method: "PATCH",
    body: JSON.stringify({ title }),
  });
});

document.querySelectorAll(".filter").forEach((btn) => {
  btn.addEventListener("click", async () => {
    filter = btn.dataset.filter;
    document.querySelectorAll(".filter").forEach((b) => b.classList.toggle("active", b === btn));
    await loadTodos();
  });
});

searchEl.addEventListener("input", () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(async () => {
    search = searchEl.value.trim();
    await loadTodos();
  }, 220);
});

document.querySelector("#clear-completed").addEventListener("click", async () => {
  await api("/api/todos", { method: "DELETE" });
  await loadTodos();
});

boot();
