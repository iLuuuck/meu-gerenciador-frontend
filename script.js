document.addEventListener('DOMContentLoaded', () => {
    // --- Variáveis Globais e Seletores de DOM ---

    // Define os usuários e suas senhas, e agora, suas listas de devedores
    // O '|| {}' garante que se 'users' não existir no localStorage, ele inicialize vazio
    // IMPORTANTE: Se você já tem devedores cadastrados, eles precisarão ser
    // transferidos manualmente para um dos usuários dentro do localStorage,
    // ou você pode cadastrá-los novamente após esta atualização.
    let users = JSON.parse(localStorage.getItem('users')) || {
        'gine': { password: 'g0g0', debtors: [] },
        'marcos': { password: '8186', debtors: [] }
    }; 
    // Garante que os usuários padrão existam se ainda não estiverem no localStorage
    // Isso é útil para a primeira vez que o sistema é carregado
    if (!users.gine) {
        users.gine = { password: 'g0g0', debtors: [] };
    }
    if (!users.marcos) {
        users.marcos = { password: '8186', debtors: [] };
    }
    localStorage.setItem('users', JSON.stringify(users)); // Salva a estrutura inicial

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
    const amountPerInstallmentInput = document.getElementById('amountPerInstallment'); 
    const startDateInput = document.getElementById('startDate');

    // Campos do Modal de Detalhes do Devedor
    const detailDebtorName = document.getElementById('detailDebtorName');
    const detailTotalAmount = document.getElementById('detailTotalAmount');
    const detailInstallments = document.getElementById('detailInstallments');
    const detailAmountPerInstallment = document.getElementById('detailAmountPerInstallment'); 
    const detailRemainingInstallments = document.getElementById('detailRemainingInstallments');
    const detailStartDate = document.getElementById('detailStartDate');
    const detailRemainingBalance = document.getElementById('detailRemainingBalance');
    const detailTotalProfit = document.getElementById('detailTotalProfit'); 

    // Seção de Pagamentos no Modal de Detalhes
    const paymentsGrid = document.getElementById('paymentsGrid');
    const paymentAmountInput = document.getElementById('paymentAmount');
    const paymentDateInput = document.getElementById('paymentDate');
    const addPaymentButton = document.getElementById('addPaymentButton');
    const fillAmountButton = document.getElementById('fillAmountButton');

    let currentDebtorId = null;
    // Removido: let debtors = JSON.parse(localStorage.getItem('debtors')) || [];
    // Agora, 'debtors' será a lista específica do usuário logado

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

    // Estas funções agora operam sobre o objeto 'debtor' que é passado a elas
    // e que vem da lista do usuário logado.
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
            return 0;
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

            // Verifica se o usuário existe e a senha está correta
            if (users[username] && users[username].password === password) {
                localStorage.setItem('loggedInUser', username);
                window.location.href = 'dashboard.html';
            } else {
                errorMessage.textContent = 'Usuário ou senha inválidos.';
                errorMessage.style.display = 'block';
            }
        });
    }

    // --- Lógica do Dashboard (apenas para dashboard.html) ---
    // Verifica se estamos no dashboard E se há um usuário logado válido
    if (loggedInUser && debtorsList && users[loggedInUser]) { 
        // Agora, debtors se refere à lista de devedores DO USUÁRIO LOGADO
        let debtorsOfCurrentUser = users[loggedInUser].debtors;

        // --- Renderização dos Devedores ---
        function renderDebtors() {
            debtorsList.innerHTML = '';
            // Renderiza os devedores do usuário logado
            if (debtorsOfCurrentUser.length === 0) {
                debtorsList.innerHTML = '<p class="loading-message">Nenhum devedor cadastrado. Clique em "Adicionar Novo Devedor" para começar.</p>';
                return;
            }

            debtorsOfCurrentUser.forEach(debtor => { // Usa debtorsOfCurrentUser
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
            const debtor = debtorsOfCurrentUser.find(d => d.id === id); // Usa debtorsOfCurrentUser
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
            const debtor = debtorsOfCurrentUser.find(d => d.id === id); // Usa debtorsOfCurrentUser
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

            if (currentDebtorId) {
                // Editando devedor existente na lista do usuário logado
                const debtorIndex = debtorsOfCurrentUser.findIndex(d => d.id === currentDebtorId);
                if (debtorIndex !== -1) {
                    let debtor = debtorsOfCurrentUser[debtorIndex];
                    debtor.name = name;
                    debtor.totalAmount = totalAmount;
                    debtor.installments = installments;
                    debtor.amountPerInstallment = amountPerInstallment;
                    debtor.startDate = startDate;
                    debtor.totalProfit = calculateTotalProfit(debtor); // Recalcula lucro
                }
            } else {
                // Adicionando novo devedor à lista do usuário logado
                const newDebtor = {
                    id: Date.now().toString(),
                    name,
                    totalAmount,
                    installments,
                    amountPerInstallment,
                    startDate,
                    payments: [], 
                    totalProfit: calculateTotalProfit({ totalAmount, installments, amountPerInstallment }) 
                };
                debtorsOfCurrentUser.push(newDebtor);
            }

            // Salva a lista de devedores ATUALIZADA do usuário logado de volta no objeto 'users'
            users[loggedInUser].debtors = debtorsOfCurrentUser;
            localStorage.setItem('users', JSON.stringify(users)); // Salva o objeto 'users' completo

            renderDebtors();
            addEditDebtorModal.style.display = 'none';
        }

        function deleteDebtor(id) {
            if (confirm('Tem certeza de que deseja excluir este devedor?')) {
                // Filtra a lista de devedores do usuário logado
                debtorsOfCurrentUser = debtorsOfCurrentUser.filter(d => d.id !== id);

                // Salva a lista de devedores ATUALIZADA do usuário logado
                users[loggedInUser].debtors = debtorsOfCurrentUser;
                localStorage.setItem('users', JSON.stringify(users));

                renderDebtors();
                debtorDetailModal.style.display = 'none';
            }
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

            // Encontra o devedor na lista do usuário logado
            const debtor = debtorsOfCurrentUser.find(d => d.id === currentDebtorId);
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
            // Salva a lista de devedores ATUALIZADA do usuário logado (com o pagamento adicionado)
            users[loggedInUser].debtors = debtorsOfCurrentUser;
            localStorage.setItem('users', JSON.stringify(users));

            renderDebtors();
            showDebtorDetails(currentDebtorId);
            paymentAmountInput.value = '';
            paymentDateInput.value = '';
        }

        function deletePayment(debtorId, paymentId) {
            // Encontra o devedor na lista do usuário logado
            const debtor = debtorsOfCurrentUser.find(d => d.id === debtorId);
            if (!debtor) return;

            if (confirm('Tem certeza de que deseja excluir este pagamento?')) {
                debtor.payments = debtor.payments.filter(p => p.id !== paymentId);
                debtor.payments.sort((a, b) => new Date(a.date) - new Date(b.date)); // Mantém a ordem

                // Salva a lista de devedores ATUALIZADA do usuário logado (com o pagamento removido)
                users[loggedInUser].debtors = debtorsOfCurrentUser;
                localStorage.setItem('users', JSON.stringify(users));

                renderDebtors();
                showDebtorDetails(currentDebtorId);
            }
        }

        // --- Event Listeners Específicos do Dashboard ---
        addDebtorButton.addEventListener('click', openAddDebtorModal);
        addEditDebtorForm.addEventListener('submit', saveDebtor);
        addPaymentButton.addEventListener('click', addPayment);
        fillAmountButton.addEventListener('click', () => {
            const debtor = debtorsOfCurrentUser.find(d => d.id === currentDebtorId); // Usa debtorsOfCurrentUser
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
    } else if (loggedInUser && !users[loggedInUser]) {
        // Caso um usuário logado não seja encontrado na estrutura 'users'
        // Isso pode acontecer se o 'localStorage' foi limpo para 'users' mas não para 'loggedInUser'
        localStorage.removeItem('loggedInUser');
        window.location.href = 'index.html'; // Redireciona para o login
    }
});
