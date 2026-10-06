document.addEventListener("DOMContentLoaded", () => {
  ensureState();

  const sessionUser = getCurrentUser();
  if (sessionUser && (window.location.pathname.endsWith("login.html") || window.location.pathname.endsWith("register.html"))) {
    window.location.href = sessionUser.role === "admin" ? "admin/dashboard.html" : "dashboard.html";
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
        window.location.href = user.role === "admin" ? "admin/dashboard.html" : "dashboard.html";
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
