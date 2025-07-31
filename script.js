// --- Lógica de Alternância de Tema ---
const themeToggleButton = document.getElementById('themeToggleButton');
const body = document.body;

// Função para aplicar o tema
function applyTheme(theme) {
    if (theme === 'light') {
        body.classList.add('light-theme');
    } else {
        body.classList.remove('light-theme');
    }
    // Salva a preferência do usuário no localStorage
    localStorage.setItem('themePreference', theme);
}

// Carregar o tema preferido do usuário ao iniciar
const savedTheme = localStorage.getItem('themePreference');
if (savedTheme) {
    applyTheme(savedTheme);
} else {
    // Se não houver preferência salva, define um tema padrão (ex: escuro)
    applyTheme('dark');
}

// Adicionar listener de evento ao botão de alternância
if (themeToggleButton) { // Verifica se o botão existe
    themeToggleButton.addEventListener('click', () => {
        if (body.classList.contains('light-theme')) {
            applyTheme('dark'); // Se for light, muda para dark
        } else {
            applyTheme('light'); // Se for dark, muda para light
        }
    });
}

// --- Fim da Lógica de Alternância de Tema ---


// --- Lógica de Login (assumindo que já existe) ---
// Normalmente, a lógica de login estaria em um arquivo separado (ex: login.js)
// ou na página de login (index.html).
// Para este exemplo, vamos manter a estrutura do dashboard.

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', (event) => {
            event.preventDefault();
            const username = loginForm.username.value;
            const password = loginForm.password.value;

            // Simples verificação de login (APENAS PARA EXEMPLO!)
            if (username === 'admin' && password === 'admin') {
                localStorage.setItem('isAuthenticated', 'true');
                window.location.href = 'dashboard.html';
            } else {
                alert('Usuário ou senha incorretos.');
            }
        });
    }

    // --- Lógica do Dashboard (assumindo que o usuário está autenticado) ---
    if (window.location.pathname.endsWith('dashboard.html')) {
        const isAuthenticated = localStorage.getItem('isAuthenticated');
        if (!isAuthenticated) {
            window.location.href = 'index.html'; // Redireciona para login se não autenticado
            return;
        }

        const logoutButton = document.getElementById('logoutButton');
        if (logoutButton) {
            logoutButton.addEventListener('click', () => {
                localStorage.removeItem('isAuthenticated');
                localStorage.removeItem('themePreference'); // Opcional: limpa a preferência de tema ao sair
                window.location.href = 'index.html';
            });
        }

        // --- Variáveis e Elementos do Dashboard ---
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
        const detailTotalAmount = document.getElementById('detailTotalAmount');
        const detailInstallments = document.getElementById('detailInstallments');
        const detailAmountPerInstallment = document.getElementById('detailAmountPerInstallment');
        const detailStartDate = document.getElementById('detailStartDate');
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
        const totalAmountInput = document.getElementById('totalAmount');
        const installmentsInput = document.getElementById('installments');
        const startDateInput = document.getElementById('startDate');
        const saveDebtorButton = document.getElementById('saveDebtorButton');

        let debtors = JSON.parse(localStorage.getItem('debtors')) || [];
        let currentDebtorId = null; // Para controlar qual devedor está sendo visualizado/editado
        let selectedPaymentIndex = null; // Para controlar qual pagamento está selecionado para exclusão

        // --- Funções Auxiliares ---

        function formatCurrency(amount) {
            return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount);
        }

        function formatDate(dateString) {
            if (!dateString) return '';
            const [year, month, day] = dateString.split('-');
            return `${day}/${month}/${year}`;
        }

        function calculateAmountPerInstallment(totalAmount, installments) {
            if (installments === 0) return 0;
            return totalAmount / installments;
        }

        function showError(message) {
            errorMessageDiv.textContent = message;
            errorMessageDiv.style.display = 'block';
            setTimeout(() => {
                errorMessageDiv.style.display = 'none';
            }, 5000);
        }

        // --- Renderização de Devedores ---
        function renderDebtors() {
            debtorsList.innerHTML = ''; // Limpa a lista antes de renderizar
            if (debtors.length === 0) {
                debtorsList.innerHTML = '<p class="loading-message">Nenhum devedor cadastrado. Clique em "Adicionar Novo Devedor" para começar.</p>';
                return;
            }

            debtors.forEach(debtor => {
                const totalPaid = debtor.payments.reduce((sum, p) => sum + p.amount, 0);
                const remainingAmount = debtor.totalAmount - totalPaid;

                const debtorItem = document.createElement('div');
                debtorItem.className = 'debtor-item';
                debtorItem.setAttribute('data-id', debtor.id);

                debtorItem.innerHTML = `
                    <div class="debtor-info">
                        <h2>${debtor.name}</h2>
                        <p>${debtor.description || 'Sem descrição'}</p>
                        <p>Total: ${formatCurrency(debtor.totalAmount)}</p>
                        <p>Restante: <span style="color: ${remainingAmount > 0 ? 'var(--error-color)' : 'var(--success-color)'}">${formatCurrency(remainingAmount)}</span></p>
                    </div>
                    <div class="debtor-actions">
                        <button class="edit-debtor-btn small-button">Editar</button>
                        <button class="delete-debtor-btn small-button">Excluir</button>
                    </div>
                `;

                // Event Listener para abrir modal de detalhes
                debtorItem.querySelector('.debtor-info').addEventListener('click', (event) => {
                    // Evita que o clique nos botões de ação também abra o modal de detalhes
                    if (!event.target.closest('.debtor-actions')) {
                         openDebtorDetailModal(debtor.id);
                    }
                });


                // Event Listener para o botão Editar
                debtorItem.querySelector('.edit-debtor-btn').addEventListener('click', (event) => {
                    event.stopPropagation(); // Evita que o clique propague para o item do devedor
                    openAddEditDebtorModal(debtor.id);
                });

                // Event Listener para o botão Excluir
                debtorItem.querySelector('.delete-debtor-btn').addEventListener('click', (event) => {
                    event.stopPropagation(); // Evita que o clique propague para o item do devedor
                    if (confirm(`Tem certeza que deseja excluir ${debtor.name}?`)) {
                        deleteDebtor(debtor.id);
                    }
                });

                debtorsList.appendChild(debtorItem);
            });
        }

        // --- Adicionar/Editar Devedor ---
        addDebtorButton.addEventListener('click', () => openAddEditDebtorModal());

        addEditDebtorForm.addEventListener('submit', (event) => {
            event.preventDefault();

            const name = debtorNameInput.value;
            const description = debtorDescriptionInput.value;
            const totalAmount = parseFloat(totalAmountInput.value);
            const installments = parseInt(installmentsInput.value);
            const startDate = startDateInput.value;

            if (isNaN(totalAmount) || isNaN(installments) || totalAmount <= 0 || installments <= 0) {
                showError('Por favor, insira valores válidos para Valor Total e Parcelas.');
                return;
            }

            if (currentDebtorId) { // Editando devedor existente
                const debtorIndex = debtors.findIndex(d => d.id === currentDebtorId);
                if (debtorIndex > -1) {
                    const oldDebtor = debtors[debtorIndex];

                    // Atualiza apenas os campos do formulário de edição
                    oldDebtor.name = name;
                    oldDebtor.description = description;
                    oldDebtor.totalAmount = totalAmount;
                    oldDebtor.installments = installments;
                    oldDebtor.startDate = startDate;

                    // Recalcula valor por parcela se o total ou parcelas mudarem
                    oldDebtor.amountPerInstallment = calculateAmountPerInstallment(totalAmount, installments);

                    // Revalida/ajusta pagamentos se o valor total mudar drasticamente
                    // Implementação mais complexa pode ser necessária aqui para lidar com pagamentos já feitos
                    // Por simplicidade, assumimos que pagamentos existentes são válidos.
                }
            } else { // Adicionando novo devedor
                const newDebtor = {
                    id: Date.now(), // ID único baseado no timestamp
                    name,
                    description,
                    totalAmount,
                    installments,
                    startDate,
                    amountPerInstallment: calculateAmountPerInstallment(totalAmount, installments),
                    payments: []
                };
                debtors.push(newDebtor);
            }

            localStorage.setItem('debtors', JSON.stringify(debtors));
            renderDebtors();
            addEditDebtorModal.style.display = 'none';
        });

        function openAddEditDebtorModal(id = null) {
            addEditDebtorForm.reset(); // Limpa o formulário
            currentDebtorId = id; // Define o ID do devedor atual

            if (id) {
                addEditModalTitle.textContent = 'Editar Devedor';
                const debtor = debtors.find(d => d.id === id);
                if (debtor) {
                    debtorNameInput.value = debtor.name;
                    debtorDescriptionInput.value = debtor.description;
                    totalAmountInput.value = debtor.totalAmount;
                    installmentsInput.value = debtor.installments;
                    startDateInput.value = debtor.startDate;
                }
            } else {
                addEditModalTitle.textContent = 'Adicionar Novo Devedor';
            }
            addEditDebtorModal.style.display = 'flex'; // Use flex para centralizar
        }

        function deleteDebtor(id) {
            debtors = debtors.filter(d => d.id !== id);
            localStorage.setItem('debtors', JSON.stringify(debtors));
            renderDebtors();
        }

        // --- Modal de Detalhes do Devedor ---
        function openDebtorDetailModal(id) {
            currentDebtorId = id;
            const debtor = debtors.find(d => d.id === id);

            if (debtor) {
                detailDebtorName.textContent = debtor.name;
                detailDebtorDescription.textContent = debtor.description;
                detailTotalAmount.textContent = formatCurrency(debtor.totalAmount);
                detailInstallments.textContent = debtor.installments;
                detailAmountPerInstallment.textContent = formatCurrency(debtor.amountPerInstallment);
                detailStartDate.textContent = formatDate(debtor.startDate);

                renderPaymentsGrid(debtor);
                debtorDetailModal.style.display = 'flex'; // Use flex para centralizar
            }
        }

        function renderPaymentsGrid(debtor) {
            paymentsGrid.innerHTML = '';
            selectedPaymentIndex = null; // Reseta seleção

            for (let i = 0; i < debtor.installments; i++) {
                const payment = debtor.payments[i];
                const paymentSquare = document.createElement('div');
                paymentSquare.className = `payment-square ${payment ? 'paid' : ''}`;
                paymentSquare.setAttribute('data-index', i);

                const installmentNumber = i + 1;
                const value = payment ? payment.amount : debtor.amountPerInstallment;
                const date = payment ? formatDate(payment.date) : 'Pendente';

                paymentSquare.innerHTML = `
                    <span>Parc. ${installmentNumber}</span>
                    <span>${formatCurrency(value)}</span>
                    <span style="font-size: 0.75em; color: ${payment ? 'rgba(255,255,255,0.7)' : 'var(--light-text)'};">${date}</span>
                    ${payment ? `<button class="delete-payment-btn" data-payment-index="${i}">X</button>` : ''}
                `;

                // Adiciona evento de clique para selecionar a caixinha
                paymentSquare.addEventListener('click', () => {
                    // Remove 'selected' de todos os outros
                    document.querySelectorAll('.payment-square').forEach(sq => sq.classList.remove('selected'));
                    
                    // Adiciona 'selected' ao clicado, se não estiver pago
                    if (!paymentSquare.classList.contains('paid')) {
                        paymentSquare.classList.add('selected');
                        selectedPaymentIndex = parseInt(paymentSquare.getAttribute('data-index'));
                    } else {
                        selectedPaymentIndex = null; // Não permite selecionar pagamentos já feitos para adicionar
                    }
                });

                // Evento para o botão de exclusão de pagamento (se existir)
                const deleteBtn = paymentSquare.querySelector('.delete-payment-btn');
                if (deleteBtn) {
                    deleteBtn.addEventListener('click', (e) => {
                        e.stopPropagation(); // Impede que o clique propague para o paymentSquare
                        const paymentIdxToDelete = parseInt(e.target.getAttribute('data-payment-index'));
                        if (confirm('Tem certeza que deseja remover este pagamento?')) {
                            removePayment(currentDebtorId, paymentIdxToDelete);
                        }
                    });
                }

                paymentsGrid.appendChild(paymentSquare);
            }

            // Preenche o campo de valor com o valor da próxima parcela, se houver
            const nextPendingInstallmentIndex = debtor.payments.length;
            if (nextPendingInstallmentIndex < debtor.installments) {
                paymentAmountInput.value = debtor.amountPerInstallment.toFixed(2);
                // Opcional: pré-selecionar a próxima parcela para pagamento
                const nextSquare = paymentsGrid.querySelector(`.payment-square[data-index="${nextPendingInstallmentIndex}"]`);
                if(nextSquare) {
                    nextSquare.classList.add('selected');
                    selectedPaymentIndex = nextPendingInstallmentIndex;
                }
            } else {
                paymentAmountInput.value = ''; // Limpa se todas as parcelas foram pagas
                selectedPaymentIndex = null;
            }
            paymentDateInput.valueAsDate = new Date(); // Define a data atual como padrão
        }

        // --- Adicionar Pagamento ---
        addPaymentButton.addEventListener('click', () => {
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

            const debtorIndex = debtors.findIndex(d => d.id === currentDebtorId);
            if (debtorIndex > -1) {
                const debtor = debtors[debtorIndex];

                // Verifica se já há um pagamento para esta parcela, se um index for selecionado
                if (selectedPaymentIndex !== null && debtor.payments[selectedPaymentIndex]) {
                    showError('Já existe um pagamento para esta parcela. Remova-o antes de adicionar um novo.');
                    return;
                }
                
                // Adiciona o pagamento na posição correta ou no fim se nenhuma parcela específica for selecionada
                const paymentToAdd = { amount: paymentAmount, date: paymentDate };
                if (selectedPaymentIndex !== null && selectedPaymentIndex < debtor.installments) {
                    debtor.payments[selectedPaymentIndex] = paymentToAdd;
                } else {
                    debtor.payments.push(paymentToAdd);
                }

                // Ordena os pagamentos pela data da parcela (se for para manter a ordem)
                // ou simplesmente pela ordem de index se o user.story for de marcar parcela a parcela.
                // Para simplificar, vou assumir que a ordem no array corresponde à ordem da parcela.
                // Se o seu caso de uso exigir, pode ordenar por data de pagamento aqui:
                // debtor.payments.sort((a, b) => new Date(a.date) - new Date(b.date));
                
                localStorage.setItem('debtors', JSON.stringify(debtors));
                renderPaymentsGrid(debtor); // Re-renderiza a grade de pagamentos
                renderDebtors(); // Atualiza a lista principal de devedores (saldo restante)
                paymentAmountInput.value = '';
                paymentDateInput.valueAsDate = new Date();
                selectedPaymentIndex = null; // Reseta a seleção
            }
        });

        // Preencher valor com o valor da parcela
        fillAmountButton.addEventListener('click', () => {
            if (currentDebtorId === null) return;
            const debtor = debtors.find(d => d.id === currentDebtorId);
            if (debtor) {
                paymentAmountInput.value = debtor.amountPerInstallment.toFixed(2);
            }
        });


        // Função para remover um pagamento
        function removePayment(debtorId, paymentIndex) {
            const debtorIndex = debtors.findIndex(d => d.id === debtorId);
            if (debtorIndex > -1) {
                const debtor = debtors[debtorIndex];
                // Remove o pagamento na posição indicada
                debtor.payments.splice(paymentIndex, 1);
                
                // Opcional: preencher o slot vazio com o próximo pagamento para manter a sequência
                // ou deixar vazio se for para refletir "pagamento removido" para aquela parcela.
                // Para este exemplo, simplesmente removemos e deixamos o slot pendente.

                localStorage.setItem('debtors', JSON.stringify(debtors));
                renderPaymentsGrid(debtor); // Re-renderiza para mostrar a remoção
                renderDebtors(); // Atualiza o saldo geral
            }
        }


        // --- Fechar Modals ---
        closeButtons.forEach(button => {
            button.addEventListener('click', () => {
                debtorDetailModal.style.display = 'none';
                addEditDebtorModal.style.display = 'none';
                selectedPaymentIndex = null; // Garante que a seleção é resetada
            });
        });

        // Fechar modal ao clicar fora do conteúdo
        window.addEventListener('click', (event) => {
            if (event.target === debtorDetailModal) {
                debtorDetailModal.style.display = 'none';
                selectedPaymentIndex = null;
            }
            if (event.target === addEditDebtorModal) {
                addEditDebtorModal.style.display = 'none';
            }
        });

        // Chamada inicial para renderizar os devedores ao carregar a página
        renderDebtors();
    }
});
