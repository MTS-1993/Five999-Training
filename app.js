let DISCORD_TICKET_URL = "https://discord.com/channels/YOUR_SERVER_ID/YOUR_TICKET_CHANNEL_ID";
const PASS_MARK = 80;

const courses = [
  {
    id: "rpu",
    icon: "RP",
    title: "Roads Policing Unit",
    tag: "Traffic specialist training",
    summary:
      "Covers pursuit conduct, traffic stops, scene safety, and specialist road incident standards.",
    modules: [
      {
        title: "Role Standards",
        body: [
          "Represent the unit with calm, clear radio work and proportionate decision-making.",
          "Prioritise public safety over the chase, the stop, or the arrest outcome.",
          "Use FMS notes to record the reason for deployment, evidence gathered, and final action.",
        ],
      },
      {
        title: "Traffic Stops",
        body: [
          "Choose a safe location before initiating a stop and keep emergency lighting visible.",
          "Explain the reason for the stop clearly before requesting documents or checks.",
          "Escalate only when risk markers, behaviour, or intelligence justify it.",
        ],
      },
      {
        title: "Pursuits",
        body: [
          "Call direction, speed, traffic, weather, and risk changes as the pursuit develops.",
          "Request authority and specialist assets early where policy requires it.",
          "Discontinue when the risk to the public outweighs the policing purpose.",
        ],
      },
    ],
    quiz: [
      {
        question: "What should be prioritised during any Roads Policing deployment?",
        answers: ["A quick arrest", "Public safety", "Winning the pursuit", "Avoiding paperwork"],
        correct: 1,
      },
      {
        question: "What should be included in pursuit commentary?",
        answers: ["Only the vehicle colour", "Direction, speed, traffic, weather, and risk", "Personal opinions", "Nothing unless asked"],
        correct: 1,
      },
      {
        question: "When should a pursuit be discontinued?",
        answers: ["Never", "Only after fuel runs out", "When public risk outweighs the policing purpose", "When the suspect turns left"],
        correct: 2,
      },
      {
        question: "Before initiating a traffic stop, what should you consider?",
        answers: ["A safe stopping location", "The nearest shop", "A faster vehicle", "A different uniform"],
        correct: 0,
      },
      {
        question: "Where should key actions and evidence be recorded?",
        answers: ["In FMS notes", "In chat only", "Nowhere", "On a private notepad only"],
        correct: 0,
      },
    ],
  },
  {
    id: "firearms",
    icon: "AR",
    title: "Authorised Firearms",
    tag: "Armed response training",
    summary:
      "Focuses on threat assessment, containment, communications, and proportionate armed tactics.",
    modules: [
      {
        title: "Threat Assessment",
        body: [
          "Identify the subject, weapon type, location, bystanders, and immediate threat level.",
          "Keep cover and distance where possible while maintaining lawful control of the scene.",
          "Update command when the threat changes or new intelligence appears.",
        ],
      },
      {
        title: "Containment",
        body: [
          "Set inner and outer cordons to protect the public and preserve tactical options.",
          "Use clear challenge instructions and allow compliance time where safe.",
          "Coordinate with negotiators, medical support, and additional units when needed.",
        ],
      },
      {
        title: "Aftercare",
        body: [
          "Secure weapons, provide medical support, and preserve evidence after an incident.",
          "Log use of force and decision points in FMS as soon as practical.",
          "Remain professional in public areas and avoid unnecessary weapon display.",
        ],
      },
    ],
    quiz: [
      {
        question: "What is the first priority in an armed deployment?",
        answers: ["Fast entry", "Threat assessment and public safety", "Using the loudest vehicle", "Avoiding command updates"],
        correct: 1,
      },
      {
        question: "What should cordons help protect?",
        answers: ["Only police vehicles", "The public and tactical options", "The suspect's route out", "Radio silence"],
        correct: 1,
      },
      {
        question: "When should command be updated?",
        answers: ["Only at the end", "When threat or intelligence changes", "Never", "After leaving the server"],
        correct: 1,
      },
      {
        question: "What should happen after an armed incident?",
        answers: ["Secure weapons, provide medical support, preserve evidence", "Leave immediately", "Delete notes", "Ignore witnesses"],
        correct: 0,
      },
      {
        question: "Where should use of force and decision points be logged?",
        answers: ["FMS", "Voice chat only", "A meme channel", "Nowhere"],
        correct: 0,
      },
    ],
  },
  {
    id: "cid",
    icon: "CI",
    title: "Criminal Investigation",
    tag: "Investigation specialist training",
    summary:
      "Builds consistent standards for evidence handling, interviews, case files, and investigation planning.",
    modules: [
      {
        title: "Investigation Planning",
        body: [
          "Start with a clear allegation, known facts, unknowns, and proportionate lines of enquiry.",
          "Record victim, witness, suspect, and scene details before drawing conclusions.",
          "Keep the investigation focused on evidence, not assumptions.",
        ],
      },
      {
        title: "Evidence Handling",
        body: [
          "Preserve original evidence and note where it came from, who handled it, and when.",
          "Use screenshots, logs, and statements to support key decisions.",
          "Do not share sensitive evidence outside approved channels.",
        ],
      },
      {
        title: "Interviews",
        body: [
          "Plan questions before interview and keep the tone professional.",
          "Put allegations clearly and allow the player a chance to answer.",
          "Summarise admissions, denials, and next steps in FMS.",
        ],
      },
    ],
    quiz: [
      {
        question: "What should an investigation be based on?",
        answers: ["Evidence", "Rumour", "Assumptions", "Who speaks loudest"],
        correct: 0,
      },
      {
        question: "What should be recorded for evidence handling?",
        answers: ["Origin, handler, and time", "Only the file name", "Nothing", "The suspect's favourite car"],
        correct: 0,
      },
      {
        question: "Where should sensitive evidence be shared?",
        answers: ["Approved channels only", "Any public chat", "Personal DMs to everyone", "Nowhere, even with command"],
        correct: 0,
      },
      {
        question: "What should interviews include?",
        answers: ["Clear allegations and a chance to answer", "Only yes/no shouting", "No planning", "No record"],
        correct: 0,
      },
      {
        question: "Where should next steps be summarised?",
        answers: ["FMS", "A private reminder only", "Vehicle notes", "They do not need recording"],
        correct: 0,
      },
    ],
  },
  {
    id: "control",
    icon: "CR",
    title: "Control Room",
    tag: "Dispatch and command training",
    summary:
      "Covers call grading, radio discipline, unit allocation, and incident oversight.",
    modules: [
      {
        title: "Call Grading",
        body: [
          "Grade incidents by threat, risk, harm, vulnerability, and available resources.",
          "Gather enough information to send the right response without delaying urgent help.",
          "Update grading if the incident escalates or new information changes the risk.",
        ],
      },
      {
        title: "Radio Discipline",
        body: [
          "Keep transmissions brief, structured, and relevant.",
          "Avoid talking over emergency traffic and acknowledge critical updates.",
          "Use clear unit identifiers and incident references.",
        ],
      },
      {
        title: "Resource Allocation",
        body: [
          "Allocate units based on skills, location, workload, and incident risk.",
          "Track who is assigned, who is free, and who needs support.",
          "Escalate to supervisors when demand exceeds available resources.",
        ],
      },
    ],
    quiz: [
      {
        question: "What factors should guide call grading?",
        answers: ["Threat, risk, harm, vulnerability, resources", "Only who called first", "Vehicle colour", "Random choice"],
        correct: 0,
      },
      {
        question: "How should radio transmissions be handled?",
        answers: ["Brief, structured, and relevant", "As long as possible", "With jokes during emergencies", "Only in text chat"],
        correct: 0,
      },
      {
        question: "When should a call grade be updated?",
        answers: ["When new information changes risk", "Never", "Only next week", "When the incident closes"],
        correct: 0,
      },
      {
        question: "What should control track?",
        answers: ["Assigned, available, and unsupported units", "Only staff cars", "Nothing", "Private conversations"],
        correct: 0,
      },
      {
        question: "When should demand be escalated?",
        answers: ["When it exceeds available resources", "Never", "Only after everyone disconnects", "For every low-risk call"],
        correct: 0,
      },
    ],
  },
];

let selectedCourseId = courses[0].id;
let selectedModuleIndex = 0;
let progress = {};
let currentUser = null;
let authConfigured = false;

const courseList = document.getElementById("courseList");
const courseTitle = document.getElementById("courseTitle");
const courseTag = document.getElementById("courseTag");
const courseHeading = document.getElementById("courseHeading");
const courseSummary = document.getElementById("courseSummary");
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

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getCourse() {
  return courses.find((course) => course.id === selectedCourseId);
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

  if (!authConfigured) {
    accountActions.innerHTML = `<span class="account-warning">Discord OAuth needs Render env vars</span>`;
    authPanel.hidden = false;
    authPanel.querySelector("h2").textContent = "Discord sign-in is not configured yet.";
    authPanel.querySelector("p:last-child").textContent =
      "Add your Discord application credentials in Render, then players will be able to sign in and save progress.";
    authPanel.querySelector("a").style.display = "none";
    return;
  }

  if (!isSignedIn()) {
    accountActions.innerHTML = `<a class="primary-button" href="/auth/discord">Sign in with Discord</a>`;
    authPanel.querySelector("a").style.display = "";
    return;
  }

  const displayName = escapeHtml(currentUser.globalName || currentUser.username);
  accountActions.innerHTML = `
    <span class="account-chip">Signed in as <strong>${displayName}</strong></span>
    <button class="ghost-button" id="resetProgress" type="button" title="Clear saved progress">Reset Progress</button>
    <button class="ghost-button" id="logoutButton" type="button">Log Out</button>
  `;

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

function renderCourseList() {
  courseList.innerHTML = courses
    .map((course) => {
      const courseProgress = getCourseProgress(course.id);
      const isActive = course.id === selectedCourseId;
      return `
        <button class="course-button ${isActive ? "active" : ""}" type="button" data-course="${course.id}">
          <span class="course-icon">${course.icon}</span>
          <span>
            <strong>${course.title}</strong>
            <small>${course.tag}</small>
          </span>
          <span class="course-state ${courseProgress.passed ? "complete" : ""}" aria-label="${courseProgress.passed ? "Completed" : "Incomplete"}"></span>
        </button>
      `;
    })
    .join("");

  document.querySelectorAll("[data-course]").forEach((button) => {
    button.addEventListener("click", () => {
      selectedCourseId = button.dataset.course;
      selectedModuleIndex = 0;
      render();
    });
  });
}

function renderModules(course) {
  const courseProgress = getCourseProgress(course.id);
  moduleTabs.innerHTML = course.modules
    .map((module, index) => {
      const read = courseProgress.readModules.includes(index);
      const active = selectedModuleIndex === index;
      return `<button class="module-tab ${active ? "active" : ""}" type="button" data-module="${index}">
        ${read ? "✓ " : ""}${module.title}
      </button>`;
    })
    .join("");

  document.querySelectorAll("[data-module]").forEach((button) => {
    button.addEventListener("click", () => {
      selectedModuleIndex = Number(button.dataset.module);
      render();
    });
  });

  const module = course.modules[selectedModuleIndex];
  moduleBody.innerHTML = `
    <h3>${module.title}</h3>
    <ul>${module.body.map((point) => `<li>${point}</li>`).join("")}</ul>
  `;

  markRead.textContent = courseProgress.readModules.includes(selectedModuleIndex)
    ? "Module Read"
    : "Mark Module Read";
  markRead.disabled = !isSignedIn() || courseProgress.readModules.includes(selectedModuleIndex);
}

function renderQuiz(course) {
  const courseProgress = getCourseProgress(course.id);
  const allRead = isSignedIn() && courseProgress.readModules.length === course.modules.length;

  quizForm.innerHTML = course.quiz
    .map(
      (item, questionIndex) => `
        <fieldset class="question" ${allRead ? "" : "disabled"}>
          <legend>${questionIndex + 1}. ${item.question}</legend>
          ${item.answers
            .map(
              (answer, answerIndex) => `
                <label class="answer">
                  <input type="radio" name="q${questionIndex}" value="${answerIndex}" required />
                  <span>${answer}</span>
                </label>
              `,
            )
            .join("")}
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
  const courseProgress = getCourseProgress(course.id);
  completionPanel.hidden = !courseProgress.passed;
  certificateProgress.textContent = courseProgress.passed ? "Unlocked" : "Locked";

  if (!courseProgress.passed) return;

  certificateMessage.innerHTML = `
    <strong>${course.title} specialist training completed.</strong><br />
    Player has achieved ${courseProgress.quizScore}% on the final assessment, meeting the ${PASS_MARK}% pass requirement.<br />
    Completed: ${courseProgress.completedAt}<br /><br />
    Please open a support ticket in Discord to obtain the role via FMS.
  `;
}

function render() {
  const course = getCourse();
  const courseProgress = getCourseProgress(course.id);

  courseTitle.textContent = course.title;
  courseTag.textContent = course.tag;
  courseHeading.textContent = "Complete the briefing, then pass the quiz.";
  courseSummary.textContent = course.summary;
  moduleProgress.textContent = `${courseProgress.readModules.length} / ${course.modules.length} read`;
  quizProgress.textContent =
    courseProgress.quizScore === null
      ? "Not attempted"
      : courseProgress.passed
        ? `Passed at ${courseProgress.quizScore}%`
        : `Last score ${courseProgress.quizScore}%`;

  renderCourseList();
  renderAccount();
  renderModules(course);
  renderQuiz(course);
  renderCompletion(course);
}

markRead.addEventListener("click", () => {
  if (!isSignedIn()) return;
  const courseProgress = getCourseProgress(selectedCourseId);
  if (!courseProgress.readModules.includes(selectedModuleIndex)) {
    courseProgress.readModules.push(selectedModuleIndex);
    courseProgress.readModules.sort((a, b) => a - b);
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

async function init() {
  const config = await api("/api/config");
  DISCORD_TICKET_URL = config.discordTicketUrl || DISCORD_TICKET_URL;
  authConfigured = config.authConfigured;
  ticketLink.href = DISCORD_TICKET_URL;

  const me = await api("/api/me");
  currentUser = me.user;

  if (isSignedIn()) {
    const saved = await api("/api/progress");
    progress = saved.progress || {};
  }

  render();
}

init().catch((error) => {
  console.error(error);
  progress = JSON.parse(localStorage.getItem("five999TrainingProgressBackup") || "{}");
  render();
});
