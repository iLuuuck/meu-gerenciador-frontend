document.addEventListener('DOMContentLoaded', () => {
    const API_URL = 'https://gerenciador-emprestimos-api.onrender.com';

    const errorMessageElement = document.getElementById('errorMessage');

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

    const getToken = () => localStorage.getItem('accessToken');

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

        if (response.status === 401 || response.status === 403) {
            alert('Sessão expirada ou não autorizado. Por favor, faça login novamente.');
            localStorage.removeItem('accessToken');
            window.location.href = 'index.html';
            throw new Error('Sessão expirada ou não autorizado.');
        }
        return response;
    };

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

    if (window.location.pathname.endsWith('dashboard.html')) {
        const debtorsListElement = document.getElementById('debtorsList');
        const addDebtorButton = document.getElementById('addDebtorButton');
        const logoutButton = document.getElementById('logoutButton');

        const debtorDetailModal = document.getElementById('debtorDetailModal');
        const closeDetailModalButton = debtorDetailModal.querySelector('.close-button');
        const detailDebtorName = document.getElementById('detailDebtorName');
        // NOVO: Elemento para exibir a descrição no modal de detalhes
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

        const addEditDebtorModal = document.getElementById('addEditDebtorModal');
        const closeAddEditModalButton = addEditDebtorModal.querySelector('.close-button');
        const addEditModalTitle = document.getElementById('addEditModalTitle');
        const addEditDebtorForm = document.getElementById('addEditDebtorForm');
        const debtorNameInput = document.getElementById('debtorName');
        // NOVO: Input para a descrição no modal de adicionar/editar
        const debtorDescriptionInput = document.getElementById('debtorDescription');
        const totalAmountInput = document.getElementById('totalAmount');
        const installmentsInput = document.getElementById('installments');
        const startDateInput = document.getElementById('startDate');
        const saveDebtorButton = document.getElementById('saveDebtorButton');

        let currentDebtor = null;
        let selectedPaymentSquare = null;
        let selectedInstallmentAmount = 0;

        const loadDebtors = async () => {
            hideErrorMessage();
            debtorsListElement.innerHTML = '<p class="loading-message">Carregando devedores...</p>';
            try {
                const response = await fetchWithAuth(`${API_URL}/debtors`);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const debtors = await response.json();
                renderDebtors(debtors);
            } catch (error) {
                console.error('Erro ao carregar devedores:', error);
                if (!errorMessageElement.style.display || errorMessageElement.style.display === 'none') {
                    showErrorMessage('Não foi possível carregar os devedores. Verifique sua conexão ou sessão.');
                }
                debtorsListElement.innerHTML = '<p class="loading-message">Erro ao carregar devedores.</p>';
            }
        };

        const renderDebtors = (debtors) => {
            debtorsListElement.innerHTML = '';
            if (debtors.length === 0) {
                debtorsListElement.innerHTML = '<p class="loading-message">Nenhum devedor cadastrado ainda. Adicione um!</p>';
                return;
            }
            debtors.forEach(debtor => {
                const debtorItem = document.createElement('div');
                debtorItem.className = 'debtor-item';
                debtorItem.dataset.id = debtor._id;

                const totalPaid = debtor.payments ? debtor.payments.reduce((sum, p) => sum + p.amount, 0) : 0;
                const currentBalance = debtor.totalAmount - totalPaid;

                debtorItem.innerHTML = `
                    <div class="debtor-info">
                        <h2>${debtor.name}</h2>
                        ${debtor.description ? `<p class="debtor-description">${debtor.description}</p>` : ''} <p>Parcelas: ${debtor.installments}</p>
                        <p>Data Início: ${new Date(debtor.startDate).toLocaleDateString('pt-BR')}</p>
                    </div>
                    <div class="debtor-balance">
                        Saldo: R$ ${currentBalance.toFixed(2).replace('.', ',')}
                    </div>
                    <div class="debtor-actions">
                        <button class="edit-debtor-btn">Editar</button>
                        <button class="delete-debtor-btn">Excluir</button>
                    </div>
                `;

                debtorItem.addEventListener('click', (e) => {
                    if (!e.target.classList.contains('edit-debtor-btn') && !e.target.classList.contains('delete-debtor-btn')) {
                        showDebtorDetail(debtor._id);
                    }
                });

                debtorItem.querySelector('.edit-debtor-btn').addEventListener('click', (e) => {
                    e.stopPropagation();
                    editDebtor(debtor._id);
                });
                debtorItem.querySelector('.delete-debtor-btn').addEventListener('click', (e) => {
                    e.stopPropagation();
                    deleteDebtor(debtor._id);
                });

                debtorsListElement.appendChild(debtorItem);
            });
        };

        const showDebtorDetail = async (id) => {
            hideErrorMessage();
            try {
                const response = await fetchWithAuth(`${API_URL}/debtors/${id}`);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const debtor = await response.json();

                currentDebtor = debtor;
                selectedPaymentSquare = null;
                selectedInstallmentAmount = 0;
                paymentAmountInput.value = '';
                paymentDateInput.value = new Date().toISOString().split('T')[0];

                detailDebtorName.textContent = debtor.name;
                // NOVO: Exibe a descrição no modal de detalhes
                detailDebtorDescription.textContent = debtor.description || ''; // Garante que seja vazio se não houver descrição
                detailDebtorDescription.style.display = debtor.description ? 'block' : 'none'; // Mostra/esconde o elemento
                
                detailTotalAmount.textContent = `R$ ${debtor.totalAmount.toFixed(2).replace('.', ',')}`;
                detailInstallments.textContent = debtor.installments;
                detailAmountPerInstallment.textContent = `R$ ${debtor.amountPerInstallment.toFixed(2).replace('.', ',')}`;
                detailStartDate.textContent = new Date(debtor.startDate).toLocaleDateString('pt-BR');

                renderPayments(debtor.payments || []);

                debtorDetailModal.style.display = 'flex';
            } catch (error) {
                console.error('Erro ao carregar detalhes do devedor:', error);
                if (!errorMessageElement.style.display || errorMessageElement.style.display === 'none') {
                    showErrorMessage('Não foi possível carregar os detalhes do devedor.');
                }
            }
        };

        const renderPayments = (payments) => {
            paymentsGrid.innerHTML = '';

            if (!currentDebtor) return;

            const installmentData = [];
            for (let i = 0; i < currentDebtor.installments; i++) {
                installmentData.push({
                    number: i + 1,
                    amount: currentDebtor.amountPerInstallment,
                    paid: false,
                    paymentDate: null,
                    paymentId: null,
                    coveredAmount: 0
                });
            }

            const paymentsWithUsage = payments.map(p => ({ ...p, usedAmount: 0 }));
            const sortedPayments = [...paymentsWithUsage].sort((a, b) => new Date(a.date) - new Date(b.date));

            let currentPaymentIndex = 0;
            for (let i = 0; i < installmentData.length; i++) {
                let installment = installmentData[i];
                let amountNeededForInstallment = installment.amount - installment.coveredAmount;

                while (amountNeededForInstallment > 0 && currentPaymentIndex < sortedPayments.length) {
                    let payment = sortedPayments[currentPaymentIndex];
                    let remainingPaymentAmount = payment.amount - payment.usedAmount;

                    if (remainingPaymentAmount > 0) {
                        let amountToCover = Math.min(amountNeededForInstallment, remainingPaymentAmount);

                        installment.coveredAmount += amountToCover;
                        payment.usedAmount += amountToCover;
                        amountNeededForInstallment -= amountToCover;

                        if (installment.coveredAmount >= installment.amount - 0.005) {
                            installment.paid = true;
                            installment.paymentId = payment._id;
                            installment.paymentDate = payment.date;
                        }

                        if (Math.abs(payment.usedAmount - payment.amount) < 0.005) {
                            currentPaymentIndex++;
                        }
                    } else {
                        currentPaymentIndex++;
                    }
                }
            }

            installmentData.forEach(installment => {
                const paymentSquare = document.createElement('div');
                paymentSquare.className = 'payment-square';
                paymentSquare.dataset.installmentNumber = installment.number;
                paymentSquare.dataset.installmentAmount = installment.amount.toFixed(2);

                const displayAmount = installment.amount.toFixed(2).replace('.', ',');

                if (installment.paid) {
                    paymentSquare.classList.add('paid');
                    paymentSquare.innerHTML = `
                        <span>Parcela ${installment.number}</span>
                        <span>R$ ${displayAmount}</span>
                        <span>Pago em: ${new Date(installment.paymentDate + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                        ${installment.paymentId ? `<button class="delete-payment-btn" data-payment-id="${installment.paymentId}">Excluir</button>` : ''}
                    `;
                } else {
                    let pendingText = 'Pendente';
                    if (installment.coveredAmount > 0) {
                        const remaining = (installment.amount - installment.coveredAmount).toFixed(2).replace('.', ',');
                        pendingText = `Faltam: R$ ${remaining}`;
                    }

                    paymentSquare.innerHTML = `
                        <span>Parcela ${installment.number}</span>
                        <span>R$ ${displayAmount}</span>
                        <span>${pendingText}</span>
                    `;
                }
                paymentsGrid.appendChild(paymentSquare);

                paymentSquare.addEventListener('click', () => {
                    if (selectedPaymentSquare) {
                        selectedPaymentSquare.classList.remove('selected');
                    }
                    paymentSquare.classList.add('selected');
                    selectedPaymentSquare = paymentSquare;

                    selectedInstallmentAmount = parseFloat(paymentSquare.dataset.installmentAmount);
                    paymentAmountInput.value = selectedInstallmentAmount.toFixed(2);
                });
            });
        };

        fillAmountButton.addEventListener('click', () => {
            if (selectedInstallmentAmount > 0) {
                paymentAmountInput.value = selectedInstallmentAmount.toFixed(2);
            } else {
                showErrorMessage('Selecione uma parcela para preencher o valor.');
            }
        });

        addPaymentButton.addEventListener('click', async () => {
            hideErrorMessage();
            const amount = parseFloat(paymentAmountInput.value);
            const date = paymentDateInput.value;

            if (isNaN(amount) || amount <= 0 || !date) {
                showErrorMessage('Por favor, insira um valor e uma data válidos para o pagamento.');
                return;
            }

            if (!currentDebtor || !currentDebtor._id) {
                showErrorMessage('Nenhum devedor selecionado para adicionar pagamento.');
                return;
            }

            addPaymentButton.disabled = true;
            addPaymentButton.textContent = 'Adicionando...';

            try {
                const response = await fetchWithAuth(`${API_URL}/debtors/${currentDebtor._id}/payments`, {
                    method: 'POST',
                    body: JSON.stringify({ amount, date })
                });

                if (response.ok) {
                    alert('Pagamento adicionado com sucesso!');
                    paymentAmountInput.value = '';
                    paymentDateInput.value = new Date().toISOString().split('T')[0];
                    selectedInstallmentAmount = 0;
                    if (selectedPaymentSquare) {
                        selectedPaymentSquare.classList.remove('selected');
                        selectedPaymentSquare = null;
                    }
                    showDebtorDetail(currentDebtor._id);
                    loadDebtors();
                } else {
                    const errorText = await response.text();
                    showErrorMessage(errorText || 'Erro ao adicionar pagamento.');
                }
            } catch (error) {
                console.error('Erro ao adicionar pagamento:', error);
                showErrorMessage('Erro de rede ao adicionar pagamento.');
            } finally {
                addPaymentButton.disabled = false;
                addPaymentButton.textContent = 'Adicionar Pagamento';
            }
        });

        paymentsGrid.addEventListener('click', async (e) => {
            if (e.target.classList.contains('delete-payment-btn')) {
                e.stopPropagation();
                const paymentIdToDelete = e.target.dataset.paymentId;

                if (!currentDebtor || !currentDebtor._id) {
                    showErrorMessage('Erro: Devedor atual não identificado para exclusão do pagamento.');
                    return;
                }

                if (confirm('Tem certeza que deseja excluir este pagamento?')) {
                    hideErrorMessage();
                    try {
                        const response = await fetchWithAuth(`${API_URL}/debtors/${currentDebtor._id}/payments/${paymentIdToDelete}`, {
                            method: 'DELETE'
                        });
                        if (response.ok) {
                            alert('Pagamento excluído com sucesso!');
                            showDebtorDetail(currentDebtor._id);
                            loadDebtors();
                        } else {
                            const errorText = await response.text();
                            showErrorMessage(errorText || 'Erro ao excluir pagamento.');
                        }
                    } catch (error) {
                        console.error('Erro ao excluir pagamento:', error);
                        showErrorMessage('Erro de rede ao excluir pagamento.');
                    }
                }
            }
        });


        addDebtorButton.addEventListener('click', () => {
            addEditModalTitle.textContent = 'Adicionar Novo Devedor';
            addEditDebtorForm.reset();
            startDateInput.value = new Date().toISOString().split('T')[0];
            currentDebtor = null;
            addEditDebtorModal.style.display = 'flex';
            hideErrorMessage();
        });

        const editDebtor = async (id) => {
            hideErrorMessage();
            try {
                const response = await fetchWithAuth(`${API_URL}/debtors/${id}`);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const debtor = await response.json();

                currentDebtor = debtor;
                addEditModalTitle.textContent = 'Editar Devedor';
                debtorNameInput.value = debtor.name;
                debtorDescriptionInput.value = debtor.description || ''; // NOVO: Preenche a descrição
                totalAmountInput.value = debtor.totalAmount;
                installmentsInput.value = debtor.installments;
                startDateInput.value = debtor.startDate;

                addEditDebtorModal.style.display = 'flex';
            } catch (error) {
                console.error('Erro ao carregar devedor para edição:', error);
                if (!errorMessageElement.style.display || errorMessageElement.style.display === 'none') {
                    showErrorMessage('Não foi possível carregar os dados do devedor para edição.');
                }
            }
        };

        addEditDebtorForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            hideErrorMessage();

            const name = debtorNameInput.value.trim();
            const description = debtorDescriptionInput.value.trim(); // NOVO: Pega o valor da descrição
            const totalAmount = parseFloat(totalAmountInput.value);
            const installments = parseInt(installmentsInput.value);
            const startDate = startDateInput.value;

            if (!name || isNaN(totalAmount) || totalAmount <= 0 || isNaN(installments) || installments <= 0 || !startDate) {
                showErrorMessage('Por favor, preencha todos os campos corretamente (valores numéricos devem ser maiores que zero).');
                return;
            }

            const debtorData = {
                name,
                description, // NOVO: Inclui a descrição nos dados
                totalAmount,
                installments,
                amountPerInstallment: totalAmount / installments,
                startDate
            };

            saveDebtorButton.disabled = true;
            saveDebtorButton.textContent = 'Salvando...';

            try {
                let response;
                if (currentDebtor) {
                    response = await fetchWithAuth(`${API_URL}/debtors/${currentDebtor._id}`, {
                        method: 'PUT',
                        body: JSON.stringify(debtorData)
                    });
                } else {
                    response = await fetchWithAuth(`${API_URL}/debtors`, {
                        method: 'POST',
                        body: JSON.stringify(debtorData)
                    });
                }

                if (response.ok) {
                    alert('Devedor salvo com sucesso!');
                    addEditDebtorModal.style.display = 'none';
                    loadDebtors();
                } else {
                    const errorText = await response.text();
                    showErrorMessage(errorText || 'Erro ao salvar devedor.');
                }
            } catch (error) {
                console.error('Erro ao salvar devedor:', error);
                showErrorMessage('Erro de rede ao salvar devedor.');
            } finally {
                saveDebtorButton.disabled = false;
                saveDebtorButton.textContent = 'Salvar Devedor';
            }
        });

        const deleteDebtor = async (id) => {
            if (confirm('Tem certeza que deseja excluir este devedor e todos os seus pagamentos? Esta ação é irreversível!')) {
                hideErrorMessage();
                try {
                    const response = await fetchWithAuth(`${API_URL}/debtors/${id}`, {
                        method: 'DELETE'
                    });
                    if (response.ok) {
                        alert('Devedor excluído com sucesso!');
                        loadDebtors();
                    } else {
                        const errorText = await response.text();
                        showErrorMessage(errorText || 'Erro ao excluir devedor.');
                    }
                } catch (error) {
                    console.error('Erro ao excluir devedor:', error);
                    showErrorMessage('Erro de rede ao excluir devedor.');
                }
            }
        };

        closeDetailModalButton.addEventListener('click', () => {
            debtorDetailModal.style.display = 'none';
            hideErrorMessage();
            if (selectedPaymentSquare) {
                selectedPaymentSquare.classList.remove('selected');
                selectedPaymentSquare = null;
            }
            selectedInstallmentAmount = 0;
            paymentAmountInput.value = '';
        });

        closeAddEditModalButton.addEventListener('click', () => {
            addEditDebtorModal.style.display = 'none';
            hideErrorMessage();
        });

        window.addEventListener('click', (e) => {
            if (e.target === debtorDetailModal) {
                debtorDetailModal.style.display = 'none';
                hideErrorMessage();
                if (selectedPaymentSquare) {
                    selectedPaymentSquare.classList.remove('selected');
                    selectedPaymentSquare = null;
                }
                selectedInstallmentAmount = 0;
                paymentAmountInput.value = '';
            }
            if (e.target === addEditDebtorModal) {
                addEditDebtorModal.style.display = 'none';
                hideErrorMessage();
            }
        });

        logoutButton.addEventListener('click', () => {
            localStorage.removeItem('accessToken');
            window.location.href = 'index.html';
        });

        loadDebtors();
    }
});
