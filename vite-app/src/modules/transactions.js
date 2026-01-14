import { showToast } from './ui.js';

// State
let allTransactions = [];
let unsubscribeFromExpenses = null;
let unsubscribeFromIncomes = null;

// Get filtered transactions based on period
export function getFilteredTransactions(periodFilter, startDate, endDate) {
  const now = new Date();
  let filterStart, filterEnd;

  switch (periodFilter) {
    case "this-month":
      filterStart = new Date(now.getFullYear(), now.getMonth(), 1);
      filterEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      break;
    case "last-7-days":
      filterStart = new Date(now);
      filterStart.setDate(now.getDate() - 7);
      filterEnd = now;
      break;
    case "last-month":
      filterStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      filterEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
      break;
    case "custom":
      filterStart = startDate ? new Date(startDate + "T00:00:00") : null;
      filterEnd = endDate ? new Date(endDate + "T23:59:59") : null;
      break;
    case "all-time":
    default:
      return allTransactions;
  }

  return allTransactions.filter((t) => {
    if (!t.createdAt) return false;
    const date = t.createdAt.toDate();
    return (!filterStart || date >= filterStart) && (!filterEnd || date <= filterEnd);
  });
}

// Update transactions in state
export function updateTransactions(type, transactions, onUpdate) {
  allTransactions = allTransactions.filter((t) => t.type !== type);
  allTransactions = [...allTransactions, ...transactions];
  allTransactions.sort((a, b) => {
    const dateA = a.createdAt ? a.createdAt.toDate() : new Date();
    const dateB = b.createdAt ? b.createdAt.toDate() : new Date();
    return dateB - dateA;
  });
  if (onUpdate) onUpdate();
}

// Add transaction to database
export async function addTransactionToDB(db, type, data, userId) {
  const collectionName = type === "expense" ? "gastos" : "receitas";
  try {
    await db
      .collection("users")
      .doc(userId)
      .collection(collectionName)
      .add({
        ...data,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        ownerId: userId,
      });
    showToast(`${type === "expense" ? "Gasto" : "Receita"} adicionado com sucesso!`, "success");
  } catch (error) {
    console.error(`Erro ao adicionar ${type}: `, error);
    showToast(`Não foi possível salvar a transação.`, "error");
  }
}

// Update transaction in database
export async function updateTransactionInDB(db, auth, id, type, data) {
  const user = auth.currentUser;
  if (!user) return;
  const collectionName = type === "expense" ? "gastos" : "receitas";
  try {
    await db
      .collection("users")
      .doc(user.uid)
      .collection(collectionName)
      .doc(id)
      .update(data);
    showToast("Transação atualizada com sucesso!", "success");
  } catch (error) {
    console.error(`Erro ao atualizar ${type}: `, error);
    showToast("Não foi possível salvar as alterações.", "error");
  }
}

// Delete transaction from database
export async function deleteTransactionFromDB(db, auth, id, type) {
  const user = auth.currentUser;
  if (!user) return;
  const collectionName = type === "expense" ? "gastos" : "receitas";
  if (confirm("Tem certeza que deseja excluir esta transação?")) {
    try {
      await db
        .collection("users")
        .doc(user.uid)
        .collection(collectionName)
        .doc(id)
        .delete();
      showToast("Transação excluída com sucesso!", "success");
    } catch (error) {
      console.error(`Erro ao excluir ${type}: `, error);
      showToast("Não foi possível excluir a transação.", "error");
    }
  }
}

// Load user transactions with real-time updates
export function loadTransactions(db, userId, onUpdate) {
  const expensesQuery = db
    .collection("users")
    .doc(userId)
    .collection("gastos")
    .orderBy("createdAt", "desc");
  
  const incomesQuery = db
    .collection("users")
    .doc(userId)
    .collection("receitas")
    .orderBy("createdAt", "desc");

  unsubscribeFromExpenses = expensesQuery.onSnapshot((snapshot) => {
    const expenses = snapshot.docs.map((doc) => ({
      id: doc.id,
      type: "expense",
      ...doc.data(),
    }));
    updateTransactions("expense", expenses, onUpdate);
  });

  unsubscribeFromIncomes = incomesQuery.onSnapshot((snapshot) => {
    const incomes = snapshot.docs.map((doc) => ({
      id: doc.id,
      type: "income",
      ...doc.data(),
    }));
    updateTransactions("income", incomes, onUpdate);
  });
}

// Unsubscribe from transaction listeners
export function unsubscribeFromTransactions() {
  if (unsubscribeFromExpenses) unsubscribeFromExpenses();
  if (unsubscribeFromIncomes) unsubscribeFromIncomes();
  allTransactions = [];
}

// Get all transactions
export function getAllTransactions() {
  return allTransactions;
}

// Render transaction list
export function renderTransactionList(transactions, container, onEdit, onDelete) {
  if (!container) return;
  
  container.innerHTML = "";
  
  if (transactions.length === 0) {
    container.innerHTML = "<p style='text-align:center; color: var(--cor-texto-suave);'>Nenhuma transação encontrada para este período.</p>";
    return;
  }

  transactions.forEach((t) => {
    const amount = parseFloat(t.amount).toFixed(2);
    const sign = t.type === "expense" ? "-" : "+";
    const listItem = document.createElement("li");
    listItem.className = `transaction-item ${t.type}`;
    listItem.innerHTML = `
      <div class="transaction-info">
        <span class="description">${t.description}</span>
        <span class="category">${t.category}</span>
      </div>
      <div class="amount-container">
        <span class="amount">${sign} R$ ${amount}</span>
      </div>
      <div class="actions">
        <button class="edit-btn" data-id="${t.id}" data-type="${t.type}" title="Editar">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
        </button>
        <button class="delete-btn" data-id="${t.id}" data-type="${t.type}" title="Excluir">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
        </button>
      </div>
    `;
    container.appendChild(listItem);
  });

  // Add event listeners
  container.querySelectorAll(".edit-btn").forEach(btn => {
    btn.addEventListener("click", () => onEdit(btn.dataset.id, btn.dataset.type));
  });
  
  container.querySelectorAll(".delete-btn").forEach(btn => {
    btn.addEventListener("click", () => onDelete(btn.dataset.id, btn.dataset.type));
  });
}
