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

  // Info do Usuário
  const userInfo = document.getElementById("user-info");
  const userEmailSpan = document.getElementById("user-email");
  const userAvatar = document.getElementById("user-avatar");

  // Abas e Formulários
  const tabs = document.querySelectorAll(".tab-btn");
  const formContainers = document.querySelectorAll(".form-container");
  
  // Formulário de Despesas
  const expenseForm = document.getElementById("expense-form");
  const expenseDescriptionInput = document.getElementById("expense-description");
  const expenseCategoryInput = document.getElementById("expense-category");
  const expenseAmountInput = document.getElementById("expense-amount");

  // Formulário de Receitas
  const incomeForm = document.getElementById("income-form");
  const incomeDescriptionInput = document.getElementById("income-description");
  const incomeCategoryInput = document.getElementById("income-category");
  const incomeAmountInput = document.getElementById("income-amount");
  
  // Listas e Métricas
  const transactionList = document.getElementById("transaction-list");
  const monthlyIncomeSpan = document.getElementById("monthly-income");
  const monthlyExpensesSpan = document.getElementById("monthly-expenses");
  const monthlyBalanceSpan = document.getElementById("monthly-balance");
  const chartCanvas = document.getElementById("expense-chart").getContext("2d");

  // --- Estado do App --- //
  let expenseChart;
  let pendingCredential;
  let allTransactions = [];
  let unsubscribeFromExpenses;
  let unsubscribeFromIncomes;

  // --- Lógica de Autenticação (sem grandes alterações) --- //
  showRegisterLink.addEventListener("click", (e) => {
    e.preventDefault();
    loginView.style.display = "none";
    registerView.style.display = "block";
  });

  showLoginLink.addEventListener("click", (e) => {
    e.preventDefault();
    registerView.style.display = "none";
    loginView.style.display = "block";
  });
  
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
    auth.signInWithEmailAndPassword(email, password).catch((error) => {
      alert(`Erro ao fazer login: ${error.message}`);
    });
  });

  registerBtn.addEventListener("click", () => {
    const email = registerEmailInput.value;
    const password = registerPasswordInput.value;
    if (!email || !password) return alert("Por favor, preencha e-mail e senha.");
    auth.createUserWithEmailAndPassword(email, password).catch((error) => {
      alert(`Erro ao registrar: ${error.message}`);
    });
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
      loadUserTransactions(user.uid);
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
    allTransactions = [];
    renderAll();
  }

  // Lógica das Abas
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(item => item.classList.remove('active'));
      formContainers.forEach(container => container.classList.remove('active'));
      
      tab.classList.add('active');
      document.getElementById(tab.dataset.tab).classList.add('active');
    });
  });

  // --- Funções do Firestore --- //
  function loadUserTransactions(userId) {
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
  }

  function updateTransactions(type, data) {
    // Remove transações antigas do mesmo tipo e adiciona as novas
    allTransactions = allTransactions.filter(t => t.type !== type).concat(data);
    renderAll();
  }
  
  async function addTransactionToDB(type, data, userId) {
    const collectionName = type === 'expense' ? 'gastos' : 'receitas';
    try {
      await db.collection("users").doc(userId).collection(collectionName).add({
        ...data,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        ownerId: userId,
      });
    } catch (error) {
      console.error(`Erro ao adicionar ${type}: `, error);
      alert(`Não foi possível salvar a transação.`);
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
        console.error(`Erro ao excluir ${type}: `, error);
        alert("Não foi possível excluir a transação.");
      }
    }
  }

  // --- Lógica de Renderização e Cálculos --- //
  function renderAll() {
    // Ordena todas as transações pela data de criação
    allTransactions.sort((a, b) => {
        const dateA = a.createdAt ? a.createdAt.toDate() : new Date();
        const dateB = b.createdAt ? b.createdAt.toDate() : new Date();
        return dateB - dateA;
    });

    transactionList.innerHTML = "";
    allTransactions.forEach(t => {
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

    calculateAndRenderMetrics();
  }

  function calculateAndRenderMetrics() {
    const hoje = new Date();
    const inicioDoMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);

    let monthlyExpenses = 0;
    let monthlyIncome = 0;
    const expenseCategoryTotals = {};
    
    allTransactions.forEach(t => {
        const transactionDate = t.createdAt ? t.createdAt.toDate() : null;
        if (transactionDate && transactionDate >= inicioDoMes) {
            if (t.type === 'expense') {
                monthlyExpenses += parseFloat(t.amount);
                expenseCategoryTotals[t.category] = (expenseCategoryTotals[t.category] || 0) + parseFloat(t.amount);
            } else if (t.type === 'income') {
                monthlyIncome += parseFloat(t.amount);
            }
        }
    });

    const monthlyBalance = monthlyIncome - monthlyExpenses;
    
    monthlyIncomeSpan.textContent = `R$ ${monthlyIncome.toFixed(2)}`;
    monthlyExpensesSpan.textContent = `R$ ${monthlyExpenses.toFixed(2)}`;
    monthlyBalanceSpan.textContent = `R$ ${monthlyBalance.toFixed(2)}`;
    
    monthlyBalanceSpan.className = monthlyBalance >= 0 ? 'positive' : 'negative';
    
    renderOrUpdateChart(expenseCategoryTotals);
  }

  const centerTextPlugin = {
    id: 'centerText',
    afterDraw: (chart) => {
      if (chart.data.datasets[0].data.length === 0) return;
      const ctx = chart.ctx;
      const { width, height } = chart.chartArea;
      const centerX = chart.chartArea.left + width / 2;
      const centerY = chart.chartArea.top + height / 2;
      ctx.font = 'bold 20px Inter';
      ctx.fillStyle = '#1E293B';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const total = chart.data.datasets[0].data.reduce((sum, value) => sum + value, 0);
      ctx.fillText(`R$ ${total.toFixed(2)}`, centerX, centerY);
    }
  };

  function renderOrUpdateChart(categoryData) {
    if (expenseChart) expenseChart.destroy();
    
    expenseChart = new Chart(chartCanvas, {
      type: 'doughnut', 
      data: {
        labels: Object.keys(categoryData),
        datasets: [{
          label: "Gastos por Categoria",
          data: Object.values(categoryData),
          backgroundColor: ["#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", "#9966FF", "#FF9F40"],
          borderWidth: 0, 
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '70%', 
        plugins: {
          legend: { position: 'bottom' },
        },
      },
      plugins: [centerTextPlugin]
    });
  }

  // --- Event Listeners dos Formulários --- //
  expenseForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const user = auth.currentUser;
    if (!user) return;
    const data = {
        description: expenseDescriptionInput.value,
        category: expenseCategoryInput.value,
        amount: parseFloat(expenseAmountInput.value)
    };
    if (data.description.trim() && data.category && !isNaN(data.amount) && data.amount > 0) {
      addTransactionToDB('expense', data, user.uid);
      expenseForm.reset();
      expenseDescriptionInput.focus();
    } else {
      alert("Por favor, preencha todos os campos do gasto com valores válidos.");
    }
  });

  incomeForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const user = auth.currentUser;
    if (!user) return;
    const data = {
        description: incomeDescriptionInput.value,
        category: incomeCategoryInput.value,
        amount: parseFloat(incomeAmountInput.value)
    };
    if (data.description.trim() && data.category && !isNaN(data.amount) && data.amount > 0) {
      addTransactionToDB('income', data, user.uid);
      incomeForm.reset();
      incomeDescriptionInput.focus();
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
});
