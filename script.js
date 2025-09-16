// Arquivo: script.js (versão modificada)

document.addEventListener("DOMContentLoaded", () => {
  // O objeto firebaseConfig foi REMOVIDO DAQUI.
  // Ele será carregado pelo arquivo config.js

  // Inicializa o Firebase
  // A variável 'firebaseConfig' já existe porque o config.js foi carregado primeiro
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }
  
  // Obtém uma referência ao serviço do Firestore
  const db = firebase.firestore();
  // --- FIM DA CONFIGURAÇÃO DO FIREBASE ---

  // Seleciona os elementos do HTML
  const expenseForm = document.getElementById("expense-form");
  const descriptionInput = document.getElementById("description");
  const categoryInput = document.getElementById("category");
  const amountInput = document.getElementById("amount");
  const expenseList = document.getElementById("expense-list");
  const totalAmountSpan = document.getElementById("total-amount");

  // Função para renderizar os gastos na tela
  function renderExpenses(docs) {
    expenseList.innerHTML = "";
    let total = 0;

    docs.forEach((doc) => {
        const expense = doc.data();
        const listItem = document.createElement("li");
        
        listItem.innerHTML = `
            <span>${expense.description} <em>(${expense.category})</em></span>
            <span>R$ ${parseFloat(expense.amount).toFixed(2)}</span>
        `;
        
        expenseList.appendChild(listItem);
        total += parseFloat(expense.amount);
    });

    totalAmountSpan.textContent = total.toFixed(2);
  }

  // Função para adicionar um novo gasto NO FIRESTORE
  async function addExpenseToDB(description, category, amount) {
    try {
      await db.collection("gastos").add({
        description: description,
        category: category,
        amount: amount,
        createdAt: firebase.firestore.FieldValue.serverTimestamp() 
      });
      console.log("Gasto adicionado com sucesso!");
    } catch (error) {
      console.error("Erro ao adicionar gasto: ", error);
      alert("Não foi possível salvar o gasto.");
    }
  }

  // Event listener para o formulário
  expenseForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const description = descriptionInput.value;
    const category = categoryInput.value;
    const amount = parseFloat(amountInput.value);

    if (description.trim() !== "" && category !== "" && !isNaN(amount) && amount > 0) {
      addExpenseToDB(description, category, amount);
      expenseForm.reset();
      descriptionInput.focus();
    } else {
      alert("Por favor, preencha todos os campos com valores válidos.");
    }
  });

  // Escuta por mudanças na coleção 'gastos' em tempo real
  db.collection("gastos")
    .orderBy("createdAt", "desc")
    .onSnapshot((snapshot) => {
      renderExpenses(snapshot.docs);
    }, (error) => {
      console.error("Erro ao carregar gastos: ", error);
    });
});