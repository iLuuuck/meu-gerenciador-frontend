document.addEventListener('DOMContentLoaded', () => {
    // Verificar se o usuário está logado
    const loggedInUser = localStorage.getItem('loggedInUser');
    if (!loggedInUser) {
        window.location.href = 'index.html';
        return;
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
    const amountPerInstallmentInput = document.getElementById('amountPerInstallment'); // NOVO CAMPO
    const startDateInput = document.getElementById('startDate');

    // Campos do modal de detalhes
    const detailDebtorName = document.getElementById('detailDebtorName');
    const detailTotalAmount = document.getElementById('detailTotalAmount');
    const detailInstallments = document.getElementById('detailInstallments');
    const detailAmountPerInstallment = document.getElementById('detailAmountPerInstallment'); // NOVO
    const detailRemainingInstallments = document.getElementById('detailRemainingInstallments');
    const detailStartDate = document.getElementById('detailStartDate');
    const detailRemainingBalance = document.getElementById('detailRemainingBalance');
    const detailTotalProfit = document.getElementById('detailTotalProfit'); // NOVO: Lucro Total

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

    function calculateRemainingBalance(debtor) {
        const totalPaid = debtor.payments.reduce((sum, p) => sum + p.amount, 0);
        // O saldo restante é o valor total *emprestado* menos o que já foi pago
        // Isso é diferente do lucro, que é (parcela * num_parcelas) - emprestado
        return debtor.totalAmount - totalPaid;
    }

    function calculateRemainingInstallments(debtor) {
        const paidInstallments = debtor.payments.length;
        return debtor.installments - paidInstallments;
    }

    // NOVO: Função para calcular o lucro total
    function calculateTotalProfit(debtor) {
        const totalAmountToBeReceived = debtor.amountPerInstallment * debtor.installments;
        return totalAmountToBeReceived - debtor.totalAmount;
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
                    <p>Prestações: ${debtor.installments}</p>
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
                if (!e.target.closest('.debtor-actions')) { // Evita abrir o modal de detalhes ao clicar nos botões de ação
                    showDebtorDetails(debtor.id);
                }
            });

            debtorsList.appendChild(debtorItem);
        });

        // Adicionar listeners para os botões de ação (editar/excluir)
        document.querySelectorAll('.edit-debtor-btn').forEach(button => {
            button.onclick = (e) => {
                e.stopPropagation(); // Evita que o evento de click do item de devedor seja disparado
                editDebtor(e.target.dataset.id);
            };
        });

        document.querySelectorAll('.delete-debtor-btn').forEach(button => {
            button.onclick = (e) => {
                e.stopPropagation(); // Evita que o evento de click do item de devedor seja disparado
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
        const totalProfit = calculateTotalProfit(debtor); // NOVO: Calcular lucro total

        detailDebtorName.textContent = debtor.name;
        detailTotalAmount.textContent = formatCurrency(debtor.totalAmount);
        detailInstallments.textContent = debtor.installments;
        detailAmountPerInstallment.textContent = formatCurrency(debtor.amountPerInstallment); // NOVO
        detailRemainingInstallments.textContent = remainingInstallments;
        detailStartDate.textContent = formatDate(debtor.startDate);
        detailRemainingBalance.textContent = formatCurrency(remainingBalance);
        detailTotalProfit.textContent = formatCurrency(totalProfit); // NOVO: Exibir lucro total

        renderPayments(debtor);
        debtorDetailModal.style.display = 'flex';
    }

    function renderPayments(debtor) {
        paymentsGrid.innerHTML = '';
        // Crie parcelas esperadas com base no número total de parcelas e valor por parcela
        for (let i = 0; i < debtor.installments; i++) {
            const paymentSquare = document.createElement('div');
            paymentSquare.classList.add('payment-square');
            // Inicializa como não pago por padrão
            let isPaid = false;
            let paymentDate = null;
            let paymentId = null;

            // Verifica se esta parcela já foi paga
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

        // Adicionar listeners para os botões de excluir pagamento
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
        currentDebtorId = null; // Limpa o ID para garantir que seja uma adição
        saveDebtorButton.textContent = 'Salvar Devedor'; // Resetar texto do botão
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
        amountPerInstallmentInput.value = debtor.amountPerInstallment; // Preenche o novo campo
        startDateInput.value = debtor.startDate; // Formato YYYY-MM-DD já deve estar salvo

        saveDebtorButton.textContent = 'Salvar Alterações';
        addEditDebtorModal.style.display = 'flex';
    }

    function saveDebtor(e) {
        e.preventDefault();

        const name = debtorNameInput.value.trim();
        const totalAmount = parseFloat(totalAmountInput.value);
        const installments = parseInt(installmentsInput.value);
        const amountPerInstallment = parseFloat(amountPerInstallmentInput.value); // Captura o novo campo
        const startDate = startDateInput.value;

        if (!name || isNaN(totalAmount) || isNaN(installments) || isNaN(amountPerInstallment) || !startDate || totalAmount <= 0 || installments <= 0 || amountPerInstallment <= 0) {
            alert('Por favor, preencha todos os campos corretamente.');
            return;
        }

        let debtor;
        if (currentDebtorId) {
            // Editando devedor existente
            debtor = debtors.find(d => d.id === currentDebtorId);
            if (debtor) {
                debtor.name = name;
                debtor.totalAmount = totalAmount;
                debtor.installments = installments;
                debtor.amountPerInstallment = amountPerInstallment; // Atualiza o novo campo
                debtor.startDate = startDate;
                // Recalcular lucro ao editar
                debtor.totalProfit = calculateTotalProfit(debtor); 
            }
        } else {
            // Adicionando novo devedor
            debtor = {
                id: Date.now().toString(),
                name,
                totalAmount,
                installments,
                amountPerInstallment, // Adiciona o novo campo
                startDate,
                payments: [],
                // Calcula lucro inicial ao adicionar
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
        // Remove 'selected' de todos os outros
        document.querySelectorAll('.payment-square').forEach(s => s.classList.remove('selected'));
        // Adiciona 'selected' ao clicado
        square.classList.add('selected');
        // Preenche o valor do pagamento com o valor da parcela
        paymentAmountInput.value = amount.toFixed(2);
        // Preenche a data com a data atual
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

        // Verifica se todas as parcelas já foram pagas
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

        renderDebtors(); // Atualiza a lista principal para mostrar saldo/prestações faltando
        showDebtorDetails(currentDebtorId); // Re-renderiza os detalhes para atualizar o modal
        paymentAmountInput.value = '';
        paymentDateInput.value = '';
    }

    function deletePayment(debtorId, paymentId) {
        const debtor = debtors.find(d => d.id === debtorId);
        if (!debtor) return;

        debtor.payments = debtor.payments.filter(p => p.id !== paymentId);
        localStorage.setItem('debtors', JSON.stringify(debtors));

        renderDebtors();
        showDebtorDetails(currentDebtorId); // Re-renderiza os detalhes
    }

    // Botão "Usar Valor da Parcela"
    fillAmountButton.addEventListener('click', () => {
        const debtor = debtors.find(d => d.id === currentDebtorId);
        if (debtor && debtor.amountPerInstallment) {
            paymentAmountInput.value = debtor.amountPerInstallment.toFixed(2);
            paymentDateInput.valueAsDate = new Date(); // Preenche com a data atual
        }
    });

    // --- Event Listeners ---

    addDebtorButton.addEventListener('click', openAddDebtorModal);
    addEditDebtorForm.addEventListener('submit', saveDebtor);
    addPaymentButton.addEventListener('click', addPayment);

    logoutButton.addEventListener('click', () => {
        localStorage.removeItem('loggedInUser');
        window.location.href = 'index.html';
    });

    closeButtons.forEach(button => {
        button.addEventListener('click', () => {
            debtorDetailModal.style.display = 'none';
            addEditDebtorModal.style.display = 'none';
        });
    });

    // Fechar modais ao clicar fora deles
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
