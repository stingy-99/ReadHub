document.addEventListener("DOMContentLoaded", () => {
  const user = requireAuth("admin");
  if (!user) return;

  renderAdminStats();
  renderAdminCharts();
  renderPopularBooks();
  renderAdminBooksTable();
  renderAdminUsersTable();
  renderAdminBorrowingsTable();
  renderAdminVisitTable();

  const bookForm = document.getElementById("admin-book-form");
  if (bookForm) {
    bookForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const formData = new FormData(bookForm);
      const state = getState();

      const newBook = {
        id: crypto.randomUUID ? crypto.randomUUID() : `book-${Date.now()}`,
        title: String(formData.get("title") || "").trim(),
        author: String(formData.get("author") || "").trim(),
        isbn: String(formData.get("isbn") || "").trim(),
        category: String(formData.get("category") || "").trim(),
        publisher: String(formData.get("publisher") || "").trim(),
        publicationYear: Number(formData.get("publicationYear") || new Date().getFullYear()),
        description: String(formData.get("description") || "").trim(),
        cover: "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=700&q=80",
        totalCopies: Number(formData.get("totalCopies") || 1),
        availableCopies: Number(formData.get("availableCopies") || 1),
        status: "active",
        rating: 4.4,
      };

      if (!newBook.title || !newBook.author || !newBook.isbn || !newBook.category || !newBook.publisher || !newBook.description) {
        showToast("Please complete all required book details.", "error");
        return;
      }

      state.books.unshift(newBook);
      state.categories = Array.from(new Set([...state.categories, newBook.category]));
      saveState(state);
      addActivityLog(user.id, "Book added", `Added ${newBook.title} to the catalog.`);
      showToast("Book added successfully.", "success");
      bookForm.reset();
      renderAdminStats();
      renderAdminBooksTable();
      renderPopularBooks();
      if (document.getElementById("category-filter")) populateCategoryOptions();
    });
  }

  document.addEventListener("click", (event) => {
    const deleteButton = event.target.closest("[data-delete-book-id]");
    if (deleteButton) {
      event.preventDefault();
      const state = getState();
      const bookId = deleteButton.dataset.deleteBookId;
      const target = state.books.find((book) => book.id === bookId);
      if (!target) return;

      if (target.status === "inactive") {
        showToast("This book is already inactive.", "warning");
        return;
      }

      target.status = "inactive";
      saveState(state);
      addActivityLog(user.id, "Book deactivated", `Deactivated ${target.title}.`);
      showToast("Book deactivated.", "warning");
      refreshAdminViews();
    }

    const toggleUser = event.target.closest("[data-toggle-user-id]");
    if (toggleUser) {
      event.preventDefault();
      const state = getState();
      const targetUser = state.users.find((item) => item.id === toggleUser.dataset.toggleUserId);
      if (!targetUser) return;
      targetUser.status = targetUser.status === "active" ? "inactive" : "active";
      saveState(state);
      addActivityLog(user.id, "User status updated", `${targetUser.fullName} was ${targetUser.status}.`);
      showToast(`User ${targetUser.status === "active" ? "activated" : "deactivated"}.`, "success");
      refreshAdminViews();
    }

    const returnButton = event.target.closest("[data-admin-return-id]");
    if (returnButton) {
      event.preventDefault();
      returnBorrowing(returnButton.dataset.adminReturnId, returnButton.dataset.userId);
    }
  });
});

function refreshAdminViews() {
  renderAdminStats();
  renderPopularBooks();
  renderAdminBooksTable();
  renderAdminUsersTable();
  renderAdminBorrowingsTable();
  renderAdminVisitTable();
}

function renderAdminStats() {
  const state = getState();
  const today = getTodayString();
  const totalBooks = state.books.length;
  const availableBooks = state.books.reduce((sum, book) => sum + Math.max(0, book.availableCopies), 0);
  const activeBorrowings = state.borrowings.filter((record) => record.status === "active").length;
  const overdueBooks = state.borrowings.filter((record) => record.status === "active" && new Date(record.dueDate) < new Date()).length;
  const registeredUsers = state.users.filter((user) => user.role === "student").length;
  const todayEntries = state.visits.filter((visit) => visit.date === today && visit.entryTime).length;
  const todayExits = state.visits.filter((visit) => visit.date === today && visit.exitTime).length;
  const currentVisitors = state.visits.filter((visit) => visit.date === today && visit.status === "inside").length;

  const container = document.getElementById("admin-stats");
  if (!container) return;

  container.innerHTML = `
    <article class="stat-card"><span>Total books</span><strong>${totalBooks}</strong></article>
    <article class="stat-card"><span>Available books</span><strong>${availableBooks}</strong></article>
    <article class="stat-card"><span>Borrowed books</span><strong>${activeBorrowings}</strong></article>
    <article class="stat-card warning-card"><span>Overdue books</span><strong>${overdueBooks}</strong></article>
    <article class="stat-card"><span>Registered users</span><strong>${registeredUsers}</strong></article>
    <article class="stat-card success-card"><span>Today&apos;s entries</span><strong>${todayEntries}</strong></article>
    <article class="stat-card"><span>Today&apos;s exits</span><strong>${todayExits}</strong></article>
    <article class="stat-card"><span>Current visitors</span><strong>${currentVisitors}</strong></article>
  `;
}

function renderAdminCharts() {
  const borrowingChart = document.getElementById("borrowing-chart");
  const trafficChart = document.getElementById("traffic-chart");

  if (borrowingChart) {
    const data = [12, 7, 9, 14, 16, 11, 18];
    borrowingChart.innerHTML = data.map((value, index) => `
      <div class="chart-bar">
        <span>${["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][index]}</span>
        <div class="chart-track"><div class="chart-fill" style="width:${(value / 20) * 100}%"></div></div>
        <strong>${value}</strong>
      </div>
    `).join("");
  }

  if (trafficChart) {
    const data = [
      { label: "Entries", value: 20 },
      { label: "Exits", value: 16 },
      { label: "Visitors", value: 12 },
    ];
    trafficChart.innerHTML = data.map((item) => `
      <div class="chart-bar">
        <span>${item.label}</span>
        <div class="chart-track"><div class="chart-fill" style="width:${(item.value / 25) * 100}%"></div></div>
        <strong>${item.value}</strong>
      </div>
    `).join("");
  }
}

function renderPopularBooks() {
  const table = document.getElementById("popular-books-table");
  if (!table) return;

  const state = getState();
  const counts = {};
  state.borrowings.forEach((record) => {
    if (record.bookId) counts[record.bookId] = (counts[record.bookId] || 0) + 1;
  });

  const ranked = state.books
    .map((book) => ({ ...book, borrowCount: counts[book.id] || 0 }))
    .sort((a, b) => b.borrowCount - a.borrowCount)
    .slice(0, 5);

  table.innerHTML = ranked.map((book) => `
    <tr>
      <td>${book.title}</td>
      <td>${book.category}</td>
      <td>${book.borrowCount}</td>
    </tr>
  `).join("");
}

function renderAdminBooksTable() {
  const table = document.getElementById("admin-books-table");
  if (!table) return;

  const state = getState();
  table.innerHTML = state.books.map((book) => `
    <tr>
      <td>${book.title}</td>
      <td>${book.author}</td>
      <td>${book.category}</td>
      <td>${book.availableCopies}/${book.totalCopies}</td>
      <td>
        <button type="button" class="admin-action danger" data-delete-book-id="${book.id}">Deactivate</button>
      </td>
    </tr>
  `).join("");
}

function renderAdminUsersTable() {
  const table = document.getElementById("admin-users-table");
  if (!table) return;

  const state = getState();
  table.innerHTML = state.users.filter((user) => user.role === "student").map((user) => `
    <tr>
      <td>${user.fullName}</td>
      <td>${user.studentId}</td>
      <td>${user.email}</td>
      <td>${user.department}</td>
      <td>${user.level}</td>
      <td><span class="badge ${user.status === "active" ? "active" : "overdue"}">${user.status}</span></td>
      <td><button type="button" class="admin-action" data-toggle-user-id="${user.id}">${user.status === "active" ? "Deactivate" : "Activate"}</button></td>
    </tr>
  `).join("");
}

function renderAdminBorrowingsTable() {
  const table = document.getElementById("admin-borrowings-table");
  if (!table) return;

  const state = getState();
  table.innerHTML = state.borrowings.map((record) => {
    const user = state.users.find((item) => item.id === record.userId);
    const book = state.books.find((item) => item.id === record.bookId);
    const dueSoon = record.status === "active" && new Date(record.dueDate) < new Date();

    return `
      <tr>
        <td>${user ? user.fullName : "Unknown"}</td>
        <td>${book ? book.title : "Unknown"}</td>
        <td>${formatDate(record.borrowedAt)}</td>
        <td>${formatDate(record.dueDate)}</td>
        <td><span class="badge ${record.status === "returned" ? "returned" : dueSoon ? "overdue" : "active"}">${record.status === "returned" ? "Returned" : dueSoon ? "Overdue" : "Active"}</span></td>
        <td>
          ${record.status === "active" ? `<button type="button" class="admin-action" data-admin-return-id="${record.id}" data-user-id="${record.userId}">Record return</button>` : "—"}
        </td>
      </tr>
    `;
  }).join("");
}

function renderAdminVisitTable() {
  const table = document.getElementById("admin-visit-table");
  if (!table) return;

  const state = getState();
  table.innerHTML = state.visits.slice(0, 12).map((visit) => `
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
