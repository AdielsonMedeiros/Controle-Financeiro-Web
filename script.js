document.addEventListener("DOMContentLoaded", () => {
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }

  const db = firebase.firestore();
  const auth = firebase.auth();

  // --- Seletores de Elementos --- //
  const authContainer = document.getElementById("auth-container");
  const appContent = document.getElementById("app-content");

  // Autenticação
  const loginView = document.getElementById("login-view");
  const registerView = document.getElementById("register-view");
  const showRegisterLink = document.getElementById("show-register");
  const showLoginLink = document.getElementById("show-login");
  const loginEmailInput = document.getElementById("login-email");
  const loginPasswordInput = document.getElementById("login-password");
  const loginEmailBtn = document.getElementById("login-email-btn");
  const registerEmailInput = document.getElementById("register-email");
  const registerPasswordInput = document.getElementById("register-password");
  const registerBtn = document.getElementById("register-btn");
  const googleLoginBtn = document.getElementById("login-google-icon-btn");
  const githubLoginBtn = document.getElementById("login-github-icon-btn");
  const logoutBtn = document.getElementById("logout-btn");

  // UI do Usuário
  const userInfo = document.getElementById("user-info");
  const userEmailSpan = document.getElementById("user-email");
  const userAvatar = document.getElementById("user-avatar");

  // Navegação e Abas
  const tabs = document.querySelectorAll(".tab-btn");
  const formContainers = document.querySelectorAll(".form-container");
  const showMainViewBtn = document.getElementById("show-main-view-btn");
  const showReportsViewBtn = document.getElementById("show-reports-view-btn");
  const mainView = document.getElementById("main-view");
  const reportsView = document.getElementById("reports-view");

  // Formulários
  const expenseForm = document.getElementById("expense-form");
  const expenseDescriptionInput = document.getElementById("expense-description");
  const expenseCategoryInput = document.getElementById("expense-category");
  const expenseAmountInput = document.getElementById("expense-amount");
  const incomeForm = document.getElementById("income-form");
  const incomeDescriptionInput = document.getElementById("income-description");
  const incomeCategoryInput = document.getElementById("income-category");
  const incomeAmountInput = document.getElementById("income-amount");
  
  // Exibição de Dados
  const transactionList = document.getElementById("transaction-list");
  const monthlyIncomeSpan = document.getElementById("monthly-income");
  const monthlyExpensesSpan = document.getElementById("monthly-expenses");
  const monthlyBalanceSpan = document.getElementById("monthly-balance");
  
  // Gráficos
  const chartCanvas = document.getElementById("expense-chart").getContext("2d");
  const monthlyEvolutionChartCanvas = document.getElementById("monthly-evolution-chart").getContext("2d");
  const categoryComparisonChartCanvas = document.getElementById("category-comparison-chart").getContext("2d");

  // Orçamentos
  const budgetSection = document.getElementById("budget-section");
  const saveBudgetsBtn = document.getElementById("save-budgets-btn");

  // Filtros
  const periodFilter = document.getElementById("period-filter");
  const customDateRange = document.getElementById("custom-date-range");
  const startDateInput = document.getElementById("start-date");
  const endDateInput = document.getElementById("end-date");

  // --- Variáveis de Estado --- //
  let expenseChart, monthlyEvolutionChart, categoryComparisonChart;
  let pendingCredential;
  let allTransactions = [];
  let userBudgets = {}; 
  let unsubscribeFromExpenses, unsubscribeFromIncomes, unsubscribeFromBudgets;

  // --- Funções de Autenticação --- //
  showRegisterLink.addEventListener("click", (e) => { e.preventDefault(); loginView.style.display = "none"; registerView.style.display = "block"; });
  showLoginLink.addEventListener("click", (e) => { e.preventDefault(); registerView.style.display = "none"; loginView.style.display = "block"; });
  
  function handleProviderLogin(provider) {
    auth.signInWithPopup(provider).catch((error) => {
      if (error.code === "auth/account-exists-with-different-credential") {
        pendingCredential = error.credential;
        auth.fetchSignInMethodsForEmail(error.email).then((methods) => {
          let providerName = methods.includes('password') ? 'E-mail e Senha' : methods[0];
          alert(`Você já tem uma conta com este e-mail usando: ${providerName}. Faça login com este método para vincular suas contas.`);
        });
      } else {
        console.error(`Erro no login com ${provider.providerId}: `, error);
        alert(`Erro ao fazer login: ${error.message}`);
      }
    });
  }

  googleLoginBtn.addEventListener("click", () => handleProviderLogin(new firebase.auth.GoogleAuthProvider()));
  githubLoginBtn.addEventListener("click", () => handleProviderLogin(new firebase.auth.GithubAuthProvider()));
  loginEmailBtn.addEventListener("click", () => {
    const email = loginEmailInput.value;
    const password = loginPasswordInput.value;
    if (!email || !password) return alert("Por favor, preencha e-mail e senha.");
    auth.signInWithEmailAndPassword(email, password).catch(error => alert(`Erro ao fazer login: ${error.message}`));
  });
  registerBtn.addEventListener("click", () => {
    const email = registerEmailInput.value;
    const password = registerPasswordInput.value;
    if (!email || !password) return alert("Por favor, preencha e-mail e senha.");
    auth.createUserWithEmailAndPassword(email, password).catch(error => alert(`Erro ao registrar: ${error.message}`));
  });
  logoutBtn.addEventListener("click", () => auth.signOut());

  auth.onAuthStateChanged((user) => {
    if (user) {
      if (pendingCredential) {
        user.linkWithCredential(pendingCredential).then(() => {
          alert("Sua conta foi vinculada com sucesso!");
          pendingCredential = null;
        }).catch((error) => {
          alert(`Não foi possível vincular a conta: ${error.message}`);
          pendingCredential = null;
        });
      }
      setupUIForLoggedInUser(user);
      loadUserData(user.uid); 
    } else {
      setupUIForLoggedOutUser();
    }
  });
  
  // --- Funções de UI --- //
  function setupUIForLoggedInUser(user) {
    authContainer.style.display = "none";
    appContent.style.display = "block";
    userInfo.style.display = "flex";
    userEmailSpan.textContent = user.email;
    userAvatar.src = user.photoURL || `https://ui-avatars.com/api/?name=${user.email}&background=random`;
  }
  
  function setupUIForLoggedOutUser() {
    authContainer.style.display = "block";
    appContent.style.display = "none";
    userInfo.style.display = "none";
   
    if (unsubscribeFromExpenses) unsubscribeFromExpenses();
    if (unsubscribeFromIncomes) unsubscribeFromIncomes();
    if (unsubscribeFromBudgets) unsubscribeFromBudgets(); 
    allTransactions = [];
    userBudgets = {};
    renderAll();
  }

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(item => item.classList.remove('active'));
      formContainers.forEach(container => container.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(tab.dataset.tab).classList.add('active');
    });
  });

  showMainViewBtn.addEventListener('click', () => {
      mainView.style.display = 'block';
      reportsView.style.display = 'none';
      showMainViewBtn.classList.add('active');
      showReportsViewBtn.classList.remove('active');
  });

  showReportsViewBtn.addEventListener('click', () => {
      mainView.style.display = 'none';
      reportsView.style.display = 'block';
      showMainViewBtn.classList.remove('active');
      showReportsViewBtn.classList.add('active');
      renderReports();
  });

  // --- Funções de Dados (Firebase) --- //
  function loadUserData(userId) {
    const expensesQuery = db.collection("users").doc(userId).collection("gastos").orderBy("createdAt", "desc");
    const incomesQuery = db.collection("users").doc(userId).collection("receitas").orderBy("createdAt", "desc");

    unsubscribeFromExpenses = expensesQuery.onSnapshot(snapshot => {
        const expenses = snapshot.docs.map(doc => ({ id: doc.id, type: 'expense', ...doc.data() }));
        updateTransactions('expense', expenses);
    });
    unsubscribeFromIncomes = incomesQuery.onSnapshot(snapshot => {
        const incomes = snapshot.docs.map(doc => ({ id: doc.id, type: 'income', ...doc.data() }));
        updateTransactions('income', incomes);
    });
  
    const budgetDocRef = db.collection("users").doc(userId).collection("orcamentos").doc("mensal");
    unsubscribeFromBudgets = budgetDocRef.onSnapshot(doc => {
        userBudgets = doc.exists ? doc.data() : {};
        renderAll(); 
    });
  }

  function updateTransactions(type, data) {
    allTransactions = allTransactions.filter(t => t.type !== type).concat(data);
    allTransactions.sort((a, b) => {
        const dateA = a.createdAt ? a.createdAt.toDate() : new Date();
        const dateB = b.createdAt ? b.createdAt.toDate() : new Date();
        return dateB - dateA;
    });
    renderAll();
  }
  
  async function addTransactionToDB(type, data, userId) {
    const collectionName = type === 'expense' ? 'gastos' : 'receitas';
    try {
      await db.collection("users").doc(userId).collection(collectionName).add({
        ...data, createdAt: firebase.firestore.FieldValue.serverTimestamp(), ownerId: userId,
      });
    } catch (error) {
      console.error(`Erro ao adicionar ${type}: `, error); alert(`Não foi possível salvar a transação.`);
    }
  }

  async function deleteTransactionFromDB(id, type) {
    const user = auth.currentUser;
    if (!user) return;
    const collectionName = type === 'expense' ? 'gastos' : 'receitas';
    if (confirm("Tem certeza que deseja excluir esta transação?")) {
      try {
        await db.collection("users").doc(user.uid).collection(collectionName).doc(id).delete();
      } catch (error) {
        console.error(`Erro ao excluir ${type}: `, error); alert("Não foi possível excluir a transação.");
      }
    }
  }
 
  async function saveUserBudgets() {
    const user = auth.currentUser; if (!user) return;
    const budgetInputs = document.querySelectorAll('.budget-input');
    const newBudgets = {};
    budgetInputs.forEach(input => {
      const category = input.dataset.category;
      const amount = parseFloat(input.value);
      if (category && !isNaN(amount) && amount >= 0) newBudgets[category] = amount;
    });
    try {
      await db.collection("users").doc(user.uid).collection("orcamentos").doc("mensal").set(newBudgets, { merge: true });
      alert("Orçamentos salvos com sucesso!");
    } catch (error) {
      console.error("Erro ao salvar orçamentos: ", error); alert("Não foi possível salvar os orçamentos.");
    }
  }

  // --- Funções de Renderização --- //
  function renderAll() {
    const filteredTransactions = getFilteredTransactions();

    transactionList.innerHTML = "";
    if (filteredTransactions.length === 0) {
        transactionList.innerHTML = "<p style='text-align:center; color: var(--cor-texto-suave);'>Nenhuma transação encontrada para este período.</p>";
    } else {
        filteredTransactions.forEach(t => {
          const amount = parseFloat(t.amount).toFixed(2);
          const sign = t.type === 'expense' ? '-' : '+';
          const listItem = document.createElement("li");
          listItem.className = `transaction-item ${t.type}`;
          listItem.innerHTML = `
            <div class="transaction-info">
                <span class="description">${t.description}</span>
                <span class="category">${t.category}</span>
            </div>
            <div class="amount">${sign} R$ ${amount}</div>
            <button class="delete-btn" data-id="${t.id}" data-type="${t.type}">Excluir</button>`;
          transactionList.appendChild(listItem);
        });
    }
    calculateAndRenderMetrics(filteredTransactions);
  }

  function calculateAndRenderMetrics(transactions) {
    let totalIncome = 0;
    let totalExpenses = 0;
    const expenseCategoryTotals = {};
    
    transactions.forEach(t => {
        if (t.type === 'expense') {
            totalExpenses += parseFloat(t.amount);
            expenseCategoryTotals[t.category] = (expenseCategoryTotals[t.category] || 0) + parseFloat(t.amount);
        } else if (t.type === 'income') {
            totalIncome += parseFloat(t.amount);
        }
    });

    const totalBalance = totalIncome - totalExpenses;
    
    monthlyIncomeSpan.textContent = `R$ ${totalIncome.toFixed(2)}`;
    monthlyExpensesSpan.textContent = `R$ ${totalExpenses.toFixed(2)}`;
    monthlyBalanceSpan.textContent = `R$ ${totalBalance.toFixed(2)}`;
    monthlyBalanceSpan.className = totalBalance >= 0 ? 'positive' : 'negative';
    
    renderOrUpdateDoughnutChart(expenseCategoryTotals);

    // O progresso do orçamento é sempre calculado com base nos gastos do mês atual
    const hoje = new Date();
    const inicioDoMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const expensesThisMonth = allTransactions.filter(t => t.type === 'expense' && t.createdAt && t.createdAt.toDate() >= inicioDoMes);
    const spentByCategoryThisMonth = {};
    expensesThisMonth.forEach(t => {
        spentByCategoryThisMonth[t.category] = (spentByCategoryThisMonth[t.category] || 0) + parseFloat(t.amount);
    });
    renderBudgetProgress(spentByCategoryThisMonth);
  }

  function renderBudgetProgress(spentByCategory) {
    budgetSection.innerHTML = '';
    const categories = [...expenseCategoryInput.options].map(opt => opt.value).filter(val => val);

    categories.forEach(category => {
      const budgetAmount = userBudgets[category] || 0;
      const spentAmount = spentByCategory[category] || 0;
      let progressPercent = budgetAmount > 0 ? (spentAmount / budgetAmount) * 100 : 0;
      const isOverBudget = spentAmount > budgetAmount && budgetAmount > 0;

      const item = document.createElement('div');
      item.className = 'budget-item';
      item.innerHTML = `
        <div class="budget-info">
          <span class="budget-category-label">${category}</span>
          <div class="progress-bar-container">
            <div class="progress-bar ${isOverBudget ? 'over-budget' : ''}" style="width: ${Math.min(progressPercent, 100)}%;"></div>
          </div>
          <span class="budget-progress-text ${isOverBudget ? 'over-budget-text' : ''}">
            R$ ${spentAmount.toFixed(2)} / R$ ${budgetAmount.toFixed(2)}
          </span>
        </div>
        <div class="budget-input-group">
          <input type="number" step="0.01" class="budget-input" data-category="${category}" value="${budgetAmount > 0 ? budgetAmount.toFixed(2) : ''}" placeholder="Definir Orçamento">
        </div>`;
      budgetSection.appendChild(item);
    });
  }

  // --- Funções de Filtros --- //
  periodFilter.addEventListener("change", () => {
    if (periodFilter.value === "custom") {
      customDateRange.style.display = "flex";
    } else {
      customDateRange.style.display = "none";
    }
    renderAll();
  });
  startDateInput.addEventListener("change", renderAll);
  endDateInput.addEventListener("change", renderAll);

  function getFilteredTransactions() {
    const now = new Date();
    let startDate, endDate = new Date(now);

    switch (periodFilter.value) {
      case "this-month":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate.setHours(23, 59, 59, 999);
        break;
      case "last-7-days":
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case "last-month":
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case "custom":
        startDate = startDateInput.value ? new Date(startDateInput.value + 'T00:00:00') : null;
        endDate = endDateInput.value ? new Date(endDateInput.value + 'T23:59:59') : null;
        break;
      case "all-time":
      default:
        return allTransactions;
    }

    if (!startDate || !endDate) return allTransactions;

    return allTransactions.filter(t => {
      const transactionDate = t.createdAt ? t.createdAt.toDate() : null;
      return transactionDate && transactionDate >= startDate && transactionDate <= endDate;
    });
  }
  
  // --- Funções de Gráficos --- //
  const centerTextPlugin = {
    id: 'centerText',
    afterDraw: (chart) => {
      if (chart.data.datasets[0].data.length === 0) return;
      const ctx = chart.ctx;
      const { width, height } = chart.chartArea;
      const centerX = chart.chartArea.left + width / 2;
      const centerY = chart.chartArea.top + height / 2;
      ctx.font = 'bold 20px Inter'; ctx.fillStyle = '#1E293B';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const total = chart.data.datasets[0].data.reduce((sum, value) => sum + value, 0);
      ctx.fillText(`R$ ${total.toFixed(2)}`, centerX, centerY);
    }
  };

  function renderOrUpdateDoughnutChart(categoryData) {
    if (expenseChart) expenseChart.destroy();
    expenseChart = new Chart(chartCanvas, {
      type: 'doughnut', 
      data: {
        labels: Object.keys(categoryData),
        datasets: [{
          label: "Gastos por Categoria", data: Object.values(categoryData),
          backgroundColor: ["#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", "#9966FF", "#FF9F40"],
          borderWidth: 0, 
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: '70%', 
        plugins: { legend: { position: 'bottom' } },
      },
      plugins: [centerTextPlugin]
    });
  }

  function renderReports() {
    renderMonthlyEvolutionChart();
    renderCategoryComparisonChart();
  }

  function renderMonthlyEvolutionChart() {
    const data = {
        labels: [],
        datasets: [
            { label: 'Receitas', data: [], backgroundColor: 'rgba(16, 185, 129, 0.7)', borderColor: '#10B981', borderWidth: 2, borderRadius: 5 },
            { label: 'Despesas', data: [], backgroundColor: 'rgba(239, 68, 68, 0.7)', borderColor: '#EF4444', borderWidth: 2, borderRadius: 5 }
        ]
    };
    const monthlyTotals = {};
    for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const monthName = d.toLocaleString('default', { month: 'short' });
        data.labels.push(monthName);
        monthlyTotals[monthKey] = { income: 0, expense: 0 };
    }

    allTransactions.forEach(t => {
        if (t.createdAt) {
            const date = t.createdAt.toDate();
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            if (monthlyTotals[monthKey]) {
                monthlyTotals[monthKey][t.type] += parseFloat(t.amount);
            }
        }
    });

    for (const key in monthlyTotals) {
        data.datasets[0].data.push(monthlyTotals[key].income);
        data.datasets[1].data.push(monthlyTotals[key].expense);
    }

    if(monthlyEvolutionChart) monthlyEvolutionChart.destroy();
    monthlyEvolutionChart = new Chart(monthlyEvolutionChartCanvas, {
        type: 'bar', data,
        options: {
            responsive: true, maintainAspectRatio: false,
            scales: { y: { beginAtZero: true, ticks: { callback: value => `R$ ${value}` } } }
        }
    });
  }

  function renderCategoryComparisonChart() {
    const expenseCategoryTotals = {};
    allTransactions.forEach(t => {
        if (t.type === 'expense') {
            expenseCategoryTotals[t.category] = (expenseCategoryTotals[t.category] || 0) + parseFloat(t.amount);
        }
    });

    const sortedCategories = Object.entries(expenseCategoryTotals).sort((a, b) => b[1] - a[1]);
    
    const data = {
        labels: sortedCategories.map(item => item[0]),
        datasets: [{
            label: 'Total Gasto',
            data: sortedCategories.map(item => item[1]),
            backgroundColor: ["#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", "#9966FF", "#FF9F40"],
        }]
    };
    
    if(categoryComparisonChart) categoryComparisonChart.destroy();
    categoryComparisonChart = new Chart(categoryComparisonChartCanvas, {
        type: 'bar', data,
        options: {
            indexAxis: 'y', // Gráfico de barras horizontais para melhor leitura
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { x: { ticks: { callback: value => `R$ ${value}` } } }
        }
    });
  }


  // --- Event Listeners dos Formulários e Ações --- //
  expenseForm.addEventListener("submit", (event) => {
    event.preventDefault(); const user = auth.currentUser; if (!user) return;
    const data = { description: expenseDescriptionInput.value, category: expenseCategoryInput.value, amount: parseFloat(expenseAmountInput.value) };
    if (data.description.trim() && data.category && !isNaN(data.amount) && data.amount > 0) {
      addTransactionToDB('expense', data, user.uid);
      expenseForm.reset(); expenseDescriptionInput.focus();
    } else {
      alert("Por favor, preencha todos os campos do gasto com valores válidos.");
    }
  });

  incomeForm.addEventListener("submit", (event) => {
    event.preventDefault(); const user = auth.currentUser; if (!user) return;
    const data = { description: incomeDescriptionInput.value, category: incomeCategoryInput.value, amount: parseFloat(incomeAmountInput.value) };
    if (data.description.trim() && data.category && !isNaN(data.amount) && data.amount > 0) {
      addTransactionToDB('income', data, user.uid);
      incomeForm.reset(); incomeDescriptionInput.focus();
    } else {
      alert("Por favor, preencha todos os campos da receita com valores válidos.");
    }
  });

  transactionList.addEventListener("click", (event) => {
    if (event.target.classList.contains("delete-btn")) {
      const id = event.target.getAttribute("data-id");
      const type = event.target.getAttribute("data-type");
      deleteTransactionFromDB(id, type);
    }
  });
 
  saveBudgetsBtn.addEventListener('click', saveUserBudgets);
});