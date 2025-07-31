document.addEventListener('DOMContentLoaded', () => {
    const API_URL = 'https://gerenciador-emprestimos-api.onrender.com';

    const errorMessageElement = document.getElementById('errorMessage');

    // Funções utilitárias para mensagens de erro
    const showErrorMessage = (message) => {
        if (errorMessageElement) {
            errorMessageElement.textContent = message;
            errorMessageElement.style.display = 'block';
        }
    };

    const hideErrorMessage = () => {
        if (errorMessageElement) {
            errorMessageElement.textContent = '';
            errorMessageElement.style.display = 'none';
        }
    };

    // Função para obter o token de acesso do localStorage
    const getToken = () => localStorage.getItem('accessToken');

    // Função para fazer requisições com autenticação e tratamento de sessão expirada
    const fetchWithAuth = async (url, options = {}) => {
        const token = getToken();
        const headers = {
            ...options.headers,
            'Content-Type': 'application/json',
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(url, { ...options, headers });

        // Tratamento de sessão expirada ou não autorizado
        if (response.status === 401 || response.status === 403) {
            alert('Sessão expirada ou não autorizado. Por favor, faça login novamente.');
            localStorage.removeItem('accessToken');
            window.location.href = 'index.html'; // Redireciona para a página de login
            throw new Error('Sessão expirada ou não autorizado.');
        }
        return response;
    };

    // --- Lógica da Página de Login (index.html) ---
    if (window.location.pathname.endsWith('index.html') || window.location.pathname.endsWith('/')) {
        const loginForm = document.getElementById('loginForm');

        if (loginForm) {
            const usernameInput = document.getElementById('username');
            const passwordInput = document.getElementById('password');
            const loginButton = loginForm.querySelector('button[type="submit"]');

            loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                hideErrorMessage();

                const username = usernameInput.value.trim();
                const password = passwordInput.value.trim();

                if (!username || !password) {
                    showErrorMessage('Por favor, preencha todos os campos de usuário e senha.');
                    return;
                }

                loginButton.disabled = true;
                loginButton.textContent = 'Entrando...';

                try {
                    const response = await fetch(`${API_URL}/login`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ username, password })
                    });

                    if (response.ok) {
                        const data = await response.json();
                        localStorage.setItem('accessToken', data.accessToken);
                        window.location.href = 'dashboard.html';
                    } else {
                        const errorText = await response.text();
                        showErrorMessage(errorText || 'Erro ao fazer login. Verifique suas credenciais.');
                    }
                } catch (error) {
                    console.error('Erro de rede ou servidor:', error);
                    showErrorMessage('Não foi possível conectar ao servidor. Tente novamente mais tarde.');
                } finally {
                    loginButton.disabled = false;
                    loginButton.textContent = 'Entrar';
                }
            });
        }

        if (getToken()) {
            window.location.href = 'dashboard.html';
        }
    }

    // --- Lógica da Página do Dashboard (dashboard.html) ---
    if (window.location.pathname.endsWith('dashboard.html')) {
        const debtorsListElement = document.getElementById('debtorsList');
        const addDebtorButton = document.getElementById('addDebtorButton');
        const logoutButton = document.getElementById('logoutButton');

        // Elementos do Modal de Detalhes do Devedor
        const debtorDetailModal = document.getElementById('debtorDetailModal');
        const closeDetailModalButton = debtorDetailModal.querySelector('.close-button');
        const detailDebtorName = document.getElementById('detailDebtorName');
        const detailTotalAmount = document.getElementById('detailTotalAmount');
        const detailInstallments = document.getElementById('detailInstallments');
        const detailAmountPerInstallment = document.getElementById('detailAmountPerInstallment');
        const detailStartDate = document.getElementById('detailStartDate');
        const paymentsGrid = document.getElementById('paymentsGrid');
        const paymentAmountInput = document.getElementById('paymentAmount');
        const paymentDateInput = document.getElementById('paymentDate');
        const fillAmountButton = document.getElementById('fillAmountButton');
        const addPaymentButton = document.getElementById('addPaymentButton');

        let currentDebtorId = null; 

        // Elementos do Modal de Adicionar/Editar Devedor
        const addEditDebtorModal = document.getElementById('addEditDebtorModal');
        const closeAddEditModalButton = addEditDebtorModal.querySelector('.close-button');
        const addEditModalTitle = document.getElementById('addEditModalTitle');
        const addEditDebtorForm = document.getElementById('addEditDebtorForm');
        const debtorNameInput = document.getElementById('debtorName');
        const totalAmountInput = document.getElementById('totalAmount');
        const installmentsInput = document.getElementById('installments');
        const startDateInput = document.getElementById('startDate');
        const saveDebtorButton = document.getElementById('saveDebtorButton');

        let isEditMode = false;
        let debtorToEditId = null;

        // --- Funções de Exibição e Interação ---

        // Abre o modal de detalhes do devedor
        const openDebtorDetailModal = async (debtorId) => {
            hideErrorMessage();
            try {
                const response = await fetchWithAuth(`${API_URL}/debtors/${debtorId}`);
                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.message || 'Falha ao carregar detalhes do devedor.');
                }
                const debtor = await response.json();

                currentDebtorId = debtor._id; 

                detailDebtorName.textContent = debtor.name;
                detailTotalAmount.textContent = formatCurrency(debtor.totalAmount);
                detailInstallments.textContent = debtor.installments;
                detailAmountPerInstallment.textContent = formatCurrency(debtor.amountPerInstallment);
                
                // A data de início ainda é uma string (YYYY-MM-DD) do DB para devedores
                detailStartDate.textContent = new Date(debtor.startDate + 'T00:00:00Z').toLocaleDateString('pt-BR');

                renderPayments(debtor.payments || []); 

                paymentAmountInput.value = debtor.amountPerInstallment.toFixed(2);
                paymentDateInput.value = ''; // Limpa o campo de data do pagamento

                debtorDetailModal.style.display = 'block';

            } catch (error) {
                console.error('Erro ao carregar detalhes do devedor:', error);
                showErrorMessage(`Erro: ${error.message}`);
            }
        };

        // Renderiza a lista de pagamentos no modal de detalhes
        const renderPayments = (payments) => {
            paymentsGrid.innerHTML = ''; 
            if (payments.length === 0) {
                paymentsGrid.innerHTML = '<p>Nenhum pagamento registrado ainda.</p>';
                return;
            }

            const sortedPayments = [...payments].sort((a, b) => new Date(a.date) - new Date(b.date));

            sortedPayments.forEach(payment => {
                const paymentSquare = document.createElement('div');
                paymentSquare.classList.add('payment-square');
                
                // CORREÇÃO FINAL DA DATA: O backend agora envia a data como um Date object ISO string.
                // O `new Date()` sozinho já consegue parsear isso.
                const paymentDateDisplay = new Date(payment.date).toLocaleDateString('pt-BR');

                paymentSquare.innerHTML = `
                    <p>Valor: ${formatCurrency(payment.amount)}</p>
                    <p>Data: ${paymentDateDisplay}</p>
                    <button class="delete-payment-button" data-payment-id="${payment.id}">Excluir</button>
                `;
                paymentsGrid.appendChild(paymentSquare);
            });
        };

        // --- Funções de Carregamento de Dados ---

        // Carrega e exibe todos os devedores
        const loadDebtors = async () => {
            hideErrorMessage();
            debtorsListElement.innerHTML = '<p>Carregando devedores...</p>';
            try {
                const response = await fetchWithAuth(`${API_URL}/debtors`);
                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.message || 'Falha ao carregar devedores.');
                }
                const debtors = await response.json();

                debtorsListElement.innerHTML = ''; 

                if (debtors.length === 0) {
                    debtorsListElement.innerHTML = '<p>Nenhum devedor cadastrado ainda. Clique em "Adicionar Novo Devedor" para começar.</p>';
                    return;
                }

                debtors.forEach(debtor => {
                    const debtorItem = document.createElement('div');
                    debtorItem.classList.add('debtor-item');
                    debtorItem.dataset.id = debtor._id; 

                    // --- Renderização dos quadrados de pagamento ---
                    const totalPaidAmount = debtor.payments.reduce((sum, p) => sum + p.amount, 0);
                    const paidInstallments = Math.floor(totalPaidAmount / debtor.amountPerInstallment);
                    const remainingInstallments = debtor.installments - paidInstallments;

                    let paymentSquaresHtml = '<div class="payment-squares">';
                    for (let i = 0; i < debtor.installments; i++) {
                        // Ajuste a lógica se você tiver pagamentos parciais
                        if (i < paidInstallments) {
                            paymentSquaresHtml += '<div class="payment-square paid"></div>';
                        } else {
                            paymentSquaresHtml += '<div class="payment-square"></div>';
                        }
                    }
                    paymentSquaresHtml += '</div>';
                    // --- Fim da renderização dos quadrados de pagamento ---


                    debtorItem.innerHTML = `
                        <h3>${debtor.name}</h3>
                        <p>Total: ${formatCurrency(debtor.totalAmount)}</p>
                        <p>Parcelas: ${debtor.installments}</p>
                        <p>Valor por Parcela: ${formatCurrency(debtor.amountPerInstallment)}</p>
                        <p>Saldo Restante: ${formatCurrency(debtor.remainingBalance)}</p>
                        ${paymentSquaresHtml} <div class="debtor-actions">
                            <button class="view-payments-button small-button">Ver Pagamentos</button>
                            <button class="edit-debtor-button small-button">Editar</button>
                            <button class="delete-debtor-button small-button">Excluir</button>
                        </div>
                    `;
                    debtorsListElement.appendChild(debtorItem);
                });

            } catch (error) {
                console.error('Erro ao carregar devedores:', error);
                showErrorMessage(`Erro: ${error.message}`);
            }
        };

        // --- Event Listeners Globais do Dashboard ---

        // Botão de Logout
        logoutButton.addEventListener('click', () => {
            localStorage.removeItem('accessToken');
            window.location.href = 'index.html';
        });

        // Botão "Adicionar Novo Devedor"
        addDebtorButton.addEventListener('click', () => {
            isEditMode = false;
            debtorToEditId = null;
            addEditModalTitle.textContent = 'Adicionar Novo Devedor';
            addEditDebtorForm.reset(); 
            addEditDebtorModal.style.display = 'block';
            hideErrorMessage(); 
        });

        // Event listener para os botões dentro da lista de devedores (usando delegação de eventos)
        debtorsListElement.addEventListener('click', async (e) => {
            const debtorItem = e.target.closest('.debtor-item');
            if (!debtorItem) return; 

            const debtorId = debtorItem.dataset.id;

            if (e.target.classList.contains('view-payments-button')) {
                await openDebtorDetailModal(debtorId);
            } else if (e.target.classList.contains('edit-debtor-button')) {
                isEditMode = true;
                debtorToEditId = debtorId;
                addEditModalTitle.textContent = 'Editar Devedor';
                hideErrorMessage(); 

                try {
                    const response = await fetchWithAuth(`${API_URL}/debtors/${debtorId}`);
                    if (!response.ok) {
                        const error = await response.json();
                        throw new Error(error.message || 'Falha ao carregar devedor para edição.');
                    }
                    const debtor = await response.json();
                    
                    debtorNameInput.value = debtor.name;
                    totalAmountInput.value = debtor.totalAmount;
                    installmentsInput.value = debtor.installments;
                    startDateInput.value = debtor.startDate; 
                    addEditDebtorModal.style.display = 'block';

                } catch (error) {
                    console.error('Erro ao carregar devedor para edição:', error);
                    showErrorMessage(`Erro: ${error.message}`);
                }
            } else if (e.target.classList.contains('delete-debtor-button')) {
                if (confirm('Tem certeza que deseja excluir este devedor e todos os seus pagamentos?')) {
                    hideErrorMessage();
                    try {
                        const response = await fetchWithAuth(`${API_URL}/debtors/${debtorId}`, {
                            method: 'DELETE'
                        });
                        if (!response.ok) {
                            const error = await response.json();
                            throw new Error(error.message || 'Falha ao excluir devedor.');
                        }
                        await loadDebtors(); 
                    } catch (error) {
                        console.error('Erro ao excluir devedor:', error);
                        showErrorMessage(`Erro: ${error.message}`);
                    }
                }
            }
        });

        // --- Event Listeners do Modal de Adicionar/Editar Devedor ---

        // Fechar o modal de Adicionar/Editar
        closeAddEditModalButton.addEventListener('click', () => {
            addEditDebtorModal.style.display = 'none';
        });

        // Submeter o formulário de Adicionar/Editar Devedor
        addEditDebtorForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            hideErrorMessage();

            const name = debtorNameInput.value.trim();
            const totalAmount = parseFloat(totalAmountInput.value);
            const installments = parseInt(installmentsInput.value);
            const startDate = startDateInput.value; 

            if (!name || isNaN(totalAmount) || totalAmount <= 0 || isNaN(installments) || installments <= 0 || !startDate) {
                showErrorMessage('Por favor, preencha todos os campos do devedor corretamente.');
                return;
            }

            saveDebtorButton.disabled = true;
            saveDebtorButton.textContent = 'Salvando...';

            const method = isEditMode ? 'PUT' : 'POST';
            const url = isEditMode ? `${API_URL}/debtors/${debtorToEditId}` : `${API_URL}/debtors`;

            try {
                const response = await fetchWithAuth(url, {
                    method: method,
                    body: JSON.stringify({ name, totalAmount, installments, startDate })
                });

                if (response.ok) {
                    addEditDebtorModal.style.display = 'none';
                    await loadDebtors(); 
                } else {
                    const error = await response.json();
                    showErrorMessage(error.message || `Erro ao ${isEditMode ? 'atualizar' : 'adicionar'} devedor.`);
                }
            } catch (error) {
                console.error(`Erro de rede ou servidor ao ${isEditMode ? 'atualizar' : 'adicionar'} devedor:`, error);
                showErrorMessage('Não foi possível conectar ao servidor. Tente novamente mais tarde.');
            } finally {
                saveDebtorButton.disabled = false;
                saveDebtorButton.textContent = 'Salvar Devedor';
            }
        });

        // --- Event Listeners do Modal de Detalhes do Devedor ---

        // Fechar o modal de Detalhes
        closeDetailModalButton.addEventListener('click', () => {
            debtorDetailModal.style.display = 'none';
            currentDebtorId = null; 
            hideErrorMessage(); 
        });

        // Botão "Usar Valor da Parcela"
        fillAmountButton.addEventListener('click', () => {
            // Remove R$ e espaços, depois substitui vírgula por ponto para parseFloat
            paymentAmountInput.value = detailAmountPerInstallment.textContent.replace('R$', '').trim().replace(',', '.');
        });

        // Botão "Adicionar Pagamento"
        addPaymentButton.addEventListener('click', async () => {
            if (!currentDebtorId) {
                showErrorMessage('Nenhum devedor selecionado para adicionar pagamento.');
                return;
            }

            hideErrorMessage();

            const amount = parseFloat(paymentAmountInput.value);
            const date = paymentDateInput.value; 

            if (isNaN(amount) || amount <= 0 || !date) {
                showErrorMessage('Por favor, insira um valor e uma data de pagamento válidos.');
                return;
            }

            addPaymentButton.disabled = true;
            addPaymentButton.textContent = 'Adicionando...';

            try {
                const response = await fetchWithAuth(`${API_URL}/debtors/${currentDebtorId}/payments`, {
                    method: 'POST',
                    body: JSON.stringify({ amount, date })
                });

                if (response.ok) {
                    const updatedDebtor = await response.json();
                    renderPayments(updatedDebtor.payments || []); 
                    // Atualiza o saldo restante no modal de detalhes
                    document.getElementById('detailTotalAmount').textContent = formatCurrency(updatedDebtor.totalAmount); // Ou recalcule com base nos pagamentos

                    await loadDebtors(); // Atualiza a lista principal para refletir os novos pagamentos e saldos

                    paymentAmountInput.value = updatedDebtor.amountPerInstallment.toFixed(2); 
                    paymentDateInput.value = ''; 

                } else {
                    const error = await response.json();
                    showErrorMessage(error.message || 'Erro ao adicionar pagamento.');
                }
            } catch (error) {
                console.error('Erro de rede ou servidor ao adicionar pagamento:', error);
                showErrorMessage('Não foi possível conectar ao servidor. Tente novamente mais tarde.');
            } finally {
                addPaymentButton.disabled = false;
                addPaymentButton.textContent = 'Adicionar Pagamento';
            }
        });

        // Event listener para botões de exclusão de pagamento dentro do paymentsGrid
        paymentsGrid.addEventListener('click', async (e) => {
            if (e.target.classList.contains('delete-payment-button')) {
                const paymentId = e.target.dataset.paymentId;
                if (!currentDebtorId || !paymentId) {
                    showErrorMessage('Erro: ID do devedor ou pagamento não encontrado.');
                    return;
                }

                if (confirm('Tem certeza que deseja excluir este pagamento?')) {
                    hideErrorMessage();
                    try {
                        const response = await fetchWithAuth(`${API_URL}/debtors/${currentDebtorId}/payments/${paymentId}`, {
                            method: 'DELETE'
                        });

                        if (response.status === 204) { 
                            await openDebtorDetailModal(currentDebtorId); // Recarrega os detalhes do devedor para atualizar a lista de pagamentos
                            await loadDebtors(); // Atualiza a lista principal para refletir o novo saldo
                        } else if (response.status === 404) {
                             showErrorMessage('Pagamento não encontrado.');
                        } else {
                            const error = await response.json();
                            throw new Error(error.message || 'Falha ao excluir pagamento.');
                        }
                    } catch (error) {
                        console.error('Erro ao excluir pagamento:', error);
                        showErrorMessage(`Erro: ${error.message}`);
                    }
                }
            }
        });

        // --- Funções Auxiliares ---

        // Formata um número para moeda BRL
        const formatCurrency = (value) => {
            return new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL'
            }).format(value);
        };

        // --- Inicialização ---
        loadDebtors(); 
    }
});
