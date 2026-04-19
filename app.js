const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzAvYMUO5_gd5zcpqM64oRCi8jO0OltG72xfCnYrlplBJfGhtZlkwESKWwF6_5cbgQIgg/exec";

async function sendScore() {
  const resultBox = document.getElementById("result");

  const studentKey = document.getElementById("studentKey").value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");

  const period = document.getElementById("period").value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");

  if (!studentKey) {
    resultBox.textContent = "Please enter a student ID like js4.";
    return;
  }

  if (!period) {
    resultBox.textContent = "Please enter a period.";
    return;
  }

  resultBox.textContent = "Sending score...";

  const payload = {
    student_key: studentKey,
    period: period,
    unit: "Unit 1",
    game_name: "Test Run",
    skill: "Systems",
    score_raw: 3,
    max_points: 5,
    time_spent_seconds: 20,
    notes: "first real test"
  };

  try {
    const response = await fetch(SCRIPT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: JSON.stringify(payload)
    });

    const text = await response.text();

    let data;
    try {
      data = JSON.parse(text);
    } catch (parseError) {
      resultBox.textContent = "Response was not valid JSON:\n\n" + text;
      return;
    }

    if (!data.ok) {
      resultBox.textContent =
        "Backend error:\n\n" + JSON.stringify(data, null, 2);
      return;
    }

    resultBox.textContent =
`Score sent successfully.

Student: ${data.student_key}
Attempt #: ${data.attempt_number}
Score: ${data.score_percent}%
XP earned: ${data.xp_earned}
Total XP: ${data.total_xp}
Level: ${data.level}
Growth from last score: ${data.growth}`;
  } catch (err) {
    resultBox.textContent = "ERROR: " + err.message;
  }
}
