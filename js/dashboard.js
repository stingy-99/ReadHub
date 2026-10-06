document.addEventListener("DOMContentLoaded", () => {
  const user = requireAuth("student");
  if (!user) return;

  renderDashboard(user.id);

  const entryButton = document.getElementById("record-entry-btn");
  if (entryButton) {
    entryButton.addEventListener("click", () => recordLibraryEntry(user.id));
  }

  const exitButton = document.getElementById("record-exit-btn");
  if (exitButton) {
    exitButton.addEventListener("click", () => recordLibraryExit(user.id));
  }
});

function renderDashboard(userId) {
  const state = getState();
  const today = getTodayString();
  const user = state.users.find((item) => item.id === userId);

  const activeBorrowings = state.borrowings.filter(
    (item) => item.userId === userId && item.status === "active"
  );

  const returnedCount = state.borrowings.filter(
    (item) => item.userId === userId && item.status === "returned"
  ).length;

  const overdue = activeBorrowings.filter((record) => {
    const dueDate = new Date(record.dueDate);
    return dueDate < new Date();
  }).length;

  const userVisitCount = state.visits.filter((visit) => visit.userId === userId).length;
  const todayEntries = state.visits.filter((visit) => visit.date === today && visit.entryTime).length;
  const todayExits = state.visits.filter((visit) => visit.date === today && visit.exitTime).length;
  const insideNow = state.visits.filter((visit) => visit.date === today && visit.status === "inside").length;

  document.getElementById("stat-borrowed").textContent = activeBorrowings.length;
  document.getElementById("stat-returned").textContent = returnedCount;
  document.getElementById("stat-overdue").textContent = overdue;
  document.getElementById("stat-visits").textContent = userVisitCount;
  document.getElementById("entries-today").textContent = todayEntries;
  document.getElementById("exits-today").textContent = todayExits;
  document.getElementById("inside-now").textContent = insideNow;

  const recentActivity = state.activityLogs
    .filter((log) => log.userId === userId)
    .slice(0, 5);

  const list = document.getElementById("recent-activity-list");
  if (list) {
    if (recentActivity.length === 0) {
      list.innerHTML = '<li class="empty-state">No recent activity yet.</li>';
    } else {
      list.innerHTML = recentActivity.map((log) => `
        <li class="activity-item">
          <div class="activity-icon">✓</div>
          <div class="activity-text">
            <strong>${log.action}</strong>
            <span>${log.description} · ${formatDateTime(log.timestamp)}</span>
          </div>
        </li>
      `).join("");
    }
  }

  const tableBody = document.getElementById("borrowings-table-body");
  if (tableBody) {
    if (activeBorrowings.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="4"><div class="empty-state">No active borrowings.</div></td></tr>';
      return;
    }

    tableBody.innerHTML = activeBorrowings.map((record) => {
      const book = getBookById(record.bookId);
      const status = record.dueDate && new Date(record.dueDate) < new Date() ? "overdue" : "active";
      const displayStatus = status === "overdue" ? "Overdue" : "Active";
      return `
        <tr>
          <td>${book ? book.title : "Unavailable"}</td>
          <td>${formatDate(record.borrowedAt)}</td>
          <td>${formatDate(record.dueDate)}</td>
          <td><span class="badge ${status === "overdue" ? "overdue" : "active"}">${displayStatus}</span></td>
        </tr>
      `;
    }).join("");
  }
}
