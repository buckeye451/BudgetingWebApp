/* Login / register screen for My Budget. */

let mode = "login"; // "login" | "register"

const form = document.getElementById("authForm");
const errorEl = document.getElementById("authError");
const submitBtn = document.getElementById("submitBtn");
const subEl = document.getElementById("authSub");
const toggleText = document.getElementById("toggleText");
const toggleBtn = document.getElementById("toggleMode");
const codeField = document.getElementById("codeField");
const passwordInput = document.getElementById("password");

let registrationInfo = { canRegister: true, codeRequired: false };

// If already signed in, go straight to the app.
fetch("/api/me").then((r) => { if (r.ok) location.href = "/"; });

// Find out whether registration is allowed (and if a code is needed).
fetch("/api/registration-status")
  .then((r) => r.json())
  .then((info) => {
    registrationInfo = info;
    if (!info.canRegister) {
      // Hide the "create account" toggle entirely.
      document.querySelector(".auth-toggle").classList.add("hidden");
    }
  })
  .catch(() => {});

function showError(msg) {
  errorEl.textContent = msg;
  errorEl.classList.remove("hidden");
}
function clearError() {
  errorEl.classList.add("hidden");
}

function applyMode() {
  clearError();
  if (mode === "login") {
    subEl.textContent = "Sign in to your account";
    submitBtn.textContent = "Sign in";
    toggleText.textContent = "Need an account?";
    toggleBtn.textContent = "Create one";
    passwordInput.autocomplete = "current-password";
    codeField.classList.add("hidden");
  } else {
    subEl.textContent = "Create your account";
    submitBtn.textContent = "Create account";
    toggleText.textContent = "Already have an account?";
    toggleBtn.textContent = "Sign in";
    passwordInput.autocomplete = "new-password";
    codeField.classList.toggle("hidden", !registrationInfo.codeRequired);
  }
}

toggleBtn.addEventListener("click", () => {
  mode = mode === "login" ? "register" : "login";
  applyMode();
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearError();
  submitBtn.disabled = true;

  const payload = {
    username: document.getElementById("username").value.trim(),
    password: passwordInput.value,
  };
  if (mode === "register") payload.code = document.getElementById("code").value;

  try {
    const res = await fetch(`/api/${mode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      location.href = "/";
    } else {
      const data = await res.json().catch(() => ({}));
      showError(data.error || "Something went wrong.");
    }
  } catch (err) {
    showError("Could not reach the server. Is it running?");
  } finally {
    submitBtn.disabled = false;
  }
});

applyMode();
