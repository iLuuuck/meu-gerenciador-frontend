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
    messagingSenderId: "365277402196",
    appId: "1:365277402196:web:65016aa2dd316e718a89c1"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth(); // Referência ao serviço de autenticação

// --- Lógica de Autenticação (Login) ---
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const loginError = document.getElementById('loginError'); // Para exibir erros de login

    if (loginForm) {
        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            if (loginError) loginError.textContent = ''; // Limpa a mensagem de erro anterior

            const email = loginForm.loginEmail.value;
            const password = loginForm.loginPassword.value;

            try {
                await auth.signInWithEmailAndPassword(email, password);
                // Redirecionamento será tratado pelo auth.onAuthStateChanged
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
                if (loginError) loginError.textContent = errorMessage; // Define o texto de erro
                console.error("Erro de login:", error);
            }
        });
    }

    // Listener de estado de autenticação: Redireciona quando o usuário loga/desloga
    auth.onAuthStateChanged((user) => {
const welcomeMessage = document.getElementById('welcomeMessage'); // Adicione esta linha
    if (user) {
        // Usuário logado
        
        // NOVO CÓDIGO AQUI 👇
        if (welcomeMessage) {
            welcomeMessage.textContent = `Bem-vindo(a), ${user.email.split('@')[0]}!`;
            welcomeMessage.style.display = 'block';
        }
        // NOVO CÓDIGO AQUI 👆

        if (window.location.pathname.endsWith('index.html') || window.location.pathname.endsWith('/')) {
            window.location.href = 'dashboard.html';
        }
        // Se já estiver no dashboard, o script continuará
    } else {
        // Usuário deslogado
        
        // NOVO CÓDIGO AQUI 👇
        if (welcomeMessage) {
            welcomeMessage.style.display = 'none';
        }
        // NOVO CÓDIGO AQUI 👆
        
        if (window.location.pathname.endsWith('dashboard.html')) {
            window.location.href = 'index.html'; // Redireciona para login
        }
    }
});


// --- Lógica do Dashboard (agora dependente da autenticação Firebase) ---
// Este código só será executado se estivermos no dashboard.html
if (window.location.pathname.endsWith('dashboard.html')) {
    // --- Variáveis e Elementos do Dashboard ---
    const logoutButton = document.getElementById('logoutButton');
    const addDebtorButton = document.getElementById('addDebtorButton');
    const debtorsList = document.getElementById('debtorsList');
    const errorMessageDiv = document.getElementById('errorMessage');

    // Modals e seus elementos
    const debtorDetailModal = document.getElementById('debtorDetailModal');
    const addEditDebtorModal = document.getElementById('addEditDebtorModal');
    const closeButtons = document.querySelectorAll('.modal .close-button');

    // Elementos do Modal de Detalhes do Devedor
    const detailDebtorName = document.getElementById('detailDebtorName');
    const detailDebtorDescription = document.getElementById('detailDebtorDescription');
    const detailLoanedAmount = document.getElementById('detailLoanedAmount');
    const detailTotalToReceive = document.getElementById('detailTotalToReceive');
    const detailInterestPercentage = document.getElementById('detailInterestPercentage');
    const toggleTotalToReceive = document.getElementById('toggleTotalToReceive');
    const detailInstallments = document.getElementById('detailInstallments');
    const detailAmountPerInstallment = document.getElementById('detailAmountPerInstallment');
    const detailStartDate = document.getElementById('detailStartDate');
    const detailFrequency = document.getElementById('detailFrequency'); // Novo elemento de frequência
    const paymentsGrid = document.getElementById('paymentsGrid');
    const paymentAmountInput = document.getElementById('paymentAmount');
    const paymentDateInput = document.getElementById('paymentDate');
    const addPaymentButton = document.getElementById('addPaymentButton');
    const fillAmountButton = document.getElementById('fillAmountButton');

    // Elementos do Modal de Adicionar/Editar Devedor
    const addEditModalTitle = document.getElementById('addEditModalTitle');
    const addEditDebtorForm = document.getElementById('addEditDebtorForm');
    const debtorNameInput = document.getElementById('debtorName');
    const debtorDescriptionInput = document.getElementById('debtorDescription');
    const loanedAmountInput = document.getElementById('loanedAmount');
    const frequencyInput = document.getElementById('frequency'); // Novo campo de frequência
    const calculationTypeSelect = document.getElementById('calculationType');
    const perInstallmentFields = document.getElementById('perInstallmentFields');
    const percentageFields = document.getElementById('percentageFields');
    const amountPerInstallmentInput = document.getElementById('amountPerInstallmentInput');
    const installmentsInput = document.getElementById('installments'); // Este campo agora está sempre visível
    const interestPercentageInput = document.getElementById('interestPercentageInput');
    const startDateInput = document.getElementById('startDate');
    const saveDebtorButton = document.getElementById('saveDebtorButton');

    // Elementos do filtro
    const filterAllButton = document.getElementById('filterAllButton');
    const filterDailyButton = document.getElementById('filterDailyButton');
    const filterWeeklyButton = document.getElementById('filterWeeklyButton');
    const filterMonthlyButton = document.getElementById('filterMonthlyButton');

    let debtors = [];
    let currentDebtorId = null;
    let selectedPaymentIndex = null;
    let currentUserId = null; // Para armazenar o ID do usuário logado
    let currentFilter = 'all'; // Variável para controlar o filtro atual

    // --- Funções Auxiliares ---

    function formatCurrency(amount) {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount);
    }

    function formatDate(dateString) {
        if (!dateString) return '';
        const [year, month, day] = dateString.split('-');
        return `${day}/${month}/${year}`;
    }

    // Calcula o total a receber e a porcentagem de juros
    function calculateLoanDetails(loanedAmount, amountPerInstallment, installments, interestPercentage, calculationType) {
        let totalToReceive;
        let calculatedAmountPerInstallment;
        let calculatedInstallments = parseInt(installments); // Sempre usa o valor do input de parcelas

        if (isNaN(calculatedInstallments) || calculatedInstallments <= 0) {
            calculatedInstallments = 1; // Garante que o número de parcelas seja pelo menos 1
        }

        if (calculationType === 'perInstallment') {
            calculatedAmountPerInstallment = parseFloat(amountPerInstallment);
            totalToReceive = calculatedAmountPerInstallment * calculatedInstallments;
            interestPercentage = ((totalToReceive - loanedAmount) / loanedAmount * 100);
            if (isNaN(interestPercentage) || !isFinite(interestPercentage)) { // Trata divisão por zero ou infinito
                interestPercentage = 0;
            }
        } else { // percentage
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

    // --- Logout ---
    if (logoutButton) {
        logoutButton.addEventListener('click', async () => {
            try {
                await auth.signOut();
                // O redirecionamento para index.html será tratado pelo auth.onAuthStateChanged
            } catch (error) {
                console.error("Erro ao fazer logout:", error);
                alert("Erro ao fazer logout. Tente novamente.");
            }
        });
    }

    // --- Renderização de Devedores na Lista Principal ---
    function renderDebtors() {
        debtorsList.innerHTML = '';
        if (debtors.length === 0) {
            debtorsList.innerHTML = '<p class="loading-message">Nenhum devedor cadastrado. Clique em "Adicionar Novo Devedor" para começar.</p>';
            return;
        }

        debtors.forEach(debtor => {
            const debtorPayments = Array.isArray(debtor.payments) ? debtor.payments : [];
            const totalPaid = debtorPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
            const remainingAmount = debtor.totalToReceive - totalPaid;

            const debtorItem = document.createElement('div');
            debtorItem.className = 'debtor-item';
            debtorItem.setAttribute('data-id', debtor.id);

            debtorItem.innerHTML = `
                <div class="debtor-info">
                    <h2>${debtor.name}</h2>
                    <p>${debtor.description || 'Sem descrição'}</p>
                    <p>Emprestado: ${formatCurrency(debtor.loanedAmount)}</p>
                    <p>Total a Receber: ${formatCurrency(debtor.totalToReceive)}</p>
                    <p>Restante: <span style="color: ${remainingAmount > 0 ? 'var(--error-color)' : 'var(--success-color)'}">${formatCurrency(remainingAmount)}</span></p>
                </div>
                <div class="debtor-actions">
                    <button class="edit-debtor-btn small-button">Editar</button>
                    <button class="delete-debtor-btn small-button">Excluir</button>
                </div>
            `;

            debtorItem.querySelector('.debtor-info').addEventListener('click', (event) => {
                if (!event.target.closest('.debtor-actions')) {
                     openDebtorDetailModal(debtor.id);
                }
            });

            debtorItem.querySelector('.edit-debtor-btn').addEventListener('click', (event) => {
                event.stopPropagation();
                openAddEditDebtorModal(debtor.id);
            });

            debtorItem.querySelector('.delete-debtor-btn').addEventListener('click', (event) => {
                event.stopPropagation();
                if (confirm(`Tem certeza que deseja excluir ${debtor.name}?`)) {
                    deleteDebtor(debtor.id);
                }
            });

            debtorsList.appendChild(debtorItem);
        });
    }

    // --- Adicionar/Editar Devedor ---
    addDebtorButton.addEventListener('click', () => openAddEditDebtorModal());

    // Lógica para alternar campos de cálculo
    if (calculationTypeSelect) {
        calculationTypeSelect.addEventListener('change', () => {
            if (calculationTypeSelect.value === 'perInstallment') {
                perInstallmentFields.style.display = 'block';
                amountPerInstallmentInput.setAttribute('required', 'required');
                percentageFields.style.display = 'none';
                interestPercentageInput.removeAttribute('required');
            } else { // percentage
                perInstallmentFields.style.display = 'none';
                amountPerInstallmentInput.removeAttribute('required');
                percentageFields.style.display = 'block';
                interestPercentageInput.setAttribute('required', 'required');
            }
            // O campo installmentsInput agora está sempre visível e required no HTML
        });
    }

    addEditDebtorForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const name = debtorNameInput.value;
        const description = debtorDescriptionInput.value;
        const loanedAmount = parseFloat(loanedAmountInput.value);
        const startDate = startDateInput.value;
        const inputInstallments = parseInt(installmentsInput.value); // Sempre lê o número de parcelas
        const frequency = frequencyInput.value; // Pega o novo campo de frequência

        if (isNaN(loanedAmount) || loanedAmount <= 0) {
            showError('Por favor, insira um valor emprestado válido e maior que zero.');
            return;
        }
        if (isNaN(inputInstallments) || inputInstallments <= 0) {
            showError('Por favor, insira um número de parcelas válido e maior que zero.');
            return;
        }

        let totalToReceive, amountPerInstallment, installments, interestPercentage;

        if (calculationTypeSelect.value === 'perInstallment') {
            const inputAmountPerInstallment = parseFloat(amountPerInstallmentInput.value);
            if (isNaN(inputAmountPerInstallment) || inputAmountPerInstallment <= 0) {
                showError('Por favor, insira um valor válido e maior que zero para "Valor por Parcela".');
                return;
            }
            ({ totalToReceive, amountPerInstallment, installments, interestPercentage } =
                calculateLoanDetails(loanedAmount, inputAmountPerInstallment, inputInstallments, 0, 'perInstallment'));
        } else { // percentage
            const inputInterestPercentage = parseFloat(interestPercentageInput.value);
            if (isNaN(inputInterestPercentage) || inputInterestPercentage < 0) {
                showError('Por favor, insira uma porcentagem de juros válida e não negativa.');
                return;
            }
            ({ totalToReceive, amountPerInstallment, installments, interestPercentage } =
                calculateLoanDetails(loanedAmount, 0, inputInstallments, inputInterestPercentage, 'percentage'));
        }


        try {
            if (currentDebtorId) {
                // Atualizar devedor existente no Firestore
                const debtorRef = db.collection('debtors').doc(currentDebtorId);
                const doc = await debtorRef.get();
                if (doc.exists) {
                    const oldDebtor = doc.data();
                    // Verifica se o devedor pertence ao usuário logado ANTES de modificar
                    if (oldDebtor.userId !== currentUserId) {
                        showError("Você não tem permissão para modificar este devedor.");
                        return;
                    }

                    let updatedPayments = Array.isArray(oldDebtor.payments) ? [...oldDebtor.payments] : [];

                    // Se o número de parcelas mudou e é menor que o anterior, truncar pagamentos
                    if (installments < updatedPayments.length) {
                        updatedPayments = updatedPayments.slice(0, installments);
                    }

                    await debtorRef.update({
                        name,
                        description,
                        loanedAmount,
                        amountPerInstallment,
                        installments,
                        startDate,
                        totalToReceive,
                        interestPercentage,
                        frequency, // Salva o novo campo de frequência
                        payments: updatedPayments // Mantém ou trunca os pagamentos existentes
                    });
                } else {
                    showError("Devedor não encontrado para atualização.");
                }
            } else {
                // Adicionar novo devedor ao Firestore
                if (!currentUserId) {
                    showError("Erro: Usuário não autenticado. Não é possível adicionar devedor.");
                    return;
                }

                const newDebtorData = {
                    name,
                    description,
                    loanedAmount,
                    amountPerInstallment,
                    installments,
                    startDate,
                    totalToReceive,
                    interestPercentage,
                    frequency, // Salva o novo campo de frequência
                    payments: [],
                    userId: currentUserId // SALVA O ID DO USUÁRIO LOGADO
                };

                await db.collection('debtors').add(newDebtorData);
            }
            addEditDebtorModal.style.display = 'none';
        } catch (error) {
            console.error("Erro ao salvar devedor:", error);
            showError('Erro ao salvar devedor. Verifique o console para mais detalhes.');
        }
    });

    function openAddEditDebtorModal(id = null) {
        addEditDebtorForm.reset();
        currentDebtorId = id;

        // Resetar para o tipo de cálculo padrão ao abrir o modal
        if (calculationTypeSelect) {
            calculationTypeSelect.value = 'perInstallment';
            perInstallmentFields.style.display = 'block';
            amountPerInstallmentInput.setAttribute('required', 'required');
            percentageFields.style.display = 'none';
            interestPercentageInput.removeAttribute('required');
        }
        if(installmentsInput) installmentsInput.setAttribute('required', 'required'); // Garante que parcelas seja sempre obrigatório

        if (id) {
            addEditModalTitle.textContent = 'Editar Devedor';
            const debtor = debtors.find(d => d.id === id);
            if (debtor) {
                debtorNameInput.value = debtor.name;
                debtorDescriptionInput.value = debtor.description;
                loanedAmountInput.value = debtor.loanedAmount;
                startDateInput.value = debtor.startDate;
                installmentsInput.value = debtor.installments; // Preenche o número de parcelas
                if (frequencyInput) frequencyInput.value = debtor.frequency; // Preenche a frequência

                // Preencher campos com base nos dados existentes
                // Se o devedor já tem amountPerInstallment, presume-se que foi calculado assim
                if (debtor.amountPerInstallment && debtor.totalToReceive && debtor.loanedAmount) {
                    // Tenta inferir o tipo de cálculo original para preencher corretamente
                    const calculatedInterestFromInstallment = ((debtor.totalToReceive - debtor.loanedAmount) / debtor.loanedAmount * 100);
                    // Se a porcentagem armazenada for próxima da calculada por parcela, ou se a porcentagem for 0
                    if (Math.abs(calculatedInterestFromInstallment - debtor.interestPercentage) < 0.01 || debtor.interestPercentage === 0) {
                         if(calculationTypeSelect) calculationTypeSelect.value = 'perInstallment';
                         amountPerInstallmentInput.value = debtor.amountPerInstallment;
                         if(perInstallmentFields) perInstallmentFields.style.display = 'block';
                         if(amountPerInstallmentInput) amountPerInstallmentInput.setAttribute('required', 'required');
                         if(percentageFields) percentageFields.style.display = 'none';
                         if(interestPercentageInput) interestPercentageInput.removeAttribute('required');
                    } else {
                         // Caso contrário, assume que foi por porcentagem
                         if(calculationTypeSelect) calculationTypeSelect.value = 'percentage';
                         interestPercentageInput.value = debtor.interestPercentage;
                         if(perInstallmentFields) perInstallmentFields.style.display = 'none';
                         if(amountPerInstallmentInput) amountPerInstallmentInput.removeAttribute('required');
                         if(percentageFields) percentageFields.style.display = 'block';
                         if(interestPercentageInput) interestPercentageInput.setAttribute('required', 'required');
                    }
                } else if (debtor.interestPercentage) {
                    // Se tem porcentagem, mas não parcelas/valor por parcela definidos explicitamente
                    if(calculationTypeSelect) calculationTypeSelect.value = 'percentage';
                    interestPercentageInput.value = debtor.interestPercentage;
                    if(perInstallmentFields) perInstallmentFields.style.display = 'none';
                    if(amountPerInstallmentInput) amountPerInstallmentInput.removeAttribute('required');
                    if(percentageFields) percentageFields.style.display = 'block';
                    if(interestPercentageInput) interestPercentageInput.setAttribute('required', 'required');
                }
            }
        } else {
            addEditModalTitle.textContent = 'Adicionar Novo Devedor';
        }
        addEditDebtorModal.style.display = 'flex';
    }

    async function deleteDebtor(id) {
        try {
            await db.collection('debtors').doc(id).delete();
        } catch (error) {
            console.error("Erro ao excluir devedor:", error);
            showError('Erro ao excluir devedor. Verifique o console para mais detalhes.');
        }
    }

    // --- Modal de Detalhes do Devedor ---
    function openDebtorDetailModal(id) {
        currentDebtorId = id;
        const debtor = debtors.find(d => d.id === id);

        if (debtor) {
            detailDebtorName.textContent = debtor.name;
            detailDebtorDescription.textContent = debtor.description;
            detailLoanedAmount.textContent = formatCurrency(debtor.loanedAmount);
            detailTotalToReceive.textContent = formatCurrency(debtor.totalToReceive);
            detailInterestPercentage.textContent = `${debtor.interestPercentage || 0}%`; // Garante que % juros seja exibido
            detailInstallments.textContent = debtor.installments;
            detailAmountPerInstallment.textContent = formatCurrency(debtor.amountPerInstallment);
            detailStartDate.textContent = formatDate(debtor.startDate);
            detailFrequency.textContent = debtor.frequency === 'daily' ? 'Diário' : debtor.frequency === 'weekly' ? 'Semanal' : 'Mensal';

            const hideTotalToReceivePref = localStorage.getItem('hideTotalToReceive');
            if (hideTotalToReceivePref === 'true') {
                toggleTotalToReceive.checked = true;
                detailTotalToReceive.classList.add('hidden-value');
            } else {
                toggleTotalToReceive.checked = false;
                detailTotalToReceive.classList.remove('hidden-value');
            }

            renderPaymentsGrid(debtor);
            debtorDetailModal.style.display = 'flex';
        }
    }

    if(toggleTotalToReceive) {
        toggleTotalToReceive.addEventListener('change', () => {
            if (toggleTotalToReceive.checked) {
                detailTotalToReceive.classList.add('hidden-value');
                localStorage.setItem('hideTotalToReceive', 'true');
            } else {
                detailTotalToReceive.classList.remove('hidden-value');
                localStorage.setItem('hideTotalToReceive', 'false');
            }
        });
    }

    // --- RENDERIZAÇÃO E LÓGICA DOS QUADRADINHOS DE PAGAMENTO ---
    function renderPaymentsGrid(debtor) {
        paymentsGrid.innerHTML = '';
        selectedPaymentIndex = null;

        const validPayments = (Array.isArray(debtor.payments) ? debtor.payments : []).filter(p => p && typeof p.amount === 'number' && p.amount > 0);
        let consumablePayments = validPayments.map(p => ({ ...p, amountRemaining: p.amount }));
        consumablePayments.sort((a, b) => new Date(a.date) - new Date(b.date));

        for (let i = 0; i < debtor.installments; i++) {
            const installmentNumber = i + 1;
            const expectedAmountForThisInstallment = debtor.amountPerInstallment;
            let paidAmountForThisInstallment = 0;
            let paymentDateForThisInstallment = 'Pendente';
            let isPaid = false;

            for (let j = 0; j < consumablePayments.length; j++) {
                const payment = consumablePayments[j];
                if (payment && payment.amountRemaining > 0) {
                    const amountNeededForThisInstallment = expectedAmountForThisInstallment - paidAmountForThisInstallment;
                    const amountToApply = Math.min(amountNeededForThisInstallment, payment.amountRemaining);

                    paidAmountForThisInstallment += amountToApply;
                    payment.amountRemaining -= amountToApply;

                    if (amountToApply > 0 && paymentDateForThisInstallment === 'Pendente') {
                         paymentDateForThisInstallment = payment.date;
                    }

                    if (paidAmountForThisInstallment >= expectedAmountForThisInstallment - 0.005) { // Tolerância para float
                        isPaid = true;
                        break;
                    }
                }
            }

            const displayAmount = Math.min(paidAmountForThisInstallment, expectedAmountForThisInstallment);
            const displayRemaining = expectedAmountForThisInstallment - displayAmount;

            const paymentSquare = document.createElement('div');
            paymentSquare.className = `payment-square ${isPaid ? 'paid' : ''}`;
            paymentSquare.setAttribute('data-index', i);

            let valueHtml = `<span>${formatCurrency(expectedAmountForThisInstallment)}</span>`;
            if (!isPaid) {
                valueHtml = `<span>${formatCurrency(displayAmount)} (Faltam: ${formatCurrency(displayRemaining)})</span>`;
            }

            let dateHtml = `<span style="font-size: 0.75em; color: ${isPaid ? 'rgba(255,255,255,0.8)' : 'var(--text-color)'};">` +
                            (paymentDateForThisInstallment === 'Pendente' ? 'Pendente' : `Pago: ${formatDate(paymentDateForThisInstallment)}`) +
                            `</span>`;

            paymentSquare.innerHTML = `
                <span>Parc. ${installmentNumber}</span>
                ${valueHtml}
                ${dateHtml}
                ${isPaid ? `<button class="delete-payment-btn" data-payment-original-index="${i}">X</button>` : ''}
            `;

            paymentSquare.addEventListener('click', () => {
                document.querySelectorAll('.payment-square').forEach(sq => sq.classList.remove('selected'));
                if (!isPaid) {
                    paymentSquare.classList.add('selected');
                    selectedPaymentIndex = i;
                    paymentAmountInput.value = (expectedAmountForThisInstallment - paidAmountForThisInstallment).toFixed(2);
                    paymentDateInput.valueAsDate = new Date();
                } else {
                    selectedPaymentIndex = null;
                    paymentAmountInput.value = '';
                    paymentDateInput.valueAsDate = null;
                }
            });

            const deleteBtn = paymentSquare.querySelector('.delete-payment-btn');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (confirm('Tem certeza que deseja remover o último pagamento registrado deste devedor?')) {
                        removeLastPayment(currentDebtorId);
                    }
                });
            }
            paymentsGrid.appendChild(paymentSquare);
        }

        const nextPendingSquare = paymentsGrid.querySelector('.payment-square:not(.paid)');
        if (nextPendingSquare) {
            const nextExpectedAmount = debtor.amountPerInstallment;
            paymentAmountInput.value = nextExpectedAmount.toFixed(2);
            paymentDateInput.valueAsDate = new Date();
            document.querySelectorAll('.payment-square').forEach(sq => sq.classList.remove('selected'));
            nextPendingSquare.classList.add('selected');
            selectedPaymentIndex = parseInt(nextPendingSquare.getAttribute('data-index'));
        } else {
            paymentAmountInput.value = '';
            paymentDateInput.valueAsDate = null;
            selectedPaymentIndex = null;
        }
    }


    // --- Adicionar Pagamento ---
    if(addPaymentButton) {
        addPaymentButton.addEventListener('click', async () => {
            if (currentDebtorId === null) {
                showError('Nenhum devedor selecionado para adicionar pagamento.');
                return;
            }

            const paymentAmount = parseFloat(paymentAmountInput.value);
            const paymentDate = paymentDateInput.value;

            if (isNaN(paymentAmount) || paymentAmount <= 0 || !paymentDate) {
                showError('Por favor, insira um valor e data válidos para o pagamento.');
                return;
            }

            try {
                const debtorRef = db.collection('debtors').doc(currentDebtorId);
                const doc = await debtorRef.get();
                if (doc.exists) {
                    const debtorData = doc.data();
                    // Verifica se o devedor pertence ao usuário logado ANTES de modificar
                    if (debtorData.userId !== currentUserId) {
                        showError("Você não tem permissão para modificar este devedor.");
                        return;
                    }

                    let updatedPayments = Array.isArray(debtorData.payments) ? [...debtorData.payments] : [];
                    updatedPayments.push({ amount: paymentAmount, date: paymentDate });
                    updatedPayments.sort((a, b) => new Date(a.date) - new Date(b.date));

                    await debtorRef.update({ payments: updatedPayments });

                    paymentAmountInput.value = '';
                    paymentDateInput.valueAsDate = new Date();
                    selectedPaymentIndex = null;
                } else {
                    showError("Devedor não encontrado para adicionar pagamento.");
                }
            } catch (error) {
                console.error("Erro ao adicionar pagamento:", error);
                showError('Erro ao adicionar pagamento. Verifique o console para mais detalhes.');
            }
        });
    }

    if(fillAmountButton) {
        fillAmountButton.addEventListener('click', () => {
            if (currentDebtorId === null) return;
            const debtor = debtors.find(d => d.id === currentDebtorId);
            if (debtor) {
                const nextPendingSquare = paymentsGrid.querySelector('.payment-square:not(.paid)');
                if (nextPendingSquare) {
                    const nextExpectedAmount = debtor.amountPerInstallment;
                    paymentAmountInput.value = nextExpectedAmount.toFixed(2);
                    paymentDateInput.valueAsDate = new Date();
                    document.querySelectorAll('.payment-square').forEach(sq => sq.classList.remove('selected'));
                    nextPendingSquare.classList.add('selected');
                    selectedPaymentIndex = parseInt(nextPendingSquare.getAttribute('data-index'));
                } else {
                    paymentAmountInput.value = debtor.amountPerInstallment.toFixed(2);
                    paymentDateInput.valueAsDate = new Date();
                    selectedPaymentIndex = null;
                }
            }
        });
    }


    async function removeLastPayment(debtorId) {
        try {
            const debtorRef = db.collection('debtors').doc(debtorId);
            const doc = await debtorRef.get();
            if (doc.exists) {
                const debtorData = doc.data();
                // Verifica se o devedor pertence ao usuário logado ANTES de modificar
                if (debtorData.userId !== currentUserId) {
                    showError("Você não tem permissão para modificar este devedor.");
                    return;
                }

                let updatedPayments = Array.isArray(debtorData.payments) ? [...debtorData.payments] : [];

                if (updatedPayments.length === 0) {
                    showError('Não há pagamentos para remover.');
                    return;
                }

                updatedPayments.pop();
                await debtorRef.update({ payments: updatedPayments });
            } else {
                showError("Devedor não encontrado para remover pagamento.");
            }
        } catch (error) {
            console.error("Erro ao remover pagamento:", error);
            showError('Erro ao remover pagamento. Verifique o console para mais detalhes.');
        }
    }


    // --- Fechar Modals ---
    closeButtons.forEach(button => {
        button.addEventListener('click', () => {
            debtorDetailModal.style.display = 'none';
            addEditDebtorModal.style.display = 'none';
            selectedPaymentIndex = null;
        });
    });

    window.addEventListener('click', (event) => {
        if (event.target === debtorDetailModal) {
            debtorDetailModal.style.display = 'none';
            selectedPaymentIndex = null;
        }
        if (event.target === addEditDebtorModal) {
            addEditDebtorModal.style.display = 'none';
        }
    });

    // --- Listener em Tempo Real do Firestore (AGORA FILTRADO POR USUÁRIO E FREQUÊNCIA) ---
    // Função para configurar o listener com base no filtro atual
    function setupFirestoreListener() {
        if (!currentUserId) {
            console.log("Usuário não logado, não é possível configurar o listener.");
            return;
        }

        let query = db.collection('debtors').where('userId', '==', currentUserId);

        // Se o filtro não for 'all', adiciona a condição de filtro
        if (currentFilter !== 'all') {
            query = query.where('frequency', '==', currentFilter);
        }

        query.onSnapshot((snapshot) => {
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
    }

    // Função para atualizar o estado visual dos botões de filtro
    function updateFilterButtons(activeButtonId) {
        document.querySelectorAll('.filter-actions .button').forEach(button => {
            if (button.id === activeButtonId) {
                button.classList.remove('button-secondary');
            } else {
                button.classList.add('button-secondary');
            }
        });
    }

    // Event listeners para os botões de filtro
    if(filterAllButton) {
        filterAllButton.addEventListener('click', () => {
            currentFilter = 'all';
            updateFilterButtons('filterAllButton');
            setupFirestoreListener();
        });
    }
    if(filterDailyButton) {
        filterDailyButton.addEventListener('click', () => {
            currentFilter = 'daily';
            updateFilterButtons('filterDailyButton');
            setupFirestoreListener();
        });
    }
    if(filterWeeklyButton) {
        filterWeeklyButton.addEventListener('click', () => {
            currentFilter = 'weekly';
            updateFilterButtons('filterWeeklyButton');
            setupFirestoreListener();
        });
    }
    if(filterMonthlyButton) {
        filterMonthlyButton.addEventListener('click', () => {
            currentFilter = 'monthly';
            updateFilterButtons('filterMonthlyButton');
            setupFirestoreListener();
        });
    }


    // O listener de autenticação agora apenas armazena o UID e chama a função de setup
    auth.onAuthStateChanged((user) => {
        if (user) {
            currentUserId = user.uid; // Armazena o ID do usuário logado
            console.log("Usuário logado:", user.email, "UID:", user.uid);
            setupFirestoreListener(); // Inicia o listener do Firestore
        } else {
            currentUserId = null; // Nenhum usuário logado
            debtors = []; // Limpa a lista de devedores
            renderDebtors(); // Renderiza a lista vazia
            console.log("Nenhum usuário logado.");
        }
    });
}

