import { showToast } from './ui.js';

// State
let customExpenseCategories = [];
let customIncomeCategories = [];
let unsubscribeFromCategories = null;

const defaultExpenseCategories = [
  "Alimentação", "Transporte", "Moradia", "Saúde", "Lazer",
  "Educação", "Vestuário", "Contas", "Outros"
];

const defaultIncomeCategories = [
  "Salário", "Freelance", "Investimentos", "Presente", "Outros"
];

// Get all expense categories
export function getExpenseCategories() {
  return [...new Set([...defaultExpenseCategories, ...customExpenseCategories])];
}

// Get all income categories
export function getIncomeCategories() {
  return [...new Set([...defaultIncomeCategories, ...customIncomeCategories])];
}

// Load categories from database
export function loadCategories(db, userId, onUpdate) {
  const categoriesDocRef = db
    .collection("users")
    .doc(userId)
    .collection("config")
    .doc("categories");

  unsubscribeFromCategories = categoriesDocRef.onSnapshot((doc) => {
    if (doc.exists) {
      const data = doc.data();
      customExpenseCategories = data.expenses || [];
      customIncomeCategories = data.incomes || [];
    } else {
      customExpenseCategories = [];
      customIncomeCategories = [];
    }
    if (onUpdate) onUpdate();
  });
}

// Unsubscribe from categories listener
export function unsubscribeFromCategoriesListener() {
  if (unsubscribeFromCategories) unsubscribeFromCategories();
  customExpenseCategories = [];
  customIncomeCategories = [];
}

// Save categories to database
export async function saveCategoriesToDB(db, userId) {
  try {
    await db
      .collection("users")
      .doc(userId)
      .collection("config")
      .doc("categories")
      .set({
        expenses: customExpenseCategories,
        incomes: customIncomeCategories,
      });
  } catch (error) {
    console.error("Erro ao salvar categorias:", error);
    showToast("Não foi possível salvar as categorias.", "error");
  }
}

// Add expense category
export function addExpenseCategory(category, db, userId) {
  const newCategory = category.trim();
  const allCategories = getExpenseCategories();
  
  if (!newCategory) {
    showToast("O nome da categoria não pode estar vazio.", "warning");
    return false;
  }
  
  if (allCategories.includes(newCategory)) {
    showToast("Esta categoria já existe.", "warning");
    return false;
  }
  
  customExpenseCategories.push(newCategory);
  saveCategoriesToDB(db, userId);
  showToast("Categoria adicionada com sucesso!", "success");
  return true;
}

// Add income category
export function addIncomeCategory(category, db, userId) {
  const newCategory = category.trim();
  const allCategories = getIncomeCategories();
  
  if (!newCategory) {
    showToast("O nome da categoria não pode estar vazio.", "warning");
    return false;
  }
  
  if (allCategories.includes(newCategory)) {
    showToast("Esta categoria já existe.", "warning");
    return false;
  }
  
  customIncomeCategories.push(newCategory);
  saveCategoriesToDB(db, userId);
  showToast("Categoria adicionada com sucesso!", "success");
  return true;
}

// Delete expense category
export function deleteExpenseCategory(category, db, userId) {
  customExpenseCategories = customExpenseCategories.filter((cat) => cat !== category);
  saveCategoriesToDB(db, userId);
  showToast("Categoria removida.", "success");
}

// Delete income category
export function deleteIncomeCategory(category, db, userId) {
  customIncomeCategories = customIncomeCategories.filter((cat) => cat !== category);
  saveCategoriesToDB(db, userId);
  showToast("Categoria removida.", "success");
}

// Populate category select elements
export function populateCategorySelects() {
  const expenseSelect = document.getElementById("expense-category");
  const incomeSelect = document.getElementById("income-category");

  if (expenseSelect) {
    const currentValue = expenseSelect.value;
    expenseSelect.innerHTML = '<option value="" disabled selected>Selecione</option>';
    getExpenseCategories().forEach((cat) => {
      expenseSelect.innerHTML += `<option value="${cat}">${cat}</option>`;
    });
    if (currentValue) expenseSelect.value = currentValue;
  }

  if (incomeSelect) {
    const currentValue = incomeSelect.value;
    incomeSelect.innerHTML = '<option value="" disabled selected>Selecione</option>';
    getIncomeCategories().forEach((cat) => {
      incomeSelect.innerHTML += `<option value="${cat}">${cat}</option>`;
    });
    if (currentValue) incomeSelect.value = currentValue;
  }
}

// Render category lists in the categories view
export function renderCategoryLists(db, userId, isDefault) {
  const expenseList = document.getElementById("expense-category-list");
  const incomeList = document.getElementById("income-category-list");

  if (expenseList) {
    expenseList.innerHTML = "";
    getExpenseCategories().forEach((cat) => {
      const isDefaultCat = defaultExpenseCategories.includes(cat);
      const li = document.createElement("li");
      li.className = "category-list-item";
      li.innerHTML = `
        <span>${cat}</span>
        ${!isDefaultCat ? `<button class="delete-category-btn" data-category="${cat}" data-type="expense" title="Excluir">&times;</button>` : ""}
      `;
      expenseList.appendChild(li);
    });
  }

  if (incomeList) {
    incomeList.innerHTML = "";
    getIncomeCategories().forEach((cat) => {
      const isDefaultCat = defaultIncomeCategories.includes(cat);
      const li = document.createElement("li");
      li.className = "category-list-item";
      li.innerHTML = `
        <span>${cat}</span>
        ${!isDefaultCat ? `<button class="delete-category-btn" data-category="${cat}" data-type="income" title="Excluir">&times;</button>` : ""}
      `;
      incomeList.appendChild(li);
    });
  }

  // Add delete event listeners
  document.querySelectorAll(".delete-category-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const category = btn.dataset.category;
      const type = btn.dataset.type;
      if (type === "expense") {
        deleteExpenseCategory(category, db, userId);
      } else {
        deleteIncomeCategory(category, db, userId);
      }
    });
  });
}
