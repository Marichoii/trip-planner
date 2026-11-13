const monthInsights = {
  march: "Cool weather and cherry blossoms begin. Good for sightseeing, but reserve early.",
  april: "Peak blossom season with amazing scenery. Highest prices and larger crowds.",
  may: "Comfortable temperatures and balanced crowds. A strong month for budget planning.",
  october: "Pleasant weather with autumn colors starting. Great for city + nature trips.",
  november: "Clear skies and colorful foliage. Cooler nights and typically moderate costs."
};

const yen = new Intl.NumberFormat("en-US");

function asNumber(id) {
  return Number(document.getElementById(id).value) || 0;
}

function updateBudget() {
  const travelers = Math.max(1, asNumber("travelers"));
  const days = Math.max(1, asNumber("days"));

  const accommodationNight = asNumber("cost-accommodation");
  const foodDay = asNumber("cost-food");
  const transportDay = asNumber("cost-transport");
  const activitiesDay = asNumber("cost-activities");

  const accommodationTotal = accommodationNight * days;
  const dailyTotalPerPerson = foodDay + transportDay + activitiesDay;
  const totalPerPerson = accommodationTotal / travelers + dailyTotalPerPerson * days;
  const groupTotal = totalPerPerson * travelers;

  const results = document.getElementById("budget-results");
  results.innerHTML = "";

  [
    `Trip year: ${document.getElementById("trip-year").value}`,
    `Estimated total per person: ¥${yen.format(Math.round(totalPerPerson))}`,
    `Estimated total for group: ¥${yen.format(Math.round(groupTotal))}`,
    `Daily estimate per person: ¥${yen.format(Math.round(totalPerPerson / days))}`
  ].forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    results.appendChild(li);
  });
}

function updateMonthSummary() {
  const selected = document.getElementById("month-select").value;
  document.getElementById("month-summary").textContent = monthInsights[selected] || "";
}

function saveNotes() {
  const notes = document.getElementById("notes").value;
  localStorage.setItem("jp-trip-notes", notes);
  document.getElementById("notes-status").textContent = "Notes saved on this device.";
}

function loadNotes() {
  const saved = localStorage.getItem("jp-trip-notes");
  if (saved) {
    document.getElementById("notes").value = saved;
  }
}

document.getElementById("trip-form").addEventListener("submit", (event) => {
  event.preventDefault();
  updateBudget();
});

["travelers", "days", "cost-accommodation", "cost-food", "cost-transport", "cost-activities", "trip-year"].forEach((id) => {
  document.getElementById(id).addEventListener("input", updateBudget);
});

document.getElementById("month-select").addEventListener("change", updateMonthSummary);
document.getElementById("save-notes").addEventListener("click", saveNotes);

loadNotes();
updateMonthSummary();
updateBudget();
