document.addEventListener('DOMContentLoaded', () => {
    const loginSection = document.getElementById('loginSection');
    const registerSection = document.getElementById('registerSection');
    const dashboardSection = document.getElementById('dashboardSection');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const toggleToRegister = document.getElementById('toggleToRegister');
    const toggleToLogin = document.getElementById('toggleToLogin');
    const loginErrorMessage = document.getElementById('loginErrorMessage');
    const registerErrorMessage = document.getElementById('registerErrorMessage');
    const logoutButton = document.getElementById('logoutButton');
    const addDebtorButton = document.getElementById('addDebtorButton');
    const addEditDebtorModal = document.getElementById('addEditDebtorModal');
    const closeAddEditDebtorModal = document.getElementById('closeAddEditDebtorModal');
    const addEditDebtorForm = document.getElementById('addEditDebtorForm');
    const modalTitle = document.getElementById('modalTitle');
    const debtorIdInput = document.getElementById('debtorId');
    const nameInput = document.getElementById('name');
    const descriptionInput = document.getElementById('description'); // NOVO
    const totalAmountInput = document.getElementById('totalAmount');
    const installmentsInput = document.getElementById('installments');
    const startDateInput = document.getElementById('startDate');
    const saveDebtorButton = document.getElementById('saveDebtorButton'); // Para feedback visual
    const debtorsListElement = document.getElementById('debtorsList');
    const errorMessageElement = document.getElementById('errorMessage');

    const debtorDetailsModal = document.getElementById('debtorDetailsModal');
    const closeDebtorDetailsModal = document.getElementById('closeDebtorDetailsModal');
    const detailsDebtorName = document.getElementById('detailsDebtorName');
    const detailsDebtorDescription = document.getElementById('detailsDebtorDescription'); // NOVO
    const detailsTotalAmount = document.getElementById('detailsTotalAmount');
    const detailsInstallments = document.getElementById('detailsInstallments');
    const detailsAmountPerInstallment = document.getElementById('detailsAmountPerInstallment');
    const detailsStartDate = document.getElementById('detailsStartDate');
    const detailsRemainingBalance = document.getElementById('detailsRemainingBalance');
    const editDebtorButton = document.getElementById('editDebtorButton');
    const deleteDebtorButton = document.getElementById('deleteDebtorButton');
    const paymentsGrid = document.getElementById('paymentsGrid');
    const addPaymentForm = document.getElementById('addPaymentForm');
    const currentDebtorIdInput = document.getElementById('currentDebtorId');
    const paymentAmountInput = document.getElementById('paymentAmount');
    const paymentDateInput = document.getElementById('paymentDate');
    const addPaymentButton = document.getElementById('addPaymentButton'); // Para feedback visual

    // --- NOVO: Variáveis para os novos modais ---
    const messageModal = document.getElementById('messageModal');
    const closeMessageModal = document.getElementById('closeMessageModal');
    const messageModalTitle = document.getElementById('messageModalTitle');
    const messageModalContent = document.getElementById('messageModalContent');
    const messageModalConfirmBtn = document.getElementById('messageModalConfirmBtn');

    const confirmModal = document.getElementById('confirmModal');
    const closeConfirmModal = document.getElementById('closeConfirmModal');
    const confirmModalContent = document.getElementById('confirmModalContent');
    const confirmModalYes = document.getElementById('confirmModalYes');
    const confirmModalNo = document.getElementById('confirmModalNo');

    // --- NOVO: Variáveis para feedback visual ---
    const actionMessageElement = document.getElementById('actionMessage');

    // --- NOVO: Variáveis para elementos de estatísticas ---
    const totalDebtorsCount = document.getElementById('totalDebtorsCount');
    const totalAmountDue = document.getElementById('totalAmountDue');
    const totalAmountPaid = document.getElementById('totalAmountPaid');
    const totalRemainingBalance = document.getElementById('totalRemainingBalance');


    const API_URL = 'https://gerenciador-de-devedores-api.onrender.com'; // Sua URL da API no Render

    // --- Funções Auxiliares ---

    const showPage = (page) => {
        loginSection.style.display = 'none';
        registerSection.style.display = 'none';
        dashboardSection.style.display = 'none';
        if (page === 'login') {
            loginSection.style.display = 'flex';
        } else if (page === 'register') {
            registerSection.style.display = 'flex';
        } else if (page === 'dashboard') {
            dashboardSection.style.display = 'block';
            loadDebtors(); // Carrega os devedores ao entrar no dashboard
        }
    };

    const hideErrorMessage = () => {
        loginErrorMessage.style.display = 'none';
        registerErrorMessage.style.display = 'none';
        errorMessageElement.style.display = 'none';
    };

    const displayErrorMessage = (element, message) => {
        element.textContent = message;
        element.style.display = 'block';
    };

    // NOVO: Funções para exibir modais personalizados
    const showCustomMessage = (title, message, type = 'info', callback = null) => {
        messageModalTitle.textContent = title;
        messageModalContent.textContent = message;

        if (type === 'success') {
            messageModalTitle.style.color = 'var(--success-color)';
            messageModalConfirmBtn.style.backgroundColor = 'var(--success-color)';
        } else if (type === 'error') {
            messageModalTitle.style.color = 'var(--error-color)';
            messageModalConfirmBtn.style.backgroundColor = 'var(--error-color)';
        } else {
            messageModalTitle.style.color = 'var(--text-color)';
            messageModalConfirmBtn.style.backgroundColor = 'var(--accent-color)';
        }

        messageModalConfirmBtn.style.display = 'block';
        messageModalConfirmBtn.onclick = () => {
            messageModal.style.display = 'none';
            if (callback) callback();
        };
        messageModal.style.display = 'flex';
    };

    const showCustomConfirm = (message, callback) => {
        confirmModalContent.textContent = message;
        confirmModal.style.display = 'flex';

        confirmModalYes.onclick = () => {
            confirmModal.style.display = 'none';
            callback(true);
        };
        confirmModalNo.onclick = () => {
            confirmModal.style.display = 'none';
            callback(false);
        };
    };

    // NOVO: Funções para feedback visual (spinner e mensagens)
    const showActionMessage = (message, type = 'info') => {
        actionMessageElement.textContent = message;
        actionMessageElement.style.display = 'block';
        if (type === 'success') {
            actionMessageElement.className = 'success-message';
        } else if (type === 'error') {
            actionMessageElement.className = 'error-message';
        } else {
            actionMessageElement.className = 'loading-message';
        }
    };

    const hideActionMessage = () => {
        actionMessageElement.style.display = 'none';
        actionMessageElement.textContent = '';
    };

    const setButtonLoading = (button, isLoading) => {
        if (isLoading) {
            button.classList.add('loading');
            button.dataset.originalText = button.textContent;
            button.innerHTML = '<span class="spinner"></span> Carregando...';
        } else {
            button.classList.remove('loading');
            button.textContent = button.dataset.originalText;
            delete button.dataset.originalText;
        }
    };

    // NOVO: Função para atualizar as estatísticas
    const updateStats = (debtors) => {
        let count = debtors.length;
        let totalDue = 0;
        let totalPaid = 0;
        let totalRemaining = 0;

        debtors.forEach(debtor => {
            totalDue += debtor.totalAmount;
            const currentPaid = (debtor.payments || []).reduce((sum, p) => sum + p.amount, 0);
            totalPaid += currentPaid;
            totalRemaining += debtor.remainingBalance; // Usa o remainingBalance já calculado pela API
        });

        totalDebtorsCount.textContent = count;
        totalAmountDue.textContent = `R$ ${totalDue.toFixed(2).replace('.', ',')}`;
        totalAmountPaid.textContent = `R$ ${totalPaid.toFixed(2).replace('.', ',')}`;
        totalRemainingBalance.textContent = `R$ ${totalRemaining.toFixed(2).replace('.', ',')}`;
    };


    const fetchWithAuth = async (url, options = {}) => {
        const token = localStorage.getItem('accessToken');
        if (!token) {
            showPage('login');
            displayErrorMessage(loginErrorMessage, 'Sessão expirada. Faça login novamente.');
            throw new Error('No token found');
        }
        options.headers = {
            ...options.headers,
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };
        return fetch(url, options);
    };

    // --- Autenticação ---

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        hideErrorMessage();
        const username = loginForm.username.value.trim();
        const password = loginForm.password.value.trim();

        if (!username || !password) {
            displayErrorMessage(loginErrorMessage, 'Por favor, preencha todos os campos.');
            return;
        }

        loginForm.loginButton.disabled = true;
        loginForm.loginButton.textContent = 'Entrando...';

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
                showPage('dashboard');
            } else {
                const errorData = await response.json();
                displayErrorMessage(loginErrorMessage, errorData.message || 'Erro ao fazer login.');
            }
        } catch (error) {
            console.error('Erro de rede ou servidor:', error);
            displayErrorMessage(loginErrorMessage, 'Erro de conexão. Tente novamente mais tarde.');
        } finally {
            loginForm.loginButton.disabled = false;
            loginForm.loginButton.textContent = 'Entrar';
        }
    });

    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        hideErrorMessage();
        const username = registerForm.username.value.trim();
        const password = registerForm.password.value.trim();

        if (!username || !password) {
            displayErrorMessage(registerErrorMessage, 'Por favor, preencha todos os campos.');
            return;
        }

        registerForm.registerButton.disabled = true;
        registerForm.registerButton.textContent = 'Registrando...';

        try {
            const response = await fetch(`${API_URL}/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            if (response.ok) {
                showCustomMessage('Sucesso!', 'Usuário registrado com sucesso! Você já pode fazer login.', 'success', () => {
                    showPage('login');
                    registerForm.reset();
                });
            } else {
                const errorData = await response.json();
                displayErrorMessage(registerErrorMessage, errorData.message || 'Erro ao registrar usuário.');
            }
        } catch (error) {
            console.error('Erro de rede ou servidor:', error);
            displayErrorMessage(registerErrorMessage, 'Erro de conexão. Tente novamente mais tarde.');
        } finally {
            registerForm.registerButton.disabled = false;
            registerForm.registerButton.textContent = 'Registrar';
        }
    });

    logoutButton.addEventListener('click', () => {
        localStorage.removeItem('accessToken');
        showPage('login');
    });

    // --- Gerenciamento de Modais ---

    addDebtorButton.addEventListener('click', () => {
        modalTitle.textContent = 'Adicionar Novo Devedor';
        addEditDebtorForm.reset();
        debtorIdInput.value = '';
        addEditDebtorModal.style.display = 'flex';
        hideErrorMessage();
        hideActionMessage();
    });

    closeAddEditDebtorModal.addEventListener('click', () => {
        addEditDebtorModal.style.display = 'none';
    });

    closeDebtorDetailsModal.addEventListener('click', () => {
        debtorDetailsModal.style.display = 'none';
    });

    closeMessageModal.addEventListener('click', () => {
        messageModal.style.display = 'none';
    });

    closeConfirmModal.addEventListener('click', () => {
        confirmModal.style.display = 'none';
    });

    window.addEventListener('click', (e) => {
        if (e.target === addEditDebtorModal) {
            addEditDebtorModal.style.display = 'none';
        }
        if (e.target === debtorDetailsModal) {
            debtorDetailsModal.style.display = 'none';
        }
        if (e.target === messageModal) {
            messageModal.style.display = 'none';
        }
        if (e.target === confirmModal) {
            confirmModal.style.display = 'none';
        }
    });

    // --- CRUD de Devedores ---

    const loadDebtors = async () => {
        hideErrorMessage();
        hideActionMessage();
        debtorsListElement.innerHTML = '<p class="loading-message">Carregando devedores...</p>';
        try {
            const response = await fetchWithAuth(`${API_URL}/debtors`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const debtors = await response.json();
            renderDebtors(debtors);
            updateStats(debtors); // NOVO: Chamar a função de atualização de estatísticas
        } catch (error) {
            console.error('Erro ao buscar devedores:', error);
            displayErrorMessage(errorMessageElement, 'Erro ao carregar devedores. Tente novamente.');
            debtorsListElement.innerHTML = '<p class="error-message">Não foi possível carregar os devedores.</p>';
        }
    };

    const renderDebtors = (debtors) => {
        debtorsListElement.innerHTML = '';
        if (debtors.length === 0) {
            debtorsListElement.innerHTML = '<p class="no-data-message">Nenhum devedor cadastrado ainda.</p>';
            return;
        }
        debtors.forEach(debtor => {
            const debtorCard = document.createElement('div');
            debtorCard.className = 'debtor-card';
            debtorCard.innerHTML = `
                <h3>${debtor.name}</h3>
                <p><strong>Valor Total:</strong> R$ ${debtor.totalAmount.toFixed(2).replace('.', ',')}</p>
                <p><strong>Parcelas:</strong> ${debtor.installments}</p>
                <p><strong>Valor por Parcela:</strong> R$ ${debtor.amountPerInstallment.toFixed(2).replace('.', ',')}</p>
                <p class="remaining-balance"><strong>Saldo Restante:</strong> R$ ${debtor.remainingBalance.toFixed(2).replace('.', ',')}</p>
                <div class="button-group">
                    <button class="details-button" data-id="${debtor._id}">Detalhes</button>
                </div>
            `;
            debtorsListElement.appendChild(debtorCard);
        });
    };

    addEditDebtorForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        hideErrorMessage();
        hideActionMessage();

        const id = debtorIdInput.value;
        const name = nameInput.value.trim();
        const description = descriptionInput.value.trim(); // NOVO
        const totalAmount = parseFloat(totalAmountInput.value);
        const installments = parseInt(installmentsInput.value);
        const startDate = startDateInput.value;

        if (!name || isNaN(totalAmount) || totalAmount <= 0 || isNaN(installments) || installments <= 0 || !startDate) {
            displayErrorMessage(errorMessageElement, 'Por favor, preencha todos os campos obrigatórios corretamente.');
            return;
        }

        setButtonLoading(saveDebtorButton, true);

        try {
            const method = id ? 'PUT' : 'POST';
            const url = id ? `${API_URL}/debtors/${id}` : `${API_URL}/debtors`;
            const body = { name, description, totalAmount, installments, startDate }; // NOVO: Incluir description

            const response = await fetchWithAuth(url, {
                method: method,
                body: JSON.stringify(body)
            });

            if (response.ok) {
                showCustomMessage('Sucesso!', `Devedor ${id ? 'atualizado' : 'adicionado'} com sucesso!`, 'success', () => {
                    addEditDebtorModal.style.display = 'none';
                    loadDebtors();
                });
            } else {
                const errorData = await response.json();
                displayErrorMessage(errorMessageElement, errorData.message || `Erro ao ${id ? 'atualizar' : 'adicionar'} devedor.`);
            }
        } catch (error) {
            console.error('Erro ao salvar devedor:', error);
            displayErrorMessage(errorMessageElement, 'Erro de conexão. Tente novamente mais tarde.');
        } finally {
            setButtonLoading(saveDebtorButton, false);
        }
    });

    // --- Detalhes do Devedor e Pagamentos ---

    debtorsListElement.addEventListener('click', async (e) => {
        if (e.target.classList.contains('details-button')) {
            hideErrorMessage();
            hideActionMessage();
            const debtorId = e.target.dataset.id;
            currentDebtorIdInput.value = debtorId; // Armazena o ID do devedor atual
            paymentsGrid.innerHTML = '<p class="loading-message">Carregando pagamentos...</p>'; // Feedback de carregamento

            try {
                const response = await fetchWithAuth(`${API_URL}/debtors/${debtorId}`);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const debtor = await response.json();
                displayDebtorDetails(debtor);
                renderPayments(debtor.payments);
                debtorDetailsModal.style.display = 'flex';
            } catch (error) {
                console.error('Erro ao buscar detalhes do devedor:', error);
                displayErrorMessage(errorMessageElement, 'Erro ao carregar detalhes do devedor.');
                paymentsGrid.innerHTML = '<p class="error-message">Não foi possível carregar os pagamentos.</p>';
            }
        }
    });

    const displayDebtorDetails = (debtor) => {
        detailsDebtorName.textContent = debtor.name;
        detailsDebtorDescription.textContent = debtor.description || 'Nenhuma descrição.'; // NOVO
        detailsTotalAmount.textContent = `R$ ${debtor.totalAmount.toFixed(2).replace('.', ',')}`;
        detailsInstallments.textContent = debtor.installments;
        detailsAmountPerInstallment.textContent = `R$ ${debtor.amountPerInstallment.toFixed(2).replace('.', ',')}`;
        detailsStartDate.textContent = new Date(debtor.startDate + 'T00:00:00').toLocaleDateString('pt-BR');
        detailsRemainingBalance.textContent = `R$ ${debtor.remainingBalance.toFixed(2).replace('.', ',')}`;

        // Limpa o formulário de pagamento
        addPaymentForm.reset();
    };

    const renderPayments = (payments) => {
        paymentsGrid.innerHTML = '';
        if (payments.length === 0) {
            paymentsGrid.innerHTML = '<p class="no-data-message">Nenhum pagamento registrado ainda.</p>';
            return;
        }
        payments.forEach(payment => {
            const paymentCard = document.createElement('div');
            paymentCard.className = 'payment-card';
            paymentCard.innerHTML = `
                <p class="payment-amount">R$ ${payment.amount.toFixed(2).replace('.', ',')}</p>
                <p>${new Date(payment.date + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
                <button class="delete-payment-btn" data-payment-id="${payment._id}">Excluir</button>
            `;
            paymentsGrid.appendChild(paymentCard);
        });
    };

    addPaymentForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        hideErrorMessage();
        hideActionMessage();

        const debtorId = currentDebtorIdInput.value;
        const amount = parseFloat(paymentAmountInput.value);
        const date = paymentDateInput.value;

        if (isNaN(amount) || amount <= 0 || !date) {
            displayErrorMessage(errorMessageElement, 'Por favor, insira um valor de pagamento válido e uma data.');
            return;
        }

        setButtonLoading(addPaymentButton, true);

        try {
            const response = await fetchWithAuth(`${API_URL}/debtors/${debtorId}/payments`, {
                method: 'POST',
                body: JSON.stringify({ amount, date })
            });

            if (response.ok) {
                const updatedDebtor = await response.json();
                showCustomMessage('Sucesso!', 'Pagamento adicionado com sucesso!', 'success', () => {
                    displayDebtorDetails(updatedDebtor);
                    renderPayments(updatedDebtor.payments);
                    loadDebtors(); // Recarrega a lista principal para atualizar o saldo
                });
            } else {
                const errorData = await response.json();
                displayErrorMessage(errorMessageElement, errorData.message || 'Erro ao adicionar pagamento.');
            }
        } catch (error) {
            console.error('Erro ao adicionar pagamento:', error);
            displayErrorMessage(errorMessageElement, 'Erro de conexão. Tente novamente mais tarde.');
        } finally {
            setButtonLoading(addPaymentButton, false);
        }
    });

    paymentsGrid.addEventListener('click', async (e) => {
        if (e.target.classList.contains('delete-payment-btn')) {
            const paymentId = e.target.dataset.paymentId;
            const debtorId = currentDebtorIdInput.value;

            showCustomConfirm('Tem certeza que deseja excluir este pagamento?', async (confirmed) => {
                if (confirmed) {
                    hideErrorMessage();
                    hideActionMessage();
                    setButtonLoading(e.target, true); // Ativa spinner no botão de exclusão

                    try {
                        const response = await fetchWithAuth(`${API_URL}/debtors/${debtorId}/payments/${paymentId}`, {
                            method: 'DELETE'
                        });

                        if (response.ok) {
                            showCustomMessage('Sucesso!', 'Pagamento excluído com sucesso!', 'success', async () => {
                                // Recarrega os detalhes do devedor para atualizar a lista de pagamentos e o saldo
                                const updatedDebtorResponse = await fetchWithAuth(`${API_URL}/debtors/${debtorId}`);
                                if (updatedDebtorResponse.ok) {
                                    const updatedDebtor = await updatedDebtorResponse.json();
                                    displayDebtorDetails(updatedDebtor);
                                    renderPayments(updatedDebtor.payments);
                                    loadDebtors(); // Recarrega a lista principal
                                } else {
                                    throw new Error('Erro ao recarregar devedor após exclusão de pagamento.');
                                }
                            });
                        } else {
                            const errorData = await response.json();
                            displayErrorMessage(errorMessageElement, errorData.message || 'Erro ao excluir pagamento.');
                        }
                    } catch (error) {
                        console.error('Erro ao deletar pagamento:', error);
                        displayErrorMessage(errorMessageElement, 'Erro de conexão. Tente novamente mais tarde.');
                    } finally {
                        setButtonLoading(e.target, false);
                    }
                }
            });
        }
    });

    editDebtorButton.addEventListener('click', async () => {
        hideErrorMessage();
        hideActionMessage();
        const debtorId = currentDebtorIdInput.value; // Pega o ID do devedor que está sendo visualizado

        try {
            const response = await fetchWithAuth(`${API_URL}/debtors/${debtorId}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const debtor = await response.json();

            // Preenche o formulário de edição
            modalTitle.textContent = 'Editar Devedor';
            debtorIdInput.value = debtor._id;
            nameInput.value = debtor.name;
            descriptionInput.value = debtor.description; // NOVO
            totalAmountInput.value = debtor.totalAmount;
            installmentsInput.value = debtor.installments;
            startDateInput.value = debtor.startDate;

            debtorDetailsModal.style.display = 'none'; // Fecha o modal de detalhes
            addEditDebtorModal.style.display = 'flex'; // Abre o modal de edição
        } catch (error) {
            console.error('Erro ao carregar devedor para edição:', error);
            displayErrorMessage(errorMessageElement, 'Erro ao carregar dados para edição.');
        }
    });

    deleteDebtorButton.addEventListener('click', async () => {
        const debtorId = currentDebtorIdInput.value;

        showCustomConfirm('Tem certeza que deseja excluir este devedor e todos os seus pagamentos? Esta ação é irreversível!', async (confirmed) => {
            if (confirmed) {
                hideErrorMessage();
                hideActionMessage();
                setButtonLoading(deleteDebtorButton, true);

                try {
                    const response = await fetchWithAuth(`${API_URL}/debtors/${debtorId}`, {
                        method: 'DELETE'
                    });

                    if (response.ok) {
                        showCustomMessage('Sucesso!', 'Devedor excluído com sucesso!', 'success', () => {
                            debtorDetailsModal.style.display = 'none';
                            loadDebtors();
                        });
                    } else {
                        const errorData = await response.json();
                        displayErrorMessage(errorMessageElement, errorData.message || 'Erro ao excluir devedor.');
                    }
                } catch (error) {
                    console.error('Erro ao deletar devedor:', error);
                    displayErrorMessage(errorMessageElement, 'Erro de conexão. Tente novamente mais tarde.');
                } finally {
                    setButtonLoading(deleteDebtorButton, false);
                }
            }
        });
    });

    // --- Inicialização ---

    // Verifica se há um token ao carregar a página
    const token = localStorage.getItem('accessToken');
    if (token) {
        showPage('dashboard');
    } else {
        showPage('login');
    }

    // Eventos de alternância entre login e registro
    toggleToRegister.addEventListener('click', (e) => {
        e.preventDefault();
        hideErrorMessage();
        loginForm.reset();
        showPage('register');
    });

    toggleToLogin.addEventListener('click', (e) => {
        e.preventDefault();
        hideErrorMessage();
        registerForm.reset();
        showPage('login');
    });
});
