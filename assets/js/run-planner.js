(function () {
  "use strict";

  var form = document.getElementById("runPlannerForm");
  if (!form) return;

  var start = document.getElementById("plannerStart");
  var mode = document.getElementById("plannerMode");
  var wins = document.getElementById("plannerWins");
  var bosses = document.getElementById("plannerBosses");
  var setbacks = document.getElementById("plannerSetbacks");
  var balance = document.getElementById("plannerBalance");
  var winCost = document.getElementById("plannerWinCost");
  var bossGain = document.getElementById("plannerBossGain");
  var setbackCost = document.getElementById("plannerSetbackCost");
  var safeState = document.getElementById("plannerSafeState");
  var dangerState = document.getElementById("plannerDangerState");
  var reset = document.getElementById("plannerReset");
  var result = balance.closest(".planner-result");

  function wholeNumber(input, fallback) {
    var value = Math.floor(Number(input.value));
    if (!Number.isFinite(value)) value = fallback;
    return Math.min(999, Math.max(Number(input.min || 0), value));
  }

  function signed(value) {
    if (value > 0) return "+" + value + " AP";
    if (value < 0) return "\u2212" + Math.abs(value) + " AP";
    return "0 AP";
  }

  function calculate() {
    var startingAp = wholeNumber(start, 30);
    var regularWins = wholeNumber(wins, 0);
    var bossWins = wholeNumber(bosses, 0);
    var setbackCount = wholeNumber(setbacks, 0);
    var penalty = mode.value === "hard" ? 6 : 4;
    var regularCost = regularWins * -1;
    var bossRecovery = bossWins * 3;
    var setbackTotal = setbackCount * penalty * -1;
    var projected = startingAp + regularCost + bossRecovery + setbackTotal;
    var safe = projected > 0;

    balance.textContent = String(projected);
    winCost.textContent = signed(regularCost);
    bossGain.textContent = signed(bossRecovery);
    setbackCost.textContent = signed(setbackTotal);
    safeState.hidden = !safe;
    dangerState.hidden = safe;
    result.classList.toggle("is-danger", !safe);
  }

  form.addEventListener("input", calculate);
  form.addEventListener("change", calculate);
  reset.addEventListener("click", function () {
    start.value = "30";
    mode.value = "normal";
    wins.value = "14";
    bosses.value = "2";
    setbacks.value = "0";
    calculate();
    start.focus();
  });

  calculate();
})();
