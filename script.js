document.addEventListener("DOMContentLoaded", () => {
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }

  const db = firebase.firestore();
  const auth = firebase.auth();

  let pendingCredential;

  const authContainer = document.getElementById("auth-container");
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
  const appContent = document.getElementById("app-content");

  const expenseForm = document.getElementById("expense-form");
  const descriptionInput = document.getElementById("description");
  const categoryInput = document.getElementById("category");
  const amountInput = document.getElementById("amount");
  const expenseList = document.getElementById("expense-list");

  const totalAmountSpan = document.getElementById("total-amount");
  const dailyTotalSpan = document.getElementById("daily-total");
  const monthlyTotalSpan = document.getElementById("monthly-total");
  const chartCanvas = document.getElementById("expense-chart").getContext("2d");
  let expenseChart;

  let unsubscribeFromExpenses;

 

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
          let providerName = "seu método original";
          if (methods && methods.length > 0) {
            const providerId = methods[0];
            if (providerId === 'password') providerName = 'E-mail e Senha';
            else if (providerId === 'google.com') providerName = 'Google';
            else if (providerId === 'github.com') providerName = 'GitHub';
            else providerName = providerId;
          } else {
            providerName = 'E-mail e Senha';
          }
          alert(
            `Você já tem uma conta com este e-mail usando o método: ${providerName}. ` +
            `Por favor, faça login com este método para vincular sua nova conta.`
          );
        });
      } else {
        console.error(`Erro no login com ${provider.providerId}: `, error);
        alert(`Erro ao fazer login: ${error.message}`);
      }
    });
  }

  googleLoginBtn.addEventListener("click", () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    handleProviderLogin(provider);
  });

  githubLoginBtn.addEventListener("click", () => {
    const provider = new firebase.auth.GithubAuthProvider();
    handleProviderLogin(provider);
  });

  loginEmailBtn.addEventListener("click", () => {
    const email = loginEmailInput.value;
    const password = loginPasswordInput.value;
    if (!email || !password) return alert("Por favor, preencha e-mail e senha.");
    auth.signInWithEmailAndPassword(email, password).catch((error) => {
      console.error("Erro no login com e-mail: ", error);
      alert(`Erro ao fazer login: ${error.message}`);
    });
  });

  registerBtn.addEventListener("click", () => {
    const email = registerEmailInput.value;
    const password = registerPasswordInput.value;
    if (!email || !password) return alert("Por favor, preencha e-mail e senha para se registrar.");
    auth.createUserWithEmailAndPassword(email, password).catch((error) => {
      console.error("Erro no registro: ", error);
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
      authContainer.style.display = "none";
      userInfo.style.display = "flex";
      appContent.style.display = "block";
      userEmailSpan.textContent = user.email;
      const avatarUrl = user.photoURL || `https://ui-avatars.com/api/?name=${user.email}&background=random`;
      userAvatar.src = avatarUrl;
      loadAndListenForExpenses(user.uid);
    } else {
      authContainer.style.display = "block";
      userInfo.style.display = "none";
      appContent.style.display = "none";
      expenseList.innerHTML = "";
      if (unsubscribeFromExpenses) unsubscribeFromExpenses();
    }
  });

  

  function loadAndListenForExpenses(userId) {
    const query = db.collection("users").doc(userId).collection("gastos").orderBy("createdAt", "desc");
    unsubscribeFromExpenses = query.onSnapshot(
      (snapshot) => renderExpensesAndMetrics(snapshot.docs),
      (error) => console.error("Erro ao carregar gastos: ", error)
    );
  }

  function renderExpensesAndMetrics(docs) {
    expenseList.innerHTML = "";
    let totalGeral = 0, totalDiario = 0, totalMensal = 0;
    const categoryTotals = {};
    const hoje = new Date(), inicioDoDia = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()), inicioDoMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);

    docs.forEach((doc) => {
      const expense = doc.data(), expenseAmount = parseFloat(expense.amount), expenseCategory = expense.category;
      const listItem = document.createElement("li");
      listItem.innerHTML = `<div class="expense-info"><span>${expense.description} <em>(${expenseCategory})</em></span><span>R$ ${expenseAmount.toFixed(2)}</span></div><button class="delete-btn" data-id="${doc.id}">Excluir</button>`;
      expenseList.appendChild(listItem);
      totalGeral += expenseAmount;
      categoryTotals[expenseCategory] = (categoryTotals[expenseCategory] || 0) + expenseAmount;
      if (expense.createdAt) {
        const expenseDate = expense.createdAt.toDate();
        if (expenseDate >= inicioDoDia) totalDiario += expenseAmount;
        if (expenseDate >= inicioDoMes) totalMensal += expenseAmount;
      }
    });

    totalAmountSpan.textContent = totalGeral.toFixed(2);
    dailyTotalSpan.textContent = totalDiario.toFixed(2);
    monthlyTotalSpan.textContent = totalMensal.toFixed(2);
    
    renderOrUpdateChart(categoryTotals, totalGeral);
  }

 

  
  const centerTextPlugin = {
    id: 'centerText',
    afterDraw: (chart) => {
      if (chart.data.datasets[0].data.length === 0) return;
      
      const ctx = chart.ctx;
      const { top, bottom, left, right, width, height } = chart.chartArea;
      const centerX = left + width / 2;
      const centerY = top + height / 2;

      
      ctx.font = '16px Inter';
      ctx.fillStyle = '#64748B'; 
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText('Total', centerX, centerY);

      
      const mainTitle = chart.options.plugins.centerText.mainTitle;
      ctx.font = 'bold 24px Inter';
      ctx.fillStyle = '#1E293B'; 
      ctx.textBaseline = 'top';
      ctx.fillText(mainTitle, centerX, centerY);
    }
  };

  function renderOrUpdateChart(categoryData, totalGeral) {
    if (expenseChart) {
      expenseChart.destroy();
    }
    
    
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
          legend: {
            position: 'bottom',
          },
          
          title: {
            display: false,
          },
          
          centerText: {
            mainTitle: `R$ ${totalGeral.toFixed(2)}`
          }
        },
      },
      
      plugins: [centerTextPlugin]
    });
  }
  

  async function addExpenseToDB(description, category, amount, userId) {
    try {
      await db.collection("users").doc(userId).collection("gastos").add({ description, category, amount, createdAt: firebase.firestore.FieldValue.serverTimestamp(), ownerId: userId });
      console.log("Gasto adicionado com sucesso!");
    } catch (error) {
      console.error("Erro ao adicionar gasto: ", error);
      alert("Não foi possível salvar o gasto.");
    }
  }

  async function deleteExpenseFromDB(id) {
    const user = auth.currentUser;
    if (!user) return;
    if (confirm("Tem certeza que deseja excluir este gasto?")) {
      try {
        await db.collection("users").doc(user.uid).collection("gastos").doc(id).delete();
        console.log("Gasto excluído com sucesso!");
      } catch (error) {
        console.error("Erro ao excluir gasto: ", error);
        alert("Não foi possível excluir o gasto.");
      }
    }
  }

  expenseForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const user = auth.currentUser;
    if (!user) return alert("Você precisa estar logado para adicionar um gasto.");
    const description = descriptionInput.value, category = categoryInput.value, amount = parseFloat(amountInput.value);
    if (description.trim() !== "" && category !== "" && !isNaN(amount) && amount > 0) {
      addExpenseToDB(description, category, amount, user.uid);
      expenseForm.reset();
      descriptionInput.focus();
    } else {
      alert("Por favor, preencha todos os campos com valores válidos.");
    }
  });

  expenseList.addEventListener("click", (event) => {
    if (event.target.classList.contains("delete-btn")) {
      const id = event.target.getAttribute("data-id");
      deleteExpenseFromDB(id);
    }
  });
});