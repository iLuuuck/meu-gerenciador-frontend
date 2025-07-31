document.addEventListener('DOMContentLoaded', () => {
    // --- Variáveis Globais (elementos que podem estar em qualquer página ou são base) ---
    const API_URL = 'https://gerenciador-de-devedores-api.onrender.com'; // Sua URL da API no Render

    // Modal de Mensagem (Sucesso/Erro/Informação) - pode ser global se você quiser usá-lo em todas as páginas
    const messageModal = document.getElementById('messageModal');
    const closeMessageModal = document.getElementById('closeMessageModal');
    const messageModalTitle = document.getElementById('messageModalTitle');
    const messageModalContent = document.getElementById('messageModalContent');
    const messageModalConfirmBtn = document.getElementById('messageModalConfirmBtn');

    // Modal de Confirmação (para Exclusão)
    const confirmModal = document.getElementById('confirmModal');
    const closeConfirmModal = document.getElementById('closeConfirmModal');
    const confirmModalContent = document.getElementById('confirmModalContent');
    const confirmModalYes = document.getElementById('confirmModalYes');
    const confirmModalNo = document.getElementById('confirmModalNo');

    // --- Funções Auxiliares Comuns ---

    const showCustomMessage = (title, message, type = 'info', callback = null) => {
        if (!messageModal) return; // Garante que o modal exista na página
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
        if (!confirmModal) return; // Garante que o modal exista na página
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

    // Fechar os modais personalizados
    if (closeMessageModal) {
        closeMessageModal.addEventListener('click', () => {
            messageModal.style.display = 'none';
        });
    }
    if (closeConfirmModal) {
        closeConfirmModal.addEventListener('click', () => {
            confirmModal.style.display = 'none';
        });
    }
    window.addEventListener('click', (e) => {
        if (messageModal && e.target === messageModal) {
            messageModal.style.display = 'none';
        }
        if (confirmModal && e.target === confirmModal) {
            confirmModal.style.display = 'none';
        }
    });

    const fetchWithAuth = async (url, options = {}) => {
        const token = localStorage.getItem('accessToken');
        if (!token) {
            // Se não há token, redireciona para o login (assumindo que esta função é chamada do dashboard)
            // Se estiver no index.html, ele já estaria na tela de login, então não faz mal
            window.location.href = 'index.html';
            throw new Error('No token found');
        }
        options.headers = {
            ...options.headers,
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };
        return fetch(url, options);
    };

    // --- Lógica para index.html (Login/Registro) ---
    const loginSection = document.getElementById('loginSection');
    const registerSection = document.getElementById('registerSection');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const toggleToRegister = document.getElementById('toggleToRegister');
    const toggleToLogin = document.getElementById('toggleToLogin');
    const loginErrorMessage = document.getElementById('loginErrorMessage');
    const registerErrorMessage = document.getElementById('registerErrorMessage');

    if (loginSection && registerSection) { // Verificação para garantir que estamos no index.html
        const hideErrorMessage = () => {
            if (loginErrorMessage) loginErrorMessage.style.display = 'none';
            if (registerErrorMessage) registerErrorMessage.style.display = 'none';
        };

        const displayErrorMessage = (element, message) => {
            if (element) { // Adicionado verificação para garantir que o elemento exista
                element.textContent = message;
                element.style.display = 'block';
            }
        };

        const showAuthPage = (page) => {
            loginSection.style.display = 'none';
            registerSection.style.display = 'none';
            if (page === 'login') {
                loginSection.style.display = 'flex';
            } else if (page === 'register') {
                registerSection.style.display = 'flex';
            }
        };

        // Verifica se há um token ao carregar a página
        const token = localStorage.getItem('accessToken');
        if (token) {
            window.location.href = 'dashboard.html'; // Redireciona para o dashboard se já logado
        } else {
            showAuthPage('login'); // Mostra a tela de login se não há token
        }

        // Eventos de alternância entre login e registro
        if (toggleToRegister) {
            toggleToRegister.addEventListener('click', (e) => {
                e.preventDefault();
                hideErrorMessage();
                if (loginForm) loginForm.reset();
                showAuthPage('register');
            });
        }

        if (toggleToLogin) {
            toggleToLogin.addEventListener('click', (e) => {
                e.preventDefault();
                hideErrorMessage();
                if (registerForm) registerForm.reset();
                showAuthPage('login');
            });
        }

        if (loginForm) {
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
                        window.location.href = 'dashboard.html'; // Redireciona para o dashboard
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
        }

        if (registerForm) {
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
                            showAuthPage('login');
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
        }
    }


    // --- Lógica para dashboard.html ---
    const dashboardSection = document.getElementById('dashboardSection');
    const logoutButton = document.getElementById('logoutButton');
    const addDebtorButton = document.getElementById('addDebtorButton');
    const addEditDebtorModal = document.getElementById('addEditDebtorModal');
    const closeAddEditDebtorModal = document.getElementById('closeAddEditDebtorModal');
    const addEditDebtorForm = document.getElementById('addEditDebtorForm');
    const modalTitle = document.getElementById('modalTitle');
    const debtorIdInput = document.getElementById('debtorId');
    const nameInput = document.getElementById('name');
    const descriptionInput = document.getElementById('description');
    const totalAmountInput = document.getElementById('totalAmount');
    const installmentsInput = document.getElementById('installments');
    const startDateInput = document.getElementById('startDate');
    const saveDebtorButton = document.getElementById('saveDebtorButton');
    const debtorsListElement = document.getElementById('debtorsList');
    const errorMessageElement = document.getElementById('errorMessage'); // Erro no dashboard

    const debtorDetailsModal = document.getElementById('debtorDetailsModal');
    const closeDebtorDetailsModal = document.getElementById('closeDebtorDetailsModal');
    const detailsDebtorName = document.getElementById('detailsDebtorName');
    const detailsDebtorDescription = document.getElementById('detailsDebtorDescription');
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
    const addPaymentButton = document.getElementById('addPaymentButton');

    // Variáveis para feedback visual no dashboard
    const actionMessageElement = document.getElementById('actionMessage');

    // Variáveis para elementos de estatísticas
    const totalDebtorsCount = document.getElementById('totalDebtorsCount');
    const totalAmountDue = document.getElementById('totalAmountDue');
    const totalAmountPaid = document.getElementById('totalAmountPaid');
    const totalRemainingBalance = document.getElementById('totalRemainingBalance');


    if (dashboardSection) { // Verificação para garantir que estamos no dashboard.html

        const hideDashboardErrorMessage = () => {
            if (errorMessageElement) errorMessageElement.style.display = 'none';
        };

        const displayDashboardErrorMessage = (element, message) => {
            if (element) {
                element.textContent = message;
                element.style.display = 'block';
            }
        };

        const showActionMessage = (message, type = 'info') => {
            if (!actionMessageElement) return;
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
            if (actionMessageElement) {
                actionMessageElement.style.display = 'none';
                actionMessageElement.textContent = '';
            }
        };

        const setButtonLoading = (button, isLoading) => {
            if (!button) return;
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

        const updateStats = (debtors) => {
            if (!totalDebtorsCount || !totalAmountDue || !totalAmountPaid || !totalRemainingBalance) return;

            let count = debtors.length;
            let totalDue = 0;
            let totalPaid = 0;
            let totalRemaining = 0;

            debtors.forEach(debtor => {
                totalDue += debtor.totalAmount;
                const currentPaid = (debtor.payments || []).reduce((sum, p) => sum + p.amount, 0);
                totalPaid += currentPaid;
                totalRemaining += debtor.remainingBalance;
            });

            totalDebtorsCount.textContent = count;
            totalAmountDue.textContent = `R$ ${totalDue.toFixed(2).replace('.', ',')}`;
            totalAmountPaid.textContent = `R$ ${totalPaid.toFixed(2).replace('.', ',')}`;
            totalRemainingBalance.textContent = `R$ ${totalRemaining.toFixed(2).replace('.', ',')}`;
        };

        // --- Autenticação e Logout no Dashboard ---
        if (logoutButton) {
            logoutButton.addEventListener('click', () => {
                localStorage.removeItem('accessToken');
                window.location.href = 'index.html'; // Redireciona para o login
            });
        }

        // --- Gerenciamento de Modais no Dashboard ---
        if (addDebtorButton) {
            addDebtorButton.addEventListener('click', () => {
                if (!addEditDebtorModal) return;
                modalTitle.textContent = 'Adicionar Novo Devedor';
                addEditDebtorForm.reset();
                debtorIdInput.value = '';
                addEditDebtorModal.style.display = 'flex';
                hideDashboardErrorMessage();
                hideActionMessage();
            });
        }

        if (closeAddEditDebtorModal) {
            closeAddEditDebtorModal.addEventListener('click', () => {
                if (addEditDebtorModal) addEditDebtorModal.style.display = 'none';
            });
        }

        if (closeDebtorDetailsModal) {
            closeDebtorDetailsModal.addEventListener('click', () => {
                if (debtorDetailsModal) debtorDetailsModal.style.display = 'none';
            });
        }

        window.addEventListener('click', (e) => {
            if (addEditDebtorModal && e.target === addEditDebtorModal) {
                addEditDebtorModal.style.display = 'none';
            }
            if (debtorDetailsModal && e.target === debtorDetailsModal) {
                debtorDetailsModal.style.display = 'none';
            }
        });


        // --- CRUD de Devedores ---

        const loadDebtors = async () => {
            hideDashboardErrorMessage();
            hideActionMessage();
            if (debtorsListElement) {
                debtorsListElement.innerHTML = '<p class="loading-message">Carregando devedores...</p>';
            }
            try {
                const response = await fetchWithAuth(`${API_URL}/debtors`);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const debtors = await response.json();
                renderDebtors(debtors);
                updateStats(debtors);
            } catch (error) {
                console.error('Erro ao buscar devedores:', error);
                displayDashboardErrorMessage(errorMessageElement, 'Erro ao carregar devedores. Tente novamente.');
                if (debtorsListElement) {
                    debtorsListElement.innerHTML = '<p class="error-message">Não foi possível carregar os devedores.</p>';
                }
            }
        };

        const renderDebtors = (debtors) => {
            if (!debtorsListElement) return;
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

        if (addEditDebtorForm) {
            addEditDebtorForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                hideDashboardErrorMessage();
                hideActionMessage();

                const id = debtorIdInput.value;
                const name = nameInput.value.trim();
                const description = descriptionInput.value.trim();
                const totalAmount = parseFloat(totalAmountInput.value);
                const installments = parseInt(installmentsInput.value);
                const startDate = startDateInput.value;

                if (!name || isNaN(totalAmount) || totalAmount <= 0 || isNaN(installments) || installments <= 0 || !startDate) {
                    displayDashboardErrorMessage(errorMessageElement, 'Por favor, preencha todos os campos obrigatórios corretamente.');
                    return;
                }

                setButtonLoading(saveDebtorButton, true);

                try {
                    const method = id ? 'PUT' : 'POST';
                    const url = id ? `${API_URL}/debtors/${id}` : `${API_URL}/debtors`;
                    const body = { name, description, totalAmount, installments, startDate };

                    const response = await fetchWithAuth(url, {
                        method: method,
                        body: JSON.stringify(body)
                    });

                    if (response.ok) {
                        showCustomMessage('Sucesso!', `Devedor ${id ? 'atualizado' : 'adicionado'} com sucesso!`, 'success', () => {
                            if (addEditDebtorModal) addEditDebtorModal.style.display = 'none';
                            loadDebtors();
                        });
                    } else {
                        const errorData = await response.json();
                        displayDashboardErrorMessage(errorMessageElement, errorData.message || `Erro ao ${id ? 'atualizar' : 'adicionar'} devedor.`);
                    }
                } catch (error) {
                    console.error('Erro ao salvar devedor:', error);
                    displayDashboardErrorMessage(errorMessageElement, 'Erro de conexão. Tente novamente mais tarde.');
                } finally {
                    setButtonLoading(saveDebtorButton, false);
                }
            });
        }

        // --- Detalhes do Devedor e Pagamentos ---

        if (debtorsListElement) {
            debtorsListElement.addEventListener('click', async (e) => {
                if (e.target.classList.contains('details-button')) {
                    hideDashboardErrorMessage();
                    hideActionMessage();
                    const debtorId = e.target.dataset.id;
                    if (currentDebtorIdInput) currentDebtorIdInput.value = debtorId;
                    if (paymentsGrid) paymentsGrid.innerHTML = '<p class="loading-message">Carregando pagamentos...</p>';

                    try {
                        const response = await fetchWithAuth(`${API_URL}/debtors/${debtorId}`);
                        if (!response.ok) {
                            throw new Error(`HTTP error! status: ${response.status}`);
                        }
                        const debtor = await response.json();
                        displayDebtorDetails(debtor);
                        renderPayments(debtor.payments);
                        if (debtorDetailsModal) debtorDetailsModal.style.display = 'flex';
                    } catch (error) {
                        console.error('Erro ao buscar detalhes do devedor:', error);
                        displayDashboardErrorMessage(errorMessageElement, 'Erro ao carregar detalhes do devedor.');
                        if (paymentsGrid) paymentsGrid.innerHTML = '<p class="error-message">Não foi possível carregar os pagamentos.</p>';
                    }
                }
            });
        }

        const displayDebtorDetails = (debtor) => {
            if (detailsDebtorName) detailsDebtorName.textContent = debtor.name;
            if (detailsDebtorDescription) detailsDebtorDescription.textContent = debtor.description || 'Nenhuma descrição.';
            if (detailsTotalAmount) detailsTotalAmount.textContent = `R$ ${debtor.totalAmount.toFixed(2).replace('.', ',')}`;
            if (detailsInstallments) detailsInstallments.textContent = debtor.installments;
            if (detailsAmountPerInstallment) detailsAmountPerInstallment.textContent = `R$ ${debtor.amountPerInstallment.toFixed(2).replace('.', ',')}`;
            if (detailsStartDate) detailsStartDate.textContent = new Date(debtor.startDate + 'T00:00:00').toLocaleDateString('pt-BR');
            if (detailsRemainingBalance) detailsRemainingBalance.textContent = `R$ ${debtor.remainingBalance.toFixed(2).replace('.', ',')}`;

            if (addPaymentForm) addPaymentForm.reset();
        };

        const renderPayments = (payments) => {
            if (!paymentsGrid) return;
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

        if (addPaymentForm) {
            addPaymentForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                hideDashboardErrorMessage();
                hideActionMessage();

                const debtorId = currentDebtorIdInput.value;
                const amount = parseFloat(paymentAmountInput.value);
                const date = paymentDateInput.value;

                if (isNaN(amount) || amount <= 0 || !date) {
                    displayDashboardErrorMessage(errorMessageElement, 'Por favor, insira um valor de pagamento válido e uma data.');
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
                        displayDashboardErrorMessage(errorMessageElement, errorData.message || 'Erro ao adicionar pagamento.');
                    }
                } catch (error) {
                    console.error('Erro ao adicionar pagamento:', error);
                    displayDashboardErrorMessage(errorMessageElement, 'Erro de conexão. Tente novamente mais tarde.');
                } finally {
                    setButtonLoading(addPaymentButton, false);
                }
            });
        }

        if (paymentsGrid) {
            paymentsGrid.addEventListener('click', async (e) => {
                if (e.target.classList.contains('delete-payment-btn')) {
                    const paymentId = e.target.dataset.paymentId;
                    const debtorId = currentDebtorIdInput.value;

                    showCustomConfirm('Tem certeza que deseja excluir este pagamento?', async (confirmed) => {
                        if (confirmed) {
                            hideDashboardErrorMessage();
                            hideActionMessage();
                            setButtonLoading(e.target, true);

                            try {
                                const response = await fetchWithAuth(`${API_URL}/debtors/${debtorId}/payments/${paymentId}`, {
                                    method: 'DELETE'
                                });

                                if (response.ok) {
                                    showCustomMessage('Sucesso!', 'Pagamento excluído com sucesso!', 'success', async () => {
                                        const updatedDebtorResponse = await fetchWithAuth(`${API_URL}/debtors/${debtorId}`);
                                        if (updatedDebtorResponse.ok) {
                                            const updatedDebtor = await updatedDebtorResponse.json();
                                            displayDebtorDetails(updatedDebtor);
                                            renderPayments(updatedDebtor.payments);
                                            loadDebtors();
                                        } else {
                                            throw new Error('Erro ao recarregar devedor após exclusão de pagamento.');
                                        }
                                    });
                                } else {
                                    const errorData = await response.json();
                                    displayDashboardErrorMessage(errorMessageElement, errorData.message || 'Erro ao excluir pagamento.');
                                }
                            } catch (error) {
                                console.error('Erro ao deletar pagamento:', error);
                                displayDashboardErrorMessage(errorMessageElement, 'Erro de conexão. Tente novamente mais tarde.');
                            } finally {
                                setButtonLoading(e.target, false);
                            }
                        }
                    });
                }
            });
        }

        if (editDebtorButton) {
            editDebtorButton.addEventListener('click', async () => {
                hideDashboardErrorMessage();
                hideActionMessage();
                const debtorId = currentDebtorIdInput.value;

                try {
                    const response = await fetchWithAuth(`${API_URL}/debtors/${debtorId}`);
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    const debtor = await response.json();

                    if (modalTitle) modalTitle.textContent = 'Editar Devedor';
                    if (debtorIdInput) debtorIdInput.value = debtor._id;
                    if (nameInput) nameInput.value = debtor.name;
                    if (descriptionInput) descriptionInput.value = debtor.description;
                    if (totalAmountInput) totalAmountInput.value = debtor.totalAmount;
                    if (installmentsInput) installmentsInput.value = debtor.installments;
                    if (startDateInput) startDateInput.value = debtor.startDate;

                    if (debtorDetailsModal) debtorDetailsModal.style.display = 'none';
                    if (addEditDebtorModal) addEditDebtorModal.style.display = 'flex';
                } catch (error) {
                    console.error('Erro ao carregar devedor para edição:', error);
                    displayDashboardErrorMessage(errorMessageElement, 'Erro ao carregar dados para edição.');
                }
            });
        }

        if (deleteDebtorButton) {
            deleteDebtorButton.addEventListener('click', async () => {
                const debtorId = currentDebtorIdInput.value;

                showCustomConfirm('Tem certeza que deseja excluir este devedor e todos os seus pagamentos? Esta ação é irreversível!', async (confirmed) => {
                    if (confirmed) {
                        hideDashboardErrorMessage();
                        hideActionMessage();
                        setButtonLoading(deleteDebtorButton, true);

                        try {
                            const response = await fetchWithAuth(`${API_URL}/debtors/${debtorId}`, {
                                method: 'DELETE'
                            });

                            if (response.ok) {
                                showCustomMessage('Sucesso!', 'Devedor excluído com sucesso!', 'success', () => {
                                    if (debtorDetailsModal) debtorDetailsModal.style.display = 'none';
                                    loadDebtors();
                                });
                            } else {
                                const errorData = await response.json();
                                displayDashboardErrorMessage(errorMessageElement, errorData.message || 'Erro ao excluir devedor.');
                            }
                        } catch (error) {
                            console.error('Erro ao deletar devedor:', error);
                            displayDashboardErrorMessage(errorMessageElement, 'Erro de conexão. Tente novamente mais tarde.');
                        } finally {
                            setButtonLoading(deleteDebtorButton, false);
                        }
                    }
                });
            });
        }

        // --- Inicialização do Dashboard ---
        loadDebtors(); // Carrega os devedores ao carregar o dashboard
    }
});
