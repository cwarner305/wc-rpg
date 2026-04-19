const WC_RPG = (() => {
  const CONFIG = {
    WEB_APP_URL: "PASTE_YOUR_APPS_SCRIPT_WEB_APP_URL_HERE",
    PASSING_PERCENT: 70,
    QUESTION_TIME_LIMIT_SECONDS: 0,
    DEFAULT_MAX_BOSS_QUESTIONS: 10,
    STORAGE_KEY_PREFIX: "wc_rpg_",
    XP_PER_LEVEL: 50,
    CHARACTER_PREVIEW_FALLBACK: {
      base: "assets/base/base_adventurer.png",
      hair: "",
      hat: "",
      outfit: "",
      item: "",
      accessory: ""
    }
  };

  const state = {
    studentKey: "",
    period: "",
    currentCode: "",
    currentUnit: "",
    currentGameName: "",
    currentSkill: "practice",
    questions: [],
    filteredQuestions: [],
    currentIndex: 0,
    selectedAnswer: null,
    answers: [],
    scoreRaw: 0,
    maxPoints: 0,
    startTime: null,
    endTime: null,
    resultPayload: null,
    studentProfile: null,
    equipped: null,
    unlockQueue: []
  };

  const el = {};

  function init() {
    cacheDom();
    bindEvents();
    loadLocalProfile();
    renderStudentHeader();
    renderAvatar();
    showScreen("start");
  }

  function cacheDom() {
    el.screenStart = document.getElementById("screen-start");
    el.screenQuiz = document.getElementById("screen-quiz");
    el.screenResults = document.getElementById("screen-results");

    el.studentKeyInput = document.getElementById("student-key");
    el.periodInput = document.getElementById("period");
    el.codeInput = document.getElementById("practice-code");

    el.startBtn = document.getElementById("start-btn");
    el.nextBtn = document.getElementById("next-btn");
    el.submitBtn = document.getElementById("submit-btn");
    el.playAgainBtn = document.getElementById("play-again-btn");

    el.loadingText = document.getElementById("loading-text");
    el.errorBox = document.getElementById("error-box");

    el.quizCodeLabel = document.getElementById("quiz-code-label");
    el.quizProgressLabel = document.getElementById("quiz-progress-label");
    el.quizQuestionText = document.getElementById("quiz-question-text");
    el.quizChoices = document.getElementById("quiz-choices");

    el.resultsTitle = document.getElementById("results-title");
    el.resultsScore = document.getElementById("results-score");
    el.resultsPercent = document.getElementById("results-percent");
    el.resultsXp = document.getElementById("results-xp");
    el.resultsTotalXp = document.getElementById("results-total-xp");
    el.resultsLevel = document.getElementById("results-level");
    el.resultsGrowth = document.getElementById("results-growth");
    el.resultsMessage = document.getElementById("results-message");

    el.studentNameDisplay = document.getElementById("student-name-display");
    el.studentLevelDisplay = document.getElementById("student-level-display");
    el.studentXpDisplay = document.getElementById("student-xp-display");

    el.avatarBase = document.getElementById("avatar-base");
    el.avatarHair = document.getElementById("avatar-hair");
    el.avatarHat = document.getElementById("avatar-hat");
    el.avatarOutfit = document.getElementById("avatar-outfit");
    el.avatarItem = document.getElementById("avatar-item");
    el.avatarAccessory = document.getElementById("avatar-accessory");

    el.unlockModal = document.getElementById("unlock-modal");
    el.unlockList = document.getElementById("unlock-list");
    el.closeUnlockBtn = document.getElementById("close-unlock-btn");

    el.equipPanel = document.getElementById("equip-panel");
    el.equipHair = document.getElementById("equip-hair");
    el.equipHat = document.getElementById("equip-hat");
    el.equipOutfit = document.getElementById("equip-outfit");
    el.equipItem = document.getElementById("equip-item");
    el.equipAccessory = document.getElementById("equip-accessory");
    el.saveEquipBtn = document.getElementById("save-equip-btn");
  }

  function bindEvents() {
    if (el.startBtn) {
      el.startBtn.addEventListener("click", startGame);
    }

    if (el.nextBtn) {
      el.nextBtn.addEventListener("click", nextQuestion);
    }

    if (el.submitBtn) {
      el.submitBtn.addEventListener("click", finishQuiz);
    }

    if (el.playAgainBtn) {
      el.playAgainBtn.addEventListener("click", resetToStart);
    }

    if (el.closeUnlockBtn) {
      el.closeUnlockBtn.addEventListener("click", closeUnlockModal);
    }

    if (el.saveEquipBtn) {
      el.saveEquipBtn.addEventListener("click", saveEquippedLoadout);
    }
  }

  function showScreen(name) {
    hideAllScreens();

    if (name === "start" && el.screenStart) el.screenStart.style.display = "block";
    if (name === "quiz" && el.screenQuiz) el.screenQuiz.style.display = "block";
    if (name === "results" && el.screenResults) el.screenResults.style.display = "block";
  }

  function hideAllScreens() {
    if (el.screenStart) el.screenStart.style.display = "none";
    if (el.screenQuiz) el.screenQuiz.style.display = "none";
    if (el.screenResults) el.screenResults.style.display = "none";
  }

  function setLoading(message) {
    if (el.loadingText) {
      el.loadingText.textContent = message || "";
    }
  }

  function setError(message) {
    if (el.errorBox) {
      el.errorBox.textContent = message || "";
      el.errorBox.style.display = message ? "block" : "none";
    }
  }

  function clearError() {
    setError("");
  }

  function startGame() {
    clearError();

    const studentKey = (el.studentKeyInput?.value || "").trim().toLowerCase();
    const period = (el.periodInput?.value || "").trim();
    const code = (el.codeInput?.value || "").trim();

    if (!studentKey) {
      setError("Enter a student ID or student key.");
      return;
    }

    if (!period) {
      setError("Enter a period.");
      return;
    }

    if (!code) {
      setError("Enter a practice code like 3.3, 3, or *3.");
      return;
    }

    state.studentKey = studentKey;
    state.period = period;
    state.currentCode = code;
    state.currentUnit = deriveUnitFromCode(code);
    state.currentGameName = code;
    state.currentSkill = isBossCode(code) ? "boss" : "practice";
    state.currentIndex = 0;
    state.answers = [];
    state.scoreRaw = 0;
    state.maxPoints = 0;
    state.startTime = Date.now();
    state.endTime = null;
    state.resultPayload = null;

    ensureProfileExists();
    saveLocalProfile();
    renderStudentHeader();

    loadQuestions(code);
  }

  async function loadQuestions(code) {
    try {
      setLoading("Loading questions...");
      clearError();

      const url = `${CONFIG.WEB_APP_URL}?action=questions&code=${encodeURIComponent(code)}`;
      const response = await fetch(url, { method: "GET" });
      const data = await response.json();

      if (!data.ok) {
        throw new Error(data.error || "Unable to load questions.");
      }

      if (!Array.isArray(data.questions) || data.questions.length === 0) {
        throw new Error("No questions were returned for this code.");
      }

      state.questions = data.questions;
      state.filteredQuestions = prepareQuestionSet(code, data.questions);
      state.maxPoints = state.filteredQuestions.length;

      if (state.maxPoints === 0) {
        throw new Error("No playable questions were prepared.");
      }

      setLoading("");
      showScreen("quiz");
      renderQuestion();
    } catch (error) {
      setLoading("");
      setError(error.message || "There was a problem loading the quiz.");
    }
  }

  function prepareQuestionSet(code, questions) {
    let working = [...questions];

    if (isBossCode(code)) {
      working.sort((a, b) => Number(b.difficulty || 0) - Number(a.difficulty || 0));
      working = working.slice(0, CONFIG.DEFAULT_MAX_BOSS_QUESTIONS);
    }

    return working;
  }

  function renderQuestion() {
    const q = state.filteredQuestions[state.currentIndex];
    if (!q) return;

    state.selectedAnswer = null;

    if (el.quizCodeLabel) {
      el.quizCodeLabel.textContent = `Code: ${state.currentCode}`;
    }

    if (el.quizProgressLabel) {
      el.quizProgressLabel.textContent = `Question ${state.currentIndex + 1} of ${state.filteredQuestions.length}`;
    }

    if (el.quizQuestionText) {
      el.quizQuestionText.textContent = q.question_text || "";
    }

    if (el.quizChoices) {
      el.quizChoices.innerHTML = "";
      q.choices.forEach(choice => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "choice-btn";
        btn.dataset.label = choice.label;
        btn.textContent = `${choice.label}. ${choice.text}`;
        btn.addEventListener("click", () => selectAnswer(choice.label));
        el.quizChoices.appendChild(btn);
      });
    }

    updateQuizNav();
  }

  function selectAnswer(label) {
    state.selectedAnswer = label;

    const buttons = document.querySelectorAll(".choice-btn");
    buttons.forEach(btn => {
      btn.classList.toggle("selected", btn.dataset.label === label);
    });

    updateQuizNav();
  }

  function updateQuizNav() {
    const onLastQuestion = state.currentIndex === state.filteredQuestions.length - 1;
    const hasSelection = !!state.selectedAnswer;

    if (el.nextBtn) {
      el.nextBtn.style.display = onLastQuestion ? "none" : "inline-block";
      el.nextBtn.disabled = !hasSelection;
    }

    if (el.submitBtn) {
      el.submitBtn.style.display = onLastQuestion ? "inline-block" : "none";
      el.submitBtn.disabled = !hasSelection;
    }
  }

  function nextQuestion() {
    if (!state.selectedAnswer) {
      setError("Choose an answer before moving on.");
      return;
    }

    clearError();
    recordCurrentAnswer();

    if (state.currentIndex < state.filteredQuestions.length - 1) {
      state.currentIndex += 1;
      renderQuestion();
    }
  }

  async function finishQuiz() {
    if (!state.selectedAnswer) {
      setError("Choose an answer before submitting.");
      return;
    }

    clearError();
    recordCurrentAnswer();

    state.endTime = Date.now();
    calculateScore();

    try {
      setLoading("Saving your progress...");

      const payload = {
        student_key: state.studentKey,
        period: state.period,
        unit: state.currentUnit,
        game_name: state.currentGameName,
        skill: state.currentSkill,
        score_raw: state.scoreRaw,
        max_points: state.maxPoints,
        time_spent_seconds: getTimeSpentSeconds(),
        notes: buildNotes()
      };

      const response = await fetch(CONFIG.WEB_APP_URL, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain;charset=utf-8"
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!data.ok) {
        throw new Error(data.error || "Your score could not be saved.");
      }

      state.resultPayload = data;
      applyResultToProfile(data);
      populateEquipmentSelectors();
      renderStudentHeader();
      renderAvatar();

      if (Array.isArray(data.unlocks) && data.unlocks.length > 0) {
        state.unlockQueue = data.unlocks;
        addUnlocksToInventory(data.unlocks);
        populateEquipmentSelectors();
        openUnlockModal(data.unlocks);
      }

      setLoading("");
      renderResults();
      showScreen("results");
    } catch (error) {
      setLoading("");
      setError(error.message || "There was a problem saving progress.");
    }
  }

  function recordCurrentAnswer() {
    const q = state.filteredQuestions[state.currentIndex];
    const selected = state.selectedAnswer;
    const correct = (q.correct_answer || "").toUpperCase();
    const isCorrect = selected === correct;

    state.answers.push({
      index: state.currentIndex,
      selected_answer: selected,
      correct_answer: correct,
      is_correct: isCorrect,
      question_text: q.question_text || "",
      skill: q.skill || "",
      difficulty: q.difficulty || ""
    });

    state.selectedAnswer = null;
  }

  function calculateScore() {
    state.scoreRaw = state.answers.filter(a => a.is_correct).length;
    state.maxPoints = state.filteredQuestions.length;
  }

  function renderResults() {
    const percent = state.maxPoints > 0
      ? Math.round((state.scoreRaw / state.maxPoints) * 100)
      : 0;

    const result = state.resultPayload || {};

    if (el.resultsTitle) {
      el.resultsTitle.textContent = isBossCode(state.currentCode)
        ? "Boss Battle Complete"
        : "Adventure Complete";
    }

    if (el.resultsScore) {
      el.resultsScore.textContent = `${state.scoreRaw} / ${state.maxPoints}`;
    }

    if (el.resultsPercent) {
      el.resultsPercent.textContent = `${percent}%`;
    }

    if (el.resultsXp) {
      el.resultsXp.textContent = String(result.xp_earned ?? 0);
    }

    if (el.resultsTotalXp) {
      el.resultsTotalXp.textContent = String(result.total_xp ?? 0);
    }

    if (el.resultsLevel) {
      el.resultsLevel.textContent = String(result.level ?? 1);
    }

    if (el.resultsGrowth) {
      el.resultsGrowth.textContent = String(result.growth ?? 0);
    }

    if (el.resultsMessage) {
      el.resultsMessage.textContent = buildResultMessage(percent, result);
    }
  }

  function buildResultMessage(percent, result) {
    const leveledUp = didLevelUp(result);
    const bossText = isBossCode(state.currentCode) ? "boss battle" : "adventure";

    if (leveledUp && percent >= CONFIG.PASSING_PERCENT) {
      return `Great work. You cleared this ${bossText}, leveled up, and unlocked new gear.`;
    }

    if (leveledUp) {
      return `You leveled up. Keep practicing this content to raise your score and earn more rewards.`;
    }

    if (percent >= CONFIG.PASSING_PERCENT) {
      return `You cleared this ${bossText}. Replay for stronger mastery and more growth.`;
    }

    return `Not cleared yet. Replay this code and keep building XP, growth, and gear.`;
  }

  function didLevelUp(result) {
    const previousLevel = Number(state.studentProfile?.level || 1);
    const newLevel = Number(result?.level || previousLevel);
    return newLevel > previousLevel;
  }

  function deriveUnitFromCode(code) {
    if (!code) return "";

    const cleaned = code.replace("*", "").trim();

    if (cleaned.includes(".")) {
      return cleaned.split(".")[0];
    }

    return cleaned;
  }

  function isBossCode(code) {
    return code.startsWith("*") || code.endsWith(".10");
  }

  function getTimeSpentSeconds() {
    if (!state.startTime || !state.endTime) return 0;
    return Math.max(0, Math.round((state.endTime - state.startTime) / 1000));
  }

  function buildNotes() {
    const correctCount = state.answers.filter(a => a.is_correct).length;
    return `Code ${state.currentCode} | Correct ${correctCount}/${state.maxPoints} | Skill ${state.currentSkill}`;
  }

  function ensureProfileExists() {
    if (!state.studentProfile) {
      state.studentProfile = {
        studentKey: state.studentKey,
        level: 1,
        totalXp: 0,
        inventory: {
          hair: [],
          hat: [],
          outfit: [],
          item: [],
          accessory: []
        }
      };
    }

    if (!state.equipped) {
      state.equipped = {
        base: CONFIG.CHARACTER_PREVIEW_FALLBACK.base,
        hair: "",
        hat: "",
        outfit: "",
        item: "",
        accessory: ""
      };
    }
  }

  function applyResultToProfile(result) {
    ensureProfileExists();

    state.studentProfile.studentKey = state.studentKey;
    state.studentProfile.level = Number(result.level || state.studentProfile.level || 1);
    state.studentProfile.totalXp = Number(result.total_xp || state.studentProfile.totalXp || 0);

    saveLocalProfile();
  }

  function addUnlocksToInventory(unlocks) {
    ensureProfileExists();

    unlocks.forEach(unlock => {
      const type = unlock.type;
      if (!state.studentProfile.inventory[type]) {
        state.studentProfile.inventory[type] = [];
      }

      const exists = state.studentProfile.inventory[type].some(item => item.asset === unlock.asset);
      if (!exists) {
        state.studentProfile.inventory[type].push({
          name: unlock.name,
          asset: unlock.asset
        });
      }
    });

    saveLocalProfile();
  }

  function openUnlockModal(unlocks) {
    if (!el.unlockModal || !el.unlockList) return;

    el.unlockList.innerHTML = "";

    unlocks.forEach(unlock => {
      const div = document.createElement("div");
      div.className = "unlock-card";
      div.innerHTML = `
        <strong>${escapeHtml(unlock.name)}</strong>
        <div>Type: ${escapeHtml(unlock.type)}</div>
        <div>Asset: ${escapeHtml(unlock.asset)}</div>
      `;
      el.unlockList.appendChild(div);
    });

    el.unlockModal.style.display = "flex";
  }

  function closeUnlockModal() {
    if (el.unlockModal) {
      el.unlockModal.style.display = "none";
    }
  }

  function populateEquipmentSelectors() {
    if (!state.studentProfile?.inventory) return;

    populateEquipSelect(el.equipHair, "hair");
    populateEquipSelect(el.equipHat, "hat");
    populateEquipSelect(el.equipOutfit, "outfit");
    populateEquipSelect(el.equipItem, "item");
    populateEquipSelect(el.equipAccessory, "accessory");
  }

  function populateEquipSelect(selectEl, type) {
    if (!selectEl) return;

    const items = state.studentProfile.inventory[type] || [];
    const currentlyEquipped = state.equipped?.[type] || "";

    selectEl.innerHTML = "";

    const blankOption = document.createElement("option");
    blankOption.value = "";
    blankOption.textContent = `No ${type}`;
    selectEl.appendChild(blankOption);

    items.forEach(item => {
      const option = document.createElement("option");
      option.value = item.asset;
      option.textContent = item.name;
      if (item.asset === currentlyEquipped) {
        option.selected = true;
      }
      selectEl.appendChild(option);
    });
  }

  function saveEquippedLoadout() {
    ensureProfileExists();

    state.equipped.hair = el.equipHair?.value || "";
    state.equipped.hat = el.equipHat?.value || "";
    state.equipped.outfit = el.equipOutfit?.value || "";
    state.equipped.item = el.equipItem?.value || "";
    state.equipped.accessory = el.equipAccessory?.value || "";

    saveLocalProfile();
    renderAvatar();
  }

  function renderAvatar() {
    ensureProfileExists();

    setLayerImage(el.avatarBase, state.equipped.base || CONFIG.CHARACTER_PREVIEW_FALLBACK.base);
    setLayerImage(el.avatarHair, state.equipped.hair || "");
    setLayerImage(el.avatarHat, state.equipped.hat || "");
    setLayerImage(el.avatarOutfit, state.equipped.outfit || "");
    setLayerImage(el.avatarItem, state.equipped.item || "");
    setLayerImage(el.avatarAccessory, state.equipped.accessory || "");
  }

  function setLayerImage(imgEl, src) {
    if (!imgEl) return;

    if (src) {
      imgEl.src = src;
      imgEl.style.display = "block";
    } else {
      imgEl.removeAttribute("src");
      imgEl.style.display = "none";
    }
  }

  function renderStudentHeader() {
    if (el.studentNameDisplay) {
      el.studentNameDisplay.textContent = state.studentKey || "Adventurer";
    }

    if (el.studentLevelDisplay) {
      el.studentLevelDisplay.textContent = String(state.studentProfile?.level || 1);
    }

    if (el.studentXpDisplay) {
      el.studentXpDisplay.textContent = String(state.studentProfile?.totalXp || 0);
    }
  }

  function resetToStart() {
    state.currentCode = "";
    state.currentUnit = "";
    state.currentGameName = "";
    state.currentSkill = "practice";
    state.questions = [];
    state.filteredQuestions = [];
    state.currentIndex = 0;
    state.selectedAnswer = null;
    state.answers = [];
    state.scoreRaw = 0;
    state.maxPoints = 0;
    state.startTime = null;
    state.endTime = null;
    state.resultPayload = null;

    if (el.codeInput) {
      el.codeInput.value = "";
    }

    clearError();
    setLoading("");
    showScreen("start");
  }

  function loadLocalProfile() {
    try {
      const studentKeyValue = (document.getElementById("student-key")?.value || "").trim().toLowerCase();
      const key = studentKeyValue || "default";
      const raw = localStorage.getItem(`${CONFIG.STORAGE_KEY_PREFIX}${key}`);

      if (!raw) {
        state.studentProfile = {
          studentKey: "",
          level: 1,
          totalXp: 0,
          inventory: {
            hair: [],
            hat: [],
            outfit: [],
            item: [],
            accessory: []
          }
        };

        state.equipped = {
          base: CONFIG.CHARACTER_PREVIEW_FALLBACK.base,
          hair: "",
          hat: "",
          outfit: "",
          item: "",
          accessory: ""
        };
        return;
      }

      const parsed = JSON.parse(raw);
      state.studentProfile = parsed.studentProfile || null;
      state.equipped = parsed.equipped || null;
    } catch (error) {
      state.studentProfile = null;
      state.equipped = null;
    }
  }

  function saveLocalProfile() {
    try {
      const key = state.studentKey || "default";

      localStorage.setItem(`${CONFIG.STORAGE_KEY_PREFIX}${key}`, JSON.stringify({
        studentProfile: state.studentProfile,
        equipped: state.equipped
      }));
    } catch (error) {
      console.warn("Could not save local profile.", error);
    }
  }

  function escapeHtml(str) {
    return String(str || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  return {
    init
  };
})();

document.addEventListener("DOMContentLoaded", () => {
  WC_RPG.init();
});
