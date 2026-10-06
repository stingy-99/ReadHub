document.addEventListener("DOMContentLoaded", () => {
  ensureState();

  const sessionUser = getCurrentUser();
  const isAdminFolder = window.location.pathname.includes("/admin/");
  const isAdminLoginPage = isAdminFolder && window.location.pathname.endsWith("login.html");
  const isStudentLoginPage = window.location.pathname.endsWith("login.html") && !isAdminLoginPage;

  if (sessionUser && (isAdminLoginPage || isStudentLoginPage || window.location.pathname.endsWith("register.html"))) {
    if (isAdminFolder && sessionUser.role !== "admin") {
      window.location.href = "/dashboard.html";
    } else if (sessionUser.role === "admin") {
      window.location.href = "/admin/dashboard.html";
    } else {
      window.location.href = "/dashboard.html";
    }
  }

  const adminLoginForm = document.getElementById("admin-login-form");
  if (adminLoginForm) {
    adminLoginForm.addEventListener("submit", (event) => {
      event.preventDefault();

      const email = document.getElementById("admin-email").value.trim();
      const password = document.getElementById("admin-password").value;

      if (!email || !password) {
        showToast("Please enter both email and password.", "error");
        return;
      }

      const state = getState();
      const user = state.users.find((item) => item.email === email && item.role === "admin");
      if (!user) {
        showToast("Admin account not found.", "error");
        return;
      }

      if (hashPasswordSync(password) !== user.passwordHash) {
        showToast("Incorrect admin password.", "error");
        return;
      }

      setSession(user.id);
      showToast("Admin login successful.", "success");
      setTimeout(() => {
        window.location.href = "/admin/dashboard.html";
      }, 500);
    });
  }

  const adminRegisterForm = document.getElementById("admin-register-form");
  if (adminRegisterForm) {
    adminRegisterForm.addEventListener("submit", (event) => {
      event.preventDefault();

      const formData = new FormData(adminRegisterForm);
      const fullName = String(formData.get("fullName") || "").trim();
      const staffId = String(formData.get("staffId") || "").trim();
      const email = String(formData.get("email") || "").trim().toLowerCase();
      const department = String(formData.get("department") || "").trim();
      const phone = String(formData.get("phone") || "").trim();
      const password = String(formData.get("password") || "");
      const confirmPassword = String(formData.get("confirmPassword") || "");

      if (!fullName || !staffId || !email || !department || !phone || !password || !confirmPassword) {
        showToast("Please complete all fields.", "error");
        return;
      }
      if (!/^\S+@\S+\.\S+$/.test(email)) {
        showToast("Enter a valid work email address.", "error");
        return;
      }
      if (password.length < 8) {
        showToast("Password must be at least 8 characters long.", "error");
        return;
      }
      if (password !== confirmPassword) {
        showToast("Passwords do not match.", "error");
        return;
      }

      const state = getState();
      const duplicate = state.users.some((item) =>
        String(item.email).toLowerCase() === email || String(item.studentId).toLowerCase() === staffId.toLowerCase()
      );
      if (duplicate) {
        showToast("An account with this email or staff ID already exists.", "error");
        return;
      }

      const adminUser = {
        id: crypto.randomUUID ? crypto.randomUUID() : `admin-${Date.now()}`,
        fullName,
        studentId: staffId,
        email,
        passwordHash: hashPasswordSync(password),
        department,
        level: "Admin",
        phone,
        role: "admin",
        status: "active",
        createdAt: new Date().toISOString(),
      };

      state.users.unshift(adminUser);
      saveState(state);
      addActivityLog(adminUser.id, "Admin account created", `Created admin account for ${fullName}.`);
      adminRegisterForm.reset();
      showToast("Admin account created. You can now log in.", "success");
      setTimeout(() => {
        window.location.href = "/admin/login.html";
      }, 600);
    });
  }

  const loginForm = document.getElementById("login-form");
  if (loginForm) {
    loginForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      const identifier = document.getElementById("login-email").value.trim();
      const password = document.getElementById("login-password").value;

      if (!identifier || !password) {
        showToast("Please enter both email/student ID and password.", "error");
        return;
      }

      const state = getState();
      const user = state.users.find(
        (item) => item.email === identifier || item.studentId === identifier
      );

      if (!user) {
        showToast("Invalid login details.", "error");
        return;
      }

      const enteredHash = hashPasswordSync(password);
      if (enteredHash !== user.passwordHash) {
        showToast("Incorrect password.", "error");
        return;
      }

      setSession(user.id);
      showToast("Login successful.", "success");
      setTimeout(() => {
        window.location.href = user.role === "admin" ? "/admin/dashboard.html" : "/dashboard.html";
      }, 500);
    });
  }

  const registerForm = document.getElementById("register-form");
  if (registerForm) {
    registerForm.addEventListener("submit", (event) => {
      event.preventDefault();

      const formData = new FormData(registerForm);
      const fullName = String(formData.get("fullName") || "").trim();
      const studentId = String(formData.get("studentId") || "").trim();
      const email = String(formData.get("email") || "").trim();
      const department = String(formData.get("department") || "").trim();
      const level = String(formData.get("level") || "").trim();
      const phone = String(formData.get("phone") || "").trim();
      const password = String(formData.get("password") || "");
      const confirmPassword = String(formData.get("confirmPassword") || "");

      if (!fullName || !studentId || !email || !department || !level || !phone || !password || !confirmPassword) {
        showToast("Please complete all required fields.", "error");
        return;
      }

      if (password.length < 6) {
        showToast("Password must be at least 6 characters long.", "error");
        return;
      }

      if (password !== confirmPassword) {
        showToast("Passwords do not match.", "error");
        return;
      }

      const state = getState();
      const exists = state.users.some((user) => user.email === email || user.studentId === studentId);
      if (exists) {
        showToast("A user with this email or student ID already exists.", "error");
        return;
      }

      state.users.unshift({
        id: crypto.randomUUID ? crypto.randomUUID() : `student-${Date.now()}`,
        fullName,
        studentId,
        email,
        department,
        level,
        phone,
        role: "student",
        status: "active",
        passwordHash: hashPasswordSync(password),
        createdAt: new Date().toISOString(),
      });

      saveState(state);
      showToast("Registration successful. Please log in.", "success");
      setTimeout(() => {
        window.location.href = "login.html";
      }, 500);
    });
  }

  const profileForm = document.getElementById("profile-form");
  if (profileForm) {
    const currentUser = requireAuth("student");
    if (currentUser) {
      document.getElementById("profile-name").value = currentUser.fullName;
      document.getElementById("profile-student").value = currentUser.studentId;
      document.getElementById("profile-email").value = currentUser.email;
      document.getElementById("profile-phone").value = currentUser.phone;
      document.getElementById("profile-department").value = currentUser.department;
      document.getElementById("profile-level").value = currentUser.level;
    }

    profileForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const user = requireAuth("student");
      if (!user) return;

      const state = getState();
      const target = state.users.find((item) => item.id === user.id);
      if (!target) return;

      target.fullName = document.getElementById("profile-name").value.trim();
      target.studentId = document.getElementById("profile-student").value.trim();
      target.email = document.getElementById("profile-email").value.trim();
      target.phone = document.getElementById("profile-phone").value.trim();
      target.department = document.getElementById("profile-department").value.trim();
      target.level = document.getElementById("profile-level").value;
      target.updatedAt = new Date().toISOString();

      saveState(state);
      addActivityLog(user.id, "Profile updated", "Updated profile details.");
      showToast("Profile updated successfully.", "success");
    });
  }

  document.querySelectorAll(".toggle-password").forEach((button) => {
    button.addEventListener("click", () => {
      const input = button.previousElementSibling;
      if (!input) return;
      const isPassword = input.type === "password";
      input.type = isPassword ? "text" : "password";
      button.textContent = isPassword ? "Hide" : "Show";
    });
  });
});
