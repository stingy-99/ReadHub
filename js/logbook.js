document.addEventListener("DOMContentLoaded", () => {
  const user = requireAuth("student");
  if (!user) return;

  renderStudentLogbook(user.id);

  const entryButton = document.getElementById("record-entry-btn");
  if (entryButton) {
    entryButton.addEventListener("click", () => recordLibraryEntry(user.id));
  }

  const exitButton = document.getElementById("record-exit-btn");
  if (exitButton) {
    exitButton.addEventListener("click", () => recordLibraryExit(user.id));
  }
});

function renderStudentLogbook(userId) {
  const state = getState();
  const visits = state.visits.filter((visit) => visit.userId === userId).slice(0, 12);
  const today = getTodayString();
  const todayVisits = state.visits.filter((visit) => visit.date === today);

  const summary = document.getElementById("visit-summary");
  if (summary) {
    const totalEntries = todayVisits.filter((visit) => visit.entryTime).length;
    const totalExits = todayVisits.filter((visit) => visit.exitTime).length;
    const currentVisitors = todayVisits.filter((visit) => visit.status === "inside").length;

    summary.innerHTML = `
      <div class="stat-card">
        <span>Total entries</span>
        <strong>${totalEntries}</strong>
      </div>
      <div class="stat-card">
        <span>Total exits</span>
        <strong>${totalExits}</strong>
      </div>
      <div class="stat-card">
        <span>Current visitors</span>
        <strong>${currentVisitors}</strong>
      </div>
      <div class="stat-card">
        <span>Peak time</span>
        <strong>9:00 AM</strong>
      </div>
    `;
  }

  const tableBody = document.getElementById("visit-table");
  if (!tableBody) return;

  if (visits.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="6"><div class="empty-state">No library activity recorded yet.</div></td></tr>';
    return;
  }

  tableBody.innerHTML = visits.map((visit) => `
    <tr>
      <td>${visit.studentName}</td>
      <td>${visit.studentId}</td>
      <td>${visit.entryTime ? formatDateTime(visit.entryTime) : "—"}</td>
      <td>${visit.exitTime ? formatDateTime(visit.exitTime) : "—"}</td>
      <td>${visit.date}</td>
      <td><span class="badge ${visit.status === "inside" ? "active" : "returned"}">${visit.status === "inside" ? "Inside" : "Exited"}</span></td>
    </tr>
  `).join("");
}
