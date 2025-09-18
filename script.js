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

// Listener para o botão de alternar tema (se existir na página)
if (themeToggleButton) {
    themeToggleButton.addEventListener('click', () => {
        if (body.classList.contains('light-theme')) {
            applyTheme('dark');
        } else {
            applyTheme('light');
        }
    });
}

// --- Configuração e Inicialização do Firebase ---
const firebaseConfig = {
    apiKey: "AIzaSyAEZVCbz39BiqTj5f129PcrVHxfS6OnzLc",
    authDomain: "gerenciadoremprestimos.firebaseapp.com",
    projectId: "gerenciadoremprestimos",
    storageBucket: "gerenciadoremprestimos.firebasestorage.app",
    messagingSenderId: "365275031835",
    appId: "1:365275031835:web:53177651c6c510003b578c"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();
let currentUserId = null;
let debtors = [];
let currentDebtorId = null;

// --- DOM Elements ---
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const errorMessage = document.getElementById('errorMessage');
const dashboardContainer = document.querySelector('.dashboard-container');
const addDebtorButton = document.getElementById('addDebtorButton');
const addDebtorModal = document.getElementById('addDebtorModal');
const closeButtons = document.querySelectorAll('.close-button');
const addDebtorForm = document.getElementById('addDebtorForm');
const debtorsList = document.getElementById('debtorsList');
const searchInput = document.getElementById('searchInput');
const sortOptions = document.getElementById('sortOptions');
const logoutButton = document.getElementById('logoutButton');
const debtorDetailModal = document.getElementById('debtorDetailModal');
const deleteDebtorButton = document.getElementById('deleteDebtorButton');
const addPaymentButton = document.getElementById('addPaymentButton');
const fillAmountButton = document.getElementById('fillAmountButton');

// --- Funções de Exibição e Erro ---
function showElement(element) {
    if (element) {
        element.style.display = 'flex';
    }
}

function hideElement(element) {
    if (element) {
        element.style.display = 'none';
    }
}

function showError(message) {
    errorMessage.textContent = message;
    showElement(errorMessage);
    setTimeout(() => {
        hideElement(errorMessage);
    }, 5000);
}

// --- Lógica de Autenticação ---
if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = loginForm['loginEmail'].value;
        const password = loginForm['loginPassword'].value;

        auth.signInWithEmailAndPassword(email, password)
            .then(() => {
                window.location.href = 'dashboard.html';
            })
            .catch((error) => {
                showError(error.message);
            });
    });
}

if (registerForm) {
    registerForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = registerForm['registerEmail'].value;
        const password = registerForm['registerPassword'].value;

        auth.createUserWithEmailAndPassword(email, password)
            .then(() => {
                showError("Conta criada com sucesso! Redirecionando para o login...");
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 3000);
            })
            .catch((error) => {
                showError(error.message);
            });
    });
}

if (logoutButton) {
    logoutButton.addEventListener('click', () => {
        auth.signOut().then(() => {
            window.location.href = 'index.html';
        }).catch((error) => {
            showError("Erro ao fazer logout.");
        });
    });
}

// --- Funções do Dashboard ---
function renderDebtors() {
    debtorsList.innerHTML = '';
    if (debtors.length === 0) {
        debtorsList.innerHTML = '<p class="no-debtors-message">Nenhum devedor cadastrado ainda. Clique em "Adicionar Novo Devedor" para começar.</p>';
        updateSummaryCards();
        return;
    }

    const filteredAndSortedDebtors = filterAndSortDebtors();

    filteredAndSortedDebtors.forEach(debtor => {
        const debtorCard = document.createElement('div');
        debtorCard.className = 'debtor-card';
        debtorCard.setAttribute('data-id', debtor.id);
        
        let totalReceived = debtor.payments.reduce((sum, payment) => sum + payment.amount, 0);
        let remainingAmount = debtor.totalToReceive - totalReceived;

        debtorCard.innerHTML = `
            <h3>${debtor.name}</h3>
            <p><strong>Empréstimo:</strong> R$ ${debtor.loanAmount.toFixed(2)}</p>
            <p><strong>Saldo Devedor:</strong> R$ ${remainingAmount.toFixed(2)}</p>
            <button class="view-details-button" data-id="${debtor.id}">Ver Detalhes</button>
        `;

        debtorsList.appendChild(debtorCard);
    });

    updateSummaryCards();
    attachCardListeners();
}

function updateSummaryCards() {
    const totalReceivedAmountEl = document.getElementById('totalReceivedAmount');
    const totalToReceiveAmountEl = document.getElementById('totalToReceiveAmount');
    const totalDebtorsCountEl = document.getElementById('totalDebtorsCount');

    const totalReceived = debtors.reduce((sum, debtor) => {
        const received = debtor.payments.reduce((subSum, payment) => subSum + payment.amount, 0);
        return sum + received;
    }, 0);

    const totalToReceive = debtors.reduce((sum, debtor) => sum + debtor.totalToReceive, 0);

    if (totalReceivedAmountEl) {
        totalReceivedAmountEl.textContent = `R$ ${totalReceived.toFixed(2)}`;
    }
    if (totalToReceiveAmountEl) {
        totalToReceiveAmountEl.textContent = `R$ ${totalToReceive.toFixed(2)}`;
    }
    if (totalDebtorsCountEl) {
        totalDebtorsCountEl.textContent = debtors.length;
    }
}

function attachCardListeners() {
    document.querySelectorAll('.view-details-button').forEach(button => {
        button.addEventListener('click', (e) => {
            const debtorId = e.target.getAttribute('data-id');
            currentDebtorId = debtorId;
            showDebtorDetails(debtorId);
        });
    });
}

function showDebtorDetails(id) {
    const debtor = debtors.find(d => d.id === id);
    if (!debtor) {
        console.error('Devedor não encontrado');
        return;
    }

    // Preencher detalhes do modal
    document.getElementById('detailName').textContent = debtor.name;
    document.getElementById('detailLoanAmount').textContent = debtor.loanAmount.toFixed(2);
    document.getElementById('detailInterestRate').textContent = debtor.interestRate;
    document.getElementById('detailTotalToReceive').textContent = debtor.totalToReceive.toFixed(2);
    document.getElementById('detailInstallment').textContent = debtor.installments;
    document.getElementById('detailStartDate').textContent = debtor.startDate;
    
    // Atualiza os valores dinâmicos
    renderPaymentsGrid(debtor);

    // Botão de deletar
    deleteDebtorButton.onclick = () => {
        if (confirm(`Tem certeza que deseja excluir ${debtor.name}? Esta ação é irreversível.`)) {
            db.collection('debtors').doc(debtor.id).delete()
                .then(() => {
                    hideElement(debtorDetailModal);
                    console.log("Devedor excluído com sucesso!");
                    showError("Devedor excluído com sucesso!", true); // Usando a mesma função para sucesso
                })
                .catch((error) => {
                    console.error("Erro ao remover devedor: ", error);
                    showError("Erro ao excluir. Tente novamente.");
                });
        }
    };
    
    showElement(debtorDetailModal);
}

function renderPaymentsGrid(debtor) {
    const paymentsGrid = document.getElementById('paymentsGrid');
    paymentsGrid.innerHTML = '';
    
    const totalReceived = debtor.payments.reduce((sum, payment) => sum + payment.amount, 0);
    const remainingAmount = debtor.totalToReceive - totalReceived;

    document.getElementById('detailTotalPaid').textContent = totalReceived.toFixed(2);
    document.getElementById('detailRemainingAmount').textContent = remainingAmount.toFixed(2);
    
    if (debtor.payments.length === 0) {
        paymentsGrid.innerHTML = '<p class="no-payments-message">Nenhum pagamento registrado ainda.</p>';
        return;
    }
    
    debtor.payments.forEach(payment => {
        const paymentCard = document.createElement('div');
        paymentCard.className = 'payment-card';
        paymentCard.innerHTML = `
            <p><strong>Valor:</strong> R$ ${payment.amount.toFixed(2)}</p>
            <p><strong>Data:</strong> ${payment.date}</p>
        `;
        paymentsGrid.appendChild(paymentCard);
    });
}

// Lógica de Pagamento
if (addPaymentButton) {
    addPaymentButton.addEventListener('click', () => {
        const amount = parseFloat(document.getElementById('paymentAmount').value);
        const date = document.getElementById('paymentDate').value;
        
        if (isNaN(amount) || amount <= 0 || !date) {
            showError("Preencha um valor e data válidos para o pagamento.");
            return;
        }

        const debtor = debtors.find(d => d.id === currentDebtorId);
        if (!debtor) {
            showError("Erro: Devedor não encontrado.");
            return;
        }

        const updatedPayments = [
            ...debtor.payments,
            { amount, date }
        ];

        db.collection('debtors').doc(currentDebtorId).update({
            payments: updatedPayments
        })
        .then(() => {
            console.log("Pagamento adicionado com sucesso!");
            document.getElementById('paymentAmount').value = '';
            document.getElementById('paymentDate').value = '';
            showError("Pagamento adicionado com sucesso!", true);
            // Firestore onSnapshot listener irá atualizar a UI automaticamente
        })
        .catch((error) => {
            console.error("Erro ao adicionar pagamento: ", error);
            showError("Erro ao adicionar pagamento. Tente novamente.");
        });
    });
}

// Lógica de preencher valor
if (fillAmountButton) {
    fillAmountButton.addEventListener('click', () => {
        const debtor = debtors.find(d => d.id === currentDebtorId);
        if (debtor) {
            const totalPaid = debtor.payments.reduce((sum, payment) => sum + payment.amount, 0);
            const remaining = debtor.totalToReceive - totalPaid;
            document.getElementById('paymentAmount').value = remaining.toFixed(2);
        }
    });
}

// Filtro e Ordenação
function filterAndSortDebtors() {
    let filteredDebtors = [...debtors];
    const searchTerm = searchInput.value.toLowerCase();
    const sortValue = sortOptions.value;

    // Filtro
    if (searchTerm) {
        filteredDebtors = filteredDebtors.filter(debtor =>
            debtor.name.toLowerCase().includes(searchTerm)
        );
    }

    // Ordenação
    filteredDebtors.sort((a, b) => {
        if (sortValue === 'name') {
            return a.name.localeCompare(b.name);
        } else if (sortValue === 'loanAmount-desc') {
            return b.loanAmount - a.loanAmount;
        } else if (sortValue === 'loanAmount-asc') {
            return a.loanAmount - b.loanAmount;
        } else if (sortValue === 'totalToReceive-desc') {
            return (b.totalToReceive - b.payments.reduce((sum, p) => sum + p.amount, 0)) -
                   (a.totalToReceive - a.payments.reduce((sum, p) => sum + p.amount, 0));
        } else if (sortValue === 'totalToReceive-asc') {
            return (a.totalToReceive - a.payments.reduce((sum, p) => sum + p.amount, 0)) -
                   (b.totalToReceive - b.payments.reduce((sum, p) => sum + p.amount, 0));
        } else if (sortValue === 'lastPayment') {
            const lastPaymentA = a.payments.length > 0 ? a.payments[a.payments.length - 1].date : '1900-01-01';
            const lastPaymentB = b.payments.length > 0 ? b.payments[b.payments.length - 1].date : '1900-01-01';
            return new Date(lastPaymentB) - new Date(lastPaymentA);
        } else if (sortValue === 'startDate') {
             return new Date(b.startDate) - new Date(a.startDate);
        }
        return 0;
    });

    return filteredDebtors;
}

if (searchInput) {
    searchInput.addEventListener('input', renderDebtors);
}

if (sortOptions) {
    sortOptions.addEventListener('change', renderDebtors);
}

// --- Listeners de Modal ---
if (addDebtorButton) {
    addDebtorButton.addEventListener('click', () => {
        showElement(addDebtorModal);
    });
}

closeButtons.forEach(button => {
    button.addEventListener('click', () => {
        hideElement(addDebtorModal);
        hideElement(debtorDetailModal);
    });
});

window.addEventListener('click', (event) => {
    if (event.target === addDebtorModal) {
        hideElement(addDebtorModal);
    }
    if (event.target === debtorDetailModal) {
        hideElement(debtorDetailModal);
    }
});

// --- Lógica de Adição de Devedor ---
if (addDebtorForm) {
    addDebtorForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const name = addDebtorForm['debtorName'].value;
        const loanAmount = addDebtorForm['loanAmount'].value;
        const interestRate = addDebtorForm['interestRate'].value;
        const installments = addDebtorForm['installments'].value;
        const startDate = addDebtorForm['startDate'].value;

        const totalToReceive = parseFloat(loanAmount) + (parseFloat(loanAmount) * parseFloat(interestRate) / 100);

        // Obtém o valor da nova frequência de recebimento
        const frequency = document.getElementById('frequency').value;
        
        const newDebtor = {
            name: name,
            loanAmount: parseFloat(loanAmount),
            interestRate: parseFloat(interestRate),
            totalToReceive: totalToReceive,
            installments: installments,
            startDate: startDate,
            frequency: frequency, // <-- Nova propriedade adicionada aqui
            userId: currentUserId,
            payments: []
        };

        db.collection('debtors').add(newDebtor)
            .then(() => {
                hideElement(addDebtorModal);
                addDebtorForm.reset();
                showError("Devedor adicionado com sucesso!", true);
                // O listener onSnapshot já vai atualizar a lista
            })
            .catch((error) => {
                console.error("Erro ao adicionar devedor: ", error);
                showError("Erro ao adicionar devedor. Tente novamente.");
            });
    });
}

// --- Carregar Devedores (inicialização) ---
function setupRealtimeDebtorsListener() {
    auth.onAuthStateChanged((user) => {
        if (user) {
            currentUserId = user.uid;
            db.collection('debtors')
              .where('userId', '==', currentUserId) // FILTRA OS DADOS PELO ID DO USUÁRIO
              .onSnapshot((snapshot) => {
                debtors = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                renderDebtors();

                if (debtorDetailModal.style.display === 'flex' && currentDebtorId) {
                    const currentDebtorInModal = debtors.find(d => d.id === currentDebtorId);
                    if (currentDebtorInModal) {
                        renderPaymentsGrid(currentDebtorInModal);
                    } else {
                        // Se o devedor foi excluído enquanto o modal estava aberto, feche-o
                        debtorDetailModal.style.display = 'none';
                    }
                }
            }, (error) => {
                console.error("Erro ao carregar devedores do Firestore:", error);
                showError("Erro ao carregar dados. Verifique sua conexão ou as regras do Firebase.");
                debtorsList.innerHTML = '<p class="loading-message error">Erro ao carregar dados. Tente novamente mais tarde.</p>';
            });
        } else {
            currentUserId = null; // Nenhum usuário logado
            debtors = []; // Limpa a lista de devedores
            renderDebtors(); // Renderiza a lista vazia
            console.log("Nenhum usuário logado.");
        }
    });
}
setupRealtimeDebtorsListener();
