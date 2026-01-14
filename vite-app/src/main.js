// Main application entry point
import './styles/main.css';

// Import modules
import { initAuth, setupUIForLoggedInUser, setupUIForLoggedOutUser } from './modules/auth.js';
import {
    calculateSummary,
    loadBudgets,
    renderBudgetSection,
    renderSummary,
    saveBudgets,
    unsubscribeFromBudgetsListener
} from './modules/budgets.js';
import {
    addExpenseCategory,
    addIncomeCategory,
    getExpenseCategories,
    loadCategories,
    populateCategorySelects,
    renderCategoryLists,
    unsubscribeFromCategoriesListener
} from './modules/categories.js';
import { renderExpenseChart, renderReports } from './modules/charts.js';
import { initializeFirebase } from './modules/firebase.js';
import {
    addTransactionToDB,
    deleteTransactionFromDB,
    getAllTransactions,
    getFilteredTransactions,
    loadTransactions,
    renderTransactionList,
    unsubscribeFromTransactions,
    updateTransactionInDB
} from './modules/transactions.js';
import { initBanner, initTheme, showToast, toggleTheme } from './modules/ui.js';

// Application state
let db, auth;
let currentUserId = null;
let currentPeriodFilter = "this-month";

// Initialize application
document.addEventListener("DOMContentLoaded", () => {
  // Initialize Firebase
  const firebase = initializeFirebase();
  db = firebase.db;
  auth = firebase.auth;

  // Initialize UI
  initTheme();
  initBanner();
  initNavigation();
  initForms();
  initFilters();

  // Initialize authentication
  initAuth(auth, handleLogin, handleLogout);

  // Theme toggle
  document.getElementById("theme-toggle-btn")?.addEventListener("click", toggleTheme);

  // Save budgets button
  document.getElementById("save-budgets-btn")?.addEventListener("click", () => {
    if (currentUserId) saveBudgets(db, currentUserId);
  });

  // Add category buttons
  document.getElementById("add-expense-category-btn")?.addEventListener("click", () => {
    const input = document.getElementById("new-expense-category-input");
    if (input && addExpenseCategory(input.value, db, currentUserId)) {
      input.value = "";
    }
  });

  document.getElementById("add-income-category-btn")?.addEventListener("click", () => {
    const input = document.getElementById("new-income-category-input");
    if (input && addIncomeCategory(input.value, db, currentUserId)) {
      input.value = "";
    }
  });
});

// Handle user login
function handleLogin(user) {
  currentUserId = user.uid;
  setupUIForLoggedInUser(user);
  
  // Load user data
  loadTransactions(db, user.uid, renderAll);
  loadCategories(db, user.uid, () => {
    populateCategorySelects();
    renderCategoryLists(db, user.uid);
  });
  loadBudgets(db, user.uid, renderAll);
}

// Handle user logout
function handleLogout() {
  currentUserId = null;
  setupUIForLoggedOutUser();
  unsubscribeFromTransactions();
  unsubscribeFromCategoriesListener();
  unsubscribeFromBudgetsListener();
}

// Initialize navigation
function initNavigation() {
  const viewNavButtons = document.querySelectorAll(".view-tab-btn");
  
  viewNavButtons.forEach((button) => {
    button.addEventListener("click", () => {
      viewNavButtons.forEach((btn) => btn.classList.remove("active"));
      document.querySelectorAll('#app-content > div[id$="-view"]').forEach((view) => {
        view.style.display = "none";
      });

      button.classList.add("active");
      const viewId = button.id.replace("show-", "").replace("-btn", "");
      const viewToShow = document.getElementById(viewId);
      if (viewToShow) viewToShow.style.display = "block";

      if (viewId === "reports-view") {
        renderReports(getAllTransactions());
      }
    });
  });

  // Form tabs
  const tabs = document.querySelectorAll(".tab-btn");
  const formContainers = document.querySelectorAll(".form-container");

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const expenseEditId = document.getElementById("expense-edit-id")?.value;
      const incomeEditId = document.getElementById("income-edit-id")?.value;

      if (!expenseEditId && !incomeEditId) {
        tabs.forEach((t) => t.classList.remove("active"));
        formContainers.forEach((c) => c.classList.remove("active"));
        tab.classList.add("active");
        document.getElementById(tab.dataset.tab)?.classList.add("active");
      } else {
        showToast("Por favor, finalize a edição atual antes de trocar de aba.", "warning");
      }
    });
  });
}

// Initialize forms
function initForms() {
  // Expense form
  document.getElementById("expense-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    handleExpenseSubmit();
  });

  // Income form
  document.getElementById("income-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    handleIncomeSubmit();
  });

  // Cancel edit buttons
  document.getElementById("cancel-expense-edit-btn")?.addEventListener("click", resetForms);
  document.getElementById("cancel-income-edit-btn")?.addEventListener("click", resetForms);
}

// Handle expense form submit
function handleExpenseSubmit() {
  if (!currentUserId) return;

  const editId = document.getElementById("expense-edit-id")?.value;
  const data = {
    description: document.getElementById("expense-description")?.value,
    category: document.getElementById("expense-category")?.value,
    amount: parseFloat(document.getElementById("expense-amount")?.value),
  };

  if (data.description?.trim() && data.category && !isNaN(data.amount) && data.amount > 0) {
    if (editId) {
      updateTransactionInDB(db, auth, editId, "expense", data);
    } else {
      addTransactionToDB(db, "expense", data, currentUserId);
    }
    resetForms();
  } else {
    showToast("Por favor, preencha todos os campos do gasto com valores válidos.", "warning");
  }
}

// Handle income form submit
function handleIncomeSubmit() {
  if (!currentUserId) return;

  const editId = document.getElementById("income-edit-id")?.value;
  const data = {
    description: document.getElementById("income-description")?.value,
    category: document.getElementById("income-category")?.value,
    amount: parseFloat(document.getElementById("income-amount")?.value),
  };

  if (data.description?.trim() && data.category && !isNaN(data.amount) && data.amount > 0) {
    if (editId) {
      updateTransactionInDB(db, auth, editId, "income", data);
    } else {
      addTransactionToDB(db, "income", data, currentUserId);
    }
    resetForms();
  } else {
    showToast("Por favor, preencha todos os campos da receita com valores válidos.", "warning");
  }
}

// Reset forms
function resetForms() {
  document.getElementById("expense-form")?.reset();
  document.getElementById("income-form")?.reset();
  document.getElementById("expense-edit-id").value = "";
  document.getElementById("income-edit-id").value = "";
  
  document.querySelectorAll(".form-container").forEach((c) => c.classList.remove("editing"));
  
  const expenseBtn = document.getElementById("expense-submit-btn");
  const incomeBtn = document.getElementById("income-submit-btn");
  if (expenseBtn) expenseBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg> Adicionar Gasto';
  if (incomeBtn) incomeBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg> Adicionar Receita';
}

// Initialize filters
function initFilters() {
  const periodFilter = document.getElementById("period-filter");
  const customDateRange = document.getElementById("custom-date-range");
  const startDate = document.getElementById("start-date");
  const endDate = document.getElementById("end-date");

  periodFilter?.addEventListener("change", (e) => {
    currentPeriodFilter = e.target.value;
    if (customDateRange) {
      customDateRange.style.display = currentPeriodFilter === "custom" ? "flex" : "none";
    }
    renderAll();
  });

  startDate?.addEventListener("change", renderAll);
  endDate?.addEventListener("change", renderAll);
}

// Handle edit transaction
function handleEdit(id, type) {
  const transaction = getAllTransactions().find((t) => t.id === id && t.type === type);
  if (!transaction) return;

  const tabs = document.querySelectorAll(".tab-btn");
  const formContainers = document.querySelectorAll(".form-container");
  const targetTab = type === "expense" ? "expense-form-container" : "income-form-container";

  tabs.forEach((t) => t.classList.remove("active"));
  formContainers.forEach((c) => c.classList.remove("active"));

  document.querySelector(`[data-tab="${targetTab}"]`)?.classList.add("active");
  document.getElementById(targetTab)?.classList.add("active", "editing");

  const prefix = type === "expense" ? "expense" : "income";
  document.getElementById(`${prefix}-edit-id`).value = id;
  document.getElementById(`${prefix}-description`).value = transaction.description;
  document.getElementById(`${prefix}-category`).value = transaction.category;
  document.getElementById(`${prefix}-amount`).value = transaction.amount;

  const submitBtn = document.getElementById(`${prefix}-submit-btn`);
  if (submitBtn) {
    submitBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg> Salvar Alterações';
  }
}

// Render all UI components
function renderAll() {
  const startDate = document.getElementById("start-date")?.value;
  const endDate = document.getElementById("end-date")?.value;
  const filteredTransactions = getFilteredTransactions(currentPeriodFilter, startDate, endDate);

  // Render transaction list
  const transactionList = document.getElementById("transaction-list");
  renderTransactionList(
    filteredTransactions, 
    transactionList, 
    handleEdit, 
    (id, type) => deleteTransactionFromDB(db, auth, id, type)
  );

  // Render summary
  const summary = calculateSummary(filteredTransactions);
  renderSummary(summary);

  // Render expense chart
  renderExpenseChart(filteredTransactions, getExpenseCategories());

  // Render budgets (using current month expenses)
  const now = new Date();
  const currentMonthExpenses = getAllTransactions().filter((t) => {
    if (t.type !== "expense" || !t.createdAt) return false;
    const date = t.createdAt.toDate();
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  });
  renderBudgetSection(getExpenseCategories(), currentMonthExpenses);

  // Update category lists
  if (currentUserId) {
    renderCategoryLists(db, currentUserId);
  }
}
