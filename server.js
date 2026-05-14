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
  DISCORD_GUILD_ID,
  DISCORD_BOT_TOKEN,
  COMMAND_ROLE_IDS = "",
  LEADERSHIP_ROLE_IDS = "",
  DISCORD_DM_NOTIFICATIONS = "false",
  FMS_API_BASE_URL = "",
  FMS_API_TOKEN = "",
  DATABASE_URL,
  SESSION_SECRET = "replace-this-session-secret-before-production",
} = process.env;

const OLD_EXAMPLE_TRAINING_IDS = new Set([
  "rpu",
  "ambulance-clinical-response",
  "fire-incident-command",
  "sar-search-planning",
  "highways-traffic-management",
  "ntp-rail-response",
]);

const pool = DATABASE_URL
  ? new Pool({
      connectionString: DATABASE_URL,
      ssl: DATABASE_URL.includes("localhost") ? false : { rejectUnauthorized: false },
    })
  : null;

let databaseReady = false;

app.use(express.json({ limit: "120mb" }));

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
  const rawUrl = String(value || "").trim();
  if (/^data:image\/(png|jpeg|jpg|webp|gif);base64,[a-z0-9+/=]+$/i.test(rawUrl)) {
    return rawUrl.slice(0, 12_000_000);
  }
  const url = rawUrl.slice(0, 1000);
  if (!url) return "";
  try {
    const parsed = new URL(url);
    return ["http:", "https:"].includes(parsed.protocol) ? url : "";
  } catch {
    return "";
  }
}

function parseNumericIds(value) {
  return (Array.isArray(value) ? value : String(value || "").split(","))
    .map((item) => Number(item))
    .filter((item) => Number.isInteger(item) && item > 0);
}

function sanitizeExpiryDate(value) {
  const date = String(value || "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : "";
}

function fmsApiUrl(route) {
  const base = FMS_API_BASE_URL.trim().replace(/\/+$/, "");
  if (!base) return "";
  const frameworkBase = base.endsWith("/frameworkapi") ? base : `${base}/frameworkapi`;
  return `${frameworkBase}${route}`;
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

  return courses.filter((course) => !OLD_EXAMPLE_TRAINING_IDS.has(course.id)).map((course, index) => ({
    id: String(course.id || `training-${Date.now()}-${index}`).replace(/[^a-z0-9-]/gi, "-"),
    service: String(course.service || course.division || "United Kingdom Police Service").slice(0, 120),
    division: String(course.division || "General"),
    icon: String(course.icon || "TR").slice(0, 3).toUpperCase(),
    title: String(course.title || "Untitled Training").slice(0, 90),
    tag: String(course.tag || "Specialist training").slice(0, 120),
    summary: String(course.summary || "").slice(0, 500),
    published: course.published !== false,
    imageUrl: sanitizeUrl(course.imageUrl),
    resourceUrl: sanitizeUrl(course.resourceUrl),
    theoryFmsTrainingGroupIds: parseNumericIds(course.theoryFmsTrainingGroupIds),
    fmsTrainingGroupIds: parseNumericIds(course.fmsTrainingGroupIds),
    fmsTrainingNote: String(course.fmsTrainingNote || "").slice(0, 500),
    fmsTrainingExpiryDate: sanitizeExpiryDate(course.fmsTrainingExpiryDate),
    fmsAutoRemoveOnExpiry: course.fmsAutoRemoveOnExpiry !== false,
    quizEnabled: course.quizEnabled !== false,
    practicalRequired: course.practicalRequired === true,
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
  const clean = (items) => sanitizeCourses(items);

  if (pool) {
    await ensureDatabase();
    const result = await pool.query("select courses from training_courses where id = 1");
    return clean(result.rows[0]?.courses || []);
  }

  try {
    return clean(JSON.parse(await fs.readFile(COURSES_FILE, "utf8")));
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

async function sendDiscordDm(discordId, message) {
  if (DISCORD_DM_NOTIFICATIONS !== "true" || !DISCORD_BOT_TOKEN) return;

  const channelResponse = await fetch("https://discord.com/api/users/@me/channels", {
    method: "POST",
    headers: {
      Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ recipient_id: discordId }),
  });

  if (!channelResponse.ok) return;
  const channel = await channelResponse.json();

  await fetch(`https://discord.com/api/channels/${channel.id}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ content: message.slice(0, 1900) }),
  });
}

async function fmsRequest(route, options = {}) {
  const url = fmsApiUrl(route);
  const token = FMS_API_TOKEN.trim();
  if (!url || !token) return null;

  const response = await fetch(url, {
    ...options,
    headers: {
      Accept: "application/json, text/plain;q=0.9, */*;q=0.8",
      "User-Agent": "Five999-Training-Dashboard/1.0",
      "api-token": token,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!response.ok) {
    const error = new Error(typeof data === "string" ? data : `FMS request failed with status ${response.status}`);
    error.status = response.status;
    throw error;
  }

  return data;
}

async function addFmsTrainingGroups(user, course, groupIds, note, message) {
  groupIds = parseNumericIds(groupIds);
  if (!groupIds.length || !FMS_API_BASE_URL || !FMS_API_TOKEN) return null;

  const lookup = await fmsRequest(`/training/groups/user?discordid=${encodeURIComponent(user.id)}`);
  const existingIds = new Set((lookup?.data || []).map((group) => Number(group.id)));
  const missingIds = groupIds.filter((groupId) => !existingIds.has(groupId));

  if (!missingIds.length) {
    return {
      ok: true,
      skipped: true,
      message: `FMS user already has the configured ${message}.`,
      groupIds,
      syncedAt: new Date().toISOString(),
    };
  }

  const body = {
    discordid: user.id,
    groupids: missingIds,
    note:
      note ||
      `Automatically awarded after passing ${course.title} through Five999 Training Hub.`,
    autoremoveonexpiry: course.fmsAutoRemoveOnExpiry !== false,
  };
  if (course.fmsTrainingExpiryDate) body.expirydate = course.fmsTrainingExpiryDate;

  await fmsRequest("/training/groups/user/add", {
    method: "POST",
    body: JSON.stringify(body),
  });

  return {
    ok: true,
    skipped: false,
    message: `FMS ${message} added.`,
    groupIds: missingIds,
    syncedAt: new Date().toISOString(),
  };
}

async function addFinalFmsTrainingGroups(user, course) {
  return addFmsTrainingGroups(user, course, course.fmsTrainingGroupIds, course.fmsTrainingNote, "training group(s)");
}

async function addTheoryFmsTrainingGroups(user, course) {
  return addFmsTrainingGroups(
    user,
    course,
    course.theoryFmsTrainingGroupIds,
    `Theory passed for ${course.title}; awaiting in-game practical.`,
    "theory/awaiting practical group(s)",
  );
}

async function syncNewFmsCompletions(user, oldProgress, nextProgress, courses) {
  const courseMap = new Map(courses.map((course) => [course.id, course]));
  const newlyCompleted = Object.entries(nextProgress || {}).filter(([courseId, item]) => {
    return item?.passed && !oldProgress?.[courseId]?.passed && courseMap.has(courseId);
  });

  for (const [courseId, courseProgress] of newlyCompleted) {
    const course = courseMap.get(courseId);
    try {
      const result = await addFinalFmsTrainingGroups(user, course);
      if (result) {
        courseProgress.fmsTrainingSync = result;
      }
    } catch (error) {
      courseProgress.fmsTrainingSync = {
        ok: false,
        message: error.message || "FMS training group sync failed.",
        syncedAt: new Date().toISOString(),
      };
    }

  }
}

async function syncNewFmsTheoryPasses(user, oldProgress, nextProgress, courses) {
  const courseMap = new Map(courses.map((course) => [course.id, course]));
  const newlyTheoryPassed = Object.entries(nextProgress || {}).filter(([courseId, item]) => {
    return item?.theoryPassed && !oldProgress?.[courseId]?.theoryPassed && courseMap.has(courseId);
  });

  for (const [courseId, courseProgress] of newlyTheoryPassed) {
    const course = courseMap.get(courseId);
    try {
      const result = await addTheoryFmsTrainingGroups(user, course);
      if (result) {
        courseProgress.fmsTheorySync = result;
      }
    } catch (error) {
      courseProgress.fmsTheorySync = {
        ok: false,
        message: error.message || "FMS theory training group sync failed.",
        syncedAt: new Date().toISOString(),
      };
    }
  }
}

async function notifyNewCompletions(user, oldProgress, nextProgress, courses) {
  const courseMap = new Map(courses.map((course) => [course.id, course]));
  const newlyCompleted = Object.entries(nextProgress || {}).filter(([courseId, item]) => {
    return item?.passed && !oldProgress?.[courseId]?.passed && courseMap.has(courseId);
  });

  for (const [courseId, item] of newlyCompleted) {
    const course = courseMap.get(courseId);
    await sendDiscordDm(
      user.id,
      [
        `Five999 Training completed: ${course.title}`,
        `Completed as: ${user.globalName || user.username}`,
        item.quizScore === null ? "No quiz was required." : `Score: ${item.quizScore}%`,
        `Date: ${item.completedAt || new Date().toLocaleString("en-GB")}`,
        "Your FMS training group has been updated where configured.",
      ].join("\n"),
    );
  }
}

async function getAllProgressRows() {
  if (pool) {
    await ensureDatabase();
    const result = await pool.query(
      "select discord_id, username, avatar, progress, updated_at from training_progress order by updated_at desc",
    );
    return result.rows.map((row) => ({
      discordId: row.discord_id,
      username: row.username,
      avatar: row.avatar,
      progress: row.progress || {},
      updatedAt: row.updated_at,
    }));
  }

  const data = await readFileStore();
  return Object.entries(data).map(([discordId, row]) => ({
    discordId,
    username: row.username || "Unknown user",
    avatar: row.avatar || null,
    progress: row.progress || {},
    updatedAt: row.updatedAt || null,
  }));
}

function buildStats(courses, progressRows) {
  const courseMap = new Map(courses.map((course) => [course.id, course]));
  const feedback = [];
  const practicalAssessments = [];
  const courseStats = courses.map((course) => ({
    id: course.id,
    title: course.title,
    service: course.service,
    division: course.division,
    quizEnabled: course.quizEnabled !== false,
    started: 0,
    completed: 0,
    passed: 0,
    averageScore: null,
    passRate: 0,
  }));
  const courseStatsMap = new Map(courseStats.map((course) => [course.id, course]));

  const users = progressRows.map((row) => {
    let started = 0;
    let completed = 0;
    let passed = 0;
    const scores = [];
    const completedCourses = [];
    const history = [];

    for (const [courseId, progress] of Object.entries(row.progress || {})) {
      const course = courseMap.get(courseId);
      if (!course) continue;
      const stats = courseStatsMap.get(courseId);
      const hasStarted = (progress.readModules || []).length > 0 || progress.quizScore !== null;
      if (hasStarted) {
        started += 1;
        stats.started += 1;
      }
      history.push({
        courseId,
        courseTitle: course.title,
        service: course.service,
        division: course.division,
        status: progress.passed
          ? "Completed"
          : course.practicalRequired && progress.theoryPassed
            ? "Practical required"
            : hasStarted
              ? "In progress"
              : "Not started",
        theoryPassedAt: progress.theoryPassedAt || "",
        practicalStatus: progress.practicalStatus || "",
        completedAt: progress.completedAt || "",
        quizScore: typeof progress.quizScore === "number" ? progress.quizScore : null,
      });
      if (progress.passed) {
        completed += 1;
        passed += 1;
        stats.completed += 1;
        stats.passed += 1;
        completedCourses.push(course.title);
      }
      if (typeof progress.quizScore === "number") {
        scores.push(progress.quizScore);
      }
      if (progress.feedback && (progress.feedback.rating || progress.feedback.comment)) {
        feedback.push({
          discordId: row.discordId,
          username: row.username,
          courseId,
          courseTitle: course.title,
          service: course.service,
          rating: progress.feedback.rating || "",
          comment: progress.feedback.comment || "",
          submittedAt: progress.feedback.submittedAt || row.updatedAt || null,
        });
      }
      if (course.practicalRequired && progress.theoryPassed && !progress.passed) {
        practicalAssessments.push({
          discordId: row.discordId,
          username: row.username,
          courseId,
          courseTitle: course.title,
          service: course.service,
          status: progress.practicalStatus || "pending",
          theoryPassedAt: progress.theoryPassedAt || row.updatedAt || null,
          assessedAt: progress.practicalAssessedAt || "",
          assessedBy: progress.practicalAssessedBy || "",
        });
      }
    }

    return {
      discordId: row.discordId,
      username: row.username,
      started,
      completed,
      passed,
      passRate: completed ? Math.round((passed / completed) * 100) : 0,
      averageScore: scores.length
        ? Math.round(scores.reduce((total, score) => total + score, 0) / scores.length)
        : null,
      completedCourses,
      history,
      updatedAt: row.updatedAt,
    };
  });

  for (const stats of courseStats) {
    const scores = progressRows
      .map((row) => row.progress?.[stats.id]?.quizScore)
      .filter((score) => typeof score === "number");
    stats.averageScore = scores.length
      ? Math.round(scores.reduce((total, score) => total + score, 0) / scores.length)
      : null;
    stats.passRate = stats.completed ? Math.round((stats.passed / stats.completed) * 100) : 0;
  }

  return {
    totals: {
      users: users.length,
      trainings: courses.length,
      completions: users.reduce((total, user) => total + user.completed, 0),
      averageUserPassRate: users.length
        ? Math.round(users.reduce((total, user) => total + user.passRate, 0) / users.length)
        : 0,
    },
    courses: courseStats,
    users,
    practicalAssessments: practicalAssessments.sort((a, b) =>
      String(b.theoryPassedAt || "").localeCompare(String(a.theoryPassedAt || "")),
    ),
    feedback: feedback.sort((a, b) => String(b.submittedAt || "").localeCompare(String(a.submittedAt || ""))),
  };
}

function protectPracticalProgress(oldProgress, nextProgress, courses) {
  const practicalCourseIds = new Set(courses.filter((course) => course.practicalRequired).map((course) => course.id));
  for (const courseId of practicalCourseIds) {
    const incoming = nextProgress?.[courseId];
    if (!incoming) continue;
    const existing = oldProgress?.[courseId];
    if (!existing?.passed && incoming.passed) {
      incoming.passed = false;
      incoming.completedAt = null;
      if (existing?.theoryPassed || incoming.theoryPassed) {
        incoming.theoryPassed = true;
        incoming.practicalStatus = incoming.practicalStatus || "pending";
      } else {
        incoming.practicalStatus = "";
      }
    }
  }
  return nextProgress;
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

async function saveProgressRow(row, progress) {
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
      [row.discordId, row.username || "Unknown user", row.avatar || null, JSON.stringify(progress || {})],
    );
    return;
  }

  const data = await readFileStore();
  data[row.discordId] = {
    username: row.username || "Unknown user",
    avatar: row.avatar || null,
    progress: progress || {},
    updatedAt: new Date().toISOString(),
  };
  await writeFileStore(data);
}

app.get("/api/config", (req, res) => {
  res.json({
    authConfigured: Boolean(DISCORD_CLIENT_ID && DISCORD_CLIENT_SECRET && DISCORD_REDIRECT_URI),
    roleChecksConfigured: Boolean(DISCORD_GUILD_ID && DISCORD_BOT_TOKEN),
    dmNotificationsConfigured: DISCORD_DM_NOTIFICATIONS === "true" && Boolean(DISCORD_BOT_TOKEN),
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
    const user = verifySession(parseCookies(req)[SESSION_COOKIE]);
    const access = user ? await getAccess(user) : null;
    const courses = await getCourses();
    res.json({
      courses: access?.command ? courses : courses.filter((course) => course.published !== false),
    });
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
    let incomingCourses = sanitizeCourses(req.body.courses || []);

    if (!access.leadership) {
      const incomingIds = new Set(incomingCourses.map((course) => course.id));
      const preservedCourses = currentCourses.filter((course) => !incomingIds.has(course.id));
      incomingCourses = [...incomingCourses, ...preservedCourses];
    }

    res.json({ courses: await saveCourses(incomingCourses) });
  } catch (error) {
    next(error);
  }
});

app.get("/api/stats", requireUser, async (req, res, next) => {
  try {
    const access = await getAccess(req.user);
    if (!access.command) {
      res.status(403).json({ error: "Command or Leadership role required." });
      return;
    }

    res.json({ stats: buildStats(await getCourses(), await getAllProgressRows()) });
  } catch (error) {
    next(error);
  }
});

app.post("/api/practical-assessments", requireUser, async (req, res, next) => {
  try {
    const access = await getAccess(req.user);
    if (!access.command) {
      res.status(403).json({ error: "Command or Leadership role required." });
      return;
    }

    const { discordId, courseId, status } = req.body || {};
    if (!discordId || !courseId || !["passed", "failed"].includes(status)) {
      res.status(400).json({ error: "Discord ID, course ID, and practical status are required." });
      return;
    }

    const courses = await getCourses();
    const course = courses.find((item) => item.id === courseId && item.practicalRequired);
    if (!course) {
      res.status(404).json({ error: "Practical training course not found." });
      return;
    }

    const rows = await getAllProgressRows();
    const row = rows.find((item) => item.discordId === discordId);
    const oldProgress = JSON.parse(JSON.stringify(row?.progress || {}));
    const nextProgress = JSON.parse(JSON.stringify(row?.progress || {}));
    const courseProgress = nextProgress[courseId];

    if (!row || !courseProgress?.theoryPassed) {
      res.status(400).json({ error: "Player must pass the theory stage before practical assessment." });
      return;
    }

    courseProgress.practicalStatus = status;
    courseProgress.practicalAssessedAt = new Date().toLocaleString("en-GB", {
      dateStyle: "medium",
      timeStyle: "short",
    });
    courseProgress.practicalAssessedBy = req.user.globalName || req.user.username;

    if (status === "passed") {
      courseProgress.passed = true;
      courseProgress.completedAt = courseProgress.practicalAssessedAt;
    } else {
      courseProgress.passed = false;
      courseProgress.completedAt = null;
    }

    await syncNewFmsCompletions(
      { id: discordId, username: row.username, globalName: row.username },
      oldProgress,
      nextProgress,
      courses,
    );
    await saveProgressRow(row, nextProgress);
    notifyNewCompletions(
      { id: discordId, username: row.username, globalName: row.username },
      oldProgress,
      nextProgress,
      courses,
    ).catch(console.error);

    res.json({ ok: true, stats: buildStats(courses, await getAllProgressRows()) });
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
    const oldProgress = await getProgress(req.user);
    const nextProgress = req.body.progress || {};
    const courses = await getCourses();
    const protectedProgress = protectPracticalProgress(oldProgress, nextProgress, courses);
    await syncNewFmsTheoryPasses(req.user, oldProgress, protectedProgress, courses);
    await syncNewFmsCompletions(req.user, oldProgress, protectedProgress, courses);
    await saveProgress(req.user, protectedProgress);
    notifyNewCompletions(req.user, oldProgress, protectedProgress, courses).catch(console.error);
    res.json({ ok: true, progress: protectedProgress });
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
  if (error.type === "entity.too.large") {
    res.status(413).json({ error: "The training is too large to save. Try using smaller images." });
    return;
  }
  res.status(500).json({ error: "Something went wrong." });
});

app.listen(PORT, () => {
  console.log(`Five999 training dashboard running on port ${PORT}`);
});
