import { showToast } from './ui.js';

// State
let userBudgets = {};
let unsubscribeFromBudgets = null;

// Load budgets from database
export function loadBudgets(db, userId, onUpdate) {
  const budgetDocRef = db
    .collection("users")
    .doc(userId)
    .collection("orcamentos")
    .doc("mensal");

  unsubscribeFromBudgets = budgetDocRef.onSnapshot((doc) => {
    userBudgets = doc.exists ? doc.data() : {};
    if (onUpdate) onUpdate();
  });
}

// Unsubscribe from budgets listener
export function unsubscribeFromBudgetsListener() {
  if (unsubscribeFromBudgets) unsubscribeFromBudgets();
  userBudgets = {};
}

// Get user budgets
export function getUserBudgets() {
  return userBudgets;
}

// Save budgets to database
export async function saveBudgets(db, userId) {
  const budgetInputs = document.querySelectorAll(".budget-input");
  const newBudgets = {};
  
  budgetInputs.forEach((input) => {
    const category = input.dataset.category;
    const amount = parseFloat(input.value);
    if (category && !isNaN(amount) && amount >= 0) {
      newBudgets[category] = amount;
    }
  });

  try {
    await db
      .collection("users")
      .doc(userId)
      .collection("orcamentos")
      .doc("mensal")
      .set(newBudgets, { merge: true });
    showToast("Orçamentos salvos com sucesso!", "success");
  } catch (error) {
    console.error("Erro ao salvar orçamentos: ", error);
    showToast("Não foi possível salvar os orçamentos.", "error");
  }
}

// Render budget section
export function renderBudgetSection(expenseCategories, currentMonthExpenses) {
  const container = document.getElementById("budget-section");
  if (!container) return;

  // Calculate totals by category for current month
  const categoryTotals = {};
  currentMonthExpenses.forEach((expense) => {
    const cat = expense.category || "Outros";
    categoryTotals[cat] = (categoryTotals[cat] || 0) + parseFloat(expense.amount);
  });

  container.innerHTML = "";

  expenseCategories.forEach((category) => {
    const spent = categoryTotals[category] || 0;
    const budget = userBudgets[category] || 0;
    const percentage = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
    const isOverBudget = budget > 0 && spent > budget;

    const item = document.createElement("div");
    item.className = "budget-item";
    item.innerHTML = `
      <div class="budget-info">
        <span class="budget-category">${category}</span>
        <div class="budget-input-group">
          <span>Meta: R$</span>
          <input type="number" class="budget-input" data-category="${category}" value="${budget}" min="0" step="0.01" placeholder="0.00">
        </div>
        <span class="budget-progress-text ${isOverBudget ? 'over-budget' : ''}">
          Gasto: R$ ${spent.toFixed(2)} ${budget > 0 ? `(${percentage.toFixed(0)}%)` : ""}
        </span>
      </div>
      <div class="budget-progress-bar">
        <div class="budget-progress-fill ${isOverBudget ? 'over-budget' : ''}" style="width: ${percentage}%"></div>
      </div>
    `;
    container.appendChild(item);
  });
}

// Calculate summary for a period
export function calculateSummary(transactions) {
  let income = 0;
  let expenses = 0;

  transactions.forEach((t) => {
    if (t.type === "income") {
      income += parseFloat(t.amount);
    } else {
      expenses += parseFloat(t.amount);
    }
  });

  return {
    income,
    expenses,
    balance: income - expenses
  };
}

// Render summary
export function renderSummary(summary) {
  const incomeEl = document.getElementById("monthly-income");
  const expensesEl = document.getElementById("monthly-expenses");
  const balanceEl = document.getElementById("monthly-balance");

  if (incomeEl) incomeEl.textContent = `R$ ${summary.income.toFixed(2)}`;
  if (expensesEl) expensesEl.textContent = `R$ ${summary.expenses.toFixed(2)}`;
  if (balanceEl) {
    balanceEl.textContent = `R$ ${summary.balance.toFixed(2)}`;
    balanceEl.style.color = summary.balance >= 0 ? "var(--cor-sucesso)" : "var(--cor-erro)";
  }
}
