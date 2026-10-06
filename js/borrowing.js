document.addEventListener("DOMContentLoaded", () => {
  const user = requireAuth("student");
  if (!user) return;

  renderBorrowingTable(user.id);

  document.addEventListener("click", (event) => {
    const returnButton = event.target.closest("[data-return-id]");
    if (returnButton) {
      returnBorrowing(returnButton.dataset.returnId, user.id);
    }
  });
});

function renderBorrowingTable(userId) {
  const state = getState();
  const tableBody = document.getElementById("my-books-table");
  if (!tableBody) return;

  const activeRecords = state.borrowings.filter((record) => record.userId === userId && record.status === "active");

  if (activeRecords.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="5"><div class="empty-state">No active borrowing records.</div></td></tr>';
    return;
  }

  tableBody.innerHTML = activeRecords.map((record) => {
    const book = getBookById(record.bookId);
    const dueSoon = new Date(record.dueDate) < new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    const statusClass = dueSoon ? "due-soon" : "active";
    const label = dueSoon ? "Due Soon" : "Active";

    return `
      <tr>
        <td>${book ? book.title : "Unknown"}</td>
        <td>${formatDate(record.borrowedAt)}</td>
        <td>${formatDate(record.dueDate)}</td>
        <td><span class="badge ${statusClass}">${label}</span></td>
        <td><button type="button" class="admin-action" data-return-id="${record.id}">Return</button></td>
      </tr>
    `;
  }).join("");
}
