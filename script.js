document.addEventListener('DOMContentLoaded', () => {
    // --- Variáveis Globais e Seletores de DOM ---
    const users = JSON.parse(localStorage.getItem('users')) || {
        'admin': 'admin'
    }; // Usuários e senhas
    const loggedInUser = localStorage.getItem('loggedInUser');

    // Elementos da página de login (index.html)
    const loginForm = document.getElementById('loginForm');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const errorMessage = document.getElementById('errorMessage');

    // Elementos do Dashboard (dashboard.html)
    const debtorsList = document.getElementById('debtorsList');
    const addDebtorButton = document.getElementById('addDebtorButton');
    const logoutButton = document.getElementById('logoutButton');

    // Modais e seus elementos
    const debtorDetailModal = document.getElementById('debtorDetailModal');
    const addEditDebtorModal = document.getElementById('addEditDebtorModal');
    const closeButtons = document.querySelectorAll('.close-button');

    // Campos do Modal de Adicionar/Editar Devedor
    const addEditModalTitle = document.getElementById('addEditModalTitle');
    const addEditDebtorForm = document.getElementById('addEditDebtorForm');
    const saveDebtorButton = document.getElementById('saveDebtorButton');
    const debtorNameInput = document.getElementById('debtorName');
    const totalAmountInput = document.getElementById('totalAmount');
    const installmentsInput = document.getElementById('installments');
    const amountPerInstallmentInput = document.getElementById('amountPerInstallment'); // NOVO CAMPO
    const startDateInput = document.getElementById('startDate');

    // Campos do Modal de Detalhes do Devedor
    const detailDebtorName = document.getElementById('detailDebtorName');
    const detailTotalAmount = document.getElementById('detailTotalAmount');
    const detailInstallments = document.getElementById('detailInstallments');
    const detailAmountPerInstallment = document.getElementById('detailAmountPerInstallment'); // NOVO CAMPO
    const detailRemainingInstallments = document.getElementById('detailRemainingInstallments');
    const detailStartDate = document.getElementById('detailStartDate');
    const detailRemainingBalance = document.getElementById('detailRemainingBalance');
    const detailTotalProfit = document.getElementById('detailTotalProfit'); // NOVO CAMPO

    // Seção de Pagamentos no Modal de Detalhes
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
        // Assegura que a data está no formato correto para exibição (DD/MM/YYYY)
        return `${day}/${month}/${year}`;
    }

    function calculateRemainingBalance(debtor) {
        const totalPaid = debtor.payments.reduce((sum, p) => sum + p.amount, 0);
        return debtor.totalAmount - totalPaid;
    }

    function calculateRemainingInstallments(debtor) {
        const paidInstallments = debtor.payments.length;
        return debtor.installments - paidInstallments;
    }

    function calculateTotalProfit(debtor) {
        const totalAmount = parseFloat(debtor.totalAmount);
        const installments = parseInt(debtor.installments);
        const amountPerInstallment = parseFloat(debtor.amountPerInstallment);

        if (isNaN(totalAmount) || isNaN(installments) || isNaN(amountPerInstallment)) {
            return 0; // Retorna 0 se os valores não forem válidos para o cálculo
        }
        
        const totalAmountToBeReceived = amountPerInstallment * installments;
        return totalAmountToBeReceived - totalAmount;
    }

    // --- Lógica de Autenticação (apenas para index.html) ---
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const username = usernameInput.value;
            const password = passwordInput.value;

            if (users[username] && users[username] === password) {
                localStorage.setItem('loggedInUser', username);
                window.location.href = 'dashboard.html';
            } else {
                errorMessage.textContent = 'Usuário ou senha inválidos.';
                errorMessage.style.display = 'block';
            }
        });
    }

    // --- Lógica do Dashboard (apenas para dashboard.html) ---
    if (loggedInUser && debtorsList) { // Verifica se estamos no dashboard
        // --- Renderização dos Devedores ---
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

        // --- Exibir Detalhes do Devedor (Modal) ---
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

        // --- Renderizar Pagamentos no Modal de Detalhes ---
        function renderPayments(debtor) {
            paymentsGrid.innerHTML = '';
            for (let i = 0; i < debtor.installments; i++) {
                const paymentSquare = document.createElement('div');
                paymentSquare.classList.add('payment-square');
                
                let isPaid = false;
                let paymentDate = null;
                let paymentId = null;

                // Verifica se a parcela atual (baseada no índice) já foi paga
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

        // --- Lógica de Modais (Adicionar/Editar Devedor) ---
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
                // Editando devedor existente
                debtor = debtors.find(d => d.id === currentDebtorId);
                if (debtor) {
                    debtor.name = name;
                    debtor.totalAmount = totalAmount;
                    debtor.installments = installments;
                    debtor.amountPerInstallment = amountPerInstallment;
                    debtor.startDate = startDate;
                    // Recalcular lucro ao editar
                    debtor.totalProfit = calculateTotalProfit(debtor); 
                }
            } else {
                // Adicionando novo devedor
                debtor = {
                    id: Date.now().toString(), // ID único para o devedor
                    name,
                    totalAmount,
                    installments,
                    amountPerInstallment,
                    startDate,
                    payments: [], // Inicializa pagamentos como array vazio
                    totalProfit: calculateTotalProfit({ totalAmount, installments, amountPerInstallment }) 
                };
                debtors.push(debtor);
            }

            localStorage.setItem('debtors', JSON.stringify(debtors));
            renderDebtors();
            addEditDebtorModal.style.display = 'none';
        }

        function deleteDebtor(id) {
            if (confirm('Tem certeza de que deseja excluir este devedor?')) {
                debtors = debtors.filter(d => d.id !== id);
                localStorage.setItem('debtors', JSON.stringify(debtors));
                renderDebtors();
                debtorDetailModal.style.display = 'none'; // Fecha o modal de detalhes se o devedor ativo for excluído
            }
        }

        // --- Lógica de Pagamentos ---
        function selectPaymentSquare(square, amount) {
            document.querySelectorAll('.payment-square').forEach(s => s.classList.remove('selected'));
            square.classList.add('selected');
            paymentAmountInput.value = amount.toFixed(2);
            paymentDateInput.valueAsDate = new Date(); // Preenche com a data atual
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

            renderDebtors(); // Atualiza a lista de cards no dashboard
            showDebtorDetails(currentDebtorId); // Re-renderiza os detalhes no modal
            paymentAmountInput.value = ''; // Limpa o campo de valor
            paymentDateInput.value = ''; // Limpa o campo de data
        }

        function deletePayment(debtorId, paymentId) {
            const debtor = debtors.find(d => d.id === debtorId);
            if (!debtor) return;

            if (confirm('Tem certeza de que deseja excluir este pagamento?')) {
                debtor.payments = debtor.payments.filter(p => p.id !== paymentId);
                // Opcional: Para manter a ordem cronológica dos pagamentos se um for excluído do meio.
                debtor.payments.sort((a, b) => new Date(a.date) - new Date(b.date));

                localStorage.setItem('debtors', JSON.stringify(debtors));

                renderDebtors();
                showDebtorDetails(currentDebtorId); // Re-renderiza os detalhes
            }
        }

        // --- Event Listeners Específicos do Dashboard ---
        addDebtorButton.addEventListener('click', openAddDebtorModal);
        addEditDebtorForm.addEventListener('submit', saveDebtor);
        addPaymentButton.addEventListener('click', addPayment);
        fillAmountButton.addEventListener('click', () => {
            const debtor = debtors.find(d => d.id === currentDebtorId);
            if (debtor && typeof debtor.amountPerInstallment === 'number') {
                paymentAmountInput.value = debtor.amountPerInstallment.toFixed(2);
                paymentDateInput.valueAsDate = new Date();
            } else {
                alert('Valor por parcela não definido para este devedor.');
            }
        });

        logoutButton.addEventListener('click', () => {
            localStorage.removeItem('loggedInUser');
            window.location.href = 'index.html';
        });

        // Fechar modais ao clicar no X ou fora
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

        // Renderizar devedores ao carregar o dashboard
        renderDebtors();
    }
});
