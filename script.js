// --- Lógica de Alternância de Tema ---
const themeToggleButton = document.getElementById('themeToggleButton');
const body = document.body;

function applyTheme(theme) {
    if (theme === 'light') {
        body.classList.add('light-theme');
    } else {
        body.classList.remove('light-theme');
    }
    localStorage.setItem('themePreference', theme);
}

// Carrega o tema salvo, se houver
const savedTheme = localStorage.getItem('themePreference');
if (savedTheme) {
    applyTheme(savedTheme);
} else {
    applyTheme('dark'); // Tema padrão se nenhum for salvo
}

// Listener para o botão de alternar tema (se existir na página) com ícone
if (themeToggleButton) {
    themeToggleButton.addEventListener('click', () => {
        if (body.classList.contains('light-theme')) {
            applyTheme('dark');
            themeToggleButton.textContent = '🌙'; // Ícone para modo escuro
        } else {
            applyTheme('light');
            themeToggleButton.textContent = '🌞'; // Ícone para modo claro
        }
    });

    // Define o ícone inicial de acordo com o tema atual
    themeToggleButton.textContent = body.classList.contains('light-theme') ? '🌞' : '🌙';
}

// --- Configuração e Inicialização do Firebase ---
const firebaseConfig = {
    apiKey: "AIzaSyAEZVCbz39BiqTj5f129PcrVHxfS6OnzLc",
    authDomain: "gerenciadoremprestimos.firebaseapp.com",
    projectId: "gerenciadoremprestimos",
    storageBucket: "gerenciadoremprestimos.firebasestorage.app",
    messagingSenderId: "365277402196",
    appId: "1:365277402196:web:65016aa2dd316e718a89c1"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth(); // Referência ao serviço de autenticação

// --- Lógica de Autenticação (Login) ---
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const loginError = document.getElementById('loginError');

    if (loginForm) {
        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            if (loginError) loginError.textContent = '';

            const email = loginForm.loginEmail.value;
            const password = loginForm.loginPassword.value;

            try {
                await auth.signInWithEmailAndPassword(email, password);
            } catch (error) {
                let errorMessage = 'Ocorreu um erro ao fazer login.';
                if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
                    errorMessage = 'E-mail ou senha inválidos.';
                } else if (error.code === 'auth/invalid-email') {
                    errorMessage = 'Formato de e-mail inválido.';
                } else if (error.code === 'auth/too-many-requests') {
                    errorMessage = 'Muitas tentativas de login. Tente novamente mais tarde.';
                } else {
                    errorMessage = `Erro: ${error.message}`;
                }
                if (loginError) loginError.textContent = errorMessage;
                console.error("Erro de login:", error);
            }
        });
    }

    auth.onAuthStateChanged((user) => {
        if (user) {
            if (window.location.pathname.endsWith('index.html') || window.location.pathname.endsWith('/')) {
                window.location.href = 'dashboard.html';
            }
        } else {
            if (window.location.pathname.endsWith('dashboard.html')) {
                window.location.href = 'index.html';
            }
        }
    });
});

// --- Lógica do Dashboard ---
if (window.location.pathname.endsWith('dashboard.html')) {
    const logoutButton = document.getElementById('logoutButton');
    const addDebtorButton = document.getElementById('addDebtorButton');
    const debtorsList = document.getElementById('debtorsList');
    const errorMessageDiv = document.getElementById('errorMessage');

    const debtorDetailModal = document.getElementById('debtorDetailModal');
    const addEditDebtorModal = document.getElementById('addEditDebtorModal');
    const closeButtons = document.querySelectorAll('.modal .close-button');

    const detailDebtorName = document.getElementById('detailDebtorName');
    const detailDebtorDescription = document.getElementById('detailDebtorDescription');
    const detailLoanedAmount = document.getElementById('detailLoanedAmount');
    const detailTotalToReceive = document.getElementById('detailTotalToReceive');
    const detailInterestPercentage = document.getElementById('detailInterestPercentage');
    const toggleTotalToReceive = document.getElementById('toggleTotalToReceive');
    const detailInstallments = document.getElementById('detailInstallments');
    const detailAmountPerInstallment = document.getElementById('detailAmountPerInstallment');
    const detailStartDate = document.getElementById('detailStartDate');
    const detailFrequency = document.getElementById('detailFrequency');
    const paymentsGrid = document.getElementById('paymentsGrid');
    const paymentAmountInput = document.getElementById('paymentAmount');
    const paymentDateInput = document.getElementById('paymentDate');
    const addPaymentButton = document.getElementById('addPaymentButton');
    const fillAmountButton = document.getElementById('fillAmountButton');

    const addEditModalTitle = document.getElementById('addEditModalTitle');
    const addEditDebtorForm = document.getElementById('addEditDebtorForm');
    const debtorNameInput = document.getElementById('debtorName');
    const debtorDescriptionInput = document.getElementById('debtorDescription');
    const loanedAmountInput = document.getElementById('loanedAmount');
    const frequencyInput = document.getElementById('frequency');
    const calculationTypeSelect = document.getElementById('calculationType');
    const perInstallmentFields = document.getElementById('perInstallmentFields');
    const percentageFields = document.getElementById('percentageFields');
    const amountPerInstallmentInput = document.getElementById('amountPerInstallmentInput');
    const installmentsInput = document.getElementById('installments');
    const interestPercentageInput = document.getElementById('interestPercentageInput');
    const startDateInput = document.getElementById('startDate');
    const saveDebtorButton = document.getElementById('saveDebtorButton');

    const filterAllButton = document.getElementById('filterAllButton');
    const filterDailyButton = document.getElementById('filterDailyButton');
    const filterWeeklyButton = document.getElementById('filterWeeklyButton');
    const filterMonthlyButton = document.getElementById('filterMonthlyButton');

    let debtors = [];
    let currentDebtorId = null;
    let selectedPaymentIndex = null;
    let currentUserId = null;
    let currentFilter = 'all';

    function formatCurrency(amount) {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount);
    }

    function formatDate(dateString) {
        if (!dateString) return '';
        const [year, month, day] = dateString.split('-');
        return `${day}/${month}/${year}`;
    }

    function calculateLoanDetails(loanedAmount, amountPerInstallment, installments, interestPercentage, calculationType) {
        let totalToReceive;
        let calculatedAmountPerInstallment;
        let calculatedInstallments = parseInt(installments);

        if (isNaN(calculatedInstallments) || calculatedInstallments <= 0) {
            calculatedInstallments = 1;
        }

        if (calculationType === 'perInstallment') {
            calculatedAmountPerInstallment = parseFloat(amountPerInstallment);
            totalToReceive = calculatedAmountPerInstallment * calculatedInstallments;
            interestPercentage = ((totalToReceive - loanedAmount) / loanedAmount * 100);
            if (isNaN(interestPercentage) || !isFinite(interestPercentage)) {
                interestPercentage = 0;
            }
        } else {
            interestPercentage = parseFloat(interestPercentage);
            totalToReceive = loanedAmount * (1 + interestPercentage / 100);
            calculatedAmountPerInstallment = totalToReceive / calculatedInstallments;
        }

        return {
            totalToReceive: parseFloat(totalToReceive.toFixed(2)),
            amountPerInstallment: parseFloat(calculatedAmountPerInstallment.toFixed(2)),
            installments: calculatedInstallments,
            interestPercentage: parseFloat(interestPercentage.toFixed(2))
        };
    }

    function showError(message) {
        errorMessageDiv.textContent = message;
        errorMessageDiv.style.display = 'block';
        setTimeout(() => {
            errorMessageDiv.style.display = 'none';
        }, 5000);
    }

    if (logoutButton) {
        logoutButton.addEventListener('click', async () => {
            try {
                await auth.signOut();
            } catch (error) {
                console.error("Erro ao fazer logout:", error);
                alert("Erro ao fazer logout. Tente novamente.");
            }
        });
    }

    // Resto do código do dashboard permanece **igual**, sem alterações
    // ...
}
