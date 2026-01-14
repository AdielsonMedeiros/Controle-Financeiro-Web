// Chart.js integration module

let expenseChart = null;
let evolutionChart = null;
let categoryComparisonChart = null;

// Colors for charts
const chartColors = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
  "#ec4899", "#14b8a6", "#f97316", "#84cc16", "#06b6d4"
];

// Render expense doughnut chart
export function renderExpenseChart(transactions, categories) {
  const ctx = document.getElementById("expense-chart");
  if (!ctx) return;

  const expenses = transactions.filter((t) => t.type === "expense");
  const categoryTotals = {};

  expenses.forEach((expense) => {
    const cat = expense.category || "Outros";
    categoryTotals[cat] = (categoryTotals[cat] || 0) + parseFloat(expense.amount);
  });

  const labels = Object.keys(categoryTotals);
  const data = Object.values(categoryTotals);

  if (expenseChart) {
    expenseChart.destroy();
  }

  if (labels.length === 0) {
    ctx.getContext("2d").clearRect(0, 0, ctx.width, ctx.height);
    return;
  }

  expenseChart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: chartColors.slice(0, labels.length),
        borderWidth: 2,
        borderColor: "#ffffff",
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "right",
          labels: {
            padding: 15,
            usePointStyle: true,
            pointStyle: "circle",
            font: { family: "'Inter', sans-serif", size: 12 }
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const value = context.parsed;
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const percentage = ((value / total) * 100).toFixed(1);
              return `R$ ${value.toFixed(2)} (${percentage}%)`;
            }
          }
        }
      }
    }
  });
}

// Render monthly evolution chart
export function renderEvolutionChart(allTransactions) {
  const ctx = document.getElementById("monthly-evolution-chart");
  if (!ctx) return;

  const monthlyData = {};

  allTransactions.forEach((t) => {
    if (!t.createdAt) return;
    const date = t.createdAt.toDate();
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    
    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = { income: 0, expense: 0 };
    }
    
    if (t.type === "income") {
      monthlyData[monthKey].income += parseFloat(t.amount);
    } else {
      monthlyData[monthKey].expense += parseFloat(t.amount);
    }
  });

  const sortedMonths = Object.keys(monthlyData).sort().slice(-6);
  const labels = sortedMonths.map((m) => {
    const [year, month] = m.split("-");
    const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    return `${monthNames[parseInt(month) - 1]}/${year.slice(2)}`;
  });

  const incomes = sortedMonths.map((m) => monthlyData[m].income);
  const expenses = sortedMonths.map((m) => monthlyData[m].expense);

  if (evolutionChart) {
    evolutionChart.destroy();
  }

  evolutionChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Receitas",
          data: incomes,
          backgroundColor: "#10b981",
          borderRadius: 6,
        },
        {
          label: "Despesas",
          data: expenses,
          backgroundColor: "#ef4444",
          borderRadius: 6,
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "top",
          labels: { font: { family: "'Inter', sans-serif" } }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              return "R$ " + value.toLocaleString("pt-BR");
            }
          }
        }
      }
    }
  });
}

// Render category comparison chart
export function renderCategoryComparisonChart(allTransactions) {
  const ctx = document.getElementById("category-comparison-chart");
  if (!ctx) return;

  const categoryTotals = {};

  allTransactions.filter(t => t.type === "expense").forEach((t) => {
    const cat = t.category || "Outros";
    categoryTotals[cat] = (categoryTotals[cat] || 0) + parseFloat(t.amount);
  });

  const sortedCategories = Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const labels = sortedCategories.map(([cat]) => cat);
  const data = sortedCategories.map(([, total]) => total);

  if (categoryComparisonChart) {
    categoryComparisonChart.destroy();
  }

  categoryComparisonChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [{
        label: "Total Gasto",
        data: data,
        backgroundColor: chartColors.slice(0, labels.length),
        borderRadius: 6,
      }]
    },
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: {
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              return "R$ " + value.toLocaleString("pt-BR");
            }
          }
        }
      }
    }
  });
}

// Render reports (both charts)
export function renderReports(allTransactions) {
  renderEvolutionChart(allTransactions);
  renderCategoryComparisonChart(allTransactions);
}
