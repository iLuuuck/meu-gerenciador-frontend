document.addEventListener('DOMContentLoaded', () => {
    // --- Variáveis Globais e Seletores de DOM ---

    // Define os usuários e suas senhas, e suas listas de devedores
    // Garante que a estrutura inicial dos usuários esteja correta com uma lista de devedores vazia
    let users = JSON.parse(localStorage.getItem('users')) || {
        'gine': { password: 'g0g0', debtors: [] },
        'marcos': { password: '8186', debtors: [] }
    };
    // Adiciona usuários padrão se eles não existirem (para a primeira execução)
    if (!users.gine) users.gine = { password: 'g0g0', debtors: [] };
    if (!users.marcos) users.marcos = { password: '8186', debtors: [] };
    // Salva a estrutura inicial garantindo que 'debtors' esteja presente para cada usuário
    localStorage.setItem('users', JSON.stringify(users));

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
    let debtorsOfCurrentUser = []; // Inicializado aqui, mas será preenchido após login

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

    // Calcula o saldo restante com base no total emprestado e total pago (considerando parcelas)
    function calculateRemainingBalance(debtor) {
        const totalPaidAcrossAllInstallments = debtor.installmentsData.reduce((sum, p) => sum + p.amountPaid, 0);
        return debtor.totalAmount - totalPaidAcrossAllInstallments;
    }

    // Calcula quantas parcelas ainda não foram 100% pagas
    function calculateRemainingInstallments(debtor) {
        return debtor.installmentsData.filter(inst => inst.amountPaid < debtor.amountPerInstallment).length;
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
    if (loggedInUser && debtorsList && users[loggedInUser]) { 
        // Carrega os devedores do usuário logado
        debtorsOfCurrentUser = users[loggedInUser].debtors;

        // --- Renderização dos Devedores ---
        function renderDebtors() {
            debtorsList.innerHTML = '';
            if (debtorsOfCurrentUser.length === 0) {
                debtorsList.innerHTML = '<p class="loading-message">Nenhum devedor cadastrado. Clique em "Adicionar Novo Devedor" para começar.</p>';
                return;
            }

            debtorsOfCurrentUser.forEach(debtor => {
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
            const debtor = debtorsOfCurrentUser.find(d => d.id === id);
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

        // --- Renderizar Pagamentos no Modal de Detalhes (Lógica Alterada) ---
        function renderPayments(debtor) {
            paymentsGrid.innerHTML = '';
            debtor.installmentsData.forEach((installment, index) => {
                const paymentSquare = document.createElement('div');
                paymentSquare.classList.add('payment-square');
                
                const installmentAmount = debtor.amountPerInstallment;
                const paidAmount = installment.amountPaid;
                const remainingToPay = installmentAmount - paidAmount;

                let statusText = '';
                let isPaid = false;
                let paymentDate = installment.dateOfLastPayment ? formatDate(installment.dateOfLastPayment) : `Parc. ${index + 1}`;

                if (paidAmount >= installmentAmount) {
                    isPaid = true;
                    paymentSquare.classList.add('paid');
                    statusText = formatCurrency(installmentAmount); // Mostra o valor total da parcela
                } else if (paidAmount > 0 && paidAmount < installmentAmount) {
                    statusText = `Faltam: ${formatCurrency(remainingToPay)}`;
                } else {
                    statusText = formatCurrency(installmentAmount); // Mostra o valor total da parcela
                }

                paymentSquare.innerHTML = `
                    <span>${statusText}</span>
                    <span>${paymentDate}</span>
                    ${isPaid ? `<button class="delete-payment-btn" data-installment-index="${index}">Excluir Pagamento</button>` : ''}
                `;

                // Adiciona listener apenas para parcelas não totalmente pagas (para selecionar)
                if (!isPaid) {
                    paymentSquare.addEventListener('click', () => selectPaymentSquare(paymentSquare, installmentAmount));
                }
                
                paymentsGrid.appendChild(paymentSquare);
            });

            // Re-adiciona listeners para os botões de excluir pagamento (agora por índice da parcela)
            document.querySelectorAll('.delete-payment-btn').forEach(button => {
                button.onclick = (e) => {
                    e.stopPropagation();
                    const installmentIndexToDelete = parseInt(e.target.dataset.installmentIndex);
                    deletePayment(currentDebtorId, installmentIndexToDelete);
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
            const debtor = debtorsOfCurrentUser.find(d => d.id === id);
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
                const debtorIndex = debtorsOfCurrentUser.findIndex(d => d.id === currentDebtorId);
                if (debtorIndex !== -1) {
                    let debtor = debtorsOfCurrentUser[debtorIndex];
                    // Se o número de parcelas ou valor por parcela mudar, a estrutura das parcelas precisa ser reavaliada
                    if (debtor.installments !== installments || debtor.amountPerInstallment !== amountPerInstallment) {
                        // Precisa recriar installmentsData se o total de parcelas ou valor mudar
                        debtor.installmentsData = Array.from({ length: installments }, (_, i) => ({ 
                            amountPaid: 0, 
                            dateOfLastPayment: null 
                        }));
                        // Aviso: Recriar instalações apaga histórico de pagamentos por parcela.
                        // Uma lógica mais avançada poderia tentar mapear pagamentos existentes.
                        alert('Atenção: A alteração no número ou valor das parcelas reiniciará o status de pagamento de cada parcela individualmente. O saldo total permanecerá o mesmo.');
                    }
                    debtor.name = name;
                    debtor.totalAmount = totalAmount;
                    debtor.installments = installments;
                    debtor.amountPerInstallment = amountPerInstallment;
                    debtor.startDate = startDate;
                    debtor.totalProfit = calculateTotalProfit(debtor);
                }
            } else {
                // Adicionando novo devedor
                const newDebtor = {
                    id: Date.now().toString(),
                    name,
                    totalAmount,
                    installments,
                    amountPerInstallment,
                    startDate,
                    // Inicializa a estrutura de dados das parcelas
                    installmentsData: Array.from({ length: installments }, (_, i) => ({ 
                        amountPaid: 0, 
                        dateOfLastPayment: null 
                    })),
                    totalProfit: calculateTotalProfit({ totalAmount, installments, amountPerInstallment }) 
                };
                debtorsOfCurrentUser.push(newDebtor);
            }

            users[loggedInUser].debtors = debtorsOfCurrentUser;
            localStorage.setItem('users', JSON.stringify(users));

            renderDebtors();
            addEditDebtorModal.style.display = 'none';
        }

        function deleteDebtor(id) {
            if (confirm('Tem certeza de que deseja excluir este devedor?')) {
                debtorsOfCurrentUser = debtorsOfCurrentUser.filter(d => d.id !== id);
                users[loggedInUser].debtors = debtorsOfCurrentUser;
                localStorage.setItem('users', JSON.stringify(users));

                renderDebtors();
                debtorDetailModal.style.display = 'none';
            }
        }

        // --- Lógica de Pagamentos (Alterada) ---
        function selectPaymentSquare(square, amount) {
            // Remove 'selected' de todos os outros
            document.querySelectorAll('.payment-square').forEach(s => s.classList.remove('selected'));
            // Adiciona 'selected' ao clicado
            square.classList.add('selected');
            paymentAmountInput.value = amount.toFixed(2);
            paymentDateInput.valueAsDate = new Date();
        }

        function addPayment() {
            if (!currentDebtorId) {
                alert('Selecione um devedor primeiro.');
                return;
            }

            const debtor = debtorsOfCurrentUser.find(d => d.id === currentDebtorId);
            if (!debtor) return;

            let paymentAmount = parseFloat(paymentAmountInput.value);
            const paymentDate = paymentDateInput.value;

            if (isNaN(paymentAmount) || !paymentDate || paymentAmount <= 0) {
                alert('Por favor, insira um valor e uma data válidos para o pagamento.');
                return;
            }

            // Itera pelas parcelas e aplica o pagamento
            for (let i = 0; i < debtor.installmentsData.length && paymentAmount > 0; i++) {
                let installment = debtor.installmentsData[i];
                const installmentValue = debtor.amountPerInstallment;
                const remainingInInstallment = installmentValue - installment.amountPaid;

                if (remainingInInstallment > 0) { // Se a parcela ainda precisa ser paga
                    const amountToApply = Math.min(paymentAmount, remainingInInstallment);
                    installment.amountPaid += amountToApply;
                    installment.dateOfLastPayment = paymentDate; // Atualiza data do último pagamento na parcela
                    paymentAmount -= amountToApply;
                }
            }

            users[loggedInUser].debtors = debtorsOfCurrentUser;
            localStorage.setItem('users', JSON.stringify(users));

            renderDebtors();
            showDebtorDetails(currentDebtorId);
            paymentAmountInput.value = '';
            paymentDateInput.value = '';
        }

        // Função para remover um pagamento de UMA PARCELA específica
        // Isso vai "desfazer" a parcela para o estado inicial ou parcial
        function deletePayment(debtorId, installmentIndex) {
            const debtor = debtorsOfCurrentUser.find(d => d.id === debtorId);
            if (!debtor || !debtor.installmentsData[installmentIndex]) return;

            if (confirm(`Tem certeza de que deseja zerar o pagamento da Parcela ${installmentIndex + 1}?`)) {
                // Zera o valor pago e a data da parcela específica
                debtor.installmentsData[installmentIndex].amountPaid = 0;
                debtor.installmentsData[installmentIndex].dateOfLastPayment = null;
                
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
            const debtor = debtorsOfCurrentUser.find(d => d.id === currentDebtorId);
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
        localStorage.removeItem('loggedInUser');
        window.location.href = 'index.html';
    }
});
