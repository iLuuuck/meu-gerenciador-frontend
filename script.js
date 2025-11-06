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
const DEBTORS_COLLECTION = 'debtors'; // Constante para o nome da coleção

// --- Lógica de Autenticação (Login em index.html) ---
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
    
    // Lógica para alternar formulário de login/cadastro (se existir no index.html)
    const registerButton = document.getElementById('registerButton');
    const registerForm = document.getElementById('registerForm');
    const loginSection = document.querySelector('.login-section');
    const registerSection = document.querySelector('.register-section');

    if (registerButton) {
        registerButton.addEventListener('click', () => {
            if(loginSection) loginSection.classList.remove('active');
            if(registerSection) registerSection.classList.add('active');
        });
    }

    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('registerEmail').value;
            const password = document.getElementById('registerPassword').value;
            const confirmPassword = document.getElementById('confirmPassword').value;

            if (password !== confirmPassword) {
                alert('As senhas não coincidem!');
                return;
            }

            try {
                await auth.createUserWithEmailAndPassword(email, password);
                // Redireciona para o painel após o registro
                window.location.href = 'dashboard.html';
            } catch (error) {
                console.error("Erro no registro:", error);
                alert(`Erro de registro: ${error.message}`);
            }
        });
    }

    // Listener de estado de autenticação: Redireciona quando o usuário loga/desloga
    auth.onAuthStateChanged((user) => {
        if (user) {
            // Usuário logado
            if (window.location.pathname.endsWith('index.html') || window.location.pathname.endsWith('/')) {
                window.location.href = 'dashboard.html';
            }
        } else {
            // Usuário deslogado
            if (window.location.pathname.endsWith('dashboard.html')) {
                window.location.href = 'index.html'; // Redireciona para login
            }
        }
    });
});


// --- LÓGICA DO DASHBOARD (dashboard.html) ---
if (window.location.pathname.endsWith('dashboard.html')) {
    // --- VARIÁVEIS DO DOM EXISTENTES ---
    const logoutButton = document.getElementById('logoutButton');
    const addDebtorButton = document.getElementById('addDebtorButton');
    const debtorsList = document.getElementById('debtorsList');
    const errorMessageDiv = document.getElementById('errorMessage');

    // Modals e seus elementos
    const debtorDetailModal = document.getElementById('debtorDetailModal');
    const addEditDebtorModal = document.getElementById('addEditDebtorModal');
    const closeButtons = document.querySelectorAll('.modal .close-button');
    const telegramLinkModal = document.getElementById('telegramLinkModal'); 
    
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
    const detailFrequency = document.getElementById('detailFrequency');
    const detailAccessCode = document.getElementById('detailAccessCode');
    const paymentsGrid = document.getElementById('paymentsGrid');
    const paymentAmountInput = document.getElementById('paymentAmount');
    const paymentDateInput = document.getElementById('paymentDate');
    const addPaymentButton = document.getElementById('addPaymentButton');
    const fillAmountButton = document.getElementById('fillAmountButton');
    const showAllInstallmentsButton = document.getElementById('showAllInstallmentsButton'); 

    // Elementos do Modal de Adicionar/Editar Devedor
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
    
    // Elementos do filtro
    const filterAllButton = document.getElementById('filterAllButton');
    const filterDailyButton = document.getElementById('filterDailyButton');
    const filterWeeklyButton = document.getElementById('filterWeeklyButton');
    const filterMonthlyButton = document.getElementById('filterMonthlyButton');

    // Variáveis de Estado
    let debtors = [];
    let currentDebtorId = null;
    let selectedPaymentIndex = null;
    let currentUserId = null; 
    let currentFilter = 'all'; 
    const linkCodeDurationMinutes = 5; 

    // --- FUNÇÕES DE GERAÇÃO E MODAL DE SUCESSO DO ACCESS CODE (ADICIONADAS) ---
    
    /**
     * Gera um código de acesso alfanumérico aleatório de 6 caracteres.
     * @returns {string} O código de acesso.
     */
    function generateAccessCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    }

    // Variável para referência ao novo modal (successModal)
    const successModal = document.getElementById('successModal');

    function openSuccessModal(code) {
        if (!successModal) {
             alert(`Sucesso! Devedor cadastrado. CÓDIGO DE ACESSO: ${code}`);
             return; 
        }
        document.getElementById('displayedAccessCode').textContent = code;
        successModal.style.display = 'flex';
        successModal.style.zIndex = '1001'; // Garante que esteja acima
    }

    function closeSuccessModal() {
        if (!successModal) return;
        successModal.style.display = 'none';
        addEditDebtorModal.style.display = 'none'; // Fecha o modal de cadastro após o sucesso
    }

    function copyAccessCode() {
        const code = document.getElementById('displayedAccessCode').textContent;
        navigator.clipboard.writeText(code).then(() => {
            alert("Código de Acesso copiado para a área de transferência!");
        }).catch(err => {
             console.error('Erro ao copiar código:', err);
             alert('Não foi possível copiar o código. Tente manualmente.');
        });
    }

    // Adiciona as funções ao escopo global para que o HTML possa chamá-las
    window.closeSuccessModal = closeSuccessModal;
    window.copyAccessCode = copyAccessCode;
    
    // --- FIM DAS FUNÇÕES DE GERAÇÃO E MODAL DE SUCESSO ---


    // --- Funções Auxiliares Existentes ---

    function formatCurrency(amount) {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount);
    }

    function formatDate(timestampOrString) {
        if (!timestampOrString) return 'N/A';

        let date;
        if (typeof timestampOrString === 'object' && typeof timestampOrString.toDate === 'function') {
            date = timestampOrString.toDate();
        } 
        else if (typeof timestampOrString === 'string') {
            date = new Date(timestampOrString);
        } 
        else {
            date = new Date(timestampOrString);
        }

        if (isNaN(date.getTime())) return 'N/A';
        return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
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
            } catch (error) {
                console.error("Erro ao fazer logout:", error);
                alert("Erro ao fazer logout. Tente novamente.");
            }
        });
    }

    // --- Lógica de Cadastro/Edição de Devedor (MODIFICADA COM accessCode) ---
    addDebtorButton.addEventListener('click', () => openAddEditDebtorModal());
    
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
        });
    }

    addEditDebtorForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const name = debtorNameInput.value;
        const description = debtorDescriptionInput.value;
        const loanedAmount = parseFloat(loanedAmountInput.value);
        const startDate = startDateInput.value;
        const inputInstallments = parseInt(installmentsInput.value); 
        const frequency = frequencyInput.value; 

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
                // ATUALIZAR DEVEDOR EXISTENTE
                const debtorRef = db.collection(DEBTORS_COLLECTION).doc(currentDebtorId);
                const doc = await debtorRef.get();
                if (doc.exists) {
                    const oldDebtor = doc.data();
                    if (oldDebtor.userId !== currentUserId) {
                        showError("Você não tem permissão para modificar este devedor.");
                        return;
                    }

                    let updatedPayments = Array.isArray(oldDebtor.payments) ? [...oldDebtor.payments] : [];
                    if (installments < updatedPayments.length) {
                        updatedPayments = updatedPayments.slice(0, installments);
                    }

                    await debtorRef.update({
                        name, description, loanedAmount, amountPerInstallment, installments, startDate, totalToReceive, interestPercentage, frequency, payments: updatedPayments 
                    });
                     addEditDebtorModal.style.display = 'none'; // Fecha o modal após a atualização
                } else {
                    showError("Devedor não encontrado para atualização.");
                }
            } else {
                // ADICIONAR NOVO DEVEDOR (AGORA COM ACCESS CODE E MODAL DE SUCESSO)

                if (!currentUserId) {
                    showError("Erro: Usuário não autenticado. Não é possível adicionar devedor.");
                    return;
                }

                // GERAÇÃO DO CÓDIGO DE ACESSO
                const accessCode = generateAccessCode(); 

                const newDebtorData = {
                    name, description, loanedAmount, amountPerInstallment, installments, startDate, totalToReceive, interestPercentage, frequency, 
                    payments: [],
                    userId: currentUserId, // ID do Admin que cadastrou
                    accessCode: accessCode // NOVO CAMPO SALVO
                };

                await db.collection(DEBTORS_COLLECTION).add(newDebtorData);
                
                // SUCESSO: ABRE O NOVO MODAL EXIBINDO O CÓDIGO
                addEditDebtorModal.style.display = 'none';
                openSuccessModal(accessCode); // <--- Chamada para exibir o código!
            }
            
        } catch (error) {
            console.error("Erro ao salvar devedor:", error);
            showError('Erro ao salvar devedor. Verifique o console para mais detalhes.');
        }
    });

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

    function updateStats() {
      const totalLoanedAmountEl = document.getElementById('totalLoanedAmount');
      const activeClientsEl = document.getElementById('activeClients');
      const totalToReceiveEl = document.getElementById('totalToReceive');
      const toggleHideTotal = document.getElementById('toggleHideTotal');

      if (!debtors || debtors.length === 0) {
        totalLoanedAmountEl.textContent = "R$ 0,00";
        activeClientsEl.textContent = "0";
        totalToReceiveEl.textContent = "R$ 0,00";
        return;
      }

      let totalLoaned = 0;
      let totalToReceiveAmount = 0;

      debtors.forEach(d => {
        totalLoaned += d.loanedAmount || 0;
        totalToReceiveAmount += d.totalToReceive || 0;
      });

      totalLoanedAmountEl.textContent = formatCurrency(totalLoaned);
      activeClientsEl.textContent = debtors.length;
      totalToReceiveEl.textContent = formatCurrency(totalToReceiveAmount);

      // toggle de esconder total
      if (toggleHideTotal) {
          toggleHideTotal.addEventListener("change", () => {
            if (toggleHideTotal.checked) {
              totalToReceiveEl.style.filter = "blur(6px)";
            } else {
              totalToReceiveEl.style.filter = "none";
            }
          });
      }
    }
    
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
        if(installmentsInput) installmentsInput.setAttribute('required', 'required'); 

        if (id) {
            addEditModalTitle.textContent = 'Editar Devedor';
            const debtor = debtors.find(d => d.id === id);
            if (debtor) {
                debtorNameInput.value = debtor.name;
                debtorDescriptionInput.value = debtor.description;
                loanedAmountInput.value = debtor.loanedAmount;
                startDateInput.value = debtor.startDate;
                installmentsInput.value = debtor.installments; 
                if (frequencyInput) frequencyInput.value = debtor.frequency; 

                // Preencher campos com base nos dados existentes
                if (debtor.amountPerInstallment && debtor.totalToReceive && debtor.loanedAmount) {
                    const calculatedInterestFromInstallment = ((debtor.totalToReceive - debtor.loanedAmount) / debtor.loanedAmount * 100);
                    if (Math.abs(calculatedInterestFromInstallment - debtor.interestPercentage) < 0.01 || debtor.interestPercentage === 0) {
                         if(calculationTypeSelect) calculationTypeSelect.value = 'perInstallment';
                         amountPerInstallmentInput.value = debtor.amountPerInstallment;
                         if(perInstallmentFields) perInstallmentFields.style.display = 'block';
                         if(amountPerInstallmentInput) amountPerInstallmentInput.setAttribute('required', 'required');
                         if(percentageFields) percentageFields.style.display = 'none';
                         if(interestPercentageInput) interestPercentageInput.removeAttribute('required');
                    } else {
                         if(calculationTypeSelect) calculationTypeSelect.value = 'percentage';
                         interestPercentageInput.value = debtor.interestPercentage;
                         if(perInstallmentFields) perInstallmentFields.style.display = 'none';
                         if(amountPerInstallmentInput) amountPerInstallmentInput.removeAttribute('required');
                         if(percentageFields) percentageFields.style.display = 'block';
                         if(interestPercentageInput) interestPercentageInput.setAttribute('required', 'required');
                    }
                } else if (debtor.interestPercentage) {
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
            await db.collection(DEBTORS_COLLECTION).doc(id).delete();
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
            detailInterestPercentage.textContent = `${debtor.interestPercentage || 0}%`; 
            detailInstallments.textContent = debtor.installments;
            detailAmountPerInstallment.textContent = formatCurrency(debtor.amountPerInstallment);
            detailStartDate.textContent = formatDate(debtor.startDate);
            detailFrequency.textContent = debtor.frequency === 'daily' ? 'Diário' : debtor.frequency === 'weekly' ? 'Semanal' : 'Mensal';

            if (detailAccessCode) {
                detailAccessCode.textContent = debtor.accessCode || 'N/A';
            }

            const hideTotalToReceivePref = localStorage.getItem('hideTotalToReceive');
            if (hideTotalToReceivePref === 'true') {
                if (toggleTotalToReceive) toggleTotalToReceive.checked = true;
                detailTotalToReceive.classList.add('hidden-value');
            } else {
                if (toggleTotalToReceive) toggleTotalToReceive.checked = false;
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
            if (paymentAmountInput) paymentAmountInput.value = '';
            if (paymentDateInput) paymentDateInput.valueAsDate = null;
            selectedPaymentIndex = null;
        }
    }


    // --- Lógica para o botão "Exibir Todas as Parcelas" ---
    function showAllInstallments() {
        if (!currentDebtorId) return;

        const debtor = debtors.find(d => d.id === currentDebtorId);
        if (!debtor) return;

        const modal = document.createElement('div');
        modal.className = 'fullscreen-modal';
        modal.innerHTML = `
            <div class="fullscreen-modal-content">
                <div class="fullscreen-modal-header">
                    <h2>Parcelas de ${debtor.name}</h2>
                    <span class="close-button">&times;</span>
                </div>
                <div class="all-installments-grid"></div>
            </div>
        `;

        document.body.appendChild(modal);
        const closeButton = modal.querySelector('.close-button');
        closeButton.addEventListener('click', () => {
            document.body.removeChild(modal);
        });

        const installmentsGrid = modal.querySelector('.all-installments-grid');

        const debtorPayments = Array.isArray(debtor.payments) ? debtor.payments : [];
        const consumablePayments = debtorPayments.map(p => ({ ...p, amountRemaining: p.amount }));
        consumablePayments.sort((a, b) => new Date(a.date) - new Date(b.date));

        for (let i = 0; i < debtor.installments; i++) {
            const installmentNumber = i + 1;
            const expectedAmountForThisInstallment = debtor.amountPerInstallment;
            let paidAmountForThisInstallment = 0;
            let isPaid = false;

            for (let j = 0; j < consumablePayments.length; j++) {
                const payment = consumablePayments[j];
                if (payment && payment.amountRemaining > 0) {
                    const amountNeededForThisInstallment = expectedAmountForThisInstallment - paidAmountForThisInstallment;
                    const amountToApply = Math.min(amountNeededForThisInstallment, payment.amountRemaining);

                    paidAmountForThisInstallment += amountToApply;
                    payment.amountRemaining -= amountToApply;

                    if (paidAmountForThisInstallment >= expectedAmountForThisInstallment - 0.005) {
                        isPaid = true;
                        break;
                    }
                }
            }

            const installmentSquare = document.createElement('div');
            installmentSquare.className = `installment-square ${isPaid ? 'paid' : 'pending'}`;
            installmentSquare.innerHTML = `
                <h4>Parc. ${installmentNumber}</h4>
                <p>Valor: ${formatCurrency(expectedAmountForThisInstallment)}</p>
                <p class="status">${isPaid ? 'PAGA' : 'PENDENTE'}</p>
            `;
            installmentsGrid.appendChild(installmentSquare);
        }
    }

    if(showAllInstallmentsButton) {
        showAllInstallmentsButton.addEventListener('click', showAllInstallments);
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
                const debtorRef = db.collection(DEBTORS_COLLECTION).doc(currentDebtorId);
                const doc = await debtorRef.get();
                if (doc.exists) {
                    const debtorData = doc.data();
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
            const debtorRef = db.collection(DEBTORS_COLLECTION).doc(debtorId);
            const doc = await debtorRef.get();
            if (doc.exists) {
                const debtorData = doc.data();
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
            if(debtorDetailModal) debtorDetailModal.style.display = 'none';
            if(addEditDebtorModal) addEditDebtorModal.style.display = 'none';
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
    
    // --- LÓGICA DE VÍNCULO TELEGRAM (EXISTENTES) ---

    function generateRandomCode(length) {
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += characters.charAt(Math.floor(Math.random() * characters.length));
        }
        return result;
    }

    async function generateLinkCode() {
        const generatedCodeSpan = document.getElementById('generatedCode');
        const generateCodeInModalBtn = document.getElementById('generateCodeInModalBtn');
        const codeDisplay = document.getElementById('codeDisplay');
        
        const user = firebase.auth().currentUser;
        if (!user) {
            alert('Você precisa estar logado para gerar um código de vínculo.');
            return;
        }

        generateCodeInModalBtn.disabled = true;
        generateCodeInModalBtn.textContent = 'Gerando...';
        
        try {
            const userId = user.uid;
            const email = user.email;
            const code = generateRandomCode(6); 
            const now = firebase.firestore.Timestamp.now();
            
            const expiresAt = new firebase.firestore.Timestamp(now.seconds + (linkCodeDurationMinutes * 60), 0);

            await db.collection('link_codes').doc(code).set({
                userId: userId,
                email: email,
                createdAt: now,
                expiresAt: expiresAt,
                code: code
            });

            generatedCodeSpan.textContent = code;
            codeDisplay.style.display = 'block';
            
            generateCodeInModalBtn.textContent = 'Código Gerado!';

            setTimeout(() => {
                generateCodeInModalBtn.disabled = false;
                generateCodeInModalBtn.textContent = 'Gerar Novo Código de Vínculo';
                codeDisplay.style.display = 'none'; 
            }, linkCodeDurationMinutes * 60 * 1000); 

        } catch (error) {
            console.error('Erro ao gerar código de vínculo:', error);
            alert('Erro ao gerar código. Tente novamente mais tarde.');
            generateCodeInModalBtn.disabled = false;
            generateCodeInModalBtn.textContent = 'Gerar Código de Vínculo';
            codeDisplay.style.display = 'none';
        }
    }

    // Adiciona a função ao escopo global para que o HTML possa chamá-la
    window.generateLinkCode = generateLinkCode;
    window.closeTelegramLinkModal = () => {
        if(telegramLinkModal) telegramLinkModal.style.display = 'none';
    };

    const generateLinkCodeBtnHeader = document.getElementById("generateLinkCodeBtn");

    if (generateLinkCodeBtnHeader) {
        generateLinkCodeBtnHeader.addEventListener('click', (e) => {
            e.preventDefault();
            if(telegramLinkModal) telegramLinkModal.style.display = 'flex';
            const menuDropdown = document.getElementById('menuDropdown');
            if (menuDropdown) menuDropdown.classList.remove("active");
        });
    }

    // --- SETUP DO LISTENER DO FIREBASE (EXISTENTE) ---
    function setupFirestoreListener() {
        if (!currentUserId) {
            console.log("Usuário não logado, não é possível configurar o listener.");
            return;
        }

        let query = db.collection(DEBTORS_COLLECTION).where('userId', '==', currentUserId);

        if (currentFilter !== 'all') {
            query = query.where('frequency', '==', currentFilter);
        }

        query.onSnapshot((snapshot) => {
            debtors = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            renderDebtors();
            updateStats();
            
            if (debtorDetailModal && debtorDetailModal.style.display === 'flex' && currentDebtorId) {
                const currentDebtorInModal = debtors.find(d => d.id === currentDebtorId);
                if (currentDebtorInModal) {
                    renderPaymentsGrid(currentDebtorInModal);
                } else {
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
    
    // --- MENU DE TRÊS PONTOS ---
    document.addEventListener("DOMContentLoaded", () => {
      const menuToggle = document.getElementById("menuToggleButton");
      const menuDropdown = document.getElementById("menuDropdown");

      if (menuToggle && menuDropdown) {
        menuToggle.addEventListener("click", (e) => {
          e.stopPropagation();
          menuDropdown.classList.toggle("active");
        });

        // Fecha o menu ao clicar fora
        document.addEventListener("click", (e) => {
          if (!menuDropdown.contains(e.target) && !menuToggle.contains(e.target)) {
            menuDropdown.classList.remove("active");
          }
        });
      }
    });

    auth.onAuthStateChanged((user) => {
        if (user) {
            currentUserId = user.uid; 
            setupFirestoreListener(); 
        } else {
            currentUserId = null; 
            debtors = []; 
        }
    });


} // FIM do if (window.location.pathname.endsWith('dashboard.html'))



