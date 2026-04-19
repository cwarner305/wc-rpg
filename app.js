const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzAvYMUO5_gd5zcpqM64oRCi8jO0OltG72xfCnYrlplBJfGhtZlkwESKWwF6_5cbgQIgg/exec";

async function sendScore() {
  const resultBox = document.getElementById("result");
  resultBox.textContent = "Trying to send...";

  const studentKey = document.getElementById("studentKey").value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");

  const period = document.getElementById("period").value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");

  const payload = {
    student_key: studentKey,
    period: period,
    unit: "Unit 1",
    game_name: "Test Run",
    skill: "Systems",
    score_raw: 3,
    max_points: 5,
    xp_earned: 10,
    level_after: 1,
    time_spent_seconds: 20,
    notes: "first real test"
  };

  try {
    const res = await fetch(SCRIPT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: JSON.stringify(payload)
    });

    const text = await res.text();
    resultBox.textContent = text;
  } catch (err) {
    resultBox.textContent = "ERROR: " + err.message;
  }
}
