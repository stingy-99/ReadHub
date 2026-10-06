const STORAGE_KEY = "elibrary_state_v1";
const SESSION_KEY = "elibrary_session_v1";
const MAX_ACTIVE_BOOKS = 5;

function hashPasswordSync(password) {
  try {
    if (window.crypto && typeof window.crypto.subtle !== "undefined") {
      return btoa(unescape(encodeURIComponent(password)));
    }
    return btoa(password);
  } catch (error) {
    return btoa(password);
  }
}

function getTodayString() {
  return new Date().toISOString().split("T")[0];
}

function formatDate(dateValue) {
  const date = new Date(dateValue);
  return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function formatDateTime(dateValue) {
  const date = new Date(dateValue);
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const seeded = createDemoState();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
    return seeded;
  }
  return JSON.parse(raw);
}

function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function ensureState() {
  if (!localStorage.getItem(STORAGE_KEY)) {
    const seeded = createDemoState();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
  }
}

function getSession() {
  const raw = localStorage.getItem(SESSION_KEY);
  return raw ? JSON.parse(raw) : null;
}

function setSession(userId) {
  localStorage.setItem(SESSION_KEY, JSON.stringify({ userId }));
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

function getCurrentUser() {
  const session = getSession();
  const state = getState();
  if (!session) return null;
  return state.users.find((user) => user.id === session.userId) || null;
}

function requireAuth(role = null) {
  const user = getCurrentUser();
  const currentPath = window.location.pathname;
  const inAdminFolder = currentPath.includes("/admin/");

  if (!user) {
    window.location.href = role === "admin" ? "/admin/login.html" : "/login.html";
    return null;
  }

  if (role && user.role !== role) {
    window.location.href = user.role === "admin" ? "/admin/dashboard.html" : "/dashboard.html";
    return null;
  }

  if (!role && inAdminFolder && user.role !== "admin") {
    window.location.href = "/dashboard.html";
    return null;
  }

  return user;
}

function addActivityLog(userId, action, description) {
  const state = getState();
  state.activityLogs.unshift({
    id: crypto.randomUUID ? crypto.randomUUID() : `log-${Date.now()}`,
    userId,
    action,
    description,
    timestamp: new Date().toISOString(),
  });
  saveState(state);
}

function showToast(message, type = "success") {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 2500);
}

function setActiveNav(currentPage) {
  const links = document.querySelectorAll(".main-nav a");
  links.forEach((link) => {
    const match = link.getAttribute("href") === currentPage ||
      (currentPage === "index" && link.getAttribute("href") === "index.html");
    if (match) link.classList.add("active");
  });
}

function initMobileMenu() {
  const toggle = document.querySelector(".menu-toggle");
  const nav = document.querySelector(".main-nav");
  if (!toggle || !nav) return;

  toggle.addEventListener("click", () => {
    nav.classList.toggle("mobile-open");
  });
}

function renderFeaturedBooks() {
  const grid = document.getElementById("featured-books-grid");
  if (!grid) return;

  const state = getState();
  const featured = state.books.slice(0, 4);
  grid.innerHTML = featured.map((book) => `
    <article class="book-card">
      <div class="book-cover" style="background-image: url('${book.cover}')"></div>
      <div class="book-card-body">
        <h3>${book.title}</h3>
        <div class="meta-row">
          <span class="meta-tag">${book.category}</span>
          <span class="meta-tag">${book.availableCopies} left</span>
        </div>
        <p class="muted">${book.author}</p>
        <div class="book-card-actions">
          <a href="book-details.html?id=${book.id}" class="btn btn-ghost">View Details</a>
        </div>
      </div>
    </article>
  `).join("");
}

function renderUserPill() {
  const pill = document.getElementById("user-pill");
  const isUser = getCurrentUser();
  if (!pill) return;
  if (!isUser) {
    pill.textContent = "Guest";
    return;
  }
  pill.textContent = `${isUser.fullName}`;
}

function getBookById(bookId) {
  return getState().books.find((book) => book.id === bookId);
}

function borrowBook(bookId, userId = getCurrentUser()?.id) {
  const state = getState();
  const user = state.users.find((item) => item.id === userId);
  if (!user) {
    showToast("Please log in to borrow a book.", "error");
    window.location.href = "login.html";
    return;
  }

  const book = state.books.find((item) => item.id === bookId);
  if (!book) {
    showToast("Book not found.", "error");
    return;
  }

  if (book.availableCopies <= 0 || book.status !== "active") {
    showToast("This book is currently unavailable.", "warning");
    return;
  }

  const activeCount = state.borrowings.filter(
    (item) => item.userId === userId && item.status === "active"
  ).length;

  if (activeCount >= MAX_ACTIVE_BOOKS) {
    showToast("You have reached the borrowing limit.", "warning");
    return;
  }

  const now = new Date();
  const dueDate = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString();

  state.borrowings.unshift({
    id: crypto.randomUUID ? crypto.randomUUID() : `borrow-${Date.now()}`,
    userId,
    bookId,
    borrowedAt: now.toISOString(),
    dueDate,
    returnedAt: null,
    status: "active",
    createdAt: now.toISOString(),
  });

  book.availableCopies -= 1;
  if (book.availableCopies === 0) book.status = "unavailable";

  addActivityLog(userId, "Book borrowed", `Borrowed ${book.title} and due on ${formatDate(dueDate)}.`);
  saveState(state);
  showToast("Book borrowed successfully.", "success");

  if (window.location.pathname.includes("books.html") || window.location.pathname.includes("book-details.html")) {
    window.location.reload();
  }
}

function returnBorrowing(recordId, userId = getCurrentUser()?.id) {
  const state = getState();
  const record = state.borrowings.find((item) => item.id === recordId && item.userId === userId && item.status === "active");

  if (!record) {
    showToast("No active borrowing record found.", "error");
    return;
  }

  const book = state.books.find((item) => item.id === record.bookId);
  if (book) {
    book.availableCopies += 1;
    book.status = book.availableCopies > 0 ? "active" : "unavailable";
  }

  record.returnedAt = new Date().toISOString();
  record.status = "returned";

  addActivityLog(userId, "Book returned", `Returned ${book ? book.title : "a book"}.`);
  saveState(state);
  showToast("Book returned successfully.", "success");
  window.location.reload();
}

function recordLibraryEntry(userId = getCurrentUser()?.id) {
  const state = getState();
  const user = state.users.find((item) => item.id === userId);
  if (!user) {
    showToast("User not found.", "error");
    return;
  }

  const today = getTodayString();
  const activeVisit = state.visits.find(
    (item) => item.userId === userId && item.date === today && item.status === "inside"
  );

  if (activeVisit) {
    showToast("You are already marked as inside the library.", "warning");
    return;
  }

  const entryTime = new Date();
  state.visits.unshift({
    id: crypto.randomUUID ? crypto.randomUUID() : `visit-${Date.now()}`,
    userId,
    entryTime: entryTime.toISOString(),
    exitTime: null,
    date: today,
    status: "inside",
    studentName: user.fullName,
    studentId: user.studentId,
    department: user.department,
    level: user.level,
  });

  addActivityLog(userId, "Library entry", `Recorded library entry for ${user.fullName}.`);
  saveState(state);
  showToast("Library entry recorded.", "success");
  window.location.reload();
}

function recordLibraryExit(userId = getCurrentUser()?.id) {
  const state = getState();
  const today = getTodayString();
  const activeVisit = state.visits.find(
    (item) => item.userId === userId && item.date === today && item.status === "inside"
  );

  if (!activeVisit) {
    showToast("No active library entry was found for today.", "warning");
    return;
  }

  activeVisit.exitTime = new Date().toISOString();
  activeVisit.status = "exited";

  const user = state.users.find((item) => item.id === userId);
  addActivityLog(userId, "Library exit", `Recorded library exit for ${user ? user.fullName : "student"}.`);
  saveState(state);
  showToast("Library exit recorded.", "success");
  window.location.reload();
}

function createDemoState() {
  const adminPassword = hashPasswordSync("Admin@123");
  const today = new Date();

  const users = [
    {
      id: "user-admin",
      fullName: "Ada Thompson",
      studentId: "ADMIN-001",
      email: "admin@elibrary.edu",
      passwordHash: adminPassword,
      department: "Library Services",
      level: "Admin",
      phone: "08000000000",
      role: "admin",
      status: "active",
      createdAt: new Date(today.getTime() - 120 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "user-student-1",
      fullName: "Augustine Okafor",
      studentId: "STU-2024-001",
      email: "augustine@uni.edu",
      passwordHash: hashPasswordSync("Student@123"),
      department: "Computer Science",
      level: "400",
      phone: "08011111111",
      role: "student",
      status: "active",
      createdAt: new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "user-student-2",
      fullName: "Grace Eze",
      studentId: "STU-2024-002",
      email: "grace@uni.edu",
      passwordHash: hashPasswordSync("Student@123"),
      department: "Business",
      level: "300",
      phone: "08022222222",
      role: "student",
      status: "active",
      createdAt: new Date(today.getTime() - 76 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "user-student-3",
      fullName: "Daniel Adebayo",
      studentId: "STU-2024-003",
      email: "daniel@uni.edu",
      passwordHash: hashPasswordSync("Student@123"),
      department: "Software Engineering",
      level: "500",
      phone: "08033333333",
      role: "student",
      status: "active",
      createdAt: new Date(today.getTime() - 58 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "user-student-4",
      fullName: "Sarah Ibrahim",
      studentId: "STU-2024-004",
      email: "sarah@uni.edu",
      passwordHash: hashPasswordSync("Student@123"),
      department: "Mathematics",
      level: "200",
      phone: "08044444444",
      role: "student",
      status: "active",
      createdAt: new Date(today.getTime() - 45 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "user-student-5",
      fullName: "Michael Osei",
      studentId: "VUG/SEN/25/11111",
      email: "michael@uni.edu",
      passwordHash: hashPasswordSync("Student@123"),
      department: "Engineering",
      level: "400",
      phone: "08055555555",
      role: "student",
      status: "active",
      createdAt: new Date(today.getTime() - 31 * 24 * 60 * 60 * 1000).toISOString(),
    }
  ];

  const books = [
    {
      id: "book-1",
      title: "Clean Code",
      author: "Robert C. Martin",
      isbn: "9780132350884",
      category: "Software Engineering",
      publisher: "Prentice Hall",
      publicationYear: 2008,
      description: "A classic guide to writing maintainable, readable and high-quality software.",
      cover: "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=700&q=80",
      totalCopies: 8,
      availableCopies: 5,
      status: "active",
      rating: 4.8,
    },
    {
      id: "book-2",
      title: "Introduction to Algorithms",
      author: "Thomas H. Cormen",
      isbn: "9780262033848",
      category: "Computer Science",
      publisher: "MIT Press",
      publicationYear: 2009,
      description: "A comprehensive textbook covering algorithmic design and analysis.",
      cover: "https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=700&q=80",
      totalCopies: 6,
      availableCopies: 3,
      status: "active",
      rating: 4.9,
    },
    {
      id: "book-3",
      title: "Fundamentals of Database Systems",
      author: "Elmasri & Navathe",
      isbn: "9780133970777",
      category: "Computer Science",
      publisher: "Pearson",
      publicationYear: 2015,
      description: "Explains entity relationships, database design and practical query issues.",
      cover: "https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&w=700&q=80",
      totalCopies: 5,
      availableCopies: 2,
      status: "active",
      rating: 4.5,
    },
    {
      id: "book-4",
      title: "Principles of Management",
      author: "Stephen P. Robbins",
      isbn: "9780134237479",
      category: "Business",
      publisher: "Pearson",
      publicationYear: 2018,
      description: "A practical overview of leadership, organization and managerial decision-making.",
      cover: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=700&q=80",
      totalCopies: 9,
      availableCopies: 6,
      status: "active",
      rating: 4.3,
    },
    {
      id: "book-5",
      title: "Calculus: Early Transcendentals",
      author: "James Stewart",
      isbn: "9781305482463",
      category: "Mathematics",
      publisher: "Cengage",
      publicationYear: 2016,
      description: "A widely used calculus textbook with strong examples and problem sets.",
      cover: "https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&w=700&q=80",
      totalCopies: 7,
      availableCopies: 4,
      status: "active",
      rating: 4.7,
    },
    {
      id: "book-6",
      title: "Engineering Mathematics",
      author: "K.A. Stroud",
      isbn: "9781137031207",
      category: "Engineering",
      publisher: "Palgrave",
      publicationYear: 2013,
      description: "Covers the mathematics needed for engineering applications and analysis.",
      cover: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=700&q=80",
      totalCopies: 6,
      availableCopies: 4,
      status: "active",
      rating: 4.4,
    },
    {
      id: "book-7",
      title: "The Design of Everyday Things",
      author: "Don Norman",
      isbn: "9780465050659",
      category: "General Studies",
      publisher: "Basic Books",
      publicationYear: 2013,
      description: "A human-centered look at design, usability and product experience.",
      cover: "https://images.unsplash.com/photo-1516979187457-637abb4f9353?auto=format&fit=crop&w=700&q=80",
      totalCopies: 5,
      availableCopies: 2,
      status: "active",
      rating: 4.6,
    },
    {
      id: "book-8",
      title: "Computer Networks",
      author: "Andrew S. Tanenbaum",
      isbn: "9780132126953",
      category: "Computer Science",
      publisher: "Pearson",
      publicationYear: 2010,
      description: "An in-depth introduction to network architecture, protocols and communication.",
      cover: "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=700&q=80",
      totalCopies: 7,
      availableCopies: 3,
      status: "active",
      rating: 4.5,
    },
    {
      id: "book-9",
      title: "Business Analytics",
      author: "James R. Evans",
      isbn: "9781292093726",
      category: "Business",
      publisher: "Pearson",
      publicationYear: 2019,
      description: "Covers analytics, forecasting and evidence-based business decision making.",
      cover: "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=700&q=80",
      totalCopies: 5,
      availableCopies: 1,
      status: "active",
      rating: 4.2,
    },
    {
      id: "book-10",
      title: "Operating System Concepts",
      author: "Abraham Silberschatz",
      isbn: "9781118063330",
      category: "Computer Science",
      publisher: "Wiley",
      publicationYear: 2014,
      description: "A leading textbook covering OS structure, scheduling and process management.",
      cover: "https://images.unsplash.com/photo-1511108690759-009324a90311?auto=format&fit=crop&w=700&q=80",
      totalCopies: 4,
      availableCopies: 2,
      status: "active",
      rating: 4.7,
    },
    {
      id: "book-11",
      title: "Software Engineering",
      author: "Ian Sommerville",
      isbn: "9781292096130",
      category: "Software Engineering",
      publisher: "Pearson",
      publicationYear: 2017,
      description: "A widely used engineering reference on specification, design and testing.",
      cover: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=700&q=80",
      totalCopies: 5,
      availableCopies: 2,
      status: "active",
      rating: 4.6,
    },
    {
      id: "book-12",
      title: "Digital Logic and Computer Design",
      author: "M. Morris Mano",
      isbn: "9780132145107",
      category: "Engineering",
      publisher: "Pearson",
      publicationYear: 2013,
      description: "Introduces digital systems, logic circuits and architecture basics.",
      cover: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=700&q=80",
      totalCopies: 4,
      availableCopies: 1,
      status: "active",
      rating: 4.4,
    },
    {
      id: "book-13",
      title: "Discrete Mathematics",
      author: "Kenneth Rosen",
      isbn: "9780073383095",
      category: "Mathematics",
      publisher: "McGraw Hill",
      publicationYear: 2012,
      description: "A foundational text on graphs, logic, probability and combinatorics.",
      cover: "https://images.unsplash.com/photo-1532012197267-da84d127e765?auto=format&fit=crop&w=700&q=80",
      totalCopies: 6,
      availableCopies: 4,
      status: "active",
      rating: 4.6,
    },
    {
      id: "book-14",
      title: "Leadership and Ethics",
      author: "John Maxwell",
      isbn: "9781400205537",
      category: "General Studies",
      publisher: "Thomas Nelson",
      publicationYear: 2011,
      description: "A guide to personal leadership, service and ethical decision making.",
      cover: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=700&q=80",
      totalCopies: 7,
      availableCopies: 5,
      status: "active",
      rating: 4.3,
    },
    {
      id: "book-15",
      title: "Data Structures and Algorithms",
      author: "Mark Allen Weiss",
      isbn: "9780132576277",
      category: "Computer Science",
      publisher: "Pearson",
      publicationYear: 2014,
      description: "Hands-on learning of efficient data design and algorithmic patterns.",
      cover: "https://images.unsplash.com/photo-1516321165247-4aa89a48be28?auto=format&fit=crop&w=700&q=80",
      totalCopies: 8,
      availableCopies: 5,
      status: "active",
      rating: 4.7,
    },
    {
      id: "book-16",
      title: "Project Management Essentials",
      author: "Talal Al-Kharouf",
      isbn: "9781118846367",
      category: "Business",
      publisher: "Wiley",
      publicationYear: 2016,
      description: "A concise overview of scope, planning, risk and project control.",
      cover: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=700&q=80",
      totalCopies: 4,
      availableCopies: 2,
      status: "active",
      rating: 4.1,
    },
    {
      id: "book-17",
      title: "Applied Probability",
      author: "Murray R. Spiegel",
      isbn: "9780070519950",
      category: "Mathematics",
      publisher: "McGraw-Hill",
      publicationYear: 2010,
      description: "Probability concepts and applications with practice-based examples.",
      cover: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=700&q=80",
      totalCopies: 5,
      availableCopies: 3,
      status: "active",
      rating: 4.2,
    },
    {
      id: "book-18",
      title: "Embedded Systems",
      author: "Raj Kamal",
      isbn: "9780070145894",
      category: "Engineering",
      publisher: "McGraw Hill",
      publicationYear: 2008,
      description: "Covers embedded hardware, software, interfacing and real-time systems.",
      cover: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=700&q=80",
      totalCopies: 6,
      availableCopies: 2,
      status: "active",
      rating: 4.5,
    },
    {
      id: "book-19",
      title: "Marketing Management",
      author: "Philip Kotler",
      isbn: "9780133856460",
      category: "Business",
      publisher: "Pearson",
      publicationYear: 2017,
      description: "Strategic marketing, market planning and customer relationship techniques.",
      cover: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=700&q=80",
      totalCopies: 5,
      availableCopies: 4,
      status: "active",
      rating: 4.4,
    },
    {
      id: "book-20",
      title: "Human Communication",
      author: "Joseph DeVito",
      isbn: "9780205749184",
      category: "General Studies",
      publisher: "Pearson",
      publicationYear: 2018,
      description: "Explores interpersonal communication skills and public speaking fundamentals.",
      cover: "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=700&q=80",
      totalCopies: 4,
      availableCopies: 2,
      status: "active",
      rating: 4.2,
    }
  ];

  const borrowings = [
    {
      id: "borrow-1",
      userId: "user-student-1",
      bookId: "book-1",
      borrowedAt: new Date(today.getTime() - 9 * 24 * 60 * 60 * 1000).toISOString(),
      dueDate: new Date(today.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      returnedAt: null,
      status: "active",
      createdAt: new Date(today.getTime() - 9 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "borrow-2",
      userId: "user-student-2",
      bookId: "book-5",
      borrowedAt: new Date(today.getTime() - 20 * 24 * 60 * 60 * 1000).toISOString(),
      dueDate: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      returnedAt: null,
      status: "active",
      createdAt: new Date(today.getTime() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "borrow-3",
      userId: "user-student-3",
      bookId: "book-9",
      borrowedAt: new Date(today.getTime() - 26 * 24 * 60 * 60 * 1000).toISOString(),
      dueDate: new Date(today.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      returnedAt: new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      status: "returned",
      createdAt: new Date(today.getTime() - 26 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "borrow-4",
      userId: "user-student-4",
      bookId: "book-15",
      borrowedAt: new Date(today.getTime() - 42 * 24 * 60 * 60 * 1000).toISOString(),
      dueDate: new Date(today.getTime() - 16 * 24 * 60 * 60 * 1000).toISOString(),
      returnedAt: null,
      status: "active",
      createdAt: new Date(today.getTime() - 42 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "borrow-5",
      userId: "user-student-1",
      bookId: "book-8",
      borrowedAt: new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString(),
      dueDate: new Date(today.getTime() + 12 * 24 * 60 * 60 * 1000).toISOString(),
      returnedAt: null,
      status: "active",
      createdAt: new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    }
  ];

  const visits = [
    {
      id: "visit-1",
      userId: "user-student-1",
      entryTime: new Date(today.getTime() - 6 * 60 * 60 * 1000).toISOString(),
      exitTime: null,
      date: getTodayString(),
      status: "inside",
      studentName: "Augustine Okafor",
      studentId: "STU-2024-001",
      department: "Computer Science",
      level: "400",
    },
    {
      id: "visit-2",
      userId: "user-student-2",
      entryTime: new Date(today.getTime() - 3 * 60 * 60 * 1000).toISOString(),
      exitTime: new Date(today.getTime() - 1 * 60 * 60 * 1000).toISOString(),
      date: getTodayString(),
      status: "exited",
      studentName: "Grace Eze",
      studentId: "STU-2024-002",
      department: "Business",
      level: "300",
    },
    {
      id: "visit-3",
      userId: "user-student-3",
      entryTime: new Date(today.getTime() - 4 * 60 * 60 * 1000).toISOString(),
      exitTime: new Date(today.getTime() - 2 * 60 * 60 * 1000).toISOString(),
      date: getTodayString(),
      status: "exited",
      studentName: "Daniel Adebayo",
      studentId: "STU-2024-003",
      department: "Software Engineering",
      level: "500",
    },
    {
      id: "visit-4",
      userId: "user-student-4",
      entryTime: new Date(today.getTime() - 2 * 60 * 60 * 1000).toISOString(),
      exitTime: null,
      date: getTodayString(),
      status: "inside",
      studentName: "Sarah Ibrahim",
      studentId: "STU-2024-004",
      department: "Mathematics",
      level: "200",
    }
  ];

  const activityLogs = [
    {
      id: "log-1",
      userId: "user-student-1",
      action: "Book borrowed",
      description: "Borrowed Clean Code",
      timestamp: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "log-2",
      userId: "user-student-2",
      action: "Book returned",
      description: "Returned Calculus: Early Transcendentals",
      timestamp: new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "log-3",
      userId: "user-admin",
      action: "Book added",
      description: "Added Introduction to Algorithms",
      timestamp: new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000).toISOString(),
    }
  ];

  return {
    users,
    books,
    categories: [
      "Computer Science",
      "Software Engineering",
      "Mathematics",
      "Engineering",
      "Business",
      "General Studies",
    ],
    borrowings,
    visits,
    activityLogs,
  };
}

window.addEventListener("DOMContentLoaded", () => {
  ensureState();

  const logoutButtons = document.querySelectorAll("[data-logout]");
  logoutButtons.forEach((button) => {
    button.addEventListener("click", () => {
      clearSession();
      window.location.href = "/index.html";
    });
  });

  renderUserPill();
  const user = getCurrentUser();
  if (user && document.getElementById("welcome-heading")) {
    document.getElementById("welcome-heading").textContent = `Welcome back, ${user.fullName.split(" ")[0]}`;
  }

  if (document.getElementById("today-date")) {
    document.getElementById("today-date").textContent = formatDate(new Date());
  }
});
