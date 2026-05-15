const PASS_MARK = 80;

const serviceSections = [
  "United Kingdom Police Service",
  "United Kingdom Ambulance Service",
  "United Kingdom Fire and Rescue Service",
  "UK Search & Rescue",
  "UK Highways",
  "National Transport Police",
  "Emergency Operations Centre",
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
let expandedServices = new Set();
let selectedCourseId = "";
let selectedModuleIndex = 0;
let currentView = "home";
let currentTheme = localStorage.getItem("five999TrainingTheme") || "light";
let progress = {};
let currentUser = null;
let currentAccess = null;
let authConfigured = false;
let selectedManagerCourseId = "__new__";
let adminMode = false;
let adminView = "editor";
let statsLoaded = false;
let courseSearchTerm = "";
let latestStats = null;
const certificatePreviewCache = new Map();
const pendingCertificatePreviews = new Set();

const courseList = document.getElementById("courseList");
const courseSearch = document.getElementById("courseSearch");
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
const courseStartPanel = document.getElementById("courseStartPanel");
const startTrainingButton = document.getElementById("startTrainingButton");
const courseStartText = document.getElementById("courseStartText");
const quizForm = document.getElementById("quizForm");
const scorePill = document.getElementById("scorePill");
const completionPanel = document.getElementById("completionPanel");
const certificateMessage = document.getElementById("certificateMessage");
const certificatePreviewWrap = document.getElementById("certificatePreviewWrap");
const certificatePreview = document.getElementById("certificatePreview");
const downloadCertificateButton = document.getElementById("downloadCertificateButton");
const downloadPdfCertificateButton = document.getElementById("downloadPdfCertificateButton");
const feedbackForm = document.getElementById("feedbackForm");
const feedbackRating = document.getElementById("feedbackRating");
const feedbackComment = document.getElementById("feedbackComment");
const feedbackResult = document.getElementById("feedbackResult");
const landingPanel = document.getElementById("landingPanel");
const profilePanel = document.getElementById("profilePanel");
const profileSummary = document.getElementById("profileSummary");
const profileGrid = document.getElementById("profileGrid");
const certificateLibrary = document.getElementById("certificateLibrary");
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
const editorModeLabel = document.getElementById("editorModeLabel");
const editorModeTitle = document.getElementById("editorModeTitle");
const editorModeText = document.getElementById("editorModeText");
const trainingAreas = [...document.querySelectorAll(".training-area")];
const adminSidebarPanel = document.getElementById("adminSidebarPanel");
const sidebarAdminButton = document.getElementById("sidebarAdminButton");
const sidebarAnalyticsButton = document.getElementById("sidebarAnalyticsButton");
const analyticsPanel = document.getElementById("analyticsPanel");
const editorPanel = document.getElementById("editorPanel");
const refreshStatsButton = document.getElementById("refreshStatsButton");
const exportStatsButton = document.getElementById("exportStatsButton");
const statsSummary = document.getElementById("statsSummary");
const statsCourseBody = document.getElementById("statsCourseBody");
const statsUserBody = document.getElementById("statsUserBody");
const statsPracticalBody = document.getElementById("statsPracticalBody");
const statsFeedbackBody = document.getElementById("statsFeedbackBody");
const auditLogBody = document.getElementById("auditLogBody");
const playerHistoryPanel = document.getElementById("playerHistoryPanel");
const exportTrainingsButton = document.getElementById("exportTrainingsButton");
const importTrainingsButton = document.getElementById("importTrainingsButton");
const importTrainingsFile = document.getElementById("importTrainingsFile");

function applyTheme() {
  document.body.classList.toggle("dark-theme", currentTheme === "dark");
  document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
    button.setAttribute(
      "aria-label",
      currentTheme === "dark" ? "Switch to light mode" : "Switch to dark mode",
    );
  });
}

function themeToggleMarkup() {
  return `
    <button class="theme-icon-button" data-theme-toggle type="button" aria-label="Switch theme">
      <span class="theme-icon-sun" aria-hidden="true"></span>
      <span class="theme-icon-moon" aria-hidden="true"></span>
    </button>
  `;
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    credentials: "same-origin",
    ...options,
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const details = [
      payload.error || `Request failed with status ${response.status}`,
      payload.status ? `Status: ${payload.status}` : "",
      payload.outboundIp ? `Outbound IP: ${payload.outboundIp}` : "",
      payload.testUrl ? `URL: ${payload.testUrl}` : "",
    ].filter(Boolean);
    throw new Error(details.join(" | "));
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

function canManageService(service) {
  if (!canManageTrainings()) return false;
  if (!Array.isArray(currentAccess?.managedServices)) return true;
  return currentAccess.managedServices.includes(service);
}

function getManagerServices() {
  return serviceSections.filter((service) => canManageService(service));
}

function getManagerCourses() {
  return courses.filter((course) => canManageService(course.service));
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
    published: course.published !== false,
    imageUrl: course.imageUrl || "",
    resourceUrl: course.resourceUrl || "",
    theoryFmsTrainingGroupIds: Array.isArray(course.theoryFmsTrainingGroupIds) ? course.theoryFmsTrainingGroupIds : [],
    fmsTrainingGroupIds: Array.isArray(course.fmsTrainingGroupIds) ? course.fmsTrainingGroupIds : [],
    fmsTrainingNote: course.fmsTrainingNote || "",
    fmsTrainingExpiryDate: course.fmsTrainingExpiryDate || "",
    fmsAutoRemoveOnExpiry: course.fmsAutoRemoveOnExpiry !== false,
    quizEnabled: course.quizEnabled !== false,
    practicalRequired: course.practicalRequired === true,
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

function courseMatchesSearch(course) {
  const query = courseSearchTerm.trim().toLowerCase();
  if (!query) return true;
  return [course.service, course.division, course.title, course.tag, course.summary]
    .join(" ")
    .toLowerCase()
    .includes(query);
}

function getVisibleCourses() {
  return courses.filter((course) => (course.published !== false || canManageTrainings()) && courseMatchesSearch(course));
}

function sortCoursesAlphabetically(items) {
  return [...items].sort((a, b) => {
    const titleCompare = String(a.title || "").localeCompare(String(b.title || ""), "en-GB", { sensitivity: "base" });
    if (titleCompare !== 0) return titleCompare;
    return String(a.division || "").localeCompare(String(b.division || ""), "en-GB", { sensitivity: "base" });
  });
}

function expandSearchMatches() {
  const query = courseSearchTerm.trim();
  if (!query) return;
  getVisibleCourses().forEach((course) => expandedServices.add(course.service));
}

function openFirstSearchResult() {
  const firstCourse = getVisibleCourses()[0];
  if (!firstCourse) return;
  selectedCourseId = firstCourse.id;
  selectedService = firstCourse.service;
  expandedServices.add(firstCourse.service);
  selectedModuleIndex = 0;
  currentView = "training";
  adminMode = false;
  render();
}

function getCourse() {
  const course = courses.find((item) => item.id === selectedCourseId) || null;
  if (!course) return null;
  if (course.published === false && !canManageTrainings()) return null;
  return course;
}

function getCourseProgress(courseId) {
  if (!progress[courseId]) {
    progress[courseId] = {
      started: false,
      readModules: [],
      quizScore: null,
      passed: false,
      completedAt: null,
      feedback: null,
    };
  }
  return progress[courseId];
}

function getProgressState(course) {
  const courseProgress = getCourseProgress(course.id);
  if (courseProgress.passed) return { label: "Completed", className: "complete" };
  if (course.practicalRequired && courseProgress.theoryPassed) {
    return { label: "Practical Required", className: "progress" };
  }
  if (courseProgress.quizScore !== null) return { label: "Failed", className: "failed" };
  if (courseProgress.started || (courseProgress.readModules || []).length > 0) return { label: "In progress", className: "progress" };
  return { label: "Not started", className: "idle" };
}

function markTheoryPassed(course, courseProgress, score = null) {
  courseProgress.theoryPassed = true;
  courseProgress.theoryPassedAt = new Date().toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  if (course.practicalRequired) {
    courseProgress.practicalStatus = "pending";
    courseProgress.passed = false;
    courseProgress.completedAt = null;
    return;
  }

  courseProgress.passed = true;
  courseProgress.completedAt = courseProgress.theoryPassedAt;
}

async function saveProgress() {
  if (!isSignedIn()) return null;
  return api("/api/progress", {
    method: "PUT",
    body: JSON.stringify({ progress }),
  }).then((result) => {
    if (result.progress) progress = result.progress;
    return result;
  }).catch(() => {
    localStorage.setItem("five999TrainingProgressBackup", JSON.stringify(progress));
    return null;
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
    <button class="ghost-button" id="profileButton" type="button">My Profile</button>
    ${
      canManageTrainings()
        ? `<button class="ghost-button" id="dashboardModeButton" type="button">Training Dashboard</button>`
        : ""
    }
    ${themeToggleMarkup()}
    <button class="ghost-button" id="resetProgress" type="button" title="Clear saved progress">Reset Progress</button>
    <button class="ghost-button" id="logoutButton" type="button">Log Out</button>
  `;
  applyTheme();
  accountActions.querySelector("[data-theme-toggle]").addEventListener("click", toggleTheme);

  document.getElementById("dashboardModeButton")?.addEventListener("click", () => {
    adminMode = false;
    currentView = "home";
    render();
  });

  document.getElementById("profileButton").addEventListener("click", () => {
    adminMode = false;
    currentView = "profile";
    render();
    profilePanel.scrollIntoView({ behavior: "smooth", block: "start" });
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
    service: "",
    division: "",
    icon: "",
    title: "",
    tag: "",
    summary: "",
    published: true,
    imageUrl: "",
    resourceUrl: "",
    theoryFmsTrainingGroupIds: [],
    fmsTrainingGroupIds: [],
    fmsTrainingNote: "",
    fmsTrainingExpiryDate: "",
    fmsAutoRemoveOnExpiry: true,
    quizEnabled: true,
    practicalRequired: false,
    modules: [
      {
        title: "",
        content: "",
        imageUrl: "",
        resourceUrl: "",
      },
    ],
    quiz: [
      {
        question: "",
        answers: ["", "", "", ""],
        correct: 0,
      },
    ],
  };
}

function getManagerCourse() {
  if (selectedManagerCourseId === "__new__") return null;
  const course = courses.find((item) => item.id === selectedManagerCourseId) || null;
  return course && canManageService(course.service) ? course : null;
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
    editorModeLabel.textContent = "Create mode";
    editorModeTitle.textContent = "Create New Training";
    editorModeText.textContent =
      "Fill the fields below, add modules and quiz questions, then save to publish this training.";
    managerForm.dataset.mode = "create";
    managerForm.elements.service.value = "";
    managerForm.elements.division.value = "";
    managerForm.elements.title.value = "";
    managerForm.elements.tag.value = "";
    managerForm.elements.icon.value = "TR";
    managerForm.elements.summary.value = "";
    managerForm.elements.published.checked = true;
    managerForm.elements.imageUrl.value = "";
    managerForm.elements.imageUpload.value = "";
    managerForm.elements.resourceUrl.value = "";
    managerForm.elements.theoryFmsTrainingGroupIds.value = "";
    managerForm.elements.fmsTrainingGroupIds.value = "";
    managerForm.elements.fmsTrainingNote.value = "";
    managerForm.elements.fmsTrainingExpiryDate.value = "";
    managerForm.elements.fmsAutoRemoveOnExpiry.checked = true;
    managerForm.elements.quizEnabled.checked = true;
    managerForm.elements.practicalRequired.checked = false;
    renderModuleBuilder([]);
    renderQuizBuilder([]);
    return;
  }
  const normalized = normalizeCourse(course);
  editorModeLabel.textContent = "Edit mode";
  editorModeTitle.textContent = `Editing ${normalized.title || "Training"}`;
  editorModeText.textContent = "Changes here update the selected existing training when you press Save.";
  managerForm.dataset.mode = "edit";
  managerForm.elements.service.value = normalized.service;
  managerForm.elements.division.value = normalized.division;
  managerForm.elements.title.value = normalized.title || "";
  managerForm.elements.tag.value = normalized.tag || "";
  managerForm.elements.icon.value = normalized.icon || "TR";
  managerForm.elements.summary.value = normalized.summary || "";
  managerForm.elements.published.checked = normalized.published !== false;
  managerForm.elements.imageUrl.value = normalized.imageUrl || "";
  managerForm.elements.imageUpload.value = "";
  managerForm.elements.resourceUrl.value = normalized.resourceUrl || "";
  managerForm.elements.theoryFmsTrainingGroupIds.value = (normalized.theoryFmsTrainingGroupIds || []).join(", ");
  managerForm.elements.fmsTrainingGroupIds.value = (normalized.fmsTrainingGroupIds || []).join(", ");
  managerForm.elements.fmsTrainingNote.value = normalized.fmsTrainingNote || "";
  managerForm.elements.fmsTrainingExpiryDate.value = normalized.fmsTrainingExpiryDate || "";
  managerForm.elements.fmsAutoRemoveOnExpiry.checked = normalized.fmsAutoRemoveOnExpiry !== false;
  managerForm.elements.quizEnabled.checked = normalized.quizEnabled !== false;
  managerForm.elements.practicalRequired.checked = normalized.practicalRequired === true;
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
  return [...quizBuilder.querySelectorAll(".builder-card")].map((card) => {
    const rawAnswers = [...card.querySelectorAll("[data-answer-text]")].map((input) => input.value.trim());
    const correctRawIndex = Number(card.querySelector("[data-correct-answer]").value);
    const correctAnswerText = rawAnswers[correctRawIndex];
    const answers = rawAnswers.filter(Boolean);
    const mappedCorrectIndex = answers.findIndex((answer) => answer === correctAnswerText);
    return {
      question: card.querySelector("[data-question-text]").value.trim(),
      answers,
      correct: mappedCorrectIndex >= 0 ? mappedCorrectIndex : 0,
    };
  });
}

function parseNumberList(value) {
  return String(value || "")
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isInteger(item) && item > 0);
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
    if (file.size > 8 * 1024 * 1024) {
      reject(new Error("Images must be under 8MB each."));
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
          <input data-module-title value="${escapeHtml(module.title || "")}" />
          <label class="field-label">Training content</label>
          <textarea data-module-content rows="5">${escapeHtml(
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
    button.addEventListener("click", async () => {
      try {
        const modules = await applyUploadedImagesToModules(collectModuleBuilder());
        modules.splice(Number(button.dataset.removeModule), 1);
        renderModuleBuilder(modules);
      } catch (error) {
        managerResult.textContent = error.message || "Module image upload failed.";
      }
    });
  });
  moduleBuilder.querySelectorAll("[data-add-module-after]").forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        const modules = await applyUploadedImagesToModules(collectModuleBuilder());
        modules.splice(Number(button.dataset.addModuleAfter) + 1, 0, {
          title: `Module ${modules.length + 1}`,
          content: "",
          imageUrl: "",
          resourceUrl: "",
        });
        renderModuleBuilder(modules);
      } catch (error) {
        managerResult.textContent = error.message || "Module image upload failed.";
      }
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
          <input data-question-text value="${escapeHtml(item.question || "")}" />
          <div class="answer-grid">
            ${answers
              .slice(0, 4)
              .map(
                (answer, answerIndex) => `
                  <label>
                    <span class="field-label">Answer ${answerIndex + 1}</span>
                    <input data-answer-text value="${escapeHtml(answer)}" />
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
          <p class="field-hint">Leave unused answer boxes blank. Two answers are fine for yes/no questions.</p>
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
  const managerServices = getManagerServices();
  const managerCourses = getManagerCourses();
  deleteTrainingButton.hidden = !canDeleteTrainings() || !managerCourses.length || selectedManagerCourseId === "__new__";

  managerService.innerHTML = [`<option value="">Choose a service section</option>`]
    .concat(managerServices
    .map((service) => `<option value="${escapeHtml(service)}">${escapeHtml(service)}</option>`)
    ).join("");

  if (
    selectedManagerCourseId !== "__new__" &&
    (!selectedManagerCourseId || !managerCourses.some((course) => course.id === selectedManagerCourseId))
  ) {
    selectedManagerCourseId = "__new__";
  }

  managerCourseSelect.innerHTML = [
    `<option value="__new__" ${selectedManagerCourseId === "__new__" ? "selected" : ""}>Create a new training</option>`,
  ]
    .concat(
      managerCourses
        .slice()
        .sort((a, b) => {
          const serviceCompare = String(a.service || "").localeCompare(String(b.service || ""), "en-GB", { sensitivity: "base" });
          if (serviceCompare !== 0) return serviceCompare;
          return String(a.title || "").localeCompare(String(b.title || ""), "en-GB", { sensitivity: "base" });
        })
        .map(
          (course) =>
            `<option value="${escapeHtml(course.id)}" ${
              course.id === selectedManagerCourseId ? "selected" : ""
            }>${course.published === false ? "[Draft] " : ""}${escapeHtml(course.service)} - ${escapeHtml(course.title)}</option>`,
        )
    )
    .join("");

  fillManagerForm(getManagerCourse());
  managerForm.querySelector("[type='submit']").disabled = !managerServices.length;
  if (!managerServices.length) {
    managerResult.textContent = "No service sections are assigned to your Command role.";
  }
  if (adminView === "analytics" && !statsLoaded) loadStats();
}

function renderEmptyStats(message) {
  statsSummary.innerHTML = `<div class="stat-card"><span>Status</span><strong>${escapeHtml(message)}</strong></div>`;
  statsCourseBody.innerHTML = `<tr><td colspan="6">${escapeHtml(message)}</td></tr>`;
  statsUserBody.innerHTML = `<tr><td colspan="7">${escapeHtml(message)}</td></tr>`;
  statsPracticalBody.innerHTML = `<tr><td colspan="6">${escapeHtml(message)}</td></tr>`;
  statsFeedbackBody.innerHTML = `<tr><td colspan="6">${escapeHtml(message)}</td></tr>`;
  auditLogBody.innerHTML = `<tr><td colspan="6">${escapeHtml(message)}</td></tr>`;
  playerHistoryPanel.hidden = true;
}

function renderPlayerHistory(user) {
  if (!user) {
    playerHistoryPanel.hidden = true;
    return;
  }
  playerHistoryPanel.hidden = false;
  playerHistoryPanel.innerHTML = `
    <div class="panel-heading">
      <div>
        <p class="eyebrow">Player profile</p>
        <h3>${escapeHtml(user.username)}</h3>
      </div>
    </div>
    <div class="analytics-table-wrap">
      <table class="analytics-table">
        <thead>
          <tr>
            <th>Training</th>
            <th>Service</th>
            <th>Status</th>
            <th>Score</th>
            <th>Theory Passed</th>
            <th>Completed</th>
          </tr>
        </thead>
        <tbody>
          ${(user.history || []).length
            ? user.history
                .map(
                  (item) => `
                    <tr>
                      <td>${escapeHtml(item.courseTitle)}</td>
                      <td>${escapeHtml(item.service)}</td>
                      <td>${escapeHtml(item.status)}</td>
                      <td>${item.quizScore === null ? "N/A" : `${item.quizScore}%`}</td>
                      <td>${escapeHtml(item.theoryPassedAt || "N/A")}</td>
                      <td>${escapeHtml(item.completedAt || "N/A")}</td>
                    </tr>
                  `,
                )
                .join("")
            : `<tr><td colspan="6">No saved training history.</td></tr>`}
        </tbody>
      </table>
    </div>
  `;
}

function renderStats(stats) {
  latestStats = stats;
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
              <td><button class="ghost-button" type="button" data-player-history="${escapeHtml(user.discordId)}">View</button></td>
            </tr>
          `,
        )
        .join("")
    : `<tr><td colspan="7">No player progress has been saved yet.</td></tr>`;

  statsPracticalBody.innerHTML = stats.practicalAssessments?.length
    ? stats.practicalAssessments
        .map(
          (item) => `
            <tr>
              <td>${escapeHtml(item.username)}</td>
              <td>${escapeHtml(item.courseTitle)}</td>
              <td>${escapeHtml(item.service)}</td>
              <td>${escapeHtml(item.status === "failed" ? "Practical failed" : "Awaiting practical")}</td>
              <td>${escapeHtml(item.theoryPassedAt || "Unknown")}</td>
              <td>
                <div class="table-actions">
                  <button class="primary-button" type="button" data-practical-pass="${escapeHtml(item.discordId)}" data-course-id="${escapeHtml(item.courseId)}">Pass</button>
                  <button class="ghost-button danger-button" type="button" data-practical-fail="${escapeHtml(item.discordId)}" data-course-id="${escapeHtml(item.courseId)}">Fail</button>
                </div>
              </td>
            </tr>
          `,
        )
        .join("")
    : `<tr><td colspan="6">No practical assessments are awaiting review.</td></tr>`;

  statsFeedbackBody.innerHTML = stats.feedback?.length
    ? stats.feedback
        .map(
          (item) => `
            <tr>
              <td>${escapeHtml(item.username)}</td>
              <td>${escapeHtml(item.courseTitle)}</td>
              <td>${escapeHtml(item.service)}</td>
              <td>${escapeHtml(item.rating ? `${item.rating} / 5` : "No rating")}</td>
              <td>${escapeHtml(item.comment || "No comment")}</td>
              <td>${escapeHtml(item.submittedAt || "Unknown")}</td>
            </tr>
          `,
        )
        .join("")
    : `<tr><td colspan="6">No training feedback has been submitted yet.</td></tr>`;

}

function renderAuditLog(entries) {
  auditLogBody.innerHTML = entries?.length
    ? entries
        .map((entry) => {
          const details = entry.details && Object.keys(entry.details).length
            ? Object.entries(entry.details)
                .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(", ") : value}`)
                .join("; ")
            : "";
          return `
            <tr>
              <td>${escapeHtml(new Date(entry.createdAt).toLocaleString("en-GB"))}</td>
              <td>${escapeHtml(String(entry.action || "").replaceAll("_", " "))}</td>
              <td>${escapeHtml(entry.actorName || "Unknown")}</td>
              <td>${escapeHtml(entry.service || "General")}</td>
              <td>${escapeHtml(entry.trainingTitle || "N/A")}</td>
              <td>${escapeHtml(details || "Recorded")}</td>
            </tr>
          `;
        })
        .join("")
    : `<tr><td colspan="6">No audit activity has been recorded yet.</td></tr>`;
}

async function updatePracticalAssessment(discordId, courseId, status) {
  if (!canManageTrainings()) return;
  const result = await api("/api/practical-assessments", {
    method: "POST",
    body: JSON.stringify({ discordId, courseId, status }),
  });
  renderStats(result.stats);
  const audit = await api("/api/audit-log");
  renderAuditLog(audit.auditLog || []);
  statsLoaded = true;
}

async function loadStats() {
  if (!canManageTrainings()) return;
  renderEmptyStats("Loading statistics...");
  try {
    const [result, audit] = await Promise.all([
      api("/api/stats"),
      api("/api/audit-log"),
    ]);
    renderStats(result.stats);
    renderAuditLog(audit.auditLog || []);
    statsLoaded = true;
  } catch (error) {
    renderEmptyStats(error.message || "Could not load statistics.");
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
  if (!courses.some((course) => course.id === selectedCourseId)) selectedCourseId = "";
  if (selectedManagerCourseId !== "__new__" && !courses.some((course) => course.id === selectedManagerCourseId)) {
    selectedManagerCourseId = "__new__";
  }
}

function downloadFile(filename, contents, type = "application/json") {
  const blob = new Blob([contents], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function csvCell(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function exportStatsCsv() {
  if (!latestStats) return;
  const rows = [
    ["Type", "Name", "Service", "Started", "Completed", "Pass Rate", "Average Score"],
    ...(latestStats.courses || []).map((course) => [
      "Training",
      course.title,
      course.service,
      course.started,
      course.completed,
      `${course.passRate}%`,
      course.averageScore === null ? "N/A" : `${course.averageScore}%`,
    ]),
    ...(latestStats.users || []).map((user) => [
      "User",
      user.username,
      "",
      user.started,
      user.completed,
      `${user.passRate}%`,
      user.averageScore === null ? "N/A" : `${user.averageScore}%`,
    ]),
  ];
  downloadFile(
    `five999-training-analytics-${new Date().toISOString().slice(0, 10)}.csv`,
    rows.map((row) => row.map(csvCell).join(",")).join("\n"),
    "text/csv",
  );
}

async function exportTrainings() {
  const result = await api("/api/courses/export");
  downloadFile(
    `five999-trainings-${new Date().toISOString().slice(0, 10)}.json`,
    JSON.stringify(result, null, 2),
  );
}

async function importTrainingsFromFile(file) {
  if (!file) return;
  const payload = JSON.parse(await file.text());
  const importedCourses = Array.isArray(payload) ? payload : payload.courses;
  const result = await api("/api/courses/import", {
    method: "POST",
    body: JSON.stringify({ courses: importedCourses }),
  });
  courses = Array.isArray(result.courses)
    ? removeOldExampleTrainings(result.courses).map(normalizeCourse)
    : courses;
  selectedManagerCourseId = "__new__";
  managerResult.textContent = "Trainings imported.";
  statsLoaded = false;
  render();
}

function renderCourseList() {
  const visibleCourses = getVisibleCourses();
  courseList.innerHTML = serviceSections
    .map((service) => {
      const serviceCourses = sortCoursesAlphabetically(visibleCourses.filter((course) => course.service === service));
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
                      const state = getProgressState(course);
                      const isActive = course.id === selectedCourseId;
                      return `
                        <button class="course-button ${isActive ? "active" : ""}" type="button" data-course="${escapeHtml(course.id)}">
                          <span class="course-icon">${escapeHtml(course.icon)}</span>
                          <span>
                            <strong>${escapeHtml(course.title)}</strong>
                            <small>${escapeHtml(course.division || course.tag)}</small>
                          </span>
                          ${course.published === false ? `<span class="draft-badge">Draft</span>` : ""}
                          <span class="progress-badge ${state.className}">${escapeHtml(state.label)}</span>
                        </button>
                      `;
                    })
                    .join("")
                : `<p class="empty-service">${courseSearchTerm ? "No matches" : "No trainings yet"}</p>`
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
      }
      selectedModuleIndex = 0;
      renderCourseList();
    });
  });

  document.querySelectorAll("[data-course]").forEach((button) => {
    button.addEventListener("click", () => {
      selectedCourseId = button.dataset.course;
      selectedService = getCourse()?.service || selectedService;
      expandedServices.add(selectedService);
      selectedModuleIndex = 0;
      currentView = "training";
      adminMode = false;
      render();
    });
  });
}

function renderProfile() {
  profilePanel.hidden = !isSignedIn() || adminMode || currentView !== "profile";
  if (profilePanel.hidden) return;

  const profileCourses = courses.filter((course) => course.published !== false || canManageTrainings());
  const completedCourses = profileCourses.filter((course) => getCourseProgress(course.id).passed);
  const completed = completedCourses.length;
  profileSummary.textContent = `${completed} / ${profileCourses.length} completed`;
  profileGrid.innerHTML = profileCourses
    .map((course) => {
      const courseProgress = getCourseProgress(course.id);
      const state = getProgressState(course);
      return `
        <article class="profile-card">
          <div>
            <span class="progress-badge ${state.className}">${escapeHtml(state.label)}</span>
            <h3>${escapeHtml(course.title)}</h3>
            <p>${escapeHtml(course.service)} / ${escapeHtml(course.division)}</p>
          </div>
          <dl>
            <div>
              <dt>Modules read</dt>
              <dd>${courseProgress.readModules.length} / ${course.modules.length}</dd>
            </div>
            <div>
              <dt>Best score</dt>
              <dd>${courseProgress.quizScore === null ? "Not attempted" : `${courseProgress.quizScore}%`}</dd>
            </div>
            <div>
              <dt>Completed</dt>
              <dd>${courseProgress.completedAt || "Not completed"}</dd>
            </div>
          </dl>
        </article>
      `;
    })
    .join("");

  certificateLibrary.innerHTML = completedCourses.length
    ? completedCourses
        .map((course) => {
          const courseProgress = getCourseProgress(course.id);
          return `
            <article class="certificate-library-card">
              <div>
                <span class="progress-badge complete">Certificate</span>
                <h4>${escapeHtml(course.title)}</h4>
                <p>${escapeHtml(course.service)} / ${escapeHtml(course.division)}</p>
                <small>Completed: ${escapeHtml(courseProgress.completedAt || "Recorded")}</small>
              </div>
              <div class="certificate-library-actions">
                <button class="primary-button" type="button" data-certificate-png="${escapeHtml(course.id)}">PNG</button>
                <button class="ghost-button" type="button" data-certificate-pdf="${escapeHtml(course.id)}">PDF</button>
              </div>
            </article>
          `;
        })
        .join("")
    : `<p class="empty-library">Completed certificates will appear here.</p>`;

  certificateLibrary.querySelectorAll("[data-certificate-png]").forEach((button) => {
    button.addEventListener("click", () => downloadCertificate(button.dataset.certificatePng));
  });
  certificateLibrary.querySelectorAll("[data-certificate-pdf]").forEach((button) => {
    button.addEventListener("click", () => downloadPdfCertificate(button.dataset.certificatePdf));
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
  certificatePreviewWrap.hidden = true;
  feedbackResult.textContent = "";

  if (!courseProgress.passed) return;

  const displayName = currentUser?.globalName || currentUser?.username || "This player";
  const scoreText = course.quizEnabled === false ? "No quiz required" : `${courseProgress.quizScore}%`;
  const fmsText = courseProgress.fmsTrainingSync?.message || "FMS training group will update where configured.";
  certificateMessage.innerHTML = `
    <div class="certificate-summary">
      <div>
        <p class="eyebrow">Completed by</p>
        <strong>${escapeHtml(displayName)}</strong>
      </div>
      <div>
        <p class="eyebrow">Course</p>
        <strong>${escapeHtml(course.title)}</strong>
      </div>
      <div>
        <p class="eyebrow">Score</p>
        <strong>${escapeHtml(scoreText)}</strong>
      </div>
      <div>
        <p class="eyebrow">Completed</p>
        <strong>${escapeHtml(courseProgress.completedAt)}</strong>
      </div>
    </div>
    <p class="certificate-status">${escapeHtml(fmsText)}</p>
    <p class="certificate-status">Your FMS training group will handle any linked role allocation automatically.</p>
  `;
  feedbackRating.value = courseProgress.feedback?.rating || "";
  feedbackComment.value = courseProgress.feedback?.comment || "";
  feedbackResult.textContent = courseProgress.feedback ? "Feedback saved. Thank you." : "";
  const previewKey = `${course.id}:${courseProgress.completedAt || ""}:${courseProgress.quizScore ?? "no-quiz"}`;
  const cachedPreview = certificatePreviewCache.get(previewKey);
  if (cachedPreview) {
    certificatePreview.src = cachedPreview;
    certificatePreviewWrap.hidden = false;
    return;
  }
  if (pendingCertificatePreviews.has(previewKey)) return;

  pendingCertificatePreviews.add(previewKey);
  const schedulePreview = window.requestIdleCallback || ((callback) => window.setTimeout(callback, 80));
  schedulePreview(() => {
    createCertificateCanvas(course.id)
      .then((canvas) => {
        pendingCertificatePreviews.delete(previewKey);
        if (!canvas || getCourse()?.id !== course.id) return;
        const dataUrl = canvas.toDataURL("image/png");
        certificatePreviewCache.set(previewKey, dataUrl);
        certificatePreview.src = dataUrl;
        certificatePreviewWrap.hidden = false;
      })
      .catch(() => {
        pendingCertificatePreviews.delete(previewKey);
        certificatePreviewWrap.hidden = true;
      });
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

function drawCenteredText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = String(text).split(" ");
  const lines = [];
  let line = "";
  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word;
    if (ctx.measureText(testLine).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = testLine;
    }
  }
  lines.push(line);
  lines.forEach((item, index) => ctx.fillText(item, x, y + index * lineHeight));
}

async function createCertificateCanvas(courseId = selectedCourseId) {
  const course = courses.find((item) => item.id === courseId) || getCourse();
  if (!course) return null;
  const courseProgress = getCourseProgress(course.id);
  if (!courseProgress.passed) return null;

  const displayName = currentUser?.globalName || currentUser?.username || "This player";
  const canvas = document.createElement("canvas");
  canvas.width = 1600;
  canvas.height = 1100;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#071b2c";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(70, 70, 1460, 960);
  ctx.strokeStyle = "#d21f2b";
  ctx.lineWidth = 10;
  ctx.strokeRect(95, 95, 1410, 910);
  ctx.strokeStyle = "#0057c8";
  ctx.lineWidth = 5;
  ctx.strokeRect(120, 120, 1360, 860);

  try {
    const logo = await loadImage("assets/five999-training-logo.png");
    ctx.drawImage(logo, 680, 130, 240, 240);
  } catch {
    ctx.fillStyle = "#d21f2b";
    ctx.font = "bold 72px Arial";
    ctx.textAlign = "center";
    ctx.fillText("Five999", 800, 250);
  }

  ctx.textAlign = "center";
  ctx.fillStyle = "#d21f2b";
  ctx.font = "bold 42px Arial";
  ctx.fillText("CERTIFICATE OF COMPLETION", 800, 430);

  ctx.fillStyle = "#071b2c";
  ctx.font = "32px Arial";
  ctx.fillText("This certifies that", 800, 510);

  ctx.font = "bold 64px Arial";
  drawCenteredText(ctx, displayName, 800, 600, 1100, 70);

  ctx.font = "32px Arial";
  ctx.fillText("has successfully completed", 800, 730);

  ctx.font = "bold 48px Arial";
  drawCenteredText(ctx, course.title, 800, 805, 1180, 56);

  ctx.font = "28px Arial";
  ctx.fillText(`Completed on ${courseProgress.completedAt || new Date().toLocaleDateString("en-GB")}`, 800, 925);

  ctx.fillStyle = "#5d6f7b";
  ctx.font = "24px Arial";
  ctx.fillText("Five999 Training Hub", 800, 970);

  return canvas;
}

async function downloadCertificate(courseId = selectedCourseId) {
  const course = courses.find((item) => item.id === courseId) || getCourse();
  const canvas = await createCertificateCanvas(courseId);
  if (!course || !canvas) return;

  const link = document.createElement("a");
  link.download = `${course.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-certificate.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

function encodePdfText(value) {
  return String(value).replace(/[()\\]/g, "\\$&");
}

function buildCertificatePdf(jpegBinary, title) {
  const objects = [];
  const addObject = (content) => {
    objects.push(content);
    return objects.length;
  };

  const imageObject = addObject(
    `<< /Type /XObject /Subtype /Image /Width 1600 /Height 1100 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBinary.length} >>\nstream\n${jpegBinary}\nendstream`,
  );
  const content = `q\n842 0 0 595 0 0 cm\n/CertImage Do\nQ\nBT\n/F1 8 Tf\n1 1 1 rg\n5 5 Td\n(${encodePdfText(title)}) Tj\nET`;
  const contentObject = addObject(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
  const pageObject = addObject(
    `<< /Type /Page /Parent 4 0 R /MediaBox [0 0 842 595] /Resources << /XObject << /CertImage ${imageObject} 0 R >> /Font << /F1 5 0 R >> >> /Contents ${contentObject} 0 R >>`,
  );
  const pagesObject = addObject(`<< /Type /Pages /Kids [${pageObject} 0 R] /Count 1 >>`);
  addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  const catalogObject = addObject(`<< /Type /Catalog /Pages ${pagesObject} 0 R >>`);

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogObject} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return pdf;
}

async function downloadPdfCertificate(courseId = selectedCourseId) {
  const course = courses.find((item) => item.id === courseId) || getCourse();
  const canvas = await createCertificateCanvas(courseId);
  if (!course || !canvas) return;

  const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
  const jpegBinary = atob(dataUrl.split(",")[1]);
  const pdf = buildCertificatePdf(jpegBinary, `${course.title} Certificate`);
  const bytes = Uint8Array.from(pdf, (char) => char.charCodeAt(0));
  const link = document.createElement("a");
  link.download = `${course.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-certificate.pdf`;
  link.href = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
  link.click();
  URL.revokeObjectURL(link.href);
}

function render() {
  normalizeCourses();
  let course = getCourse();
  if (currentView === "training" && !course) {
    currentView = "home";
  }
  document.body.classList.toggle("admin-mode", adminMode);
  applyTheme();
  renderCourseList();
  renderAccount();
  landingPanel.hidden = adminMode || currentView !== "home";
  profilePanel.hidden = currentView !== "profile";
  trainingAreas.forEach((area) => {
    area.hidden = adminMode || currentView !== "training";
  });

  if (adminMode) {
    landingPanel.hidden = true;
    profilePanel.hidden = true;
    renderManagement();
    return;
  }

  if (currentView === "home") {
    courseTitle.textContent = "Training Dashboard";
    renderManagement();
    return;
  }

  if (currentView === "profile") {
    courseTitle.textContent = "My Training Profile";
    renderProfile();
    renderManagement();
    return;
  }

  course = getCourse();
  if (!course) {
    currentView = "home";
    courseTitle.textContent = "Training Dashboard";
    courseMedia.innerHTML = "";
    renderHeroImage("");
    courseStartPanel.hidden = true;
    moduleProgress.textContent = "0 / 0 read";
    quizProgress.textContent = "Not available";
    certificateProgress.textContent = "Locked";
    moduleTabs.innerHTML = "";
    moduleBody.innerHTML = "<p>No training content is available yet.</p>";
    quizForm.innerHTML = "";
    scorePill.textContent = "80% required";
    completionPanel.hidden = true;
    landingPanel.hidden = false;
    renderManagement();
    return;
  }
  const courseProgress = getCourseProgress(course.id);
  const hasStarted = Boolean(courseProgress.started || courseProgress.readModules.length || courseProgress.quizScore !== null || courseProgress.passed);
  selectedService = course.service || selectedService;

  courseTitle.textContent = course.title;
  courseTag.textContent = `${course.service} / ${course.division}`;
  courseHeading.textContent = hasStarted ? "Complete the briefing, then pass the quiz." : "Review the overview, then start when ready.";
  courseSummary.textContent = course.summary;
  moduleProgress.textContent = `${courseProgress.readModules.length} / ${course.modules.length} read`;
  quizProgress.textContent =
    courseProgress.quizScore === null
      ? courseProgress.theoryPassed
        ? "Theory passed"
        : "Not attempted"
      : courseProgress.passed
        ? `Passed at ${courseProgress.quizScore}%`
        : course.practicalRequired && courseProgress.theoryPassed
          ? "Practical required"
        : `Last score ${courseProgress.quizScore}%`;

  renderHeroImage(course.imageUrl);
  courseMedia.innerHTML = renderMedia("", course.resourceUrl);
  courseStartPanel.hidden = hasStarted;
  courseStartText.textContent = course.quizEnabled === false
    ? `This training has no final quiz. Read each module and mark it complete${course.practicalRequired ? ", then complete the in-game practical with Command." : " to unlock your confirmation and certificate."}`
    : `This training includes ${course.modules.length} module${course.modules.length === 1 ? "" : "s"} and a final quiz. You need ${PASS_MARK}% to pass${course.practicalRequired ? ", then Command must pass your in-game practical." : "."}`;
  startTrainingButton.disabled = !isSignedIn();
  startTrainingButton.textContent = isSignedIn() ? "Start Training" : "Sign in to Start";

  if (hasStarted) {
    renderModules(course);
    renderQuiz(course);
    renderCompletion(course);
  } else {
    moduleTabs.innerHTML = "";
    moduleBody.innerHTML = "<p>Press Start Training to unlock the briefing modules.</p>";
    quizForm.innerHTML = "<p class=\"result-text\">The quiz unlocks after you start and read the briefing modules.</p>";
    scorePill.textContent = course.quizEnabled === false ? "Quiz disabled" : "80% required";
    completionPanel.hidden = true;
  }
  renderManagement();
}

startTrainingButton.addEventListener("click", () => {
  if (!isSignedIn()) return;
  const course = getCourse();
  if (!course) return;
  const courseProgress = getCourseProgress(course.id);
  courseProgress.started = true;
  saveProgress();
  render();
});

markRead.addEventListener("click", async () => {
  if (!isSignedIn()) return;
  const courseProgress = getCourseProgress(selectedCourseId);
  if (!courseProgress.readModules.includes(selectedModuleIndex)) {
    courseProgress.readModules.push(selectedModuleIndex);
    courseProgress.readModules.sort((a, b) => a - b);
    const course = getCourse();
    if (course?.quizEnabled === false && courseProgress.readModules.length === course.modules.length) {
      courseProgress.quizScore = null;
      markTheoryPassed(course, courseProgress);
    }
    await saveProgress();
  }

  const course = getCourse();
  if (selectedModuleIndex < course.modules.length - 1) {
    selectedModuleIndex += 1;
  }
  render();
});

quizForm.addEventListener("submit", async (event) => {
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

  if (score >= PASS_MARK) {
    markTheoryPassed(course, courseProgress, score);
  }

  await saveProgress();
  render();

  const resultText = document.getElementById("resultText");
  resultText.textContent =
    score >= PASS_MARK
      ? course.practicalRequired
        ? `Theory passed with ${score}%. Command must now complete your in-game practical assessment.`
        : `Passed with ${score}%. Your completion message is ready below.`
      : `Scored ${score}%. You need ${PASS_MARK}% to pass, so review the briefing and try again.`;

  if (score >= PASS_MARK && !course.practicalRequired) {
    completionPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  }
});

feedbackForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!isSignedIn()) return;
  const course = getCourse();
  if (!course) return;
  const courseProgress = getCourseProgress(course.id);
  if (!courseProgress.passed) return;

  courseProgress.feedback = {
    rating: feedbackRating.value,
    comment: feedbackComment.value.trim(),
    submittedAt: new Date().toLocaleString("en-GB", {
      dateStyle: "medium",
      timeStyle: "short",
    }),
  };
  saveProgress();
  feedbackResult.textContent = "Feedback saved. Thank you.";
});

courseSearch.addEventListener("input", () => {
  courseSearchTerm = courseSearch.value;
  expandSearchMatches();
  renderCourseList();
});

courseSearch.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") return;
  event.preventDefault();
  courseSearchTerm = courseSearch.value;
  expandSearchMatches();
  openFirstSearchResult();
});

managerCourseSelect.addEventListener("change", () => {
  selectedManagerCourseId = managerCourseSelect.value;
  managerResult.textContent = "";
  render();
});

sidebarAdminButton.addEventListener("click", () => {
  adminMode = true;
  adminView = "editor";
  currentView = "admin";
  selectedManagerCourseId = "__new__";
  render();
});

sidebarAnalyticsButton.addEventListener("click", () => {
  adminMode = true;
  adminView = "analytics";
  currentView = "admin";
  render();
});

function toggleTheme() {
  currentTheme = currentTheme === "dark" ? "light" : "dark";
  localStorage.setItem("five999TrainingTheme", currentTheme);
  applyTheme();
}

refreshStatsButton.addEventListener("click", () => {
  statsLoaded = false;
  loadStats();
});

exportStatsButton.addEventListener("click", () => {
  exportStatsCsv();
});

exportTrainingsButton.addEventListener("click", async () => {
  if (!canManageTrainings()) return;
  try {
    await exportTrainings();
  } catch (error) {
    managerResult.textContent = error.message || "Training export failed.";
  }
});

importTrainingsButton.addEventListener("click", () => {
  if (!canManageTrainings()) return;
  importTrainingsFile.click();
});

importTrainingsFile.addEventListener("change", async () => {
  try {
    await importTrainingsFromFile(importTrainingsFile.files[0]);
  } catch (error) {
    managerResult.textContent = error.message || "Training import failed.";
  } finally {
    importTrainingsFile.value = "";
  }
});

statsUserBody.addEventListener("click", (event) => {
  const button = event.target.closest("[data-player-history]");
  if (!button) return;
  const users = latestStats?.users || [];
  const user = users.find((item) => item.discordId === button.dataset.playerHistory);
  renderPlayerHistory(user);
});

statsPracticalBody.addEventListener("click", (event) => {
  const passButton = event.target.closest("[data-practical-pass]");
  if (passButton) {
    updatePracticalAssessment(passButton.dataset.practicalPass, passButton.dataset.courseId, "passed");
    return;
  }
  const failButton = event.target.closest("[data-practical-fail]");
  if (failButton) {
    updatePracticalAssessment(failButton.dataset.practicalFail, failButton.dataset.courseId, "failed");
  }
});

downloadCertificateButton.addEventListener("click", () => {
  downloadCertificate();
});

downloadPdfCertificateButton.addEventListener("click", () => {
  downloadPdfCertificate();
});

newTrainingButton.addEventListener("click", () => {
  if (!canManageTrainings()) return;
  selectedManagerCourseId = "__new__";
  managerResult.textContent = "";
  render();
});

deleteTrainingButton.addEventListener("click", async () => {
  if (!canDeleteTrainings()) return;
  const course = getManagerCourse();
  if (!course) return;
  if (!window.confirm(`Delete ${course.title}? This is restricted to Leadership Team.`)) return;

  courses = courses.filter((item) => item.id !== course.id);
  selectedCourseId = courses[0]?.id || "";
  selectedManagerCourseId = "__new__";
  await saveCoursesToServer();
  managerResult.textContent = "Training deleted.";
  render();
});

addModuleButton.addEventListener("click", async () => {
  try {
    const modules = await applyUploadedImagesToModules(collectModuleBuilder());
    modules.push({ title: `Module ${modules.length + 1}`, content: "", imageUrl: "", resourceUrl: "" });
    renderModuleBuilder(modules);
  } catch (error) {
    managerResult.textContent = error.message || "Module image upload failed.";
  }
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
    const quiz = collectQuizBuilder().filter((item) => item.question && item.answers.length >= 2);
    const quizEnabled = managerForm.elements.quizEnabled.checked;
    const practicalRequired = managerForm.elements.practicalRequired.checked;
    const uploadedTrainingImage = await readImageFile(managerForm.elements.imageUpload.files[0]);
    const service = managerForm.elements.service.value;

    if (!modules.length || (quizEnabled && !quiz.length)) {
      managerResult.textContent = quizEnabled
        ? "Add at least one module and one quiz question with at least two answers."
        : "Add at least one module.";
      return;
    }

    if (!canManageService(service)) {
      managerResult.textContent = "Your Command role cannot create or edit trainings for that service.";
      return;
    }

    const existing = getManagerCourse();
    const draft = createBlankTraining();
    const nextCourse = {
      id: existing?.id || draft.id,
      service,
      division: managerForm.elements.division.value,
      title: managerForm.elements.title.value,
      tag: managerForm.elements.tag.value,
      icon: managerForm.elements.icon.value,
      summary: managerForm.elements.summary.value,
      published: managerForm.elements.published.checked,
      imageUrl: uploadedTrainingImage || managerForm.elements.imageUrl.value,
      resourceUrl: managerForm.elements.resourceUrl.value,
      theoryFmsTrainingGroupIds: parseNumberList(managerForm.elements.theoryFmsTrainingGroupIds.value),
      fmsTrainingGroupIds: parseNumberList(managerForm.elements.fmsTrainingGroupIds.value),
      fmsTrainingNote: managerForm.elements.fmsTrainingNote.value,
      fmsTrainingExpiryDate: managerForm.elements.fmsTrainingExpiryDate.value,
      fmsAutoRemoveOnExpiry: managerForm.elements.fmsAutoRemoveOnExpiry.checked,
      quizEnabled,
      practicalRequired,
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
    currentView = "admin";
    await saveCoursesToServer();
    managerResult.textContent = "Training saved.";
    render();
  } catch (error) {
    managerResult.textContent = error.message || "Check the training fields, then try again.";
  }
});

async function init() {
  const [config, me, savedCourses] = await Promise.all([
    api("/api/config"),
    api("/api/me"),
    api("/api/courses"),
  ]);
  authConfigured = config.authConfigured;
  currentUser = me.user;
  currentAccess = me.access;
  if (savedCourses.courses?.length) {
    courses = removeOldExampleTrainings(savedCourses.courses).map(normalizeCourse);
  } else {
    normalizeCourses();
  }
  selectedCourseId = "";
  selectedService = courses[0]?.service || serviceSections[0];
  expandedServices = new Set();
  selectedManagerCourseId = "__new__";

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
