// Arquivo: script.js (versão com métricas e gráfico)

document.addEventListener("DOMContentLoaded", () => {
  // Configuração do Firebase (sem alterações)
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }
  
  const db = firebase.firestore();
  
  // --- Seletores do HTML ---
  const expenseForm = document.getElementById("expense-form");
  const descriptionInput = document.getElementById("description");
  const categoryInput = document.getElementById("category");
  const amountInput = document.getElementById("amount");
  const expenseList = document.getElementById("expense-list");
  
  // Seletores de métricas
  const totalAmountSpan = document.getElementById("total-amount");
  const dailyTotalSpan = document.getElementById("daily-total");
  const monthlyTotalSpan = document.getElementById("monthly-total");

  // --- Lógica do Gráfico ---
  const chartCanvas = document.getElementById("expense-chart").getContext('2d');
  let expenseChart; // Variável para armazenar a instância do gráfico

  // Função para criar ou atualizar o gráfico de pizza
  function renderOrUpdateChart(categoryData) {
    // Destrói o gráfico anterior se ele existir (para evitar sobreposição)
    if (expenseChart) {
      expenseChart.destroy();
    }

    expenseChart = new Chart(chartCanvas, {
      type: 'pie', // Tipo do gráfico
      data: {
        labels: Object.keys(categoryData), // Nomes das categorias (Alimentação, Transporte, etc.)
        datasets: [{
          label: 'Gastos por Categoria',
          data: Object.values(categoryData), // Valores de cada categoria
          backgroundColor: [ // Cores para cada fatia
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

  // Função para renderizar gastos, métricas E O GRÁFICO
  function renderExpensesAndMetrics(docs) {
    expenseList.innerHTML = "";
    
    // Variáveis para cálculos
    let totalGeral = 0;
    let totalDiario = 0;
    let totalMensal = 0;
    const categoryTotals = {}; // Objeto para agrupar totais por categoria

    // Datas de referência
    const hoje = new Date();
    const inicioDoDia = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
    const inicioDoMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);

    docs.forEach((doc) => {
        const expense = doc.data();
        const expenseAmount = parseFloat(expense.amount);
        const expenseCategory = expense.category;

        // 1. Renderiza o item na lista
        const listItem = document.createElement("li");
        listItem.innerHTML = `
            <span>${expense.description} <em>(${expenseCategory})</em></span>
            <span>R$ ${expenseAmount.toFixed(2)}</span>
        `;
        expenseList.appendChild(listItem);

        // 2. Soma para o total geral
        totalGeral += expenseAmount;

        // 3. Agrupa os valores por categoria para o gráfico
        if (categoryTotals[expenseCategory]) {
          categoryTotals[expenseCategory] += expenseAmount;
        } else {
          categoryTotals[expenseCategory] = expenseAmount;
        }

        // 4. Calcula métricas diárias e mensais
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

    // 5. Atualiza os valores no HTML
    totalAmountSpan.textContent = totalGeral.toFixed(2);
    dailyTotalSpan.textContent = totalDiario.toFixed(2);
    monthlyTotalSpan.textContent = totalMensal.toFixed(2);

    // 6. Renderiza ou atualiza o gráfico
    renderOrUpdateChart(categoryTotals);
  }

  // Função para adicionar gasto no Firestore (sem alterações)
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

  // Event listener para o formulário (sem alterações)
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

  // Listener do Firestore (sem alterações)
  db.collection("gastos")
    .orderBy("createdAt", "desc")
    .onSnapshot((snapshot) => {
      renderExpensesAndMetrics(snapshot.docs);
    }, (error) => {
      console.error("Erro ao carregar gastos: ", error);
    });
});