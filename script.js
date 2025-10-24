document.addEventListener("DOMContentLoaded", () => {
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }

  const db = firebase.firestore();
  const auth = firebase.auth();

  // --- Seleção de Elementos DOM --- //
  const authContainer = document.getElementById("auth-container");
  const appContent = document.getElementById("app-content");

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

  const userInfo = document.getElementById("user-info");
  const userEmailSpan = document.getElementById("user-email");
  const userAvatar = document.getElementById("user-avatar");

  const tabs = document.querySelectorAll(".tab-btn");
  const formContainers = document.querySelectorAll(".form-container");


  const viewNavButtons = document.querySelectorAll(".view-tab-btn");
  const mainView = document.getElementById("main-view");
  const categoriesView = document.getElementById("categories-view");
  const reportsView = document.getElementById("reports-view");

  const expenseForm = document.getElementById("expense-form");
  const expenseDescriptionInput = document.getElementById(
    "expense-description"
  );
  const expenseCategoryInput = document.getElementById("expense-category");
  const expenseAmountInput = document.getElementById("expense-amount");
  const expenseEditIdInput = document.getElementById("expense-edit-id");
  const expenseSubmitBtn = document.getElementById("expense-submit-btn");
  const cancelExpenseEditBtn = document.getElementById(
    "cancel-expense-edit-btn"
  );

  const incomeForm = document.getElementById("income-form");
  const incomeDescriptionInput = document.getElementById("income-description");
  const incomeCategoryInput = document.getElementById("income-category");
  const incomeAmountInput = document.getElementById("income-amount");
  const incomeEditIdInput = document.getElementById("income-edit-id");
  const incomeSubmitBtn = document.getElementById("income-submit-btn");
  const cancelIncomeEditBtn = document.getElementById("cancel-income-edit-btn");


  const newExpenseCategoryInput = document.getElementById(
    "new-expense-category-input"
  );
  const addExpenseCategoryBtn = document.getElementById(
    "add-expense-category-btn"
  );
  const expenseCategoryList = document.getElementById("expense-category-list");
  const newIncomeCategoryInput = document.getElementById(
    "new-income-category-input"
  );
  const addIncomeCategoryBtn = document.getElementById(
    "add-income-category-btn"
  );
  const incomeCategoryList = document.getElementById("income-category-list");

  const transactionList = document.getElementById("transaction-list");
  const monthlyIncomeSpan = document.getElementById("monthly-income");
  const monthlyExpensesSpan = document.getElementById("monthly-expenses");
  const monthlyBalanceSpan = document.getElementById("monthly-balance");

  const chartCanvas = document.getElementById("expense-chart").getContext("2d");
  const monthlyEvolutionChartCanvas = document
    .getElementById("monthly-evolution-chart")
    .getContext("2d");
  const categoryComparisonChartCanvas = document
    .getElementById("category-comparison-chart")
    .getContext("2d");

  const budgetSection = document.getElementById("budget-section");
  const saveBudgetsBtn = document.getElementById("save-budgets-btn");

  const periodFilter = document.getElementById("period-filter");
  const customDateRange = document.getElementById("custom-date-range");
  const startDateInput = document.getElementById("start-date");
  const endDateInput = document.getElementById("end-date");

  const themeToggleBtn = document.getElementById("theme-toggle-btn");
  const moonIcon = document.getElementById("moon-icon");
  const sunIcon = document.getElementById("sun-icon");

  // Banner do App Mobile
  const mobileAppBanner = document.getElementById("mobile-app-banner");
  const closeBannerBtn = document.getElementById("close-app-banner");

  let expenseChart, monthlyEvolutionChart, categoryComparisonChart;
  let pendingCredential;
  let allTransactions = [];
  let userBudgets = {};

  // -- Variáveis de Categoria -- //
  const defaultExpenseCategories = [
    "Alimentação",
    "Transporte",
    "Lazer",
    "Moradia",
    "Saúde",
    "Outros",
  ];
  const defaultIncomeCategories = [
    "Salário",
    "Investimentos",
    "Freelance",
    "Presente",
    "Outros",
  ];
  let customExpenseCategories = [];
  let customIncomeCategories = [];

  let unsubscribeFromExpenses,
    unsubscribeFromIncomes,
    unsubscribeFromBudgets,
    unsubscribeFromCategories;


  // --- Controle do Banner do App Mobile --- //
  // Verifica se o banner já foi fechado anteriormente
  const bannerDismissed = localStorage.getItem("mobileAppBannerDismissed");
  if (bannerDismissed === "true") {
    mobileAppBanner.classList.add("hidden");
  }

  // Evento para fechar o banner
  closeBannerBtn.addEventListener("click", () => {
    mobileAppBanner.classList.add("hidden");
    localStorage.setItem("mobileAppBannerDismissed", "true");
  });

  document.getElementById("show-register").addEventListener("click", (e) => {
    e.preventDefault();
    loginView.style.display = "none";
    registerView.style.display = "block";
  });
  document.getElementById("show-login").addEventListener("click", (e) => {
    e.preventDefault();
    registerView.style.display = "none";
    loginView.style.display = "block";
  });

  function handleProviderLogin(provider) {
    auth.signInWithPopup(provider).catch((error) => {
      if (error.code === "auth/account-exists-with-different-credential") {
        pendingCredential = error.credential;
        auth.fetchSignInMethodsForEmail(error.email).then((methods) => {
          let providerName = methods.includes("password")
            ? "E-mail e Senha"
            : methods[0];
          alert(
            `Você já tem uma conta com este e-mail usando: ${providerName}. Faça login com este método para vincular suas contas.`
          );
        });
      } else {
        console.error(`Erro no login com ${provider.providerId}: `, error);
        alert(`Erro ao fazer login: ${error.message}`);
      }
    });
  }

  googleLoginBtn.addEventListener("click", () =>
    handleProviderLogin(new firebase.auth.GoogleAuthProvider())
  );
  githubLoginBtn.addEventListener("click", () =>
    handleProviderLogin(new firebase.auth.GithubAuthProvider())
  );
  loginEmailBtn.addEventListener("click", () => {
    const email = loginEmailInput.value;
    const password = loginPasswordInput.value;
    if (!email || !password)
      return alert("Por favor, preencha e-mail e senha.");
    auth
      .signInWithEmailAndPassword(email, password)
      .catch((error) => alert(`Erro ao fazer login: ${error.message}`));
  });
  registerBtn.addEventListener("click", () => {
    const email = registerEmailInput.value;
    const password = registerPasswordInput.value;
    if (!email || !password)
      return alert("Por favor, preencha e-mail e senha.");
    auth
      .createUserWithEmailAndPassword(email, password)
      .catch((error) => alert(`Erro ao registrar: ${error.message}`));
  });
  logoutBtn.addEventListener("click", () => auth.signOut());

  auth.onAuthStateChanged((user) => {
    if (user) {
      if (pendingCredential) {
        user
          .linkWithCredential(pendingCredential)
          .then(() => {
            alert("Sua conta foi vinculada com sucesso!");
            pendingCredential = null;
          })
          .catch((error) => {
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

  function setupUIForLoggedInUser(user) {
    authContainer.style.display = "none";
    appContent.style.display = "block";
    userInfo.style.display = "flex";
    userEmailSpan.textContent = user.email;
    userAvatar.src =
      user.photoURL ||
      `https://ui-avatars.com/api/?name=${user.email}&background=random`;
  }

  function setupUIForLoggedOutUser() {
    authContainer.style.display = "block";
    appContent.style.display = "none";
    userInfo.style.display = "none";
    if (unsubscribeFromExpenses) unsubscribeFromExpenses();
    if (unsubscribeFromIncomes) unsubscribeFromIncomes();
    if (unsubscribeFromBudgets) unsubscribeFromBudgets();
    if (unsubscribeFromCategories) unsubscribeFromCategories();
    allTransactions = [];
    userBudgets = {};
    customExpenseCategories = [];
    customIncomeCategories = [];
    renderAll();
  }

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      if (!incomeEditIdInput.value && !expenseEditIdInput.value) {
        tabs.forEach((item) => item.classList.remove("active"));
        formContainers.forEach((container) =>
          container.classList.remove("active")
        );
        tab.classList.add("active");
        document.getElementById(tab.dataset.tab).classList.add("active");
      } else {
        alert("Por favor, finalize a edição atual antes de trocar de aba.");
      }
    });
  });

  viewNavButtons.forEach((button) => {
    button.addEventListener("click", () => {
      
      viewNavButtons.forEach((btn) => btn.classList.remove("active"));
      document
        .querySelectorAll('#app-content > div[id$="-view"]')
        .forEach((view) => {
          view.style.display = "none";
        });

     
      button.classList.add("active");
      const viewId = button.id.replace("show-", "").replace("-btn", "");
      const viewToShow = document.getElementById(viewId);
      if (viewToShow) {
        viewToShow.style.display = "block";
      }

    
      if (viewId === "reports-view") {
        renderReports();
      }
    });
  });

  function loadUserData(userId) {
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
      updateTransactions("expense", expenses);
    });
    unsubscribeFromIncomes = incomesQuery.onSnapshot((snapshot) => {
      const incomes = snapshot.docs.map((doc) => ({
        id: doc.id,
        type: "income",
        ...doc.data(),
      }));
      updateTransactions("income", incomes);
    });

    const budgetDocRef = db
      .collection("users")
      .doc(userId)
      .collection("orcamentos")
      .doc("mensal");
    unsubscribeFromBudgets = budgetDocRef.onSnapshot((doc) => {
      userBudgets = doc.exists ? doc.data() : {};
      renderAll();
    });

   
    const categoriesDocRef = db
      .collection("users")
      .doc(userId)
      .collection("config")
      .doc("categories");
    unsubscribeFromCategories = categoriesDocRef.onSnapshot((doc) => {
      if (doc.exists) {
        const data = doc.data();
        customExpenseCategories = data.expenseCategories || [];
        customIncomeCategories = data.incomeCategories || [];
      } else {
        customExpenseCategories = [];
        customIncomeCategories = [];
      }
      populateCategoryDropdowns();
      renderCategoryManagementLists();
      renderAll(); 
    });
  }

 
  function populateCategoryDropdowns() {
    const allExpenseCategories = [
      ...defaultExpenseCategories,
      ...customExpenseCategories,
    ];
    const allIncomeCategories = [
      ...defaultIncomeCategories,
      ...customIncomeCategories,
    ];

   
    const selectedExpense = expenseCategoryInput.value;
    const selectedIncome = incomeCategoryInput.value;

    expenseCategoryInput.innerHTML =
      '<option value="" disabled>Selecione uma categoria</option>';
    allExpenseCategories.forEach((cat) => {
      const option = document.createElement("option");
      option.value = cat;
      option.textContent = cat;
      expenseCategoryInput.appendChild(option);
    });

    incomeCategoryInput.innerHTML =
      '<option value="" disabled>Selecione uma categoria</option>';
    allIncomeCategories.forEach((cat) => {
      const option = document.createElement("option");
      option.value = cat;
      option.textContent = cat;
      incomeCategoryInput.appendChild(option);
    });

   
    expenseCategoryInput.value = selectedExpense || "";
    incomeCategoryInput.value = selectedIncome || "";
  }

  function renderCategoryManagementLists() {
    expenseCategoryList.innerHTML = "";
    customExpenseCategories.forEach((cat) => {
      const li = document.createElement("li");
      li.className = "category-list-item";
      li.innerHTML = `<span>${cat}</span><button class="delete-category-btn" data-type="expense" data-category="${cat}">&times;</button>`;
      expenseCategoryList.appendChild(li);
    });

    incomeCategoryList.innerHTML = "";
    customIncomeCategories.forEach((cat) => {
      const li = document.createElement("li");
      li.className = "category-list-item";
      li.innerHTML = `<span>${cat}</span><button class="delete-category-btn" data-type="income" data-category="${cat}">&times;</button>`;
      incomeCategoryList.appendChild(li);
    });
  }

  async function saveCategoriesToDB() {
    const user = auth.currentUser;
    if (!user) return;
    const categoriesDocRef = db
      .collection("users")
      .doc(user.uid)
      .collection("config")
      .doc("categories");
    try {
      await categoriesDocRef.set(
        {
          expenseCategories: customExpenseCategories,
          incomeCategories: customIncomeCategories,
        },
        { merge: true }
      );
    } catch (error) {
      console.error("Erro ao salvar categorias:", error);
      alert("Não foi possível salvar as categorias.");
    }
  }

  addExpenseCategoryBtn.addEventListener("click", () => {
    const newCategory = newExpenseCategoryInput.value.trim();
    if (
      newCategory &&
      ![...defaultExpenseCategories, ...customExpenseCategories].includes(
        newCategory
      )
    ) {
      customExpenseCategories.push(newCategory);
      saveCategoriesToDB();
      newExpenseCategoryInput.value = "";
    } else if (!newCategory) {
      alert("O nome da categoria não pode estar vazio.");
    } else {
      alert("Esta categoria já existe.");
    }
  });

  addIncomeCategoryBtn.addEventListener("click", () => {
    const newCategory = newIncomeCategoryInput.value.trim();
    if (
      newCategory &&
      ![...defaultIncomeCategories, ...customIncomeCategories].includes(
        newCategory
      )
    ) {
      customIncomeCategories.push(newCategory);
      saveCategoriesToDB();
      newIncomeCategoryInput.value = "";
    } else if (!newCategory) {
      alert("O nome da categoria não pode estar vazio.");
    } else {
      alert("Esta categoria já existe.");
    }
  });

  function handleCategoryDelete(e) {
    if (!e.target.classList.contains("delete-category-btn")) return;
    const type = e.target.dataset.type;
    const category = e.target.dataset.category;

    if (type === "expense") {
      customExpenseCategories = customExpenseCategories.filter(
        (c) => c !== category
      );
    } else if (type === "income") {
      customIncomeCategories = customIncomeCategories.filter(
        (c) => c !== category
      );
    }
    saveCategoriesToDB();
  }

  expenseCategoryList.addEventListener("click", handleCategoryDelete);
  incomeCategoryList.addEventListener("click", handleCategoryDelete);

  
  function updateTransactions(type, data) {
    allTransactions = allTransactions
      .filter((t) => t.type !== type)
      .concat(data);
    allTransactions.sort((a, b) => {
      const dateA = a.createdAt ? a.createdAt.toDate() : new Date();
      const dateB = b.createdAt ? b.createdAt.toDate() : new Date();
      return dateB - dateA;
    });
    renderAll();
  }

  async function addTransactionToDB(type, data, userId) {
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
    } catch (error) {
      console.error(`Erro ao adicionar ${type}: `, error);
      alert(`Não foi possível salvar a transação.`);
    }
  }

  async function updateTransactionInDB(id, type, data) {
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
    } catch (error) {
      console.error(`Erro ao atualizar ${type}: `, error);
      alert("Não foi possível salvar as alterações.");
    }
  }

  async function deleteTransactionFromDB(id, type) {
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
      } catch (error) {
        console.error(`Erro ao excluir ${type}: `, error);
        alert("Não foi possível excluir a transação.");
      }
    }
  }

  async function saveUserBudgets() {
    const user = auth.currentUser;
    if (!user) return;
    const budgetInputs = document.querySelectorAll(".budget-input");
    const newBudgets = {};
    budgetInputs.forEach((input) => {
      const category = input.dataset.category;
      const amount = parseFloat(input.value);
      if (category && !isNaN(amount) && amount >= 0)
        newBudgets[category] = amount;
    });
    try {
      await db
        .collection("users")
        .doc(user.uid)
        .collection("orcamentos")
        .doc("mensal")
        .set(newBudgets, { merge: true });
      alert("Orçamentos salvos com sucesso!");
    } catch (error) {
      console.error("Erro ao salvar orçamentos: ", error);
      alert("Não foi possível salvar os orçamentos.");
    }
  }

  function renderAll() {
    const filteredTransactions = getFilteredTransactions();
    transactionList.innerHTML = "";
    if (filteredTransactions.length === 0) {
      transactionList.innerHTML =
        "<p style='text-align:center; color: var(--cor-texto-suave);'>Nenhuma transação encontrada para este período.</p>";
    } else {
      filteredTransactions.forEach((t) => {
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
                <div class="amount">${sign} R$ ${amount}</div>
            </div>
            <div class="actions">
                <button class="edit-btn" data-id="${t.id}" data-type="${t.type}" title="Editar Transação">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                </button>
                <button class="delete-btn" data-id="${t.id}" data-type="${t.type}" title="Excluir Transação">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                </button>
            </div>`;
        transactionList.appendChild(listItem);
      });
    }
    calculateAndRenderMetrics(filteredTransactions);
  }

  // --- LÓGICA DE EDIÇÃO --- //
  function handleStartEdit(id, type) {
    const transactionToEdit = allTransactions.find((t) => t.id === id);
    if (!transactionToEdit) return;

    if (type === "expense") {
      expenseDescriptionInput.value = transactionToEdit.description;
      expenseCategoryInput.value = transactionToEdit.category;
      expenseAmountInput.value = transactionToEdit.amount;
      expenseEditIdInput.value = id;
      expenseSubmitBtn.textContent = "Salvar Alterações";
      document
        .getElementById("expense-form-container")
        .classList.add("editing");
      tabs.forEach((tab) => tab.classList.remove("active"));
      document
        .querySelector('.tab-btn[data-tab="expense-form-container"]')
        .classList.add("active");
      formContainers.forEach((c) => c.classList.remove("active"));
      document.getElementById("expense-form-container").classList.add("active");
    } else if (type === "income") {
      incomeDescriptionInput.value = transactionToEdit.description;
      incomeCategoryInput.value = transactionToEdit.category;
      incomeAmountInput.value = transactionToEdit.amount;
      incomeEditIdInput.value = id;
      incomeSubmitBtn.textContent = "Salvar Alterações";
      document.getElementById("income-form-container").classList.add("editing");
      tabs.forEach((tab) => tab.classList.remove("active"));
      document
        .querySelector('.tab-btn[data-tab="income-form-container"]')
        .classList.add("active");
      formContainers.forEach((c) => c.classList.remove("active"));
      document.getElementById("income-form-container").classList.add("active");
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetForms() {
    expenseForm.reset();
    expenseEditIdInput.value = "";
    expenseSubmitBtn.textContent = "Adicionar Gasto";
    document
      .getElementById("expense-form-container")
      .classList.remove("editing");

    incomeForm.reset();
    incomeEditIdInput.value = "";
    incomeSubmitBtn.textContent = "Adicionar Receita";
    document
      .getElementById("income-form-container")
      .classList.remove("editing");

   
    expenseCategoryInput.value = "";
    incomeCategoryInput.value = "";
  }


  expenseForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const user = auth.currentUser;
    if (!user) return;

    const editId = expenseEditIdInput.value;
    const data = {
      description: expenseDescriptionInput.value,
      category: expenseCategoryInput.value,
      amount: parseFloat(expenseAmountInput.value),
    };

    if (
      data.description.trim() &&
      data.category &&
      !isNaN(data.amount) &&
      data.amount > 0
    ) {
      if (editId) {
        updateTransactionInDB(editId, "expense", data);
      } else {
        addTransactionToDB("expense", data, user.uid);
      }
      resetForms();
    } else {
      alert(
        "Por favor, preencha todos os campos do gasto com valores válidos."
      );
    }
  });

  incomeForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const user = auth.currentUser;
    if (!user) return;

    const editId = incomeEditIdInput.value;
    const data = {
      description: incomeDescriptionInput.value,
      category: incomeCategoryInput.value,
      amount: parseFloat(incomeAmountInput.value),
    };

    if (
      data.description.trim() &&
      data.category &&
      !isNaN(data.amount) &&
      data.amount > 0
    ) {
      if (editId) {
        updateTransactionInDB(editId, "income", data);
      } else {
        addTransactionToDB("income", data, user.uid);
      }
      resetForms();
    } else {
      alert(
        "Por favor, preencha todos os campos da receita com valores válidos."
      );
    }
  });

  transactionList.addEventListener("click", (event) => {
    const target = event.target.closest("button");
    if (!target) return;

    const id = target.getAttribute("data-id");
    const type = target.getAttribute("data-type");

    if (target.classList.contains("delete-btn")) {
      deleteTransactionFromDB(id, type);
    } else if (target.classList.contains("edit-btn")) {
      handleStartEdit(id, type);
    }
  });

  cancelExpenseEditBtn.addEventListener("click", resetForms);
  cancelIncomeEditBtn.addEventListener("click", resetForms);

  
  function calculateAndRenderMetrics(transactions) {
    let totalIncome = 0;
    let totalExpenses = 0;
    const expenseCategoryTotals = {};

    transactions.forEach((t) => {
      if (t.type === "expense") {
        totalExpenses += parseFloat(t.amount);
        expenseCategoryTotals[t.category] =
          (expenseCategoryTotals[t.category] || 0) + parseFloat(t.amount);
      } else if (t.type === "income") {
        totalIncome += parseFloat(t.amount);
      }
    });

    const totalBalance = totalIncome - totalExpenses;

    monthlyIncomeSpan.textContent = `R$ ${totalIncome.toFixed(2)}`;
    monthlyExpensesSpan.textContent = `R$ ${totalExpenses.toFixed(2)}`;
    monthlyBalanceSpan.textContent = `R$ ${totalBalance.toFixed(2)}`;
    monthlyBalanceSpan.className = totalBalance >= 0 ? "positive" : "negative";

    renderOrUpdateDoughnutChart(expenseCategoryTotals);

    const hoje = new Date();
    const inicioDoMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const expensesThisMonth = allTransactions.filter(
      (t) =>
        t.type === "expense" &&
        t.createdAt &&
        t.createdAt.toDate() >= inicioDoMes
    );
    const spentByCategoryThisMonth = {};
    expensesThisMonth.forEach((t) => {
      spentByCategoryThisMonth[t.category] =
        (spentByCategoryThisMonth[t.category] || 0) + parseFloat(t.amount);
    });
    renderBudgetProgress(spentByCategoryThisMonth);
  }

  function renderBudgetProgress(spentByCategory) {
    budgetSection.innerHTML = "";
    const categories = [
      ...defaultExpenseCategories,
      ...customExpenseCategories,
    ];

    categories.forEach((category) => {
      const budgetAmount = userBudgets[category] || 0;
      const spentAmount = spentByCategory[category] || 0;
      let progressPercent =
        budgetAmount > 0 ? (spentAmount / budgetAmount) * 100 : 0;
      const isOverBudget = spentAmount > budgetAmount && budgetAmount > 0;

      const item = document.createElement("div");
      item.className = "budget-item";
      item.innerHTML = `
        <div class="budget-info">
          <span class="budget-category-label">${category}</span>
          <div class="progress-bar-container">
            <div class="progress-bar ${
              isOverBudget ? "over-budget" : ""
            }" style="width: ${Math.min(progressPercent, 100)}%;"></div>
          </div>
          <span class="budget-progress-text ${
            isOverBudget ? "over-budget-text" : ""
          }">
            R$ ${spentAmount.toFixed(2)} / R$ ${budgetAmount.toFixed(2)}
          </span>
        </div>
        <div class="budget-input-group">
          <input type="number" step="0.01" class="budget-input" data-category="${category}" value="${
        budgetAmount > 0 ? budgetAmount.toFixed(2) : ""
      }" placeholder="Definir Orçamento">
        </div>`;
      budgetSection.appendChild(item);
    });
  }

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
    let startDate,
      endDate = new Date(now);

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
        startDate = startDateInput.value
          ? new Date(startDateInput.value + "T00:00:00")
          : null;
        endDate = endDateInput.value
          ? new Date(endDateInput.value + "T23:59:59")
          : null;
        break;
      case "all-time":
      default:
        return allTransactions;
    }

    if (!startDate || !endDate) return allTransactions;

    return allTransactions.filter((t) => {
      const transactionDate = t.createdAt ? t.createdAt.toDate() : null;
      return (
        transactionDate &&
        transactionDate >= startDate &&
        transactionDate <= endDate
      );
    });
  }

  const centerTextPlugin = {
    id: "centerText",
    afterDraw: (chart) => {
      if (chart.data.datasets[0].data.length === 0) return;
      const ctx = chart.ctx;
      const { width, height } = chart.chartArea;
      const centerX = chart.chartArea.left + width / 2;
      const centerY = chart.chartArea.top + height / 2;

      const isDarkMode = document.body.classList.contains("dark-mode");
      ctx.fillStyle = isDarkMode ? "#FFFFFF" : "#1E293B";
      ctx.font = "bold 22px Inter";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const total = chart.data.datasets[0].data.reduce(
        (sum, value) => sum + value,
        0
      );
      ctx.fillText(`R$ ${total.toFixed(2)}`, centerX, centerY);
    },
  };

  function renderOrUpdateDoughnutChart(categoryData) {
    if (expenseChart) expenseChart.destroy();
    const isDarkMode = document.body.classList.contains("dark-mode");
    const legendColor = isDarkMode ? "#9CA3AF" : "#64748B";

    expenseChart = new Chart(chartCanvas, {
      type: "doughnut",
      data: {
        labels: Object.keys(categoryData),
        datasets: [
          {
            label: "Gastos por Categoria",
            data: Object.values(categoryData),
            backgroundColor: [
              "#FF6384",
              "#36A2EB",
              "#FFCE56",
              "#4BC0C0",
              "#9966FF",
              "#FF9F40",
            ],
            borderWidth: 2,
            borderColor: "#ffffff",
            hoverBorderWidth: 3,
            hoverBorderColor: "#ffffff",
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "70%",
        animation: {
          animateRotate: true,
          animateScale: true,
          duration: 1500,
          easing: 'easeInOutQuart',
        },
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              color: legendColor,
              padding: 15,
              font: {
                size: 13,
                weight: '500'
              }
            }
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            padding: 12,
            cornerRadius: 8,
            titleFont: {
              size: 14,
              weight: 'bold'
            },
            bodyFont: {
              size: 13
            }
          }
        },
      },
      plugins: [centerTextPlugin],
    });
  }

  function renderReports() {
    renderMonthlyEvolutionChart();
    renderCategoryComparisonChart();
  }

  function renderMonthlyEvolutionChart() {
    const isDarkMode = document.body.classList.contains("dark-mode");
    const textColor = isDarkMode ? "#9CA3AF" : "#64748B";
    const gridColor = isDarkMode ? "rgba(55, 65, 81, 0.5)" : "#E2E8F0";

    const data = {
      labels: [],
      datasets: [
        {
          label: "Receitas",
          data: [],
          backgroundColor: "rgba(16, 185, 129, 0.7)",
          borderColor: "#10B981",
          borderWidth: 2,
          borderRadius: 5,
        },
        {
          label: "Despesas",
          data: [],
          backgroundColor: "rgba(239, 68, 68, 0.7)",
          borderColor: "#EF4444",
          borderWidth: 2,
          borderRadius: 5,
        },
      ],
    };
    const monthlyTotals = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
        2,
        "0"
      )}`;
      const monthName = d.toLocaleString("default", { month: "short" });
      data.labels.push(monthName);
      monthlyTotals[monthKey] = { income: 0, expense: 0 };
    }

    allTransactions.forEach((t) => {
      if (t.createdAt) {
        const date = t.createdAt.toDate();
        const monthKey = `${date.getFullYear()}-${String(
          date.getMonth() + 1
        ).padStart(2, "0")}`;
        if (monthlyTotals[monthKey]) {
          monthlyTotals[monthKey][t.type] += parseFloat(t.amount);
        }
      }
    });

    for (const key in monthlyTotals) {
      data.datasets[0].data.push(monthlyTotals[key].income);
      data.datasets[1].data.push(monthlyTotals[key].expense);
    }

    if (monthlyEvolutionChart) monthlyEvolutionChart.destroy();
    monthlyEvolutionChart = new Chart(monthlyEvolutionChartCanvas, {
      type: "bar",
      data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 1200,
          easing: 'easeInOutQuart',
        },
        plugins: {
          legend: {
            labels: {
              color: textColor,
              padding: 15,
              font: {
                size: 13,
                weight: '500'
              }
            }
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            padding: 12,
            cornerRadius: 8,
            titleFont: {
              size: 14,
              weight: 'bold'
            },
            bodyFont: {
              size: 13
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { callback: (value) => `R$ ${value}`, color: textColor },
            grid: { color: gridColor, lineWidth: 1 },
          },
          x: {
            ticks: { color: textColor },
            grid: { color: gridColor, lineWidth: 1 }
          },
        },
      },
    });
  }

  function renderCategoryComparisonChart() {
    const isDarkMode = document.body.classList.contains("dark-mode");
    const textColor = isDarkMode ? "#9CA3AF" : "#64748B";
    const gridColor = isDarkMode ? "rgba(55, 65, 81, 0.5)" : "#E2E8F0";

    const expenseCategoryTotals = {};
    allTransactions.forEach((t) => {
      if (t.type === "expense") {
        expenseCategoryTotals[t.category] =
          (expenseCategoryTotals[t.category] || 0) + parseFloat(t.amount);
      }
    });

    const sortedCategories = Object.entries(expenseCategoryTotals).sort(
      (a, b) => b[1] - a[1]
    );

    const data = {
      labels: sortedCategories.map((item) => item[0]),
      datasets: [
        {
          label: "Total Gasto",
          data: sortedCategories.map((item) => item[1]),
          backgroundColor: [
            "#FF6384",
            "#36A2EB",
            "#FFCE56",
            "#4BC0C0",
            "#9966FF",
            "#FF9F40",
          ],
        },
      ],
    };

    if (categoryComparisonChart) categoryComparisonChart.destroy();
    categoryComparisonChart = new Chart(categoryComparisonChartCanvas, {
      type: "bar",
      data,
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 1200,
          easing: 'easeInOutQuart',
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            padding: 12,
            cornerRadius: 8,
            titleFont: {
              size: 14,
              weight: 'bold'
            },
            bodyFont: {
              size: 13
            }
          }
        },
        scales: {
          x: {
            ticks: { callback: (value) => `R$ ${value}`, color: textColor },
            grid: { color: gridColor, lineWidth: 1 },
          },
          y: {
            ticks: { color: textColor },
            grid: { color: gridColor, lineWidth: 1 }
          },
        },
      },
    });
  }

  saveBudgetsBtn.addEventListener("click", saveUserBudgets);

  const applyTheme = (theme) => {
    if (theme === "dark") {
      document.body.classList.add("dark-mode");
      moonIcon.style.display = "none";
      sunIcon.style.display = "block";
    } else {
      document.body.classList.remove("dark-mode");
      moonIcon.style.display = "block";
      sunIcon.style.display = "none";
    }
  };

  const toggleTheme = () => {
    const currentTheme = document.body.classList.contains("dark-mode")
      ? "light"
      : "dark";
    localStorage.setItem("theme", currentTheme);
    applyTheme(currentTheme);
    renderAll();
    if (reportsView.style.display === "block") {
      renderReports();
    }
  };

  themeToggleBtn.addEventListener("click", toggleTheme);

  const loadInitialTheme = () => {
    const savedTheme = localStorage.getItem("theme");
    const preferredTheme = window.matchMedia("(prefers-color-scheme: dark)")
      .matches
      ? "dark"
      : "light";
    applyTheme(savedTheme || preferredTheme);
  };

  loadInitialTheme();
});
