document.addEventListener("DOMContentLoaded", () => {
  const user = requireAuth("student");
  if (!user) return;

  populateCategoryOptions();

  const searchInput = document.getElementById("book-search");
  const categoryFilter = document.getElementById("category-filter");
  const availabilityFilter = document.getElementById("availability-filter");

  if (searchInput) {
    searchInput.addEventListener("input", renderCatalog);
  }

  if (categoryFilter) {
    categoryFilter.addEventListener("change", renderCatalog);
  }

  if (availabilityFilter) {
    availabilityFilter.addEventListener("change", renderCatalog);
  }

  if (document.getElementById("catalog-list")) {
    renderCatalog();
  }

  if (document.getElementById("book-detail-layout")) {
    renderBookDetail();
  }

  document.addEventListener("click", (event) => {
    const borrowButton = event.target.closest("[data-borrow-id]");
    if (borrowButton) {
      borrowBook(borrowButton.dataset.borrowId, user.id);
    }

    const detailButton = event.target.closest("[data-book-id]");
    if (detailButton && detailButton.dataset.href) {
      window.location.href = detailButton.dataset.href;
    }
  });
});

function populateCategoryOptions() {
  const categoryFilter = document.getElementById("category-filter");
  if (!categoryFilter) return;

  const state = getState();
  categoryFilter.innerHTML = ['<option value="all">All categories</option>']
    .concat(state.categories.map((category) => `<option value="${category}">${category}</option>`))
    .join("");
}

function getFilteredBooks() {
  const searchInput = document.getElementById("book-search");
  const categoryFilter = document.getElementById("category-filter");
  const availabilityFilter = document.getElementById("availability-filter");

  const query = (searchInput?.value || "").trim().toLowerCase();
  const selectedCategory = categoryFilter?.value || "all";
  const selectedAvailability = availabilityFilter?.value || "all";

  return getState().books.filter((book) => {
    const matchesSearch = !query || [book.title, book.author, book.isbn, book.category].some((value) =>
      String(value).toLowerCase().includes(query)
    );
    const matchesCategory = selectedCategory === "all" || book.category === selectedCategory;
    const matchesAvailability = selectedAvailability === "all" ||
      (selectedAvailability === "available" && book.availableCopies > 0) ||
      (selectedAvailability === "unavailable" && book.availableCopies <= 0);
    return matchesSearch && matchesCategory && matchesAvailability;
  });
}

function renderCatalog() {
  const list = document.getElementById("catalog-list");
  const count = document.getElementById("book-count");
  if (!list) return;

  const books = getFilteredBooks();
  if (count) count.textContent = `${books.length} books`;

  if (books.length === 0) {
    list.innerHTML = '<div class="empty-state">No books match your selected filters.</div>';
    return;
  }

  list.innerHTML = books.map((book) => `
    <article class="book-card">
      <div class="book-cover" style="background-image: url('${book.cover}')"></div>
      <div class="book-card-body">
        <h3>${book.title}</h3>
        <p class="muted">${book.author}</p>
        <div class="meta-row">
          <span class="meta-tag">${book.category}</span>
          <span class="meta-tag">${book.availableCopies} copies</span>
        </div>
        <p class="muted">ISBN: ${book.isbn}</p>
        <div class="book-card-actions">
          <button type="button" class="btn btn-ghost" data-book-id="${book.id}" data-href="book-details.html?id=${book.id}">View Details</button>
          <button type="button" class="btn btn-primary" data-borrow-id="${book.id}" ${book.availableCopies <= 0 ? "disabled" : ""}>${book.availableCopies > 0 ? "Borrow" : "Unavailable"}</button>
        </div>
      </div>
    </article>
  `).join("");
}

function renderBookDetail() {
  const container = document.getElementById("book-detail-layout");
  if (!container) return;

  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  const book = getBookById(id);

  if (!book) {
    container.innerHTML = '<div class="empty-state">Book details are unavailable.</div>';
    return;
  }

  const currentUser = getCurrentUser();
  const canBorrow = book.availableCopies > 0 && currentUser;

  document.getElementById("book-detail-title").textContent = book.title;

  container.innerHTML = `
    <div class="book-detail-cover">
      <img src="${book.cover}" alt="${book.title}" />
    </div>
    <article class="detail-panel">
      <div class="detail-meta">
        <span class="meta-tag">${book.category}</span>
        <span class="meta-tag">${book.availableCopies} available</span>
        <span class="meta-tag">${book.totalCopies} total copies</span>
      </div>
      <h2>${book.title}</h2>
      <p class="muted">by ${book.author}</p>
      <p>${book.description}</p>

      <div class="meta-info">
        <div class="meta-box">
          <span>ISBN</span>
          <strong>${book.isbn}</strong>
        </div>
        <div class="meta-box">
          <span>Publisher</span>
          <strong>${book.publisher}</strong>
        </div>
        <div class="meta-box">
          <span>Publication Year</span>
          <strong>${book.publicationYear}</strong>
        </div>
        <div class="meta-box">
          <span>Availability</span>
          <strong>${book.availableCopies > 0 ? "Available" : "Currently unavailable"}</strong>
        </div>
      </div>

      <div class="detail-actions">
        <button type="button" class="btn btn-primary" data-borrow-id="${book.id}" ${canBorrow ? "" : "disabled"}>${book.availableCopies > 0 ? "Borrow this book" : "Currently unavailable"}</button>
        <a href="books.html" class="btn btn-secondary">Back to catalog</a>
      </div>
    </article>
  `;
}
