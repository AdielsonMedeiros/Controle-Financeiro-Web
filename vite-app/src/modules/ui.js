// Toast notification system
export function showToast(message, type = "info") {
  const container = document.getElementById("toast-container");
  if (!container) return;
  
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;

  const icons = {
    success: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`,
    error: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`,
    warning: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`,
    info: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`
  };

  toast.innerHTML = `
    <div class="toast-icon">${icons[type] || icons.info}</div>
    <div class="toast-message">${message}</div>
    <button class="toast-close">&times;</button>
  `;

  container.appendChild(toast);

  const removeToast = () => {
    toast.style.animation = "fadeOutToast 0.3s ease-in forwards";
    toast.addEventListener("animationend", () => toast.remove());
  };

  setTimeout(removeToast, 4000);
  toast.querySelector(".toast-close").addEventListener("click", removeToast);
}

// Parse and translate error messages
export function getErrorMsg(error) {
  let message = "Ocorreu um erro desconhecido.";
  
  if (typeof error === 'string') {
    message = error;
  } else if (error && error.message) {
    message = error.message;
  }

  try {
    if (message.trim().startsWith('{')) {
      const parsed = JSON.parse(message);
      if (parsed?.error?.message) {
        message = parsed.error.message;
      } else if (parsed?.message) {
        message = parsed.message;
      }
    }
  } catch (e) {
    // Not JSON, continue with original message
  }

  const errorCodes = {
    'INVALID_LOGIN_CREDENTIALS': 'Email ou senha incorretos.',
    'INVALID_PASSWORD': 'Senha incorreta.',
    'EMAIL_NOT_FOUND': 'Este email não está cadastrado.',
    'USER_DISABLED': 'Esta conta foi desativada.',
    'auth/invalid-email': 'O endereço de email é inválido.',
    'auth/user-disabled': 'Este usuário foi desativado.',
    'auth/user-not-found': 'Usuário não encontrado.',
    'auth/wrong-password': 'Email ou senha incorretos.',
    'auth/email-already-in-use': 'O endereço de email já está em uso.',
    'auth/weak-password': 'A senha deve ter pelo menos 6 caracteres.',
    'auth/account-exists-with-different-credential': 'Conta já existe com credenciais diferentes. Faça login com o método original.',
    'auth/popup-closed-by-user': 'O login foi cancelado pelo usuário.',
    'auth/cancelled-popup-request': 'A solicitação de login foi cancelada.'
  };

  return errorCodes[message] || message;
}

// Theme toggle functionality
export function initTheme() {
  const savedTheme = localStorage.getItem("theme");
  if (savedTheme === "dark") {
    document.body.classList.add("dark-mode");
    updateThemeIcons(true);
  }
}

export function toggleTheme() {
  const isDark = document.body.classList.toggle("dark-mode");
  localStorage.setItem("theme", isDark ? "dark" : "light");
  updateThemeIcons(isDark);
}

function updateThemeIcons(isDark) {
  const moonIcon = document.getElementById("moon-icon");
  const sunIcon = document.getElementById("sun-icon");
  if (moonIcon) moonIcon.style.display = isDark ? "none" : "block";
  if (sunIcon) sunIcon.style.display = isDark ? "block" : "none";
}

// Mobile app banner
export function initBanner() {
  const banner = document.getElementById("mobile-app-banner");
  const closeBtn = document.getElementById("close-app-banner");
  
  if (localStorage.getItem("appBannerClosed") === "true" && banner) {
    banner.style.display = "none";
  }
  
  closeBtn?.addEventListener("click", () => {
    if (banner) {
      banner.style.display = "none";
      localStorage.setItem("appBannerClosed", "true");
    }
  });
}
