const WC_RPG = (() => {
  const CONFIG = {
    WEB_APP_URL: "https://script.google.com/macros/s/AKfycbz7ZEV6TtBKoiT2KQaZf9nNqiBiTC7SGolaPtZL8eIzFg03t1PbvJei0qIhYY-2iQ3cJQ/exec",
    PASSING_PERCENT: 70,
    QUESTION_TIME_LIMIT_SECONDS: 0,
    DEFAULT_MAX_BOSS_QUESTIONS: 10,
    STORAGE_KEY_PREFIX: "wc_rpg_",
    XP_PER_LEVEL: 100,
    DEFAULT_CHARACTER: {
      skin: "skin_01",
      hair: "hair_01",
      hat: "",
      face: "",
      torso: "torso_01",
      legs: "legs_01",
      accessory: "",
      weapon: "",
      pet: "",
      unlocked_csv: "skin_01,hair_01,torso_01,legs_01"
    }
  };

  const ASSET_BASE = "assets";

  const state = {
    studentKey: "",
    period: "",
    currentCode: "",
    currentUnit: "",
    currentGameName: "",
    currentSkill: "practice",
    currentGameMode: "lesson",
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
    character: null,
    unlockQueue: []
  };

  const el = {};

  function init() {
    cacheDom();
    bindEvents();
    loadLocalProfile();
    ensureProfileExists();
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

    el.avatarSkin = document.getElementById("avatar-skin");
    el.avatarLegs = document.getElementById("avatar-legs");
    el.avatarTorso = document.getElementById("avatar-torso");
    el.avatarHair = document.getElementById("avatar-hair");
    el.avatarHat = document.getElementById("avatar-hat");
    el.avatarFace = document.getElementById("avatar-face");
    el.avatarAccessory = document.getElementById("avatar-accessory");
    el.avatarWeapon = document.getElementById("avatar-weapon");
    el.avatarPet = document.getElementById("avatar-pet");

    el.unlockModal = document.getElementById("unlock-modal");
    el.unlockList = document.getElementById("unlock-list");
    el.closeUnlockBtn = document.getElementById("close-unlock-btn");

    el.equipSkin = document.getElementById("equip-skin");
    el.equipHair = document.getElementById("equip-hair");
    el.equipHat = document.getElementById("equip-hat");
    el.equipFace = document.getElementById("equip-face");
    el.equipTorso = document.getElementById("equip-torso");
    el.equipLegs = document.getElementById("equip-legs");
    el.equipAccessory = document.getElementById("equip-accessory");
    el.equipWeapon = document.getElementById("equip-weapon");
    el.equipPet = document.getElementById("equip-pet");
    el.saveEquipBtn = document.getElementById("save-equip-btn");
  }

  function bindEvents() {
    if (el.startBtn) el.startBtn.addEventListener("click", startGame);
    if (el.nextBtn) el.nextBtn.addEventListener("click", nextQuestion);
    if (el.submitBtn) el.submitBtn.addEventListener("click", finishQuiz);
    if (el.playAgainBtn) el.playAgainBtn.addEventListener("click", resetToStart);
    if (el.closeUnlockBtn) el.closeUnlockBtn.addEventListener("click", closeUnlockModal);
    if (el.saveEquipBtn) el.saveEquipBtn.addEventListener("click", saveEquippedLoadout);
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
    if (el.loadingText) el.loadingText.textContent = message || "";
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
    state.currentGameMode = deriveGameMode(code);
    state.currentSkill = state.currentGameMode === "boss" ? "boss" : "practice";
    state.currentIndex = 0;
    state.answers = [];
    state.scoreRaw = 0;
    state.maxPoints = 0;
    state.startTime = Date.now();
    state.endTime = null;
    state.resultPayload = null;

    loadLocalProfileForStudent(studentKey);
    ensureProfileExists();
    saveLocalProfile();
    renderStudentHeader();
    renderAvatar();

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
      (q.choices || []).forEach(choice => {
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
        game_mode: state.currentGameMode,
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

      if (Array.isArray(data.unlocked_items) && data.unlocked_items.length > 0) {
        state.unlockQueue = data.unlocked_items;
        openUnlockModal(data.unlocked_items);
      }

      populateEquipmentSelectors();
      renderStudentHeader();
      renderAvatar();

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
    const previousLevel = Number(state.studentProfile?.previousLevel || state.studentProfile?.level || 1);
    const newLevel = Number(result?.level || previousLevel);
    return newLevel > previousLevel;
  }

  function deriveUnitFromCode(code) {
    if (!code) return "";
    const cleaned = String(code).replace("*", "").trim();
    if (cleaned.includes(".")) return cleaned.split(".")[0];
    return cleaned;
  }

  function deriveGameMode(code) {
    if (isBossCode(code)) return "boss";
    if (!String(code).includes(".")) return "unit";
    return "lesson";
  }

  function isBossCode(code) {
    return String(code).startsWith("*") || String(code).endsWith(".10");
  }

  function getTimeSpentSeconds() {
    if (!state.startTime || !state.endTime) return 0;
    return Math.max(0, Math.round((state.endTime - state.startTime) / 1000));
  }

  function buildNotes() {
    const correctCount = state.answers.filter(a => a.is_correct).length;
    return `Code ${state.currentCode} | Correct ${correctCount}/${state.maxPoints} | Mode ${state.currentGameMode}`;
  }

  function ensureProfileExists() {
    if (!state.studentProfile) {
      state.studentProfile = {
        studentKey: state.studentKey || "",
        level: 1,
        previousLevel: 1,
        totalXp: 0,
        attempts: 0,
        growth: 0
      };
    }

    if (!state.character) {
      state.character = parseCharacter(CONFIG.DEFAULT_CHARACTER);
    }
  }

  function applyResultToProfile(result) {
    ensureProfileExists();

    const oldLevel = Number(state.studentProfile.level || 1);

    state.studentProfile.studentKey = state.studentKey;
    state.studentProfile.previousLevel = oldLevel;
    state.studentProfile.level = Number(result.level || oldLevel);
    state.studentProfile.totalXp = Number(result.total_xp || state.studentProfile.totalXp || 0);
    state.studentProfile.growth = Number(result.growth || 0);

    if (result.character) {
      state.character = parseCharacter(result.character);
    }

    saveLocalProfile();
  }

  function parseCharacter(rawCharacter) {
    const character = {
      skin: rawCharacter?.skin || CONFIG.DEFAULT_CHARACTER.skin,
      hair: rawCharacter?.hair || CONFIG.DEFAULT_CHARACTER.hair,
      hat: rawCharacter?.hat || "",
      face: rawCharacter?.face || "",
      torso: rawCharacter?.torso || CONFIG.DEFAULT_CHARACTER.torso,
      legs: rawCharacter?.legs || CONFIG.DEFAULT_CHARACTER.legs,
      accessory: rawCharacter?.accessory || "",
      weapon: rawCharacter?.weapon || "",
      pet: rawCharacter?.pet || "",
      unlocked_csv: rawCharacter?.unlocked_csv || CONFIG.DEFAULT_CHARACTER.unlocked_csv
    };

    return character;
  }

  function openUnlockModal(unlocks) {
    if (!el.unlockModal || !el.unlockList) return;

    el.unlockList.innerHTML = "";

    unlocks.forEach(unlock => {
      const div = document.createElement("div");
      div.className = "unlock-card";
      div.innerHTML = `
        <strong>${escapeHtml(unlock.item_name || unlock.name || "New Unlock")}</strong>
        <div>Slot: ${escapeHtml(unlock.slot || unlock.type || "")}</div>
        <div>Rarity: ${escapeHtml(unlock.rarity || "")}</div>
      `;
      el.unlockList.appendChild(div);
    });

    el.unlockModal.style.display = "flex";
  }

  function closeUnlockModal() {
    if (el.unlockModal) el.unlockModal.style.display = "none";
  }

  function populateEquipmentSelectors() {
    if (!state.character) return;

    populateEquipSelect(el.equipSkin, "skin");
    populateEquipSelect(el.equipHair, "hair");
    populateEquipSelect(el.equipHat, "hat");
    populateEquipSelect(el.equipFace, "face");
    populateEquipSelect(el.equipTorso, "torso");
    populateEquipSelect(el.equipLegs, "legs");
    populateEquipSelect(el.equipAccessory, "accessory");
    populateEquipSelect(el.equipWeapon, "weapon");
    populateEquipSelect(el.equipPet, "pet");
  }

  function populateEquipSelect(selectEl, slot) {
    if (!selectEl) return;

    const unlocked = getUnlockedAssetsForSlot(slot);
    const currentValue = state.character?.[slot] || "";

    selectEl.innerHTML = "";

    const blankOption = document.createElement("option");
    blankOption.value = "";
    blankOption.textContent = slot === "skin" || slot === "hair" || slot === "torso" || slot === "legs"
      ? `Keep current ${slot}`
      : `No ${slot}`;
    selectEl.appendChild(blankOption);

    unlocked.forEach(assetKey => {
      const option = document.createElement("option");
      option.value = assetKey;
      option.textContent = prettifyAssetName(assetKey);
      if (assetKey === currentValue) option.selected = true;
      selectEl.appendChild(option);
    });
  }

  function getUnlockedAssetsForSlot(slot) {
    const unlockedCsv = state.character?.unlocked_csv || "";
    const unlocked = unlockedCsv.split(",").map(x => x.trim()).filter(Boolean);

    return unlocked.filter(assetKey => belongsToSlot(slot, assetKey));
  }

  function belongsToSlot(slot, assetKey) {
    const key = String(assetKey || "").toLowerCase();
    if (slot === "skin") return key.startsWith("skin_");
    if (slot === "hair") return key.startsWith("hair_");
    if (slot === "hat") return key.startsWith("hat_");
    if (slot === "face") return key.startsWith("face_");
    if (slot === "torso") return key.startsWith("torso_");
    if (slot === "legs") return key.startsWith("legs_");
    if (slot === "accessory") return key.startsWith("acc_");
    if (slot === "weapon") return key.startsWith("wpn_");
    if (slot === "pet") return key.startsWith("pet_");
    return false;
  }

  function saveEquippedLoadout() {
    ensureProfileExists();

    if (el.equipSkin?.value) state.character.skin = el.equipSkin.value;
    if (el.equipHair?.value) state.character.hair = el.equipHair.value;
    state.character.hat = el.equipHat?.value || "";
    state.character.face = el.equipFace?.value || "";
    if (el.equipTorso?.value) state.character.torso = el.equipTorso.value;
    if (el.equipLegs?.value) state.character.legs = el.equipLegs.value;
    state.character.accessory = el.equipAccessory?.value || "";
    state.character.weapon = el.equipWeapon?.value || "";
    state.character.pet = el.equipPet?.value || "";

    saveLocalProfile();
    renderAvatar();
  }

  function renderAvatar() {
    ensureProfileExists();

    setLayerImage(el.avatarSkin, getAssetPath("skin", state.character.skin));
    setLayerImage(el.avatarLegs, getAssetPath("legs", state.character.legs));
    setLayerImage(el.avatarTorso, getAssetPath("torso", state.character.torso));
    setLayerImage(el.avatarHair, getAssetPath("hair", state.character.hair));
    setLayerImage(el.avatarHat, getAssetPath("hat", state.character.hat));
    setLayerImage(el.avatarFace, getAssetPath("face", state.character.face));
    setLayerImage(el.avatarAccessory, getAssetPath("accessory", state.character.accessory));
    setLayerImage(el.avatarWeapon, getAssetPath("weapon", state.character.weapon));
    setLayerImage(el.avatarPet, getAssetPath("pet", state.character.pet));
  }

  function getAssetPath(slot, assetKey) {
    if (!slot || !assetKey) return "";
    const fileName = normalizeAssetKey(assetKey) + ".png";

    if (slot === "accessory") return `${ASSET_BASE}/accessory/${fileName}`;
    if (slot === "weapon") return `${ASSET_BASE}/weapon/${fileName}`;
    return `${ASSET_BASE}/${slot}/${fileName}`;
  }

  function normalizeAssetKey(key) {
    return String(key || "").trim().toLowerCase();
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
function getLevelFromXP(xp) {
  return Math.floor(xp / 100) + 1;
}

function getXPForNextLevel(xp) {
  const nextLevelXP = Math.ceil((xp + 1) / 100) * 100;
  return nextLevelXP - xp;
}

function awardXP(baseXP, accuracy) {
  let bonus = 0;

  if (accuracy === 100) bonus = 50;
  else if (accuracy >= 90) bonus = 30;
  else if (accuracy >= 80) bonus = 15;

  return baseXP + bonus;
}
  function renderStudentHeader() {
    if (el.studentNameDisplay) {
      el.studentNameDisplay.textContent = state.studentKey || state.studentProfile?.studentKey || "Adventurer";
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
    state.currentGameMode = "lesson";
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

    if (el.codeInput) el.codeInput.value = "";

    clearError();
    setLoading("");
    showScreen("start");
  }

  function loadLocalProfile() {
    try {
      const raw = localStorage.getItem(`${CONFIG.STORAGE_KEY_PREFIX}default`);
      if (!raw) {
        state.studentProfile = null;
        state.character = null;
        return;
      }

      const parsed = JSON.parse(raw);
      state.studentProfile = parsed.studentProfile || null;
      state.character = parsed.character ? parseCharacter(parsed.character) : null;
    } catch (error) {
      state.studentProfile = null;
      state.character = null;
    }
  }

  function loadLocalProfileForStudent(studentKey) {
    try {
      const raw = localStorage.getItem(`${CONFIG.STORAGE_KEY_PREFIX}${studentKey}`);
      if (!raw) {
        state.studentProfile = {
          studentKey,
          level: 1,
          previousLevel: 1,
          totalXp: 0,
          attempts: 0,
          growth: 0
        };
        state.character = parseCharacter(CONFIG.DEFAULT_CHARACTER);
        return;
      }

      const parsed = JSON.parse(raw);
      state.studentProfile = parsed.studentProfile || {
        studentKey,
        level: 1,
        previousLevel: 1,
        totalXp: 0,
        attempts: 0,
        growth: 0
      };
      state.character = parsed.character ? parseCharacter(parsed.character) : parseCharacter(CONFIG.DEFAULT_CHARACTER);
    } catch (error) {
      state.studentProfile = {
        studentKey,
        level: 1,
        previousLevel: 1,
        totalXp: 0,
        attempts: 0,
        growth: 0
      };
      state.character = parseCharacter(CONFIG.DEFAULT_CHARACTER);
    }
  }

  function saveLocalProfile() {
    try {
      const key = state.studentKey || "default";

      localStorage.setItem(`${CONFIG.STORAGE_KEY_PREFIX}${key}`, JSON.stringify({
        studentProfile: state.studentProfile,
        character: state.character
      }));
    } catch (error) {
      console.warn("Could not save local profile.", error);
    }
  }

  function prettifyAssetName(assetKey) {
    return String(assetKey || "")
      .replaceAll("_", " ")
      .replace(/\b\w/g, char => char.toUpperCase());
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
