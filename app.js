const WC_RPG = (() => {
  const CONFIG = {
    WEB_APP_URL: "https://script.google.com/macros/s/AKfycbz7ZEV6TtBKoiT2KQaZf9nNqiBiTC7SGolaPtZL8eIzFg03t1PbvJei0qIhYY-2iQ3cJQ/exec",
    PASSING_PERCENT: 70,
    QUESTION_TIME_LIMIT_SECONDS: 0,
    DEFAULT_MAX_BOSS_QUESTIONS: 10,
    STORAGE_KEY_PREFIX: "wc_rpg_",
    XP_PER_LEVEL: 100,
    AVATAR_SCALE_MIN: 0.72,
    AVATAR_SCALE_MAX: 1.08,
    AVATAR_SCALE_LEVELS_TO_MAX: 30,
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
  const AVAILABLE_ASSETS = {
    skin: ["skin_01"],
    hair: ["hair_01", "hair_02", "hair_03"],
    hat: ["hat_01", "hat_02"],
    face: ["face_01"],
    torso: ["torso_01", "torso_02", "torso_03"],
    legs: ["legs_01", "legs_02", "legs_03"],
    accessory: ["acc_01", "acc_02"],
    weapon: ["wpn_01", "wpn_02"],
    pet: ["pet_01", "pet_02"]
  };
  const MONSTER_LIBRARY = {
    fallback: [
      { id: "sparring_wisp", name: "Sparring Wisp", glyph: "🌀", lore: "A training spirit that tests basic pattern recognition.", tier: 1 },
      { id: "archive_guardian", name: "Archive Guardian", glyph: "📚", lore: "A keeper of maps and records who rewards careful reasoning.", tier: 2 }
    ],
    "1": [
      { id: "chronicle_beast", name: "Chronicle Beast", glyph: "🦉", lore: "A mythic owl linked to memory and historical perspective.", tier: 1 }
    ],
    "2": [
      { id: "river_warden", name: "River Warden", glyph: "🐊", lore: "A folklore guardian tied to river routes and trade corridors.", tier: 2 },
      { id: "storm_lion", name: "Storm Lion", glyph: "🦁", lore: "A legendary protector that appears in regional storytelling traditions.", tier: 3 }
    ],
    "3": [
      { id: "desert_manticore", name: "Desert Manticore", glyph: "🦂", lore: "A Persian-inspired mythic challenger representing high-risk encounters.", tier: 3 },
      { id: "anqa_echo", name: "Anqa Echo", glyph: "🕊️", lore: "Inspired by classical Arabic lore, this encounter favors synthesis questions.", tier: 4 }
    ],
    "4": [
      { id: "jade_drake", name: "Jade Drake", glyph: "🐉", lore: "A folklore dragon encounter tied to statecraft and long-term planning.", tier: 3 },
      { id: "nian_hunter", name: "Nian Hunter", glyph: "🧧", lore: "Inspired by New Year legend themes of preparation and resilience.", tier: 4 }
    ],
    "5": [
      { id: "makara_guard", name: "Makara Guard", glyph: "🐘", lore: "A mythic protector inspired by South Asian artistic traditions.", tier: 3 },
      { id: "garuda_trial", name: "Garuda Trial", glyph: "🦅", lore: "A high-tier encounter inspired by regional epic storytelling.", tier: 4 }
    ],
    "6": [
      { id: "network_hydra", name: "Network Hydra", glyph: "🛰️", lore: "A modern myth encounter where global systems interact and collide.", tier: 4 },
      { id: "signal_titan", name: "Signal Titan", glyph: "🤖", lore: "Represents interconnected economies, tech, and power shifts.", tier: 5 }
    ]
  };

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
    equipment: null,
    catalogItems: [],
    unlockQueue: [],
    currentMonster: null,
    quizLoadRequestId: 0,
    isLoadingQuestions: false
  };

  const el = {};

  function init() {
    cacheDom();
    bindEvents();
    loadLocalProfile();
    ensureProfileExists();
    renderStudentHeader();
    renderAvatar();
    populateEquipmentSelectors();
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
    el.avatarStage = document.querySelector(".avatar-stage");
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
    el.monsterGlyph = document.getElementById("monster-glyph");
    el.monsterName = document.getElementById("monster-name");
    el.monsterTier = document.getElementById("monster-tier");
    el.monsterDescription = document.getElementById("monster-description");
  }

  function bindEvents() {
    if (el.startBtn) el.startBtn.addEventListener("click", startGame);
    if (el.nextBtn) el.nextBtn.addEventListener("click", nextQuestion);
    if (el.submitBtn) el.submitBtn.addEventListener("click", finishQuiz);
    if (el.playAgainBtn) el.playAgainBtn.addEventListener("click", resetToStart);
    if (el.closeUnlockBtn) el.closeUnlockBtn.addEventListener("click", closeUnlockModal);
    if (el.saveEquipBtn) el.saveEquipBtn.addEventListener("click", saveEquippedLoadout);
    if (el.studentKeyInput) {
      el.studentKeyInput.addEventListener("change", handleStudentKeyChanged);
      el.studentKeyInput.addEventListener("blur", handleStudentKeyChanged);
    }
  }

  async function handleStudentKeyChanged() {
    const typedStudentKey = (el.studentKeyInput?.value || "").trim().toLowerCase();
    if (!typedStudentKey) return;

    state.studentKey = typedStudentKey;
    loadLocalProfileForStudent(typedStudentKey);
    ensureProfileExists();
    await hydrateStudentFromServer(typedStudentKey);
    renderStudentHeader();
    renderAvatar();
    populateEquipmentSelectors();
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

  async function startGame() {
    if (state.isLoadingQuestions) return;

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
    state.currentMonster = null;
    state.quizLoadRequestId += 1;

    loadLocalProfileForStudent(studentKey);
    ensureProfileExists();
    await hydrateStudentFromServer(studentKey);
    saveLocalProfile();
    renderStudentHeader();
    renderAvatar();
    populateEquipmentSelectors();
    chooseMonsterForRun();
    renderMonster();

    loadQuestions(code, state.quizLoadRequestId);
  }

  async function hydrateStudentFromServer(studentKey) {
    try {
      const url = `${CONFIG.WEB_APP_URL}?action=student&student_key=${encodeURIComponent(studentKey)}`;
      const response = await fetch(url, { method: "GET" });
      const data = await response.json();

      if (!data.ok) return;

      if (data.summary) {
        state.studentProfile = {
          ...state.studentProfile,
          studentKey,
          level: Number(data.summary.level || 1),
          previousLevel: Number(data.summary.level || 1),
          totalXp: Number(data.summary.total_xp || 0),
          attempts: Number(data.summary.attempts || 0),
          growth: Number(data.summary.growth_from_last || 0)
        };
      }

      if (data.character) {
        state.character = parseCharacter(data.character);
      }

      if (data.equipment) {
        state.equipment = data.equipment;
      }

      await ensureCatalogLoaded();
    } catch (error) {
      console.warn("Unable to hydrate student from backend.", error);
    }
  }

  async function ensureCatalogLoaded() {
    if (Array.isArray(state.catalogItems) && state.catalogItems.length > 0) return;

    try {
      const url = `${CONFIG.WEB_APP_URL}?action=catalog`;
      const response = await fetch(url, { method: "GET" });
      const data = await response.json();

      if (data.ok && Array.isArray(data.items)) {
        state.catalogItems = data.items;
      }
    } catch (error) {
      console.warn("Unable to load equipment catalog.", error);
    }
  }

  async function loadQuestions(code, requestId) {
    try {
      state.isLoadingQuestions = true;
      if (el.startBtn) el.startBtn.disabled = true;
      setLoading("Loading questions...");
      clearError();

      const url = `${CONFIG.WEB_APP_URL}?action=questions&code=${encodeURIComponent(code)}`;
      const response = await fetch(url, { method: "GET" });
      const data = await response.json();

      if (requestId !== state.quizLoadRequestId) return;

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
      chooseMonsterForRun();
      renderMonster();
      renderQuestion();
    } catch (error) {
      if (requestId !== state.quizLoadRequestId) return;
      setLoading("");
      setError(error.message || "There was a problem loading the quiz.");
    } finally {
      if (requestId === state.quizLoadRequestId) {
        state.isLoadingQuestions = false;
        if (el.startBtn) el.startBtn.disabled = false;
      }
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

    try {
      setLoading("Saving your progress...");

      const payload = {
        action: "complete",
        student_key: state.studentKey,
        period: state.period,
        code: state.currentCode,
        game_name: state.currentGameName,
        monster_id: state.currentMonster?.id || "",
        monster_tier: Number(state.currentMonster?.tier || 1),
        answers: state.answers.map(a => ({
          question_id: a.question_id,
          selected_answer: a.selected_answer
        })),
        time_spent_seconds: getTimeSpentSeconds()
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
      state.scoreRaw = Number(data.score_raw || 0);
      state.maxPoints = Number(data.max_points || state.filteredQuestions.length || 0);
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

    state.answers.push({
      index: state.currentIndex,
      question_id: q.question_id || "",
      selected_answer: selected,
      question_text: q.question_text || "",
      skill: q.skill || "",
      difficulty: q.difficulty || ""
    });

    state.selectedAnswer = null;
  }

  function renderResults() {
    const percent = Number(state.resultPayload?.score_percent ?? (state.maxPoints > 0
      ? Math.round((state.scoreRaw / state.maxPoints) * 100)
      : 0));

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
    const monsterName = state.currentMonster?.name ? ` against ${state.currentMonster.name}` : "";

    if (leveledUp && percent >= CONFIG.PASSING_PERCENT) {
      return `Great work. You cleared this ${bossText}${monsterName}, leveled up, and unlocked new gear.`;
    }

    if (leveledUp) {
      return `You leveled up. Keep practicing this content to raise your score and earn more rewards.`;
    }

    if (percent >= CONFIG.PASSING_PERCENT) {
      return `You cleared this ${bossText}${monsterName}. Replay for stronger mastery and more growth.`;
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

  function chooseMonsterForRun() {
    const unit = deriveUnitFromCode(state.currentCode || "");
    const baseList = MONSTER_LIBRARY[unit] || MONSTER_LIBRARY.fallback;
    if (!Array.isArray(baseList) || baseList.length === 0) {
      state.currentMonster = MONSTER_LIBRARY.fallback[0];
      return;
    }

    const mode = state.currentGameMode;
    let pool = [...baseList];
    if (mode === "boss") {
      pool = pool.filter(m => Number(m.tier || 1) >= 3);
    }

    if (pool.length === 0) pool = [...baseList];
    const picked = pool[Math.floor(Math.random() * pool.length)];
    state.currentMonster = {
      ...picked,
      tier: mode === "boss" ? Math.max(3, Number(picked.tier || 1)) : Number(picked.tier || 1)
    };
  }

  function renderMonster() {
    const monster = state.currentMonster || MONSTER_LIBRARY.fallback[0];
    if (!monster) return;

    if (el.monsterGlyph) el.monsterGlyph.textContent = monster.glyph || "👾";
    if (el.monsterName) el.monsterName.textContent = monster.name || "Training Dummy";
    if (el.monsterTier) {
      const modeLabel = state.currentGameMode === "boss" ? "Boss" : state.currentGameMode === "unit" ? "Elite" : "Standard";
      el.monsterTier.textContent = `${modeLabel} Tier ${monster.tier || 1}`;
    }
    if (el.monsterDescription) {
      const bonusText = state.currentGameMode === "boss"
        ? "Defeating this encounter boosts XP and improves high-rarity loot odds."
        : "Clear this encounter to gain XP and progression rewards.";
      el.monsterDescription.textContent = `${monster.lore || ""} ${bonusText}`.trim();
    }
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

    if (result.equipment) {
      state.equipment = result.equipment;
    }

    saveLocalProfile();
  }

  function parseCharacter(rawCharacter) {
    const character = {
      skin: sanitizeEquippedItem("skin", rawCharacter?.skin) || CONFIG.DEFAULT_CHARACTER.skin,
      hair: sanitizeEquippedItem("hair", rawCharacter?.hair) || CONFIG.DEFAULT_CHARACTER.hair,
      hat: sanitizeEquippedItem("hat", rawCharacter?.hat || ""),
      face: sanitizeEquippedItem("face", rawCharacter?.face || ""),
      torso: sanitizeEquippedItem("torso", rawCharacter?.torso) || CONFIG.DEFAULT_CHARACTER.torso,
      legs: sanitizeEquippedItem("legs", rawCharacter?.legs) || CONFIG.DEFAULT_CHARACTER.legs,
      accessory: sanitizeEquippedItem("accessory", rawCharacter?.accessory || ""),
      weapon: sanitizeEquippedItem("weapon", rawCharacter?.weapon || ""),
      pet: sanitizeEquippedItem("pet", rawCharacter?.pet || ""),
      unlocked_csv: sanitizeUnlockedCsv(rawCharacter?.unlocked_csv || CONFIG.DEFAULT_CHARACTER.unlocked_csv)
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

    unlocked.forEach(item => {
      const option = document.createElement("option");
      option.value = item.item_id;
      option.textContent = item.item_name || prettifyAssetName(item.item_id);
      if (item.item_id === currentValue) option.selected = true;
      selectEl.appendChild(option);
    });
  }

  function getUnlockedAssetsForSlot(slot) {
    const slotItems = normalizeSlotItems(slot);
    if (Array.isArray(slotItems) && slotItems.length > 0) {
      const unlockedItems = slotItems.filter(item => !!item.unlocked && !!item.item_id);

      if (unlockedItems.length > 0) return unlockedItems;

      // Defensive fallback for misconfigured/unseeded unlock flags:
      // keep currently equipped item selectable and include starter-level items.
      const currentId = state.character?.[slot] || state.equipment?.current?.[slot] || "";
      const starterItems = slotItems
        .filter(item => Number(item.level_required || 0) <= 1)
        .filter(item => !!item.item_id);
      const currentItem = slotItems.find(item => item.item_id === currentId);

      return dedupeItems([currentItem, ...starterItems].filter(Boolean));
    }

    const unlockedCsv = state.character?.unlocked_csv || "";
    const unlocked = unlockedCsv.split(",").map(x => x.trim()).filter(Boolean);

    return unlocked
      .filter(assetKey => belongsToSlot(slot, assetKey))
      .map(assetKey => ({
        item_id: assetKey,
        item_name: prettifyAssetName(assetKey),
        unlocked: true
      }));
  }

  function normalizeSlotItems(slot) {
    const serverSlotItems = state.equipment?.slots?.[slot];
    if (Array.isArray(serverSlotItems) && serverSlotItems.length > 0) {
      return serverSlotItems
        .map(item => ({
          ...item,
          item_id: sanitizeEquippedItem(slot, item.item_id || "")
        }))
        .filter(item => !!item.item_id);
    }

    if (!Array.isArray(state.catalogItems) || state.catalogItems.length === 0) {
      return [];
    }

    return state.catalogItems
      .filter(item => String(item.slot || "").toLowerCase() === slot)
      .map(item => {
        const itemId = sanitizeEquippedItem(slot, item.item_id || "");
        if (!itemId) return null;
        const unlockedCsv = state.character?.unlocked_csv || "";
        const unlockedSet = new Set(
          unlockedCsv
            .split(",")
            .map(x => x.trim())
            .filter(Boolean)
        );
        const isStarter = Number(item.level_required || 0) <= 1;
        return {
          ...item,
          item_id: itemId,
          unlocked: unlockedSet.has(itemId) || isStarter
        };
      })
      .filter(Boolean);
  }

  function dedupeItems(items) {
    const seen = new Set();
    return items.filter(item => {
      const itemId = String(item?.item_id || "");
      if (!itemId || seen.has(itemId)) return false;
      seen.add(itemId);
      return true;
    });
  }

  function belongsToSlot(slot, assetKey) {
    const key = String(assetKey || "").toLowerCase();
    if (slot === "skin") return key.startsWith("skin_");
    if (slot === "hair") return key.startsWith("hair_");
    if (slot === "hat") return key.startsWith("hat_");
    if (slot === "face") return key.startsWith("face_");
    if (slot === "torso") return key.startsWith("torso_");
    if (slot === "legs") return key.startsWith("legs_");
    if (slot === "accessory") return key.startsWith("acc_") || key.startsWith("accessory_");
    if (slot === "weapon") return key.startsWith("wpn_") || key.startsWith("weapon_");
    if (slot === "pet") return key.startsWith("pet_");
    return false;
  }

  function sanitizeUnlockedCsv(csvValue) {
    const values = String(csvValue || "")
      .split(",")
      .map(value => value.trim().toLowerCase())
      .filter(Boolean);

    const cleaned = values.filter(itemId => isKnownAssetKey(itemId));
    return dedupeItems(cleaned.map(item_id => ({ item_id }))).map(item => item.item_id).join(",");
  }

  function sanitizeEquippedItem(slot, itemId) {
    const normalized = normalizeAssetKey(itemId);
    if (!normalized) return "";
    if (!belongsToSlot(slot, normalized)) return "";
    if (!isKnownAssetKey(normalized)) return "";
    return normalized;
  }

  function isKnownAssetKey(itemId) {
    const normalized = normalizeAssetKey(itemId);
    return Object.values(AVAILABLE_ASSETS).some(items => items.includes(normalized));
  }

  async function saveEquippedLoadout() {
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

    const payload = {
      action: "save_character",
      student_key: state.studentKey,
      skin: state.character.skin,
      hair: state.character.hair,
      hat: state.character.hat,
      face: state.character.face,
      torso: state.character.torso,
      legs: state.character.legs,
      accessory: state.character.accessory,
      weapon: state.character.weapon,
      pet: state.character.pet
    };

    try {
      const response = await fetch(CONFIG.WEB_APP_URL, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain;charset=utf-8"
        },
        body: JSON.stringify(payload)
      });
      const data = await response.json();

      if (!data.ok) {
        throw new Error(data.error || "Could not save equipment.");
      }

      if (data.character) state.character = parseCharacter(data.character);
      if (data.equipment) state.equipment = data.equipment;
      saveLocalProfile();
      renderAvatar();
    } catch (error) {
      setError(error.message || "Could not save equipment.");
    }
  }

  function renderAvatar() {
    ensureProfileExists();
    applyAvatarScale();

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

  function applyAvatarScale() {
    if (!el.avatarStage) return;
    const totalXp = Number(state.studentProfile?.totalXp || 0);
    const scale = getAvatarScaleFromXp(totalXp);
    el.avatarStage.style.setProperty("--avatar-scale", String(scale));
  }

  function getAvatarScaleFromXp(totalXp) {
    const level = Math.max(1, Math.floor(Number(totalXp || 0) / CONFIG.XP_PER_LEVEL) + 1);
    const maxLevel = Math.max(2, Number(CONFIG.AVATAR_SCALE_LEVELS_TO_MAX || 30));
    const progress = Math.max(0, Math.min(1, (level - 1) / (maxLevel - 1)));
    const minScale = Number(CONFIG.AVATAR_SCALE_MIN || 0.72);
    const maxScale = Number(CONFIG.AVATAR_SCALE_MAX || 1.08);
    const scaled = minScale + ((maxScale - minScale) * progress);
    return Number(scaled.toFixed(3));
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
    state.currentMonster = null;

    if (el.codeInput) el.codeInput.value = "";

    clearError();
    setLoading("");
    renderMonster();
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
