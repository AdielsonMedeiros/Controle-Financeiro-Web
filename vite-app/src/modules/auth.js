import { getErrorMsg, showToast } from './ui.js';

let pendingCredential = null;

// Initialize auth event listeners
export function initAuth(auth, onLogin, onLogout) {
  const loginEmailInput = document.getElementById("login-email");
  const loginPasswordInput = document.getElementById("login-password");
  const loginEmailBtn = document.getElementById("login-email-btn");
  const loginGoogleBtn = document.getElementById("login-google-icon-btn");
  const loginGithubBtn = document.getElementById("login-github-icon-btn");
  const registerEmailInput = document.getElementById("register-email");
  const registerPasswordInput = document.getElementById("register-password");
  const registerBtn = document.getElementById("register-btn");
  const logoutBtn = document.getElementById("logout-btn");
  const showRegisterLink = document.getElementById("show-register");
  const showLoginLink = document.getElementById("show-login");
  const loginView = document.getElementById("login-view");
  const registerView = document.getElementById("register-view");

  // Toggle between login and register views
  showRegisterLink?.addEventListener("click", (e) => {
    e.preventDefault();
    if (loginView) loginView.style.display = "none";
    if (registerView) registerView.style.display = "block";
  });

  showLoginLink?.addEventListener("click", (e) => {
    e.preventDefault();
    if (registerView) registerView.style.display = "none";
    if (loginView) loginView.style.display = "block";
  });

  // Email/Password Login
  loginEmailBtn?.addEventListener("click", () => {
    const email = loginEmailInput?.value;
    const password = loginPasswordInput?.value;
    if (!email || !password) {
      return showToast("Por favor, preencha e-mail e senha.", "warning");
    }
    auth.signInWithEmailAndPassword(email, password)
      .catch((error) => showToast(`Erro ao fazer login: ${getErrorMsg(error)}`, "error"));
  });

  // Email/Password Register
  registerBtn?.addEventListener("click", () => {
    const email = registerEmailInput?.value;
    const password = registerPasswordInput?.value;
    if (!email || !password) {
      return showToast("Por favor, preencha e-mail e senha.", "warning");
    }
    auth.createUserWithEmailAndPassword(email, password)
      .catch((error) => showToast(`Erro ao registrar: ${getErrorMsg(error)}`, "error"));
  });

  // Google Login
  loginGoogleBtn?.addEventListener("click", () => {
    handleProviderLogin(auth, new firebase.auth.GoogleAuthProvider());
  });

  // GitHub Login
  loginGithubBtn?.addEventListener("click", () => {
    handleProviderLogin(auth, new firebase.auth.GithubAuthProvider());
  });

  // Logout
  logoutBtn?.addEventListener("click", () => auth.signOut());

  // Auth state observer
  auth.onAuthStateChanged((user) => {
    if (user) {
      if (pendingCredential) {
        user.linkWithCredential(pendingCredential)
          .then(() => {
            showToast("Sua conta foi vinculada com sucesso!", "success");
            pendingCredential = null;
          })
          .catch((error) => {
            showToast(`Não foi possível vincular a conta: ${getErrorMsg(error)}`, "error");
            pendingCredential = null;
          });
      }
      onLogin(user);
    } else {
      onLogout();
    }
  });
}

function handleProviderLogin(auth, provider) {
  auth.signInWithPopup(provider).catch((error) => {
    if (error.code === "auth/account-exists-with-different-credential") {
      pendingCredential = error.credential;
      auth.fetchSignInMethodsForEmail(error.email).then((methods) => {
        let providerName = methods.includes("password") ? "E-mail e Senha" : methods[0];
        showToast(
          `Você já tem uma conta com este e-mail usando: ${providerName}. Faça login com este método para vincular suas contas.`,
          "info"
        );
      });
    } else {
      showToast(`Erro ao fazer login: ${getErrorMsg(error)}`, "error");
    }
  });
}

// Update UI for logged in user
export function setupUIForLoggedInUser(user) {
  const authWrapper = document.getElementById("auth-wrapper");
  const dashboardWrapper = document.getElementById("dashboard-wrapper");
  const appContent = document.getElementById("app-content");
  const userInfo = document.getElementById("user-info");
  const userEmailSpan = document.getElementById("user-email");
  const userAvatar = document.getElementById("user-avatar");
  const viewNavButtons = document.querySelectorAll(".view-tab-btn");

  if (authWrapper) authWrapper.style.display = "none";
  if (dashboardWrapper) dashboardWrapper.style.display = "block";
  if (appContent) appContent.style.display = "block";
  if (userInfo) userInfo.style.display = "flex";
  if (userEmailSpan) userEmailSpan.textContent = user.email;
  if (userAvatar) {
    userAvatar.src = user.photoURL || `https://ui-avatars.com/api/?name=${user.email}&background=random`;
  }

  // Ensure main-view is shown by default
  document.querySelectorAll('#app-content > div[id$="-view"]').forEach((view) => {
    view.style.display = "none";
  });
  const mainView = document.getElementById("main-view");
  if (mainView) mainView.style.display = "block";

  viewNavButtons.forEach((btn) => btn.classList.remove("active"));
  const mainViewBtn = document.getElementById("show-main-view-btn");
  if (mainViewBtn) mainViewBtn.classList.add("active");
}

// Update UI for logged out user
export function setupUIForLoggedOutUser() {
  const authWrapper = document.getElementById("auth-wrapper");
  const dashboardWrapper = document.getElementById("dashboard-wrapper");

  if (authWrapper) authWrapper.style.display = "flex";
  if (dashboardWrapper) dashboardWrapper.style.display = "none";
}
