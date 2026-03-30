const usernameInput = document.querySelector("#username");
const passwordInput = document.querySelector("#password");
const loginButton = document.querySelector("#login-button");
const createAccountButton = document.querySelector("#create-account-button");
const authStatus = document.querySelector("#auth-status");

function setStatus(message, isError = false) {
  if (!authStatus) {
    return;
  }
  authStatus.textContent = message;
  authStatus.style.color = isError ? "#a40000" : "#1f2937";
}

async function handleAuth(mode) {
  const username = (usernameInput?.value || "").trim();
  const password = passwordInput?.value || "";

  if (!username || !password) {
    setStatus("Enter a username and password.", true);
    return;
  }

  try {
    const endpoint = mode === "register" ? "/api/auth/register" : "/api/auth/login";
    const result = await apiFetch(endpoint, {
      method: "POST",
      body: JSON.stringify({ username, password })
    });

    setToken(result.token);
    setStatus(`Welcome, ${result.user.username}. Redirecting...`);
    window.location.href = "sort-io.html";
  } catch (error) {
    setStatus(error.message, true);
  }
}

async function checkExistingSession() {
  if (!getToken()) {
    return;
  }

  try {
    const result = await apiFetch("/api/auth/me");
    setStatus(`Signed in as ${result.user.username}. Redirecting...`);
    window.location.href = "sort-io.html";
  } catch {
    clearToken();
  }
}

if (loginButton) {
  loginButton.addEventListener("click", () => handleAuth("login"));
}

if (createAccountButton) {
  createAccountButton.addEventListener("click", () => handleAuth("register"));
}

checkExistingSession();
