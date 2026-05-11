let DISCORD_TICKET_URL = "https://discord.com/channels/YOUR_SERVER_ID/YOUR_TICKET_CHANNEL_ID";
const PASS_MARK = 80;

const serviceSections = [
  "United Kingdom Police Service",
  "United Kingdom Ambulance Service",
  "United Kingdom Fire and Rescue Service",
  "UK Search & Rescue",
  "UK Highways",
  "National Transport Police",
];

const oldExampleTrainingIds = new Set([
  "rpu",
  "ambulance-clinical-response",
  "fire-incident-command",
  "sar-search-planning",
  "highways-traffic-management",
  "ntp-rail-response",
]);

let courses = [];
let selectedService = serviceSections[0];
let expandedServices = new Set([serviceSections[0]]);
let selectedCourseId = "";
let selectedModuleIndex = 0;
let progress = {};
let currentUser = null;
let currentAccess = null;
let authConfigured = false;
let selectedManagerCourseId = "";
let adminMode = false;
let adminView = "editor";
let statsLoaded = false;

const courseList = document.getElementById("courseList");
const courseTitle = document.getElementById("courseTitle");
const courseTag = document.getElementById("courseTag");
const courseHeading = document.getElementById("courseHeading");
const courseSummary = document.getElementById("courseSummary");
const courseMedia = document.getElementById("courseMedia");
const heroArt = document.getElementById("heroArt");
const moduleProgress = document.getElementById("moduleProgress");
const quizProgress = document.getElementById("quizProgress");
const certificateProgress = document.getElementById("certificateProgress");
const moduleTabs = document.getElementById("moduleTabs");
const moduleBody = document.getElementById("moduleBody");
const markRead = document.getElementById("markRead");
const quizForm = document.getElementById("quizForm");
const scorePill = document.getElementById("scorePill");
const completionPanel = document.getElementById("completionPanel");
const certificateMessage = document.getElementById("certificateMessage");
const ticketLink = document.getElementById("ticketLink");
const accountActions = document.getElementById("accountActions");
const authPanel = document.getElementById("authPanel");
const managementPanel = document.getElementById("managementPanel");
const managementAccess = document.getElementById("managementAccess");
const managerCourseSelect = document.getElementById("managerCourseSelect");
const managerService = document.getElementById("managerService");
const newTrainingButton = document.getElementById("newTrainingButton");
const deleteTrainingButton = document.getElementById("deleteTrainingButton");
const addModuleButton = document.getElementById("addModuleButton");
const addQuestionButton = document.getElementById("addQuestionButton");
const moduleBuilder = document.getElementById("moduleBuilder");
const quizBuilder = document.getElementById("quizBuilder");
const managerForm = document.getElementById("managerForm");
const managerResult = document.getElementById("managerResult");
const trainingAreas = [...document.querySelectorAll(".training-area")];
const adminSidebarPanel = document.getElementById("adminSidebarPanel");
const sidebarAdminButton = document.getElementById("sidebarAdminButton");
const sidebarAnalyticsButton = document.getElementById("sidebarAnalyticsButton");
const analyticsPanel = document.getElementById("analyticsPanel");
const editorPanel = document.getElementById("editorPanel");
const refreshStatsButton = document.getElementById("refreshStatsButton");
const statsSummary = document.getElementById("statsSummary");
const statsCourseBody = document.getElementById("statsCourseBody");
const statsUserBody = document.getElementById("statsUserBody");

ticketLink.href = DISCORD_TICKET_URL;

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    credentials: "same-origin",
    ...options,
  });

  if (!response.ok) {
    throw new Error((await response.json().catch(() => ({}))).error || "Request failed");
  }

  return response.json();
}

function isSignedIn() {
  return Boolean(currentUser);
}

function canManageTrainings() {
  return Boolean(currentAccess?.command);
}

function canDeleteTrainings() {
  return Boolean(currentAccess?.leadership);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function safeUrl(value) {
  const url = String(value || "").trim();
  if (!url) return "";
  if (/^data:image\/(png|jpeg|jpg|webp|gif);base64,/i.test(url)) return url;
  try {
    const parsed = new URL(url);
    return ["http:", "https:"].includes(parsed.protocol) ? url : "";
  } catch {
    return "";
  }
}

function normalizeCourse(course) {
  return {
    ...course,
    service: course.service || serviceSections[0],
    division: course.division || "General",
    imageUrl: course.imageUrl || "",
    resourceUrl: course.resourceUrl || "",
    quizEnabled: course.quizEnabled !== false,
    modules: (course.modules || []).map((module) => ({
      ...module,
      content: module.content || (Array.isArray(module.body) ? module.body.join("\n") : ""),
      imageUrl: module.imageUrl || "",
      resourceUrl: module.resourceUrl || "",
    })),
    quiz: course.quiz || [],
  };
}

function normalizeCourses() {
  courses = courses.map(normalizeCourse);
}

function removeOldExampleTrainings(items) {
  return (items || []).filter((course) => !oldExampleTrainingIds.has(course.id));
}

function getCourse() {
  return courses.find((course) => course.id === selectedCourseId) || courses[0];
}

function getCourseProgress(courseId) {
  if (!progress[courseId]) {
    progress[courseId] = {
      readModules: [],
      quizScore: null,
      passed: false,
      completedAt: null,
    };
  }
  return progress[courseId];
}

function saveProgress() {
  if (!isSignedIn()) return;
  api("/api/progress", {
    method: "PUT",
    body: JSON.stringify({ progress }),
  }).catch(() => {
    localStorage.setItem("five999TrainingProgressBackup", JSON.stringify(progress));
  });
}

function renderAccount() {
  authPanel.hidden = isSignedIn();
  adminSidebarPanel.hidden = !canManageTrainings();

  if (!authConfigured) {
    accountActions.innerHTML = `<span class="account-warning">Discord OAuth needs Render env vars</span>`;
    adminSidebarPanel.hidden = true;
    authPanel.hidden = false;
    authPanel.querySelector("h2").textContent = "Discord sign-in is not configured yet.";
    authPanel.querySelector("p:last-child").textContent =
      "Add your Discord application credentials in Render, then players will be able to sign in and save progress.";
    authPanel.querySelector("a").style.display = "none";
    return;
  }

  if (!isSignedIn()) {
    accountActions.innerHTML = "";
    adminSidebarPanel.hidden = true;
    authPanel.querySelector("a").style.display = "";
    return;
  }

  const displayName = escapeHtml(currentUser.globalName || currentUser.username);
  const roleLabel = currentAccess?.leadership
    ? "Leadership Team"
    : currentAccess?.command
      ? "Command"
      : "Player";
  accountActions.innerHTML = `
    <span class="account-chip">Signed in as <strong>${displayName}</strong> &middot; ${roleLabel}</span>
    ${
      canManageTrainings()
        ? `<button class="ghost-button" id="dashboardModeButton" type="button">Training Dashboard</button>`
        : ""
    }
    <button class="ghost-button" id="resetProgress" type="button" title="Clear saved progress">Reset Progress</button>
    <button class="ghost-button" id="logoutButton" type="button">Log Out</button>
  `;

  document.getElementById("dashboardModeButton")?.addEventListener("click", () => {
    adminMode = false;
    render();
  });

  document.getElementById("resetProgress").addEventListener("click", () => {
    progress = {};
    saveProgress();
    selectedModuleIndex = 0;
    render();
  });

  document.getElementById("logoutButton").addEventListener("click", async () => {
    await api("/auth/logout", { method: "POST" });
    window.location.reload();
  });
}

function createBlankTraining() {
  return {
    id: `training-${Date.now()}`,
    service: selectedService || serviceSections[0],
    division: "New Subdivision",
    icon: "TR",
    title: "New Specialist Training",
    tag: "Specialist training",
    summary: "Add the training summary here.",
    imageUrl: "",
    resourceUrl: "",
    quizEnabled: true,
    modules: [
      {
        title: "Module One",
        content: "Add the briefing content here.",
        imageUrl: "",
        resourceUrl: "",
      },
    ],
    quiz: [
      {
        question: "Add your first quiz question here.",
        answers: ["Correct answer", "Incorrect answer", "Incorrect answer", "Incorrect answer"],
        correct: 0,
      },
    ],
  };
}

function getManagerCourse() {
  return courses.find((course) => course.id === selectedManagerCourseId) || courses[0];
}

function renderMedia(imageUrl, resourceUrl) {
  const parts = [];
  const safeImageUrl = safeUrl(imageUrl);
  const safeResourceUrl = safeUrl(resourceUrl);
  if (safeImageUrl) {
    parts.push(`<img class="training-image" src="${escapeHtml(safeImageUrl)}" alt="" loading="lazy" />`);
  }
  if (safeResourceUrl) {
    parts.push(
      `<a class="resource-link" href="${escapeHtml(safeResourceUrl)}" target="_blank" rel="noreferrer">Open Resource</a>`,
    );
  }
  return parts.join("");
}

function renderHeroImage(imageUrl) {
  const safeImageUrl = safeUrl(imageUrl);
  if (safeImageUrl) {
    heroArt.classList.add("has-training-image");
    heroArt.innerHTML = `<img class="hero-training-image" src="${escapeHtml(safeImageUrl)}" alt="" />`;
    return;
  }

  heroArt.classList.remove("has-training-image");
  heroArt.innerHTML = `
    <div class="signal-card">
      <span></span>
      <span></span>
      <span></span>
      <strong>FMS</strong>
    </div>
  `;
}

function modulePoints(module) {
  const content = module.content || (Array.isArray(module.body) ? module.body.join("\n") : "");
  return content
    .split("\n")
    .map((point) => point.trim())
    .filter(Boolean);
}

function fillManagerForm(course) {
  if (!course) {
    managerForm.elements.service.value = selectedService || serviceSections[0];
    managerForm.elements.division.value = "";
    managerForm.elements.title.value = "";
    managerForm.elements.tag.value = "";
    managerForm.elements.icon.value = "TR";
    managerForm.elements.summary.value = "";
    managerForm.elements.imageUrl.value = "";
    managerForm.elements.imageUpload.value = "";
    managerForm.elements.resourceUrl.value = "";
    managerForm.elements.quizEnabled.checked = true;
    renderModuleBuilder([]);
    renderQuizBuilder([]);
    return;
  }
  const normalized = normalizeCourse(course);
  managerForm.elements.service.value = normalized.service;
  managerForm.elements.division.value = normalized.division;
  managerForm.elements.title.value = normalized.title || "";
  managerForm.elements.tag.value = normalized.tag || "";
  managerForm.elements.icon.value = normalized.icon || "TR";
  managerForm.elements.summary.value = normalized.summary || "";
  managerForm.elements.imageUrl.value = normalized.imageUrl || "";
  managerForm.elements.imageUpload.value = "";
  managerForm.elements.resourceUrl.value = normalized.resourceUrl || "";
  managerForm.elements.quizEnabled.checked = normalized.quizEnabled !== false;
  renderModuleBuilder(normalized.modules);
  renderQuizBuilder(normalized.quiz);
}

function collectModuleBuilder() {
  return [...moduleBuilder.querySelectorAll(".builder-card")].map((card) => ({
    title: card.querySelector("[data-module-title]").value,
    content: card.querySelector("[data-module-content]").value,
    imageUrl: card.querySelector("[data-module-image]").value,
    resourceUrl: card.querySelector("[data-module-resource]").value,
  }));
}

function collectQuizBuilder() {
  return [...quizBuilder.querySelectorAll(".builder-card")].map((card) => ({
    question: card.querySelector("[data-question-text]").value,
    answers: [...card.querySelectorAll("[data-answer-text]")].map((input) => input.value),
    correct: Number(card.querySelector("[data-correct-answer]").value),
  }));
}

function readImageFile(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      resolve("");
      return;
    }
    if (!file.type.startsWith("image/")) {
      reject(new Error("Only image files can be uploaded."));
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      reject(new Error("Images must be under 4MB."));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Image upload failed."));
    reader.readAsDataURL(file);
  });
}

async function applyUploadedImagesToModules(modules) {
  const cards = [...moduleBuilder.querySelectorAll(".builder-card")];
  return Promise.all(
    modules.map(async (module, index) => {
      const file = cards[index]?.querySelector("[data-module-upload]")?.files?.[0];
      const uploadedImage = await readImageFile(file);
      return {
        ...module,
        imageUrl: uploadedImage || module.imageUrl,
      };
    }),
  );
}

function renderModuleBuilder(modules = []) {
  const safeModules = modules.length
    ? modules
    : [{ title: "Module One", content: "", imageUrl: "", resourceUrl: "" }];

  moduleBuilder.innerHTML = safeModules
    .map(
      (module, index) => `
        <div class="builder-card" data-module-card>
          <div class="builder-card-heading">
            <strong>Module ${index + 1}</strong>
            <button class="ghost-button danger-button" type="button" data-remove-module="${index}">Remove</button>
          </div>
          <label class="field-label">Module title</label>
          <input data-module-title value="${escapeHtml(module.title || "")}" required />
          <label class="field-label">Training content</label>
          <textarea data-module-content rows="5" required>${escapeHtml(
            module.content || (Array.isArray(module.body) ? module.body.join("\n") : ""),
          )}</textarea>
          <label class="field-label">Image URL</label>
          <input data-module-image value="${escapeHtml(module.imageUrl || "")}" placeholder="https://example.com/module-image.png" />
          <label class="field-label">Upload module image</label>
          <input data-module-upload type="file" accept="image/*" />
          <label class="field-label">Resource URL</label>
          <input data-module-resource value="${escapeHtml(module.resourceUrl || "")}" placeholder="https://example.com/resource" />
          <div class="manager-actions">
            <button class="ghost-button" type="button" data-add-module-after="${index}">Add Module Below</button>
          </div>
        </div>
      `,
    )
    .join("");

  moduleBuilder.querySelectorAll("[data-remove-module]").forEach((button) => {
    button.addEventListener("click", () => {
      const modules = collectModuleBuilder();
      modules.splice(Number(button.dataset.removeModule), 1);
      renderModuleBuilder(modules);
    });
  });
  moduleBuilder.querySelectorAll("[data-add-module-after]").forEach((button) => {
    button.addEventListener("click", () => {
      const modules = collectModuleBuilder();
      modules.splice(Number(button.dataset.addModuleAfter) + 1, 0, {
        title: `Module ${modules.length + 1}`,
        content: "",
        imageUrl: "",
        resourceUrl: "",
      });
      renderModuleBuilder(modules);
    });
  });
}

function renderQuizBuilder(quiz = []) {
  const safeQuiz = quiz.length
    ? quiz
    : [
        {
          question: "",
          answers: ["", "", "", ""],
          correct: 0,
        },
      ];

  quizBuilder.innerHTML = safeQuiz
    .map((item, index) => {
      const answers = [...(item.answers || [])];
      while (answers.length < 4) answers.push("");
      return `
        <div class="builder-card" data-question-card>
          <div class="builder-card-heading">
            <strong>Question ${index + 1}</strong>
            <button class="ghost-button danger-button" type="button" data-remove-question="${index}">Remove</button>
          </div>
          <label class="field-label">Question</label>
          <input data-question-text value="${escapeHtml(item.question || "")}" required />
          <div class="answer-grid">
            ${answers
              .slice(0, 4)
              .map(
                (answer, answerIndex) => `
                  <label>
                    <span class="field-label">Answer ${answerIndex + 1}</span>
                    <input data-answer-text value="${escapeHtml(answer)}" required />
                  </label>
                `,
              )
              .join("")}
          </div>
          <label class="field-label">Correct answer</label>
          <select data-correct-answer>
            ${answers
              .slice(0, 4)
              .map(
                (_, answerIndex) =>
                  `<option value="${answerIndex}" ${
                    Number(item.correct) === answerIndex ? "selected" : ""
                  }>Answer ${answerIndex + 1}</option>`,
              )
              .join("")}
          </select>
        </div>
      `;
    })
    .join("");

  quizBuilder.querySelectorAll("[data-remove-question]").forEach((button) => {
    button.addEventListener("click", () => {
      const quiz = collectQuizBuilder();
      quiz.splice(Number(button.dataset.removeQuestion), 1);
      renderQuizBuilder(quiz);
    });
  });
}

function renderManagement() {
  managementPanel.hidden = !canManageTrainings() || !adminMode;
  if (!canManageTrainings() || !adminMode) return;

  analyticsPanel.hidden = adminView !== "analytics";
  editorPanel.hidden = adminView !== "editor";
  courseTitle.textContent = adminView === "analytics" ? "Training Analytics" : "Training Management";
  courseTag.textContent = "Command Area";

  managementAccess.textContent = canDeleteTrainings()
    ? adminView === "analytics"
      ? "Leadership analytics"
      : "Leadership admin rights"
    : adminView === "analytics"
      ? "Command analytics"
      : "Command add/edit rights";
  deleteTrainingButton.hidden = !canDeleteTrainings() || !courses.length;

  managerService.innerHTML = serviceSections
    .map((service) => `<option value="${escapeHtml(service)}">${escapeHtml(service)}</option>`)
    .join("");

  if (!selectedManagerCourseId || !courses.some((course) => course.id === selectedManagerCourseId)) {
    selectedManagerCourseId = courses[0]?.id || "";
  }

  managerCourseSelect.innerHTML = courses.length
    ? courses
        .map(
          (course) =>
            `<option value="${escapeHtml(course.id)}" ${
              course.id === selectedManagerCourseId ? "selected" : ""
            }>${escapeHtml(course.service)} - ${escapeHtml(course.title)}</option>`,
        )
        .join("")
    : `<option value="">No trainings created yet</option>`;

  fillManagerForm(getManagerCourse());
  if (adminView === "analytics" && !statsLoaded) loadStats();
}

function renderEmptyStats(message) {
  statsSummary.innerHTML = `<div class="stat-card"><span>Status</span><strong>${escapeHtml(message)}</strong></div>`;
  statsCourseBody.innerHTML = `<tr><td colspan="6">${escapeHtml(message)}</td></tr>`;
  statsUserBody.innerHTML = `<tr><td colspan="6">${escapeHtml(message)}</td></tr>`;
}

function renderStats(stats) {
  const totals = stats.totals || {};
  statsSummary.innerHTML = `
    <div class="stat-card"><span>Users tracked</span><strong>${totals.users || 0}</strong></div>
    <div class="stat-card"><span>Trainings</span><strong>${totals.trainings || 0}</strong></div>
    <div class="stat-card"><span>Completions</span><strong>${totals.completions || 0}</strong></div>
    <div class="stat-card"><span>Avg pass rate</span><strong>${totals.averageUserPassRate || 0}%</strong></div>
  `;

  statsCourseBody.innerHTML = stats.courses?.length
    ? stats.courses
        .map(
          (course) => `
            <tr>
              <td>${escapeHtml(course.title)}</td>
              <td>${escapeHtml(course.service)}</td>
              <td>${course.started}</td>
              <td>${course.completed}</td>
              <td>${course.passRate}%</td>
              <td>${course.averageScore === null ? "N/A" : `${course.averageScore}%`}</td>
            </tr>
          `,
        )
        .join("")
    : `<tr><td colspan="6">No trainings have been created yet.</td></tr>`;

  statsUserBody.innerHTML = stats.users?.length
    ? stats.users
        .map(
          (user) => `
            <tr>
              <td>${escapeHtml(user.username)}</td>
              <td>${user.started}</td>
              <td>${user.completed}</td>
              <td>${user.passRate}%</td>
              <td>${user.averageScore === null ? "N/A" : `${user.averageScore}%`}</td>
              <td>${escapeHtml((user.completedCourses || []).join(", ") || "None")}</td>
            </tr>
          `,
        )
        .join("")
    : `<tr><td colspan="6">No player progress has been saved yet.</td></tr>`;
}

async function loadStats() {
  if (!canManageTrainings()) return;
  renderEmptyStats("Loading statistics...");
  try {
    const result = await api("/api/stats");
    renderStats(result.stats);
    statsLoaded = true;
  } catch (error) {
    renderEmptyStats("Could not load statistics.");
  }
}

async function saveCoursesToServer() {
  courses = removeOldExampleTrainings(courses);
  const result = await api("/api/courses", {
    method: "PUT",
    body: JSON.stringify({ courses }),
  });
  courses = Array.isArray(result.courses)
    ? removeOldExampleTrainings(result.courses).map(normalizeCourse)
    : courses;
  if (!courses.some((course) => course.id === selectedCourseId)) selectedCourseId = courses[0]?.id || "";
  if (!courses.some((course) => course.id === selectedManagerCourseId)) {
    selectedManagerCourseId = courses[0]?.id || "";
  }
}

function renderCourseList() {
  courseList.innerHTML = serviceSections
    .map((service) => {
      const serviceCourses = courses.filter((course) => course.service === service);
      return `
        <section class="service-group">
          <button class="service-button ${
            expandedServices.has(service) ? "active" : ""
          }" type="button" data-service="${escapeHtml(service)}" aria-expanded="${expandedServices.has(service)}">
            <strong class="service-toggle">${expandedServices.has(service) ? "-" : "+"}</strong>
            <span>${escapeHtml(service)}</span>
            <small>${serviceCourses.length}</small>
          </button>
          <div class="service-trainings" ${expandedServices.has(service) ? "" : "hidden"}>
            ${
              serviceCourses.length
                ? serviceCourses
                    .map((course) => {
                      const courseProgress = getCourseProgress(course.id);
                      const isActive = course.id === selectedCourseId;
                      return `
                        <button class="course-button ${isActive ? "active" : ""}" type="button" data-course="${escapeHtml(course.id)}">
                          <span class="course-icon">${escapeHtml(course.icon)}</span>
                          <span>
                            <strong>${escapeHtml(course.title)}</strong>
                            <small>${escapeHtml(course.division || course.tag)}</small>
                          </span>
                          <span class="course-state ${courseProgress.passed ? "complete" : ""}" aria-label="${courseProgress.passed ? "Completed" : "Incomplete"}"></span>
                        </button>
                      `;
                    })
                    .join("")
                : `<p class="empty-service">No trainings yet</p>`
            }
          </div>
        </section>
      `;
    })
    .join("");

  document.querySelectorAll("[data-service]").forEach((button) => {
    button.addEventListener("click", () => {
      selectedService = button.dataset.service;
      if (expandedServices.has(selectedService)) {
        expandedServices.delete(selectedService);
      } else {
        expandedServices.add(selectedService);
        const firstCourse = courses.find((course) => course.service === selectedService);
        if (firstCourse) selectedCourseId = firstCourse.id;
      }
      selectedModuleIndex = 0;
      render();
    });
  });

  document.querySelectorAll("[data-course]").forEach((button) => {
    button.addEventListener("click", () => {
      selectedCourseId = button.dataset.course;
      selectedService = getCourse()?.service || selectedService;
      expandedServices.add(selectedService);
      selectedModuleIndex = 0;
      render();
    });
  });
}

function renderModules(course) {
  if (!course) return;
  const courseProgress = getCourseProgress(course.id);
  moduleTabs.innerHTML = course.modules
    .map((module, index) => {
      const read = courseProgress.readModules.includes(index);
      const active = selectedModuleIndex === index;
      return `<button class="module-tab ${active ? "active" : ""}" type="button" data-module="${index}">
        ${read ? "Read: " : ""}${escapeHtml(module.title)}
      </button>`;
    })
    .join("");

  document.querySelectorAll("[data-module]").forEach((button) => {
    button.addEventListener("click", () => {
      selectedModuleIndex = Number(button.dataset.module);
      render();
    });
  });

  const module = course.modules[selectedModuleIndex] || course.modules[0];
  const points = modulePoints(module);
  moduleBody.innerHTML = `
    <h3>${escapeHtml(module.title)}</h3>
    ${renderMedia(module.imageUrl, module.resourceUrl)}
    <ul>${points.map((point) => `<li>${escapeHtml(point)}</li>`).join("")}</ul>
  `;

  markRead.textContent = courseProgress.readModules.includes(selectedModuleIndex)
    ? "Module Read"
    : "Mark Module Read";
  markRead.disabled = !isSignedIn() || courseProgress.readModules.includes(selectedModuleIndex);
}

function renderQuiz(course) {
  if (!course) return;
  if (course.quizEnabled === false) {
    quizForm.innerHTML = `<p class="result-text">No quiz is required for this training.</p>`;
    scorePill.textContent = "Quiz disabled";
    return;
  }
  const courseProgress = getCourseProgress(course.id);
  const allRead = isSignedIn() && courseProgress.readModules.length === course.modules.length;

  quizForm.innerHTML = course.quiz
    .map(
      (item, questionIndex) => `
        <fieldset class="question" ${allRead ? "" : "disabled"}>
          <legend><span>${questionIndex + 1}</span>${escapeHtml(item.question)}</legend>
          <div class="answer-list">
            ${item.answers
              .map(
                (answer, answerIndex) => `
                  <label class="answer">
                    <input class="answer-radio" type="radio" name="q${questionIndex}" value="${answerIndex}" required />
                    <span class="answer-copy">${escapeHtml(answer)}</span>
                  </label>
                `,
              )
              .join("")}
          </div>
        </fieldset>
      `,
    )
    .join("");

  quizForm.insertAdjacentHTML(
    "beforeend",
    `
      <div class="quiz-actions">
        <button class="primary-button" type="submit" ${allRead ? "" : "disabled"}>Submit Quiz</button>
        <p class="result-text" id="resultText">${
          !isSignedIn()
            ? "Sign in with Discord to unlock training progress."
            : allRead
              ? "Answer every question to submit."
              : "Read every briefing module to unlock the quiz."
        }</p>
      </div>
    `,
  );

  scorePill.textContent =
    courseProgress.quizScore === null ? "80% required" : `Best score: ${courseProgress.quizScore}%`;
}

function renderCompletion(course) {
  if (!course) return;
  const courseProgress = getCourseProgress(course.id);
  completionPanel.hidden = !courseProgress.passed;
  certificateProgress.textContent = courseProgress.passed ? "Unlocked" : "Locked";

  if (!courseProgress.passed) return;

  const displayName = currentUser?.globalName || currentUser?.username || "This player";
  certificateMessage.innerHTML = `
    <strong>${escapeHtml(course.title)} specialist training completed.</strong><br />
    ${escapeHtml(displayName)} has completed this course.<br />
    ${
      course.quizEnabled === false
        ? "No final quiz was required for this training."
        : `${escapeHtml(displayName)} has achieved ${courseProgress.quizScore}% on the final assessment, meeting the ${PASS_MARK}% pass requirement.`
    }<br />
    Completed: ${courseProgress.completedAt}<br /><br />
    Please open a support ticket in Discord to obtain the role via FMS.
  `;
}

function render() {
  normalizeCourses();
  const course = getCourse();
  renderCourseList();
  renderAccount();
  trainingAreas.forEach((area) => {
    area.hidden = adminMode;
  });
  if (!course) {
    courseTitle.textContent = adminMode ? "Training Management" : "No Trainings Created";
    courseTag.textContent = "Specialist subdivisions";
    courseHeading.textContent = "No trainings have been added yet.";
    courseSummary.textContent =
      canManageTrainings()
        ? "Open Create/Edit/Delete to add the first training."
        : "A Command or Leadership member needs to create trainings before players can begin.";
    courseMedia.innerHTML = "";
    renderHeroImage("");
    moduleProgress.textContent = "0 / 0 read";
    quizProgress.textContent = "Not available";
    certificateProgress.textContent = "Locked";
    moduleTabs.innerHTML = "";
    moduleBody.innerHTML = "<p>No training content is available yet.</p>";
    quizForm.innerHTML = "";
    scorePill.textContent = "80% required";
    completionPanel.hidden = true;
    renderManagement();
    return;
  }
  const courseProgress = getCourseProgress(course.id);
  selectedService = course.service || selectedService;

  courseTitle.textContent = course.title;
  courseTag.textContent = `${course.service} / ${course.division}`;
  courseHeading.textContent = "Complete the briefing, then pass the quiz.";
  courseSummary.textContent = course.summary;
  moduleProgress.textContent = `${courseProgress.readModules.length} / ${course.modules.length} read`;
  quizProgress.textContent =
    courseProgress.quizScore === null
      ? "Not attempted"
      : courseProgress.passed
        ? `Passed at ${courseProgress.quizScore}%`
        : `Last score ${courseProgress.quizScore}%`;

  renderHeroImage(course.imageUrl);
  courseMedia.innerHTML = renderMedia("", course.resourceUrl);

  renderModules(course);
  renderQuiz(course);
  renderCompletion(course);
  renderManagement();
}

markRead.addEventListener("click", () => {
  if (!isSignedIn()) return;
  const courseProgress = getCourseProgress(selectedCourseId);
  if (!courseProgress.readModules.includes(selectedModuleIndex)) {
    courseProgress.readModules.push(selectedModuleIndex);
    courseProgress.readModules.sort((a, b) => a - b);
    const course = getCourse();
    if (course?.quizEnabled === false && courseProgress.readModules.length === course.modules.length) {
      courseProgress.quizScore = null;
      courseProgress.passed = true;
      courseProgress.completedAt = new Date().toLocaleString("en-GB", {
        dateStyle: "medium",
        timeStyle: "short",
      });
    }
    saveProgress();
  }

  const course = getCourse();
  if (selectedModuleIndex < course.modules.length - 1) {
    selectedModuleIndex += 1;
  }
  render();
});

quizForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!isSignedIn()) return;
  const course = getCourse();
  const courseProgress = getCourseProgress(course.id);
  let correctAnswers = 0;

  course.quiz.forEach((item, questionIndex) => {
    const selected = quizForm.querySelector(`input[name="q${questionIndex}"]:checked`);
    if (selected && Number(selected.value) === item.correct) {
      correctAnswers += 1;
    }
  });

  const score = Math.round((correctAnswers / course.quiz.length) * 100);
  courseProgress.quizScore = Math.max(courseProgress.quizScore || 0, score);
  courseProgress.passed = score >= PASS_MARK || courseProgress.passed;

  if (score >= PASS_MARK) {
    courseProgress.completedAt = new Date().toLocaleString("en-GB", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }

  saveProgress();
  render();

  const resultText = document.getElementById("resultText");
  resultText.textContent =
    score >= PASS_MARK
      ? `Passed with ${score}%. Your completion message is ready below.`
      : `Scored ${score}%. You need ${PASS_MARK}% to pass, so review the briefing and try again.`;

  if (score >= PASS_MARK) {
    completionPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  }
});

managerCourseSelect.addEventListener("change", () => {
  selectedManagerCourseId = managerCourseSelect.value;
  fillManagerForm(getManagerCourse());
});

sidebarAdminButton.addEventListener("click", () => {
  adminMode = true;
  adminView = "editor";
  render();
});

sidebarAnalyticsButton.addEventListener("click", () => {
  adminMode = true;
  adminView = "analytics";
  render();
});

refreshStatsButton.addEventListener("click", () => {
  statsLoaded = false;
  loadStats();
});

newTrainingButton.addEventListener("click", () => {
  if (!canManageTrainings()) return;
  const training = createBlankTraining();
  courses.push(training);
  selectedService = training.service;
  expandedServices.add(selectedService);
  selectedCourseId = training.id;
  selectedManagerCourseId = training.id;
  managerResult.textContent = "New training created. Fill the fields, then save.";
  render();
});

deleteTrainingButton.addEventListener("click", async () => {
  if (!canDeleteTrainings()) return;
  const course = getManagerCourse();
  if (!course) return;
  if (!window.confirm(`Delete ${course.title}? This is restricted to Leadership Team.`)) return;

  courses = courses.filter((item) => item.id !== course.id);
  selectedCourseId = courses[0]?.id || "";
  selectedManagerCourseId = selectedCourseId;
  await saveCoursesToServer();
  managerResult.textContent = "Training deleted.";
  render();
});

addModuleButton.addEventListener("click", () => {
  const modules = collectModuleBuilder();
  modules.push({ title: `Module ${modules.length + 1}`, content: "", imageUrl: "", resourceUrl: "" });
  renderModuleBuilder(modules);
});

addQuestionButton.addEventListener("click", () => {
  const quiz = collectQuizBuilder();
  quiz.push({ question: "", answers: ["", "", "", ""], correct: 0 });
  renderQuizBuilder(quiz);
});

managerForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!canManageTrainings()) return;

  try {
    const modules = (await applyUploadedImagesToModules(collectModuleBuilder())).filter(
      (module) => module.title && module.content,
    );
    const quiz = collectQuizBuilder().filter(
      (item) => item.question && item.answers.every((answer) => answer.trim()),
    );
    const quizEnabled = managerForm.elements.quizEnabled.checked;
    const uploadedTrainingImage = await readImageFile(managerForm.elements.imageUpload.files[0]);

    if (!modules.length || (quizEnabled && !quiz.length)) {
      managerResult.textContent = quizEnabled
        ? "Add at least one module and one complete quiz question."
        : "Add at least one module.";
      return;
    }

    const existing = getManagerCourse();
    const nextCourse = {
      id: existing?.id || `training-${Date.now()}`,
      service: managerForm.elements.service.value,
      division: managerForm.elements.division.value,
      title: managerForm.elements.title.value,
      tag: managerForm.elements.tag.value,
      icon: managerForm.elements.icon.value,
      summary: managerForm.elements.summary.value,
      imageUrl: uploadedTrainingImage || managerForm.elements.imageUrl.value,
      resourceUrl: managerForm.elements.resourceUrl.value,
      quizEnabled,
      modules,
      quiz,
    };

    courses = courses.some((course) => course.id === nextCourse.id)
      ? courses.map((course) => (course.id === nextCourse.id ? nextCourse : course))
      : [...courses, nextCourse];

    selectedService = nextCourse.service;
    expandedServices.add(selectedService);
    selectedCourseId = nextCourse.id;
    selectedManagerCourseId = nextCourse.id;
    await saveCoursesToServer();
    managerResult.textContent = "Training saved.";
    render();
  } catch (error) {
    managerResult.textContent = "Check the training fields, then try again.";
  }
});

async function init() {
  const config = await api("/api/config");
  DISCORD_TICKET_URL = config.discordTicketUrl || DISCORD_TICKET_URL;
  authConfigured = config.authConfigured;
  ticketLink.href = DISCORD_TICKET_URL;

  const me = await api("/api/me");
  currentUser = me.user;
  currentAccess = me.access;

  const savedCourses = await api("/api/courses");
  if (savedCourses.courses?.length) {
    courses = removeOldExampleTrainings(savedCourses.courses).map(normalizeCourse);
  } else {
    normalizeCourses();
  }
  selectedCourseId = courses[0]?.id || "";
  selectedService = courses[0]?.service || serviceSections[0];
  expandedServices.add(selectedService);
  selectedManagerCourseId = selectedCourseId;

  if (isSignedIn()) {
    const saved = await api("/api/progress");
    progress = saved.progress || {};
  }

  render();
}

init().catch((error) => {
  console.error(error);
  progress = JSON.parse(localStorage.getItem("five999TrainingProgressBackup") || "{}");
  normalizeCourses();
  render();
});
