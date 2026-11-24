
// ==========================================
// BUBBLE TOOLS
// ==========================================

// Хранилище данных
function readArray(key) {
    try {
        const data = JSON.parse(localStorage.getItem(key) || "[]");
        return Array.isArray(data) ? data : [];
    } catch {
        return [];
    }
}

function saveData(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
}

function createId() {
    return Date.now() + "-" + Math.random().toString(16).slice(2);
}

function getDateKey(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

// ==========================================
// 1. ТЕМЫ
// ==========================================

const themeToggle = document.getElementById("theme-toggle");

if (localStorage.getItem("bubble-tools-theme") === "dark") {
    document.body.classList.add("dark");
}

function updateThemeButton() {
    if (!themeToggle) return;

    themeToggle.textContent = document.body.classList.contains("dark")
        ? "Светлая тема"
        : "Тёмная тема";
}

updateThemeButton();

themeToggle?.addEventListener("click", () => {
    document.body.classList.toggle("dark");

    const theme = document.body.classList.contains("dark")
        ? "dark"
        : "light";

    localStorage.setItem("bubble-tools-theme", theme);
    updateThemeButton();
});

// ==========================================
// 2. КАЛЬКУЛЯТОР
// ==========================================

const calcDisplay = document.getElementById("calc-display");
const calcButtons = document.querySelectorAll("[data-value]");
const calcClear = document.getElementById("calc-clear");
const calcEquals = document.getElementById("calc-equals");

let currentInput = "0";
let storedValue = null;
let currentOperator = null;
let resetInput = false;

function updateCalculator() {
    calcDisplay.value = currentInput;
}

function calculate() {
    if (currentOperator === null || storedValue === null) return;

    const rightValue = Number(currentInput);
    let result;

    switch (currentOperator) {
        case "+":
            result = storedValue + rightValue;
            break;
        case "-":
            result = storedValue - rightValue;
            break;
        case "*":
            result = storedValue * rightValue;
            break;
        case "/":
            if (rightValue === 0) {
                calcDisplay.value = "Деление на 0";
                currentInput = "0";
                storedValue = null;
                currentOperator = null;
                resetInput = true;
                return;
            }
            result = storedValue / rightValue;
            break;
    }

    currentInput = String(Number(result.toPrecision(10)));
    storedValue = null;
    currentOperator = null;
    resetInput = true;
    updateCalculator();
}

calcButtons.forEach(button => {
    button.addEventListener("click", () => {
        const value = button.dataset.value;

        if (["+", "-", "*", "/"].includes(value)) {
            if (currentOperator !== null && !resetInput) {
                calculate();
            }

            storedValue = Number(currentInput);
            currentOperator = value;
            resetInput = true;
            return;
        }

        if (value === ".") {
            if (resetInput) {
                currentInput = "0.";
                resetInput = false;
            } else if (!currentInput.includes(".")) {
                currentInput += ".";
            }
        } else {
            if (resetInput || currentInput === "0") {
                currentInput = value;
                resetInput = false;
            } else {
                currentInput += value;
            }
        }

        updateCalculator();
    });
});

calcEquals.addEventListener("click", calculate);

calcClear.addEventListener("click", () => {
    currentInput = "0";
    storedValue = null;
    currentOperator = null;
    resetInput = false;
    updateCalculator();
});

// ==========================================

// ==========================================
// 3. CLOUD TASKS — ОБЛАЧНЫЕ ЗАДАЧИ
// ==========================================

const taskForm = document.getElementById("task-form");
const taskInput = document.getElementById("task-input");
const taskList = document.getElementById("task-list");

const tasksSubmit = taskForm.querySelector('button[type="submit"]');

let tasks = [];
let taskUserId = null;
let taskLoadVersion = 0;

// Отображение задач
function renderTasks() {
    taskList.innerHTML = "";

    if (!taskUserId) {
        const li = document.createElement("li");
        li.textContent = "Войди в аккаунт, чтобы открыть облачные задачи.";
        taskList.appendChild(li);
        if (window.bubbleDashboardReady) updateDashboard();
        return;
    }

    if (tasks.length === 0) {
        const li = document.createElement("li");
        li.textContent = "Пока задач нет. Добавь первую!";
        taskList.appendChild(li);
        if (window.bubbleDashboardReady) updateDashboard();
        return;
    }

    tasks.forEach(task => {
        const li = document.createElement("li");
        li.dataset.taskId = task.id;

        if (task.completed) {
            li.classList.add("completed");
        }

        const text = document.createElement("span");
        text.textContent = task.text;

        // Отметка выполнения
        const completeButton = document.createElement("button");
        completeButton.type = "button";
        completeButton.textContent = task.completed ? "↶" : "✓";

        completeButton.addEventListener("click", async () => {
            completeButton.disabled = true;

            try {
                const { error } = await window.supabaseClient
                    .from("tasks")
                    .update({ completed: !task.completed })
                    .eq("id", task.id)
                    .eq("user_id", taskUserId);

                if (error) throw error;

                task.completed = !task.completed;
                renderTasks();

                showToast("Статус задачи обновлён!", "success");

            } catch (error) {
                console.error(error);
                showToast("Не удалось обновить задачу", "error");
                completeButton.disabled = false;
            }
        });

        // Удаление задачи
        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.textContent = "×";

        deleteButton.addEventListener("click", async () => {
            deleteButton.disabled = true;

            try {
                const { error } = await window.supabaseClient
                    .from("tasks")
                    .delete()
                    .eq("id", task.id)
                    .eq("user_id", taskUserId);

                if (error) throw error;

                tasks = tasks.filter(item => item.id !== task.id);
                renderTasks();

                showToast("Задача удалена!", "success");

            } catch (error) {
                console.error(error);
                showToast("Не удалось удалить задачу", "error");
                deleteButton.disabled = false;
            }
        });

        li.append(text, completeButton, deleteButton);
        taskList.appendChild(li);
    });
    if (window.bubbleDashboardReady) updateDashboard();
}


// Загрузка задач из облака
async function loadCloudTasks(userId) {
    const version = ++taskLoadVersion;

    taskUserId = userId;
    tasks = [];
    renderTasks();

    try {
        let { data, error } = await window.supabaseClient
            .from("tasks")
            .select("id, text, completed, created_at")
            .eq("user_id", userId)
            .order("created_at", { ascending: false });

        if (error) throw error;

        // Перенос старых локальных задач при первом входе
        if (!localStorage.getItem("bubble-tools-tasks-migrated")) {

            if (data.length === 0) {
                const oldTasks = readArray("bubble-tools-tasks");

                const oldTaskRows = oldTasks
                    .filter(task => typeof task.text === "string" && task.text.trim())
                    .map(task => ({
                        user_id: userId,
                        text: task.text.trim().slice(0, 300),
                        completed: Boolean(task.completed)
                    }));

                if (oldTaskRows.length > 0) {
                    const result = await window.supabaseClient
                        .from("tasks")
                        .insert(oldTaskRows)
                        .select("id, text, completed, created_at");

                    if (result.error) throw result.error;

                    data = result.data || [];
                }
            }

            localStorage.setItem("bubble-tools-tasks-migrated", "true");
        }

        // Не применяем устаревший результат загрузки
        if (version !== taskLoadVersion) return;

        tasks = data || [];
        renderTasks();

        console.log("Облачные задачи загружены:", tasks.length);

    } catch (error) {
        console.error("Ошибка загрузки задач:", error);
        showToast("Не удалось загрузить задачи из облака", "error");
    }
}


// Добавление новой задачи
taskForm.addEventListener("submit", async event => {
    event.preventDefault();

    const text = taskInput.value.trim();

    if (!text) return;

    if (!taskUserId) {
        showToast("Сначала войди в аккаунт!", "error");
        return;
    }

    tasksSubmit.disabled = true;

    try {
        const { data, error } = await window.supabaseClient
            .from("tasks")
            .insert({
                user_id: taskUserId,
                text: text,
                completed: false
            })
            .select("id, text, completed, created_at")
            .single();

        if (error) throw error;

        tasks.unshift(data);
        taskForm.reset();
        renderTasks();

        showToast("Задача сохранена в облаке!", "success");

    } catch (error) {
        console.error("Ошибка добавления задачи:", error);
        showToast("Не удалось сохранить задачу", "error");

    } finally {
        tasksSubmit.disabled = false;
    }
});


// Следим за входом и выходом пользователей
window.supabaseClient.auth.onAuthStateChange((event, session) => {
    setTimeout(() => {
        if (session?.user?.id) {
            loadCloudTasks(session.user.id);
        } else {
            taskLoadVersion++;
            taskUserId = null;
            tasks = [];
            renderTasks();
        }
    }, 0);
});

renderTasks();

console.log("Cloud Tasks подключены!");



// ==========================================
// 4. BUBBLE CLOUD — EXPENSES & CURRENCIES
// ==========================================

const expenseForm = document.getElementById("expense-form");
const expenseTitle = document.getElementById("expense-title");
const expenseAmount = document.getElementById("expense-amount");
const expenseCategory = document.getElementById("expense-category");
const expenseCurrency = document.getElementById("expense-currency");

const expenseList = document.getElementById("expense-list");
const expenseTotal = document.getElementById("expense-total");

const analyticsCurrencySelect =
    document.getElementById("analytics-currency");

const supportedCurrencies = [
    "EUR", "USD", "RUB", "UAH", "GBP", "PLN", "CHF"
];

const currencyNames = {
    EUR: "Евро",
    USD: "Доллар",
    RUB: "Рубль",
    UAH: "Гривна",
    GBP: "Фунт",
    PLN: "Злотый",
    CHF: "Швейцарский франк"
};

const categoryNames = {
    food: "Еда",
    transport: "Транспорт",
    shopping: "Покупки",
    entertainment: "Развлечения",
    subscriptions: "Подписки",
    other: "Другое"
};

const categoryColors = [
    "#B58AE8",
    "#F0A9CC",
    "#8ECFC5",
    "#F4C77E",
    "#91A8EC",
    "#A9A0B8"
];

let selectedAnalyticsCurrency = supportedCurrencies.includes(
    localStorage.getItem("bubble-tools-analytics-currency")
)
    ? localStorage.getItem("bubble-tools-analytics-currency")
    : "EUR";

let expenses = [];
let expenseUserId = null;
let expenseLoadVersion = 0;

let categoryChart = null;
let weeklyChart = null;
let monthlyChart = null;

/* LIVE DASHBOARD */
window.bubbleDashboardReady = true;
function updateDashboard() {
 const active=tasks.filter(task=>!task.completed).length;
 const done=tasks.filter(task=>task.completed).length;
 const selected=expenses.filter(item=>(supportedCurrencies.includes(item.currency)?item.currency:"EUR")===selectedAnalyticsCurrency);
 const now=new Date();
 const key=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`;
 const monthTotal=selected.filter(item=>String(item.spent_on||"").startsWith(key)).reduce((sum,item)=>sum+Number(item.amount||0),0);
 document.getElementById("dashboard-active-tasks").textContent=taskUserId?active:"—";
 document.getElementById("dashboard-done-tasks").textContent=taskUserId?done:"—";
 document.getElementById("dashboard-month-expenses").textContent=expenseUserId?formatExpenseMoney(monthTotal,selectedAnalyticsCurrency):"—";
 document.getElementById("dashboard-expense-count").textContent=expenseUserId?selected.length:"—";
 document.getElementById("dashboard-month-label").textContent=`${now.toLocaleDateString("ru-RU",{month:"long",year:"numeric"})} · ${selectedAnalyticsCurrency}`;
 const taskBox=document.getElementById("dashboard-recent-tasks"); taskBox.innerHTML="";
 if(!taskUserId) taskBox.innerHTML="<li>Войди в аккаунт, чтобы увидеть задачи.</li>";
 else if(!tasks.length) taskBox.innerHTML="<li>Пока задач нет.</li>";
 else tasks.slice(0,4).forEach(task=>{const li=document.createElement("li");li.className=task.completed?"is-complete":"";li.textContent=`${task.completed?"✓":"○"} ${task.text}`;taskBox.appendChild(li);});
 const expenseBox=document.getElementById("dashboard-recent-expenses"); expenseBox.innerHTML="";
 if(!expenseUserId) expenseBox.innerHTML="<li>Войди в аккаунт, чтобы увидеть расходы.</li>";
 else if(!selected.length) expenseBox.innerHTML="<li>Пока расходов нет в выбранной валюте.</li>";
 else selected.slice(0,4).forEach(item=>{const li=document.createElement("li");li.textContent=`${item.title} · ${formatExpenseMoney(item.amount,selectedAnalyticsCurrency)}`;expenseBox.appendChild(li);});
}


if (analyticsCurrencySelect) {
    analyticsCurrencySelect.value = selectedAnalyticsCurrency;
}

function getExpenseDateKey(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function formatExpenseMoney(amount, currencyCode) {
    const safeCurrency = supportedCurrencies.includes(currencyCode)
        ? currencyCode
        : "EUR";

    return new Intl.NumberFormat("ru-RU", {
        style: "currency",
        currency: safeCurrency
    }).format(Number(amount) || 0);
}

// ==========================================
// 5. RENDER EXPENSES
// ==========================================

function renderExpenses() {
    expenseList.innerHTML = "";

    const filteredExpenses = expenses.filter(item =>
        (supportedCurrencies.includes(item.currency)
            ? item.currency
            : "EUR") === selectedAnalyticsCurrency
    );

    const total = filteredExpenses.reduce(
        (sum, item) => sum + Number(item.amount || 0),
        0
    );

    expenseTotal.textContent = formatExpenseMoney(
        total,
        selectedAnalyticsCurrency
    );

    if (!expenseUserId) {
        const li = document.createElement("li");
        li.textContent = "Войди в аккаунт, чтобы увидеть расходы.";
        expenseList.appendChild(li);
        updateAnalytics();
        return;
    }

    if (expenses.length === 0) {
        const li = document.createElement("li");
        li.textContent = "Расходов пока нет.";
        expenseList.appendChild(li);
    }

    expenses.forEach(expense => {
        const li = document.createElement("li");

        li.dataset.expenseId = expense.id;

        const currencyCode = supportedCurrencies.includes(expense.currency)
            ? expense.currency
            : "EUR";

        const category = categoryNames[expense.category] || "Другое";

        const text = document.createElement("span");

        text.textContent =
            `${expense.title} (${category}) — ${formatExpenseMoney(
                expense.amount,
                currencyCode
            )}`;

        const remove = document.createElement("button");
        remove.type = "button";
        remove.textContent = "×";

        remove.addEventListener("click", async () => {
            remove.disabled = true;

            try {
                const { error } = await window.supabaseClient
                    .from("expenses")
                    .delete()
                    .eq("id", expense.id)
                    .eq("user_id", expenseUserId);

                if (error) throw error;

                expenses = expenses.filter(
                    item => item.id !== expense.id
                );

                renderExpenses();

                showToast("Расход удалён!", "success");

            } catch (error) {
                console.error(error);
                showToast("Не удалось удалить расход", "error");
                remove.disabled = false;
            }
        });

        li.append(text, remove);
        expenseList.appendChild(li);
    });

    updateAnalytics();
}

// ==========================================
// 6. LOAD CLOUD EXPENSES
// ==========================================

async function loadCloudExpenses(userId) {
    const version = ++expenseLoadVersion;

    expenseUserId = userId;
    expenses = [];

    renderExpenses();

    const migrationKey =
        "bubble-tools-expenses-migrated-" + userId;

    try {
        let { data, error } = await window.supabaseClient
            .from("expenses")
            .select(
                "id, title, amount, category, currency, spent_on, created_at"
            )
            .eq("user_id", userId)
            .order("created_at", { ascending: false });

        if (error) throw error;

        if (!localStorage.getItem(migrationKey)) {

            if (data.length === 0) {
                const oldExpenses =
                    readArray("bubble-tools-expenses");

                const rows = oldExpenses
                    .filter(item =>
                        typeof item.title === "string" &&
                        item.title.trim() &&
                        Number(item.amount) > 0 &&
                        Number.isFinite(Number(item.amount))
                    )
                    .map(item => ({
                        user_id: userId,
                        title: item.title.trim().slice(0, 200),
                        amount: Number(item.amount),
                        category: categoryNames[item.category]
                            ? item.category
                            : "other",
                        currency: supportedCurrencies.includes(item.currency)
                            ? item.currency
                            : "EUR",
                        spent_on:
                            /^\d{4}-\d{2}-\d{2}$/.test(item.date || "")
                                ? item.date
                                : getExpenseDateKey()
                    }));

                if (rows.length > 0) {
                    const result = await window.supabaseClient
                        .from("expenses")
                        .insert(rows)
                        .select(
                            "id, title, amount, category, currency, spent_on, created_at"
                        );

                    if (result.error) throw result.error;

                    data = result.data || [];
                }
            }

            localStorage.setItem(migrationKey, "true");
        }

        if (version !== expenseLoadVersion) return;

        expenses = (data || []).map(item => ({
            ...item,
            currency: supportedCurrencies.includes(item.currency)
                ? item.currency
                : "EUR"
        }));

        renderExpenses();

        console.log("Облачные расходы загружены:", expenses.length);

    } catch (error) {
        console.error("Ошибка загрузки расходов:", error);
        showToast("Не удалось загрузить расходы", "error");
    }
}

// ==========================================
// 7. ADD EXPENSE
// ==========================================

expenseForm.addEventListener("submit", async event => {
    event.preventDefault();

    const title = expenseTitle.value.trim();
    const amount = Number(expenseAmount.value);

    const category = expenseCategory.value;

    const currencyCode = supportedCurrencies.includes(
        expenseCurrency.value
    )
        ? expenseCurrency.value
        : "EUR";

    if (!title || !Number.isFinite(amount) || amount <= 0) {
        showToast("Проверь название и сумму", "error");
        return;
    }

    if (!expenseUserId) {
        showToast("Сначала войди в аккаунт!", "error");
        return;
    }

    const submitButton =
        expenseForm.querySelector('button[type="submit"]');

    submitButton.disabled = true;

    try {
        const { data, error } = await window.supabaseClient
            .from("expenses")
            .insert({
                user_id: expenseUserId,
                title: title,
                amount: amount,
                category: categoryNames[category] ? category : "other",
                currency: currencyCode,
                spent_on: getExpenseDateKey()
            })
            .select(
                "id, title, amount, category, currency, spent_on, created_at"
            )
            .single();

        if (error) throw error;

        expenses.unshift(data);

        expenseForm.reset();

        // Сохраняем выбранную валюту после очистки полей формы.
        const lastCurrency = localStorage.getItem(
            "bubble-tools-last-expense-currency"
        );
        const defaultCurrency = localStorage.getItem(
            "bubble-tools-default-currency"
        );

        expenseCurrency.value = supportedCurrencies.includes(lastCurrency)
            ? lastCurrency
            : (supportedCurrencies.includes(defaultCurrency)
                ? defaultCurrency
                : "EUR");

        renderExpenses();

        showToast("Расход сохранён в облаке!", "success");

    } catch (error) {
        console.error("Ошибка добавления расхода:", error);
        showToast("Не удалось сохранить расход", "error");

    } finally {
        submitButton.disabled = false;
    }
});

// ==========================================
// 8. ANALYTICS CURRENCY FILTER
// ==========================================

analyticsCurrencySelect.addEventListener("change", () => {
    const value = analyticsCurrencySelect.value;

    if (!supportedCurrencies.includes(value)) return;

    selectedAnalyticsCurrency = value;

    localStorage.setItem(
        "bubble-tools-analytics-currency",
        value
    );

    renderExpenses();
});

// ==========================================
// 9. FINANCIAL STATISTICS
// ==========================================

function updateAnalytics() {
    const filteredExpenses = expenses.filter(item =>
        (supportedCurrencies.includes(item.currency)
            ? item.currency
            : "EUR") === selectedAnalyticsCurrency
    );

    const total = filteredExpenses.reduce(
        (sum, item) => sum + Number(item.amount || 0),
        0
    );

    const count = filteredExpenses.length;
    const average = count ? total / count : 0;

    document.getElementById("stat-total").textContent =
        formatExpenseMoney(total, selectedAnalyticsCurrency);

    document.getElementById("stat-count").textContent = count;

    document.getElementById("stat-average").textContent =
        formatExpenseMoney(average, selectedAnalyticsCurrency);

    updateDashboard();
    updateCharts();
}

// ==========================================
// 10. CHARTS
// ==========================================

function updateCharts() {
    if (typeof Chart === "undefined") {
        console.error("Chart.js не загружен!");
        return;
    }

    const categoryCanvas =
        document.getElementById("category-chart");

    const weeklyCanvas =
        document.getElementById("weekly-chart");

    if (!categoryCanvas || !weeklyCanvas) return;

    const filteredExpenses = expenses.filter(item =>
        (supportedCurrencies.includes(item.currency)
            ? item.currency
            : "EUR") === selectedAnalyticsCurrency
    );

    // Круговая диаграмма
    const totalsByCategory = {};

    filteredExpenses.forEach(expense => {
        const category = categoryNames[expense.category]
            ? expense.category
            : "other";

        totalsByCategory[category] =
            (totalsByCategory[category] || 0) +
            Number(expense.amount || 0);
    });

    let categories = Object.keys(totalsByCategory);

    const isEmpty = categories.length === 0;

    const categoryLabels = isEmpty
        ? ["Пока нет расходов"]
        : categories.map(key => categoryNames[key]);

    const categoryValues = isEmpty
        ? [1]
        : categories.map(key => totalsByCategory[key]);

    const colors = isEmpty
        ? ["#E5DFEA"]
        : categories.map((key, index) =>
            categoryColors[index % categoryColors.length]
        );

    if (categoryChart) categoryChart.destroy();

    categoryChart = new Chart(categoryCanvas, {
        type: "doughnut",
        data: {
            labels: categoryLabels,
            datasets: [{
                data: categoryValues,
                backgroundColor: colors,
                borderWidth: 0,
                hoverOffset: 9
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: "65%",
            plugins: {
                legend: {
                    position: "bottom"
                },
                tooltip: {
                    callbacks: {
                        label: context =>
                            `${context.label}: ${formatExpenseMoney(
                                context.raw,
                                selectedAnalyticsCurrency
                            )}`
                    }
                }
            }
        }
    });

    // График за последние семь дней
    const lastSevenDays = [];

    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);

        lastSevenDays.push({
            key: getExpenseDateKey(date),
            label: date.toLocaleDateString("ru-RU", {
                weekday: "short",
                day: "numeric"
            })
        });
    }

    const weeklyValues = lastSevenDays.map(day => {
        return filteredExpenses
            .filter(expense => expense.spent_on === day.key)
            .reduce(
                (sum, expense) => sum + Number(expense.amount || 0),
                0
            );
    });

    if (weeklyChart) weeklyChart.destroy();

    weeklyChart = new Chart(weeklyCanvas, {
        type: "bar",
        data: {
            labels: lastSevenDays.map(day => day.label),
            datasets: [{
                label: `Расходы (${selectedAnalyticsCurrency})`,
                data: weeklyValues,
                backgroundColor: "#B58AE8",
                borderRadius: 10,
                maxBarThickness: 35
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: context =>
                            formatExpenseMoney(
                                context.raw,
                                selectedAnalyticsCurrency
                            )
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: value =>
                            formatExpenseMoney(
                                value,
                                selectedAnalyticsCurrency
                            )
                    }
                }
            }
        }
    });

    const currentMonth = new Date();
    const previousMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
    const monthSum = date => {
        const monthKey = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}`;
        return filteredExpenses.filter(item=>String(item.spent_on||"").startsWith(monthKey))
            .reduce((sum,item)=>sum+Number(item.amount||0),0);
    };
    if (monthlyChart) monthlyChart.destroy();
    monthlyChart = new Chart(document.getElementById("monthly-chart"), {
        type:"bar",
        data:{labels:[previousMonth.toLocaleDateString("ru-RU",{month:"long"}),currentMonth.toLocaleDateString("ru-RU",{month:"long"})],
            datasets:[{label:`Расходы (${selectedAnalyticsCurrency})`,data:[monthSum(previousMonth),monthSum(currentMonth)],backgroundColor:["#F04FAD","#00D9F5"],borderRadius:12,maxBarThickness:54}]},
        options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:context=>formatExpenseMoney(context.raw,selectedAnalyticsCurrency)}}},
            scales:{y:{beginAtZero:true,ticks:{callback:value=>formatExpenseMoney(value,selectedAnalyticsCurrency)}}}}
    });

}

// ==========================================
// 11. AUTH STATE FOR EXPENSES
// ==========================================

window.supabaseClient.auth.onAuthStateChange((event, session) => {
    setTimeout(() => {
        if (session?.user?.id) {
            loadCloudExpenses(session.user.id);
        } else {
            expenseLoadVersion++;
            expenseUserId = null;
            expenses = [];

            renderExpenses();
        }
    }, 0);
});

renderExpenses();

console.log("Bubble Tools multi-currency analytics loaded!");


// ==========================================
// 8. CLOUD NOTES — ОБЛАЧНЫЕ ЗАМЕТКИ
// ==========================================

const notesInput = document.getElementById("notes-input");
const saveNote = document.getElementById("save-note");
const notesStatus = document.getElementById("notes-status");

let notesUserId = null;
let notesLoadVersion = 0;

// Загружаем заметки из облака
async function loadCloudNotes(userId) {
    const version = ++notesLoadVersion;

    notesUserId = userId;

    notesInput.disabled = true;
    saveNote.disabled = true;
    notesStatus.textContent = "Загружаем заметку...";

    try {
        const { data, error } = await window.supabaseClient
            .from("notes")
            .select("content")
            .eq("user_id", userId)
            .maybeSingle();

        if (error) throw error;

        if (version !== notesLoadVersion) return;

        if (data) {
            notesInput.value = data.content || "";
        } else {
            // Перенос старой локальной заметки
            const localNote =
                localStorage.getItem("bubble-tools-notes") || "";

            notesInput.value = localNote;

            if (localNote.trim()) {
                const { error: saveError } = await window.supabaseClient
                    .from("notes")
                    .upsert({
                        user_id: userId,
                        content: localNote,
                        updated_at: new Date().toISOString()
                    }, {
                        onConflict: "user_id"
                    });

                if (saveError) throw saveError;
            }
        }

        if (version !== notesLoadVersion) return;

        notesStatus.textContent = "✓ Заметка загружена из облака";

        notesInput.disabled = false;
        saveNote.disabled = false;

    } catch (error) {
        console.error("Ошибка загрузки заметок:", error);

        if (version === notesLoadVersion) {
            notesStatus.textContent = "Ошибка загрузки заметки";
            showToast("Не удалось загрузить заметку", "error");
        }
    }
}


// Сохраняем заметку в облако
saveNote.addEventListener("click", async () => {

    if (!notesUserId) {
        showToast("Сначала войди в аккаунт!", "error");
        return;
    }

    saveNote.disabled = true;
    notesStatus.textContent = "Сохраняем...";

    try {
        const { error } = await window.supabaseClient
            .from("notes")
            .upsert({
                user_id: notesUserId,
                content: notesInput.value,
                updated_at: new Date().toISOString()
            }, {
                onConflict: "user_id"
            });

        if (error) throw error;

        localStorage.setItem(
            "bubble-tools-notes",
            notesInput.value
        );

        notesStatus.textContent = "✓ Сохранено в облако!";
        showToast("Заметка сохранена в облаке!", "success");

    } catch (error) {
        console.error("Ошибка сохранения заметки:", error);

        notesStatus.textContent = "Не удалось сохранить";
        showToast("Ошибка сохранения заметки", "error");

    } finally {
        saveNote.disabled = !notesUserId;
    }
});


// Следим за входом и выходом
window.supabaseClient.auth.onAuthStateChange((event, session) => {

    setTimeout(() => {
        if (session?.user?.id) {

            loadCloudNotes(session.user.id);

        } else {

            notesLoadVersion++;
            notesUserId = null;

            notesInput.value = "";
            notesInput.disabled = true;
            saveNote.disabled = true;

            notesStatus.textContent =
                "Войди в аккаунт, чтобы пользоваться заметками.";
        }
    }, 0);

});

notesInput.disabled = true;
saveNote.disabled = true;

console.log("Cloud Notes подключены!");



/* ==========================================
   9. CLOUD PROFILE — ОБЛАЧНЫЙ ПРОФИЛЬ
========================================== */

const profileForm = document.getElementById("profile-form");
const profileNameInput = document.getElementById("profile-name-input");
const profileName = document.getElementById("profile-name");
const profileAvatar = document.getElementById("profile-avatar");

const profileSaveButton =
    profileForm.querySelector('button[type="submit"]');

let profileUserId = null;
let profileLoadVersion = 0;


// Отображение профиля
function renderCloudProfile(name) {
    const displayName = name || "Пользователь";

    profileName.textContent = displayName;
    profileAvatar.textContent =
        displayName.charAt(0).toUpperCase();

    profileNameInput.value = displayName;
}


// Блокировка формы
function setProfileLocked(locked) {
    profileNameInput.disabled = locked;
    profileSaveButton.disabled = locked;
}


// Загрузка профиля из Supabase
async function loadCloudProfile(userId) {
    const version = ++profileLoadVersion;

    profileUserId = userId;
    setProfileLocked(true);

    profileName.textContent = "Загрузка...";
    profileAvatar.textContent = "…";

    try {
        const { data, error } = await window.supabaseClient
            .from("profiles")
            .select("id, display_name")
            .eq("id", userId)
            .maybeSingle();

        if (error) throw error;

        if (!data) {
            throw new Error(
                "Профиль не найден. Проверь автоматическое создание профиля."
            );
        }

        if (version !== profileLoadVersion) return;

        let displayName = data.display_name || "Пользователь";

        // Перенос старого локального имени в облако
        const oldName = localStorage.getItem("bubble-tools-profile");

        if (
            displayName === "Пользователь" &&
            oldName &&
            oldName !== "Пользователь"
        ) {
            const { error: updateError } = await window.supabaseClient
                .from("profiles")
                .update({ display_name: oldName })
                .eq("id", userId);

            if (updateError) throw updateError;

            displayName = oldName;
        }

        if (version !== profileLoadVersion) return;

        renderCloudProfile(displayName);
        localStorage.setItem("bubble-tools-profile", displayName);

        setProfileLocked(false);

        console.log("Облачный профиль загружен!");

    } catch (error) {
        console.error("Ошибка загрузки профиля:", error);
        showToast("Не удалось загрузить профиль", "error");

        if (version === profileLoadVersion) {
            setProfileLocked(true);
        }
    }
}


// Сохранение имени в облако
profileForm.addEventListener("submit", async event => {
    event.preventDefault();

    if (!profileUserId) {
        showToast("Сначала войди в аккаунт!", "error");
        return;
    }

    const newName = profileNameInput.value.trim();

    if (!newName || newName.length > 30) {
        showToast("Имя должно содержать от 1 до 30 символов", "error");
        return;
    }

    setProfileLocked(true);

    try {
        const { data, error } = await window.supabaseClient
            .from("profiles")
            .update({ display_name: newName })
            .eq("id", profileUserId)
            .select("id, display_name")
            .maybeSingle();

        if (error) throw error;

        if (!data) {
            throw new Error("Профиль не найден или обновление запрещено.");
        }

        renderCloudProfile(data.display_name);

        localStorage.setItem(
            "bubble-tools-profile",
            data.display_name
        );

        showToast("Профиль сохранён в облаке!", "success");

    } catch (error) {
        console.error("Ошибка сохранения профиля:", error);
        showToast("Не удалось сохранить профиль", "error");

    } finally {
        setProfileLocked(!profileUserId);
    }
});


// Следим за авторизацией
window.supabaseClient.auth.onAuthStateChange((event, session) => {
    setTimeout(() => {
        if (session?.user?.id) {
            loadCloudProfile(session.user.id);
        } else {
            profileLoadVersion++;
            profileUserId = null;

            renderCloudProfile("Пользователь");
            setProfileLocked(true);
        }
    }, 0);
});


// Начальное состояние
setProfileLocked(true);
renderCloudProfile("Пользователь");

console.log("Cloud Profile подключён!");


// ==========================================
// 10. BUBBLE TOAST NOTIFICATIONS
// ==========================================

function showToast(message, type = "success") {if (localStorage.getItem("bubble-tools-notifications") === "off") {
    return;
}
    let container = document.querySelector(".toast-container");

    if (!container) {
        container = document.createElement("div");
        container.className = "toast-container";
        document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.textContent = message;

    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add("hide");

        setTimeout(() => {
            toast.remove();

            if (container.children.length === 0) {
                container.remove();
            }
        }, 300);
    }, 3000);
}

/* ==========================================
   BUBBLE CLOUD — AUTHENTICATION
========================================== */

(() => {
    const supabase = window.supabaseClient;

    if (!supabase) {
        console.error("Supabase не подключён!");
        return;
    }

    const authForm = document.getElementById("auth-form");
    const authToggle = document.getElementById("auth-toggle");
    const authTitle = document.getElementById("auth-title");
    const authDescription = document.getElementById("auth-description");
    const authSubmit = document.getElementById("auth-submit");
    const authEmail = document.getElementById("auth-email");
    const authPassword = document.getElementById("auth-password");
    const authMessage = document.getElementById("auth-message");
    const authSession = document.getElementById("auth-session");
    const authUserEmail = document.getElementById("auth-user-email");
    const authLogout = document.getElementById("auth-logout");

    let authMode = "login";

    // Переключение между входом и регистрацией
    function updateAuthMode() {
        const isSignup = authMode === "signup";

        authTitle.textContent = isSignup
            ? "Создать аккаунт"
            : "Вход в аккаунт";

        authDescription.textContent = isSignup
            ? "Зарегистрируйся, чтобы сохранять данные в облаке."
            : "Войди, чтобы получить доступ к своим данным.";

        authSubmit.textContent = isSignup
            ? "Зарегистрироваться"
            : "Войти";

        authToggle.textContent = isSignup
            ? "Уже есть аккаунт? Войти"
            : "Нет аккаунта? Зарегистрироваться";

        authPassword.autocomplete = isSignup
            ? "new-password"
            : "current-password";

        authMessage.textContent = "";
    }

    authToggle.addEventListener("click", () => {
        authMode = authMode === "login" ? "signup" : "login";
        updateAuthMode();
    });

    // Обновление интерфейса при входе и выходе
    function updateAuthUI(session) {
        const loggedIn = Boolean(session);

        authForm.hidden = loggedIn;
        authToggle.hidden = loggedIn;
        authSession.hidden = !loggedIn;

        if (loggedIn) {
            authUserEmail.textContent = session.user.email;
            authTitle.textContent = "Ты вошёл в аккаунт!";
            authDescription.textContent =
                "BUBBLE CLOUD подключён.";
        } else {
            authMode = "login";
            updateAuthMode();
        }
    }

    // Регистрация и вход
    authForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const email = authEmail.value.trim();
        const password = authPassword.value;

        authSubmit.disabled = true;
        authMessage.textContent = "Подключаемся...";

        try {
            if (authMode === "signup") {

                const { data, error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        emailRedirectTo: window.location.href
                    }
                });

                if (error) throw error;

                if (data.session) {
                    authMessage.textContent = "Аккаунт создан!";
                    showToast("Добро пожаловать в Bubble Cloud!", "success");
                } else {
                    authMessage.textContent =
                        "Проверь почту и подтверди свой email.";
                }

            } else {

                const { error } =
                    await supabase.auth.signInWithPassword({
                        email,
                        password
                    });

                if (error) throw error;

                authMessage.textContent = "Вход выполнен!";
                showToast("Ты успешно вошёл!", "success");
            }

        } catch (error) {
            console.error("Ошибка авторизации:", error);

            authMessage.textContent =
                error.message || "Не удалось выполнить операцию.";

            showToast("Ошибка авторизации", "error");

        } finally {
            authSubmit.disabled = false;
        }
    });

    // Выход из текущего устройства
    authLogout.addEventListener("click", async () => {
        authLogout.disabled = true;

        try {
            const { error } = await supabase.auth.signOut({
                scope: "local"
            });

            if (error) throw error;

            showToast("Ты вышел из аккаунта", "success");

        } catch (error) {
            console.error(error);
            showToast("Не удалось выйти", "error");

        } finally {
            authLogout.disabled = false;
        }
    });

    // Следим за состоянием аккаунта
    supabase.auth.onAuthStateChange((event, session) => {
        console.log("Состояние авторизации:", event);
        updateAuthUI(session);
    });

    console.log("Bubble Cloud Auth готов!");
})();

/* ==========================================
   BUBBLE TOOLS 2.0 — SETTINGS FUNCTIONALITY
========================================== */

const defaultCurrencySelect =
    document.getElementById("default-currency");

const settingsThemeSelect =
    document.getElementById("settings-theme");

const notificationsEnabled =
    document.getElementById("notifications-enabled");

const availableCurrencies = supportedCurrencies.slice();


// ==========================================
// 1. ОСНОВНАЯ ВАЛЮТА
// ==========================================

function loadDefaultCurrency() {
    const savedDefault = localStorage.getItem(
        "bubble-tools-default-currency"
    );

    const defaultCurrency = availableCurrencies.includes(savedDefault)
        ? savedDefault
        : "EUR";

    const savedExpenseCurrency = localStorage.getItem(
        "bubble-tools-last-expense-currency"
    );

    defaultCurrencySelect.value = defaultCurrency;

    expenseCurrency.value = availableCurrencies.includes(savedExpenseCurrency)
        ? savedExpenseCurrency
        : defaultCurrency;
}

loadDefaultCurrency();

expenseCurrency.addEventListener("change", () => {
    if (!availableCurrencies.includes(expenseCurrency.value)) return;

    localStorage.setItem(
        "bubble-tools-last-expense-currency",
        expenseCurrency.value
    );
});

defaultCurrencySelect.addEventListener("change", () => {
    const currency = defaultCurrencySelect.value;

    if (!availableCurrencies.includes(currency)) return;

    localStorage.setItem("bubble-tools-default-currency", currency);
    localStorage.setItem("bubble-tools-last-expense-currency", currency);

    expenseCurrency.value = currency;

    showToast("Основная валюта изменена!", "success");
});


// ==========================================
// 2. ТЕМА ПРИЛОЖЕНИЯ
// ==========================================

function syncSettingsTheme() {
    settingsThemeSelect.value =
        document.body.classList.contains("dark") ? "dark" : "light";
}

syncSettingsTheme();

settingsThemeSelect.addEventListener("change", () => {
    const theme = settingsThemeSelect.value;

    document.body.classList.toggle("dark", theme === "dark");
    localStorage.setItem("bubble-tools-theme", theme);

    updateThemeButton();

    showToast(
        theme === "dark"
            ? "Тёмная тема включена"
            : "Светлая тема включена",
        "success"
    );
});

// Обновляем список, если тему меняют кнопкой в верхней панели.
themeToggle.addEventListener("click", syncSettingsTheme);


// ==========================================
// 3. УВЕДОМЛЕНИЯ
// ==========================================

const savedNotifications = localStorage.getItem(
    "bubble-tools-notifications"
);

notificationsEnabled.checked = savedNotifications !== "off";

notificationsEnabled.addEventListener("change", () => {
    const enabled = notificationsEnabled.checked;

    localStorage.setItem(
        "bubble-tools-notifications",
        enabled ? "on" : "off"
    );

    if (enabled) {
        showToast("Уведомления включены!", "success");
    }
});

console.log("Bubble Tools Settings подключены!");
