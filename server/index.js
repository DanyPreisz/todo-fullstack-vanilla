import { URL } from "node:url";
import db from "./db.js";
import { createApp, readJson, sendEmpty, sendJson, serveStatic } from "./http.js";
import { getUserFromRequest, hashPassword, signToken, verifyPassword } from "./middleware/auth.js";

const PORT = process.env.PORT || 3000;
const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;

function mapTodo(row) {
  return {
    id: row.id,
    title: row.title,
    completed: Boolean(row.completed),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function requireUser(req, res) {
  const user = getUserFromRequest(req);
  if (!user) {
    sendJson(res, 401, { error: "No autenticado" });
    return null;
  }
  return user;
}

const server = createApp(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const { pathname, searchParams } = url;
  const method = req.method || "GET";

  if (!pathname.startsWith("/api/")) {
    serveStatic(req, res);
    return;
  }

  if (method === "POST" && pathname === "/api/auth/register") {
    const body = await readJson(req);
    const username = String(body.username || "").trim();
    const password = String(body.password || "");
    if (!USERNAME_RE.test(username)) {
      return sendJson(res, 400, { error: "Usuario: 3-20 caracteres, solo letras, números y _" });
    }
    if (password.length < 6) {
      return sendJson(res, 400, { error: "La contraseña debe tener al menos 6 caracteres" });
    }
    const exists = db.prepare("SELECT id FROM users WHERE username = ?").get(username);
    if (exists) return sendJson(res, 409, { error: "Ese usuario ya existe" });
    const result = db
      .prepare("INSERT INTO users (username, password_hash) VALUES (?, ?)")
      .run(username, hashPassword(password));
    const user = { id: Number(result.lastInsertRowid), username };
    return sendJson(res, 201, { user, token: signToken(user) });
  }

  if (method === "POST" && pathname === "/api/auth/login") {
    const body = await readJson(req);
    const username = String(body.username || "").trim();
    const password = String(body.password || "");
    const row = db
      .prepare("SELECT id, username, password_hash FROM users WHERE username = ?")
      .get(username);
    if (!row || !verifyPassword(password, row.password_hash)) {
      return sendJson(res, 401, { error: "Usuario o contraseña incorrectos" });
    }
    const user = { id: row.id, username: row.username };
    return sendJson(res, 200, { user, token: signToken(user) });
  }

  if (method === "GET" && pathname === "/api/auth/me") {
    const user = requireUser(req, res);
    if (!user) return;
    const row = db.prepare("SELECT id, username, created_at FROM users WHERE id = ?").get(user.id);
    if (!row) return sendJson(res, 401, { error: "Usuario no encontrado" });
    return sendJson(res, 200, { user: row });
  }

  if (pathname === "/api/todos" || pathname.startsWith("/api/todos/")) {
    const user = requireUser(req, res);
    if (!user) return;

    if (method === "GET" && pathname === "/api/todos") {
      const filter = String(searchParams.get("filter") || "all");
      const q = String(searchParams.get("q") || "").trim();
      let sql = "SELECT * FROM todos WHERE user_id = ?";
      const params = [user.id];
      if (filter === "active") sql += " AND completed = 0";
      if (filter === "completed") sql += " AND completed = 1";
      if (q) {
        sql += " AND title LIKE ? ESCAPE '\\'";
        params.push(`%${q.replaceAll("\\", "\\\\").replaceAll("%", "\\%").replaceAll("_", "\\_")}%`);
      }
      sql += " ORDER BY completed ASC, created_at DESC";
      const rows = db.prepare(sql).all(...params);
      const counts = db
        .prepare(
          `SELECT
             COUNT(*) AS total,
             SUM(CASE WHEN completed = 0 THEN 1 ELSE 0 END) AS active,
             SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) AS completed
           FROM todos WHERE user_id = ?`
        )
        .get(user.id);
      return sendJson(res, 200, {
        todos: rows.map(mapTodo),
        counts: {
          total: counts.total || 0,
          active: counts.active || 0,
          completed: counts.completed || 0,
        },
      });
    }

    if (method === "POST" && pathname === "/api/todos") {
      const body = await readJson(req);
      const title = String(body.title || "").trim();
      if (!title) return sendJson(res, 400, { error: "El título es obligatorio" });
      if (title.length > 200) return sendJson(res, 400, { error: "Máximo 200 caracteres" });
      const result = db.prepare("INSERT INTO todos (user_id, title) VALUES (?, ?)").run(user.id, title);
      const row = db.prepare("SELECT * FROM todos WHERE id = ?").get(result.lastInsertRowid);
      return sendJson(res, 201, { todo: mapTodo(row) });
    }

    if (method === "DELETE" && pathname === "/api/todos") {
      db.prepare("DELETE FROM todos WHERE user_id = ? AND completed = 1").run(user.id);
      return sendEmpty(res, 204);
    }

    const match = pathname.match(/^\/api\/todos\/(\d+)$/);
    if (match) {
      const id = Number(match[1]);
      if (method === "PATCH") {
        const existing = db
          .prepare("SELECT * FROM todos WHERE id = ? AND user_id = ?")
          .get(id, user.id);
        if (!existing) return sendJson(res, 404, { error: "Tarea no encontrada" });
        const body = await readJson(req);
        const nextTitle = body.title !== undefined ? String(body.title).trim() : existing.title;
        const nextCompleted = body.completed !== undefined ? (body.completed ? 1 : 0) : existing.completed;
        if (!nextTitle) return sendJson(res, 400, { error: "El título no puede estar vacío" });
        if (nextTitle.length > 200) return sendJson(res, 400, { error: "Máximo 200 caracteres" });
        db.prepare(
          "UPDATE todos SET title = ?, completed = ?, updated_at = datetime('now') WHERE id = ? AND user_id = ?"
        ).run(nextTitle, nextCompleted, id, user.id);
        const row = db.prepare("SELECT * FROM todos WHERE id = ?").get(id);
        return sendJson(res, 200, { todo: mapTodo(row) });
      }
      if (method === "DELETE") {
        const result = db.prepare("DELETE FROM todos WHERE id = ? AND user_id = ?").run(id, user.id);
        if (result.changes === 0) return sendJson(res, 404, { error: "Tarea no encontrada" });
        return sendEmpty(res, 204);
      }
    }
  }

  sendJson(res, 404, { error: "Ruta no encontrada" });
});

const HOST = process.env.HOST || "0.0.0.0";
server.listen(Number(PORT), HOST, () => {
  console.log(`To-Do fullstack en http://${HOST}:${PORT}`);
});
