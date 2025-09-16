document.addEventListener("DOMContentLoaded", () => {
  
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }
  
  const db = firebase.firestore();
  
  const expenseForm = document.getElementById("expense-form");
  const descriptionInput = document.getElementById("description");
  const categoryInput = document.getElementById("category");
  const amountInput = document.getElementById("amount");
  const expenseList = document.getElementById("expense-list");
  
  const totalAmountSpan = document.getElementById("total-amount");
  const dailyTotalSpan = document.getElementById("daily-total");
  const monthlyTotalSpan = document.getElementById("monthly-total");

  const chartCanvas = document.getElementById("expense-chart").getContext('2d');
  let expenseChart; 

  function renderOrUpdateChart(categoryData) {
    if (expenseChart) {
      expenseChart.destroy();
    }

    expenseChart = new Chart(chartCanvas, {
      type: 'pie', 
      data: {
        labels: Object.keys(categoryData), 
        datasets: [{
          label: 'Gastos por Categoria',
          data: Object.values(categoryData), 
          backgroundColor: [ 
            '#FF6384',
            '#36A2EB',
            '#FFCE56',
            '#4BC0C0',
            '#9966FF',
            '#FF9F40'
          ],
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'top',
          },
          title: {
            display: true,
            text: 'Distribuição de Gastos por Categoria'
          }
        }
      }
    });
  }

  function renderExpensesAndMetrics(docs) {
    expenseList.innerHTML = "";
    
    let totalGeral = 0;
    let totalDiario = 0;
    let totalMensal = 0;
    const categoryTotals = {}; 

    const hoje = new Date();
    const inicioDoDia = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
    const inicioDoMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);

    docs.forEach((doc) => {
        const expense = doc.data();
        const expenseAmount = parseFloat(expense.amount);
        const expenseCategory = expense.category;

        const listItem = document.createElement("li");
        // --- ALTERAÇÃO AQUI: Adicionado o botão de exclusão com o ID do documento ---
        listItem.innerHTML = `
            <div class="expense-info">
              <span>${expense.description} <em>(${expenseCategory})</em></span>
              <span>R$ ${expenseAmount.toFixed(2)}</span>
            </div>
            <button class="delete-btn" data-id="${doc.id}">Excluir</button>
        `;
        expenseList.appendChild(listItem);

        totalGeral += expenseAmount;

        if (categoryTotals[expenseCategory]) {
          categoryTotals[expenseCategory] += expenseAmount;
        } else {
          categoryTotals[expenseCategory] = expenseAmount;
        }

        if (expense.createdAt) {
            const expenseDate = expense.createdAt.toDate();
            if (expenseDate >= inicioDoDia) {
                totalDiario += expenseAmount;
            }
            if (expenseDate >= inicioDoMes) {
                totalMensal += expenseAmount;
            }
        }
    });

    totalAmountSpan.textContent = totalGeral.toFixed(2);
    dailyTotalSpan.textContent = totalDiario.toFixed(2);
    monthlyTotalSpan.textContent = totalMensal.toFixed(2);

    renderOrUpdateChart(categoryTotals);
  }

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

  // --- NOVA FUNÇÃO: Para excluir um gasto do banco de dados ---
  async function deleteExpenseFromDB(id) {
    if (confirm("Tem certeza que deseja excluir este gasto?")) {
        try {
            await db.collection("gastos").doc(id).delete();
            console.log("Gasto excluído com sucesso!");
        } catch (error) {
            console.error("Erro ao excluir gasto: ", error);
            alert("Não foi possível excluir o gasto.");
        }
    }
  }

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

  // --- NOVO EVENT LISTENER: Para capturar cliques nos botões de exclusão ---
  expenseList.addEventListener("click", (event) => {
    if (event.target.classList.contains("delete-btn")) {
        const id = event.target.getAttribute("data-id");
        deleteExpenseFromDB(id);
    }
  });

  db.collection("gastos")
    .orderBy("createdAt", "desc")
    .onSnapshot((snapshot) => {
      renderExpensesAndMetrics(snapshot.docs);
    }, (error) => {
      console.error("Erro ao carregar gastos: ", error);
    });
});