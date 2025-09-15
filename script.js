document.addEventListener("DOMContentLoaded", () => {
  const expenseForm = document.getElementById("expense-form");
  const descriptionInput = document.getElementById("description");
  const amountInput = document.getElementById("amount");
  const expenseList = document.getElementById("expense-list");
  const totalAmountSpan = document.getElementById("total-amount");

  let expenses = JSON.parse(localStorage.getItem("expenses")) || [];

  function renderExpenses() {
    expenseList.innerHTML = "";

    let total = 0;

    expenses.forEach((expense) => {
      const listItem = document.createElement("li");

      listItem.innerHTML = `
                <span>${expense.description}</span>
                <span>R$ ${expense.amount.toFixed(2)}</span>
            `;

      expenseList.appendChild(listItem);

      total += expense.amount;
    });

    totalAmountSpan.textContent = total.toFixed(2);
  }

  function addExpense(description, amount) {
    const newExpense = {
      description: description,
      amount: amount,
    };

    expenses.push(newExpense);

    localStorage.setItem("expenses", JSON.stringify(expenses));

    renderExpenses();
  }

  expenseForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const description = descriptionInput.value;
    const amount = parseFloat(amountInput.value);

    if (description.trim() !== "" && !isNaN(amount) && amount > 0) {
      addExpense(description, amount);

      descriptionInput.value = "";
      amountInput.value = "";

      descriptionInput.focus();
    } else {
      alert("Por favor, preencha a descrição e um valor válido.");
    }
  });

  renderExpenses();
});
