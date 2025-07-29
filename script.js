document.addEventListener('DOMContentLoaded', () => {
    // Verificar se o usuário está logado
    // ESTE BLOCO AGORA DEVE SER MANTIDO SOMENTE AQUI NO SCRIPT DO DASHBOARD.
    // Ele será carregado *apenas* na página do dashboard (dashboard.html).
    const loggedInUser = localStorage.getItem('loggedInUser');
    if (!loggedInUser) {
        window.location.href = 'index.html'; // Redireciona para o login se não estiver logado
        return; // Interrompe a execução do script
    }

    const debtorsList = document.getElementById('debtorsList');
    const addDebtorButton = document.getElementById('addDebtorButton');
    const logoutButton = document.getElementById('logoutButton');

    // Modais e seus elementos
    const debtorDetailModal = document.getElementById('debtorDetailModal');
    const addEditDebtorModal = document.getElementById('addEditDebtorModal');

    const closeButtons = document.querySelectorAll('.close-button');
    const addEditModalTitle = document.getElementById('addEditModalTitle');
    const addEditDebtorForm = document.getElementById('addEditDebtorForm');
    const saveDebtorButton = document.getElementById('saveDebtorButton');

    // Campos do formulário de devedor
    const debtorNameInput = document.getElementById('debtorName');
    const totalAmountInput = document.getElementById('totalAmount');
    const installmentsInput = document.getElementById('installments');
    const amountPerInstallmentInput = document.getElementById('amountPerInstallment');
    const startDateInput = document.getElementById('startDate');

    // Campos do modal de detalhes
    const detailDebtorName = document.getElementById('detailDebtorName');
    const detailTotalAmount = document.getElementById('detailTotalAmount');
    const detailInstallments = document.getElementById('detailInstallments');
    const detailAmountPerInstallment = document.getElementById('detailAmountPerInstallment');
    const detailRemainingInstallments = document.getElementById('detailRemainingInstallments');
    const detailStartDate = document.getElementById('detailStartDate');
    const detailRemainingBalance = document.getElementById('detailRemainingBalance');
    const detailTotalProfit = document.getElementById('detailTotalProfit');

    const paymentsGrid = document.getElementById('paymentsGrid');
    const paymentAmountInput = document.getElementById('paymentAmount');
    const paymentDateInput = document.getElementById('paymentDate');
    const addPaymentButton = document.getElementById('addPaymentButton');
    const fillAmountButton = document.getElementById('fillAmountButton');

    let currentDebtorId = null;
    let debtors = JSON.parse(localStorage.getItem('debtors')) || [];

    // --- Funções Auxiliares ---

    function formatCurrency(value) {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    }

    function formatDate(dateString) {
        if (!dateString) return 'N/A';
        const [year, month, day] = dateString.split('-');
        return `${day}/${month}/${year}`;
    }

    // Calcula o saldo restante do VALOR EMPRESTADO original
    function calculateRemainingBalance(debtor) {
        const totalPaid = debtor.payments.reduce((sum, p) => sum + p.amount, 0);
        return debtor.totalAmount - totalPaid;
    }

    function calculateRemainingInstallments(debtor) {
        const paidInstallments = debtor.payments.length;
        return debtor.installments - paidInstallments;
    }

    // Função para calcular o lucro total
    function calculateTotalProfit(debtor) {
        const totalAmount = parseFloat(debtor.totalAmount);
        const installments = parseInt(debtor.installments);
        const amountPerInstallment = parseFloat(debtor.amountPerInstallment);

        if (isNaN(totalAmount) || isNaN(installments) || isNaN(amountPerInstallment)) {
            return 0;
        }
        
        const totalAmountToBeReceived = amountPerInstallment * installments;
        return totalAmountToBeReceived - totalAmount;
    }

    // --- Renderização ---

    function renderDebtors() {
        debtorsList.innerHTML = '';
        if (debtors.length === 0) {
            debtorsList.innerHTML = '<p class="loading-message">Nenhum devedor cadastrado. Clique em "Adicionar Novo Devedor" para começar.</p>';
            return;
        }

        debtors.forEach(debtor => {
            const debtorItem = document.createElement('div');
            debtorItem.classList.add('debtor-item');
            debtorItem.dataset.id = debtor.id;

            const remainingBalance = calculateRemainingBalance(debtor);
            const remainingInstallments = calculateRemainingInstallments(debtor);

            debtorItem.innerHTML = `
                <div class="debtor-info">
                    <h2>${debtor.name}</h2>
                    <p>Valor Emprestado: ${formatCurrency(debtor.totalAmount)}</p>
                    <p>Prestações: ${debtor.installments} x ${formatCurrency(debtor.amountPerInstallment)}</p>
                    <p>Prestações Faltando: ${remainingInstallments}</p>
                </div>
                <div class="debtor-balance">
                    Saldo: ${formatCurrency(remainingBalance)}
                </div>
                <div class="debtor-actions">
                    <button class="edit-debtor-btn" data-id="${debtor.id}">Editar</button>
                    <button class="delete-debtor-btn" data-id="${debtor.id}">Excluir</button>
                </div>
            `;

            debtorItem.addEventListener('click', (e) => {
                if (!e.target.closest('.debtor-actions')) { 
                    showDebtorDetails(debtor.id);
                }
            });

            debtorsList.appendChild(debtorItem);
        });

        document.querySelectorAll('.edit-debtor-btn').forEach(button => {
            button.onclick = (e) => {
                e.stopPropagation();
                editDebtor(e.target.dataset.id);
            };
        });

        document.querySelectorAll('.delete-debtor-btn').forEach(button => {
            button.onclick = (e) => {
                e.stopPropagation();
                deleteDebtor(e.target.dataset.id);
            };
        });
    }

    function showDebtorDetails(id) {
        currentDebtorId = id;
        const debtor = debtors.find(d => d.id === id);
        if (!debtor) return;

        const remainingBalance = calculateRemainingBalance(debtor);
        const remainingInstallments = calculateRemainingInstallments(debtor);
        const totalProfit = calculateTotalProfit(debtor);

        detailDebtorName.textContent = debtor.name;
        detailTotalAmount.textContent = formatCurrency(debtor.totalAmount);
        detailInstallments.textContent = debtor.installments;
        detailAmountPerInstallment.textContent = formatCurrency(debtor.amountPerInstallment);
        detailRemainingInstallments.textContent = remainingInstallments;
        detailStartDate.textContent = formatDate(debtor.startDate);
        detailRemainingBalance.textContent = formatCurrency(remainingBalance);
        detailTotalProfit.textContent = formatCurrency(totalProfit);

        renderPayments(debtor);
        debtorDetailModal.style.display = 'flex';
    }

    function renderPayments(debtor) {
        paymentsGrid.innerHTML = '';
        for (let i = 0; i < debtor.installments; i++) {
            const paymentSquare = document.createElement('div');
            paymentSquare.classList.add('payment-square');
            let isPaid = false;
            let paymentDate = null;
            let paymentId = null;

            if (debtor.payments && debtor.payments[i]) {
                const payment = debtor.payments[i];
                isPaid = true;
                paymentDate = payment.date;
                paymentId = payment.id;
                paymentSquare.classList.add('paid');
                paymentSquare.dataset.paymentId = paymentId;
            }

            paymentSquare.innerHTML = `
                <span>${formatCurrency(debtor.amountPerInstallment)}</span>
                <span>${paymentDate ? formatDate(paymentDate) : `Parc. ${i + 1}`}</span>
                ${isPaid ? `<button class="delete-payment-btn" data-payment-id="${paymentId}">Excluir Pagamento</button>` : ''}
            `;

            if (!isPaid) {
                paymentSquare.addEventListener('click', () => selectPaymentSquare(paymentSquare, debtor.amountPerInstallment));
            }
            
            paymentsGrid.appendChild(paymentSquare);
        }

        document.querySelectorAll('.delete-payment-btn').forEach(button => {
            button.onclick = (e) => {
                e.stopPropagation();
                const paymentIdToDelete = e.target.dataset.paymentId;
                deletePayment(currentDebtorId, paymentIdToDelete);
            };
        });
    }

    // --- Lógica de Modais ---

    function openAddDebtorModal() {
        addEditModalTitle.textContent = 'Adicionar Novo Devedor';
        addEditDebtorForm.reset();
        currentDebtorId = null;
        saveDebtorButton.textContent = 'Salvar Devedor';
        addEditDebtorModal.style.display = 'flex';
    }

    function editDebtor(id) {
        currentDebtorId = id;
        const debtor = debtors.find(d => d.id === id);
        if (!debtor) return;

        addEditModalTitle.textContent = 'Editar Devedor';
        debtorNameInput.value = debtor.name;
        totalAmountInput.value = debtor.totalAmount;
        installmentsInput.value = debtor.installments;
        amountPerInstallmentInput.value = debtor.amountPerInstallment;
        startDateInput.value = debtor.startDate;

        saveDebtorButton.textContent = 'Salvar Alterações';
        addEditDebtorModal.style.display = 'flex';
    }

    function saveDebtor(e) {
        e.preventDefault();

        const name = debtorNameInput.value.trim();
        const totalAmount = parseFloat(totalAmountInput.value);
        const installments = parseInt(installmentsInput.value);
        const amountPerInstallment = parseFloat(amountPerInstallmentInput.value);
        const startDate = startDateInput.value;

        if (!name || isNaN(totalAmount) || isNaN(installments) || isNaN(amountPerInstallment) || !startDate || totalAmount <= 0 || installments <= 0 || amountPerInstallment <= 0) {
            alert('Por favor, preencha todos os campos corretamente (Nome, Valor Emprestado, Número de Parcelas, Valor por Parcela e Data de Início).');
            return;
        }

        let debtor;
        if (currentDebtorId) {
            debtor = debtors.find(d => d.id === currentDebtorId);
            if (debtor) {
                debtor.name = name;
                debtor.totalAmount = totalAmount;
                debtor.installments = installments;
                debtor.amountPerInstallment = amountPerInstallment;
                debtor.startDate = startDate;
                debtor.totalProfit = calculateTotalProfit(debtor); 
            }
        } else {
            debtor = {
                id: Date.now().toString(),
                name,
                totalAmount,
                installments,
                amountPerInstallment,
                startDate,
                payments: [],
                totalProfit: calculateTotalProfit({ totalAmount, installments, amountPerInstallment }) 
            };
            debtors.push(debtor);
        }

        localStorage.setItem('debtors', JSON.stringify(debtors));
        renderDebtors();
        addEditDebtorModal.style.display = 'none';
    }

    // --- Lógica de Pagamentos ---

    function selectPaymentSquare(square, amount) {
        document.querySelectorAll('.payment-square').forEach(s => s.classList.remove('selected'));
        square.classList.add('selected');
        paymentAmountInput.value = amount.toFixed(2);
        paymentDateInput.valueAsDate = new Date();
    }

    function addPayment() {
        if (!currentDebtorId) {
            alert('Selecione um devedor primeiro.');
            return;
        }

        const debtor = debtors.find(d => d.id === currentDebtorId);
        if (!debtor) return;

        const paymentAmount = parseFloat(paymentAmountInput.value);
        const paymentDate = paymentDateInput.value;

        if (isNaN(paymentAmount) || !paymentDate || paymentAmount <= 0) {
            alert('Por favor, insira um valor e uma data válidos para o pagamento.');
            return;
        }

        if (debtor.payments.length >= debtor.installments) {
            alert('Todas as parcelas já foram pagas para este devedor.');
            return;
        }

        const newPayment = {
            id: Date.now().toString(),
            amount: paymentAmount,
            date: paymentDate
        };

        debtor.payments.push(newPayment);
        localStorage.setItem('debtors', JSON.stringify(debtors));

        renderDebtors();
        showDebtorDetails(currentDebtorId);
        paymentAmountInput.value = '';
        paymentDateInput.value = '';
    }

    function deletePayment(debtorId, paymentId) {
        const debtor = debtors.find(d => d.id === debtorId);
        if (!debtor) return;

        debtor.payments = debtor.payments.filter(p => p.id !== paymentId);

        localStorage.setItem('debtors', JSON.stringify(debtors));

        renderDebtors();
        showDebtorDetails(currentDebtorId);
    }

    // Botão "Usar Valor da Parcela"
    fillAmountButton.addEventListener('click', () => {
        const debtor = debtors.find(d => d.id === currentDebtorId);
        if (debtor && typeof debtor.amountPerInstallment === 'number') {
            paymentAmountInput.value = debtor.amountPerInstallment.toFixed(2);
            paymentDateInput.valueAsDate = new Date();
        } else {
            alert('Valor por parcela não definido para este devedor.');
        }
    });

    // --- Event Listeners ---

    addDebtorButton.addEventListener('click', openAddDebtorModal);
    addEditDebtorForm.addEventListener('submit', saveDebtor);
    addPaymentButton.addEventListener('click', addPayment);

    // Botão de Logout
    logoutButton.addEventListener('click', () => {
        localStorage.removeItem('loggedInUser'); // Remove o estado de login
        window.location.href = 'index.html'; // Redireciona para a página de login
    });

    closeButtons.forEach(button => {
        button.addEventListener('click', () => {
            debtorDetailModal.style.display = 'none';
            addEditDebtorModal.style.display = 'none';
        });
    });

    window.addEventListener('click', (event) => {
        if (event.target === debtorDetailModal) {
            debtorDetailModal.style.display = 'none';
        }
        if (event.target === addEditDebtorModal) {
            addEditDebtorModal.style.display = 'none';
        }
    });

    // Renderizar devedores ao carregar a página
    renderDebtors();
});
