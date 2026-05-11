const crypto = require("crypto");
const fs = require("fs/promises");
const path = require("path");
const express = require("express");
const { Pool } = require("pg");

const app = express();
const PORT = process.env.PORT || 3000;
const SESSION_COOKIE = "five999_session";
const STATE_COOKIE = "five999_oauth_state";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 14;
const DATA_FILE = path.join(__dirname, "data", "progress.json");
const COURSES_FILE = path.join(__dirname, "data", "courses.json");

const {
  DISCORD_CLIENT_ID,
  DISCORD_CLIENT_SECRET,
  DISCORD_REDIRECT_URI,
  DISCORD_TICKET_URL = "https://discord.com/channels/YOUR_SERVER_ID/YOUR_TICKET_CHANNEL_ID",
  DISCORD_GUILD_ID,
  DISCORD_BOT_TOKEN,
  COMMAND_ROLE_IDS = "",
  LEADERSHIP_ROLE_IDS = "",
  DATABASE_URL,
  SESSION_SECRET = "replace-this-session-secret-before-production",
} = process.env;

const pool = DATABASE_URL
  ? new Pool({
      connectionString: DATABASE_URL,
      ssl: DATABASE_URL.includes("localhost") ? false : { rejectUnauthorized: false },
    })
  : null;

let databaseReady = false;

app.use(express.json({ limit: "100kb" }));

app.get("/", (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.sendFile(path.join(__dirname, "index.html"));
});

app.get("/styles.css", (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.sendFile(path.join(__dirname, "styles.css"));
});

app.get("/app.js", (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.sendFile(path.join(__dirname, "app.js"));
});

app.get("/assets/five999-training-logo.png", (req, res) => {
  res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  res.sendFile(path.join(__dirname, "assets", "five999-training-logo.png"));
});

function parseCookies(req) {
  return Object.fromEntries(
    (req.headers.cookie || "")
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const index = part.indexOf("=");
        if (index === -1) return [part, ""];
        return [part.slice(0, index), decodeURIComponent(part.slice(index + 1))];
      }),
  );
}

function serializeCookie(name, value, options = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`, "Path=/", "HttpOnly", "SameSite=Lax"];
  if (options.maxAge !== undefined) parts.push(`Max-Age=${options.maxAge}`);
  if (process.env.NODE_ENV === "production") parts.push("Secure");
  return parts.join("; ");
}

function base64Url(input) {
  return Buffer.from(input).toString("base64url");
}

function sign(value) {
  return crypto.createHmac("sha256", SESSION_SECRET).update(value).digest("base64url");
}

function createSession(user) {
  const payload = base64Url(
    JSON.stringify({
      id: user.id,
      username: user.username,
      globalName: user.global_name || user.username,
      avatar: user.avatar,
      exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS,
    }),
  );
  return `${payload}.${sign(payload)}`;
}

function verifySession(token) {
  if (!token || !token.includes(".")) return null;
  const [payload, signature] = token.split(".");
  const expected = sign(payload);
  if (signature.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;

  const user = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  if (!user.exp || user.exp < Math.floor(Date.now() / 1000)) return null;
  return user;
}

function requireUser(req, res, next) {
  const user = verifySession(parseCookies(req)[SESSION_COOKIE]);
  if (!user) {
    res.status(401).json({ error: "Sign in with Discord to continue." });
    return;
  }
  req.user = user;
  next();
}

async function ensureDatabase() {
  if (databaseReady || !pool) return;
  await pool.query(`
    create table if not exists training_progress (
      discord_id text primary key,
      username text not null,
      avatar text,
      progress jsonb not null default '{}'::jsonb,
      updated_at timestamptz not null default now()
    )
  `);
  await pool.query(`
    create table if not exists training_courses (
      id integer primary key default 1,
      courses jsonb not null default '[]'::jsonb,
      updated_at timestamptz not null default now()
    )
  `);
  databaseReady = true;
}

function parseRoleIds(value) {
  return value
    .split(",")
    .map((role) => role.trim())
    .filter(Boolean);
}

function hasAnyRole(memberRoleIds, allowedRoleIds) {
  return allowedRoleIds.some((roleId) => memberRoleIds.includes(roleId));
}

function sanitizeUrl(value) {
  const url = String(value || "").trim().slice(0, 1000);
  if (!url) return "";
  try {
    const parsed = new URL(url);
    return ["http:", "https:"].includes(parsed.protocol) ? url : "";
  } catch {
    return "";
  }
}

async function getDiscordRoleIds(discordId) {
  if (!DISCORD_GUILD_ID || !DISCORD_BOT_TOKEN) return [];

  const response = await fetch(
    `https://discord.com/api/guilds/${DISCORD_GUILD_ID}/members/${discordId}`,
    { headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` } },
  );

  if (!response.ok) return [];
  const member = await response.json();
  return member.roles || [];
}

async function getAccess(user) {
  const roles = await getDiscordRoleIds(user.id);
  const commandRoles = parseRoleIds(COMMAND_ROLE_IDS);
  const leadershipRoles = parseRoleIds(LEADERSHIP_ROLE_IDS);
  const isLeadership = hasAnyRole(roles, leadershipRoles);
  const isCommand = isLeadership || hasAnyRole(roles, commandRoles);

  return {
    roles,
    command: isCommand,
    leadership: isLeadership,
    roleChecksConfigured: Boolean(DISCORD_GUILD_ID && DISCORD_BOT_TOKEN),
  };
}

function sanitizeCourses(courses) {
  if (!Array.isArray(courses)) return [];

  return courses.map((course, index) => ({
    id: String(course.id || `training-${Date.now()}-${index}`).replace(/[^a-z0-9-]/gi, "-"),
    service: String(course.service || course.division || "United Kingdom Police Service").slice(0, 120),
    division: String(course.division || "General"),
    icon: String(course.icon || "TR").slice(0, 3).toUpperCase(),
    title: String(course.title || "Untitled Training").slice(0, 90),
    tag: String(course.tag || "Specialist training").slice(0, 120),
    summary: String(course.summary || "").slice(0, 500),
    imageUrl: sanitizeUrl(course.imageUrl),
    resourceUrl: sanitizeUrl(course.resourceUrl),
    modules: Array.isArray(course.modules)
      ? course.modules.map((module) => ({
          title: String(module.title || "Module").slice(0, 90),
          content: String(
            module.content || (Array.isArray(module.body) ? module.body.join("\n") : ""),
          ).slice(0, 3000),
          body: Array.isArray(module.body)
            ? module.body.map((point) => String(point).slice(0, 500)).filter(Boolean)
            : String(module.content || "")
                .split("\n")
                .map((point) => point.trim())
                .filter(Boolean),
          imageUrl: sanitizeUrl(module.imageUrl),
          resourceUrl: sanitizeUrl(module.resourceUrl),
        }))
      : [],
    quiz: Array.isArray(course.quiz)
      ? course.quiz.map((question) => {
          const answers = Array.isArray(question.answers)
            ? question.answers.map((answer) => String(answer).slice(0, 180)).slice(0, 6)
            : [];
          const correct = Math.max(0, Number.isInteger(question.correct) ? question.correct : 0);
          return {
            question: String(question.question || "").slice(0, 240),
            answers,
            correct: Math.min(correct, Math.max(answers.length - 1, 0)),
          };
        })
      : [],
  }));
}

async function getCourses() {
  if (pool) {
    await ensureDatabase();
    const result = await pool.query("select courses from training_courses where id = 1");
    return result.rows[0]?.courses || [];
  }

  try {
    return JSON.parse(await fs.readFile(COURSES_FILE, "utf8"));
  } catch {
    return [];
  }
}

async function saveCourses(courses) {
  const sanitized = sanitizeCourses(courses);

  if (pool) {
    await ensureDatabase();
    await pool.query(
      `
        insert into training_courses (id, courses, updated_at)
        values (1, $1, now())
        on conflict (id) do update set courses = excluded.courses, updated_at = now()
      `,
      [JSON.stringify(sanitized)],
    );
    return sanitized;
  }

  await fs.mkdir(path.dirname(COURSES_FILE), { recursive: true });
  await fs.writeFile(COURSES_FILE, JSON.stringify(sanitized, null, 2));
  return sanitized;
}

async function readFileStore() {
  try {
    return JSON.parse(await fs.readFile(DATA_FILE, "utf8"));
  } catch {
    return {};
  }
}

async function writeFileStore(data) {
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
}

async function getProgress(user) {
  if (pool) {
    await ensureDatabase();
    const result = await pool.query("select progress from training_progress where discord_id = $1", [
      user.id,
    ]);
    return result.rows[0]?.progress || {};
  }

  const data = await readFileStore();
  return data[user.id]?.progress || {};
}

async function saveProgress(user, progress) {
  if (pool) {
    await ensureDatabase();
    await pool.query(
      `
        insert into training_progress (discord_id, username, avatar, progress, updated_at)
        values ($1, $2, $3, $4, now())
        on conflict (discord_id) do update set
          username = excluded.username,
          avatar = excluded.avatar,
          progress = excluded.progress,
          updated_at = now()
      `,
      [user.id, user.globalName || user.username, user.avatar, JSON.stringify(progress || {})],
    );
    return;
  }

  const data = await readFileStore();
  data[user.id] = {
    username: user.globalName || user.username,
    avatar: user.avatar,
    progress: progress || {},
    updatedAt: new Date().toISOString(),
  };
  await writeFileStore(data);
}

app.get("/api/config", (req, res) => {
  res.json({
    discordTicketUrl: DISCORD_TICKET_URL,
    authConfigured: Boolean(DISCORD_CLIENT_ID && DISCORD_CLIENT_SECRET && DISCORD_REDIRECT_URI),
    roleChecksConfigured: Boolean(DISCORD_GUILD_ID && DISCORD_BOT_TOKEN),
  });
});

app.get("/api/me", async (req, res, next) => {
  const user = verifySession(parseCookies(req)[SESSION_COOKIE]);
  try {
    res.json({ user, access: user ? await getAccess(user) : null });
  } catch (error) {
    next(error);
  }
});

app.get("/api/courses", async (req, res, next) => {
  try {
    res.json({ courses: await getCourses() });
  } catch (error) {
    next(error);
  }
});

app.put("/api/courses", requireUser, async (req, res, next) => {
  try {
    const access = await getAccess(req.user);
    if (!access.command) {
      res.status(403).json({ error: "Command or Leadership role required." });
      return;
    }

    const currentCourses = await getCourses();
    const incomingCourses = sanitizeCourses(req.body.courses || []);

    if (!access.leadership) {
      const incomingIds = incomingCourses.map((course) => course.id);
      const removedExistingTraining = currentCourses.some((course) => !incomingIds.includes(course.id));
      if (removedExistingTraining) {
        res.status(403).json({ error: "Only Leadership Team can delete trainings or divisions." });
        return;
      }
    }

    res.json({ courses: await saveCourses(incomingCourses) });
  } catch (error) {
    next(error);
  }
});

app.get("/api/progress", requireUser, async (req, res, next) => {
  try {
    res.json({ progress: await getProgress(req.user) });
  } catch (error) {
    next(error);
  }
});

app.put("/api/progress", requireUser, async (req, res, next) => {
  try {
    await saveProgress(req.user, req.body.progress || {});
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.post("/auth/logout", (req, res) => {
  res.setHeader("Set-Cookie", serializeCookie(SESSION_COOKIE, "", { maxAge: 0 }));
  res.json({ ok: true });
});

app.get("/auth/discord", (req, res) => {
  if (!DISCORD_CLIENT_ID || !DISCORD_REDIRECT_URI) {
    res.status(500).send("Discord OAuth is not configured yet.");
    return;
  }

  const state = crypto.randomBytes(24).toString("base64url");
  const params = new URLSearchParams({
    client_id: DISCORD_CLIENT_ID,
    redirect_uri: DISCORD_REDIRECT_URI,
    response_type: "code",
    scope: "identify",
    state,
  });

  res.setHeader("Set-Cookie", serializeCookie(STATE_COOKIE, state, { maxAge: 600 }));
  res.redirect(`https://discord.com/oauth2/authorize?${params.toString()}`);
});

app.get("/auth/discord/callback", async (req, res, next) => {
  try {
    const { code, state } = req.query;
    const cookies = parseCookies(req);

    if (!code || !state || state !== cookies[STATE_COOKIE]) {
      res.status(400).send("Discord sign-in could not be verified.");
      return;
    }

    const tokenResponse = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: DISCORD_CLIENT_ID,
        client_secret: DISCORD_CLIENT_SECRET,
        grant_type: "authorization_code",
        code,
        redirect_uri: DISCORD_REDIRECT_URI,
      }),
    });

    if (!tokenResponse.ok) {
      res.status(502).send("Discord token exchange failed.");
      return;
    }

    const token = await tokenResponse.json();
    const userResponse = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${token.access_token}` },
    });

    if (!userResponse.ok) {
      res.status(502).send("Discord user lookup failed.");
      return;
    }

    const user = await userResponse.json();
    res.setHeader("Set-Cookie", [
      serializeCookie(SESSION_COOKIE, createSession(user), { maxAge: SESSION_MAX_AGE_SECONDS }),
      serializeCookie(STATE_COOKIE, "", { maxAge: 0 }),
    ]);
    res.redirect("/");
  } catch (error) {
    next(error);
  }
});

app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({ error: "Something went wrong." });
});

app.listen(PORT, () => {
  console.log(`Five999 training dashboard running on port ${PORT}`);
});
