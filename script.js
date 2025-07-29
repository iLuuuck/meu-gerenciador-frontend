document.addEventListener('DOMContentLoaded', () => {
    // URL da sua API no Render
    const API_URL = 'https://gerenciador-emprestimos-api.onrender.com';

    // Elemento para exibir mensagens de erro globais
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
            return; // Interrompe o fluxo após redirecionamento
        }
        return response;
    };

    // --- Lógica da Página de Login (index.html) ---
    // Verifica se a URL atual é a página de login ou a raiz
    if (window.location.pathname.endsWith('index.html') || window.location.pathname.endsWith('/')) {
        const loginForm = document.getElementById('loginForm');

        if (loginForm) {
            const usernameInput = document.getElementById('username');
            const passwordInput = document.getElementById('password');
            const loginButton = loginForm.querySelector('button[type="submit"]');

            loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                hideErrorMessage(); // Esconde qualquer mensagem de erro anterior

                // Validação frontend mais robusta
                const username = usernameInput.value.trim();
                const password = passwordInput.value.trim();

                if (!username || !password) {
                    showErrorMessage('Por favor, preencha todos os campos de usuário e senha.');
                    return;
                }

                // Desabilita o botão para evitar cliques múltiplos e dar feedback visual
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
                        localStorage.setItem('accessToken', data.accessToken); // Armazena o token
                        window.location.href = 'dashboard.html'; // Redireciona para o dashboard
                    } else {
                        // Exibe mensagem de erro do servidor
                        const errorText = await response.text();
                        showErrorMessage(errorText || 'Erro ao fazer login. Verifique suas credenciais.');
                    }
                } catch (error) {
                    console.error('Erro de rede ou servidor:', error);
                    showErrorMessage('Não foi possível conectar ao servidor. Tente novamente mais tarde.');
                } finally {
                    // Reabilita o botão ao final da requisição
                    loginButton.disabled = false;
                    loginButton.textContent = 'Entrar';
                }
            });
        }

        // Se já houver um token, redireciona para o dashboard automaticamente
        if (getToken()) {
            window.location.href = 'dashboard.html';
        }
    }

    // --- Lógica da Página do Dashboard (dashboard.html) ---
    // Verifica se a URL atual é a página do dashboard
    if (window.location.pathname.endsWith('dashboard.html')) {
        // Elementos da lista de devedores e botões principais
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
        const addPaymentButton = document.getElementById('addPaymentButton');
        const fillAmountButton = document.getElementById('fillAmountButton'); // Botão "Usar Valor da Parcela"

        // NOVOS ELEMENTOS: Detalhes específicos do valor da parcela e lucro
        const detailCustomInstallmentAmount = document.getElementById('detailCustomInstallmentAmount');
        const detailEstimatedProfit = document.getElementById('detailEstimatedProfit');


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

        // NOVO ELEMENTO: Input para o valor da parcela personalizada
        const customInstallmentAmountInput = document.getElementById('customInstallmentAmount');

        // Variáveis de estado para controlar o devedor atual e a seleção de parcelas
        let currentDebtor = null;
        let selectedPaymentSquare = null; // Rastreia a caixinha de parcela selecionada
        let selectedInstallmentAmount = 0; // Armazena o valor da parcela selecionada para o botão "Preencher Valor"

        // --- Funções de Carregamento e Renderização ---

        // Carrega a lista de devedores da API
        const loadDebtors = async () => {
            hideErrorMessage(); // Esconde erros ao recarregar
            debtorsListElement.innerHTML = '<p class="loading-message">Carregando devedores...</p>'; // Mensagem de carregamento
            try {
                const response = await fetchWithAuth(`${API_URL}/debtors`);
                if (!response || !response.ok) { // Adicionado verificação para `!response` em caso de redirecionamento em fetchWithAuth
                    throw new Error(`HTTP error! status: ${response ? response.status : 'N/A'}`);
                }
                const debtors = await response.json();
                renderDebtors(debtors); // Renderiza a lista após o carregamento
            } catch (error) {
                console.error('Erro ao carregar devedores:', error);
                // A mensagem de erro da sessão expirada já é tratada em fetchWithAuth,
                // então só mostra um erro genérico se não foi por isso.
                if (!errorMessageElement.style.display || errorMessageElement.style.display === 'none') {
                    showErrorMessage('Não foi possível carregar os devedores. Verifique sua conexão ou sessão.');
                }
                debtorsListElement.innerHTML = '<p class="loading-message">Erro ao carregar devedores.</p>';
            }
        };

        // Renderiza os devedores na lista principal
        const renderDebtors = (debtors) => {
            debtorsListElement.innerHTML = ''; // Limpa a lista existente
            if (debtors.length === 0) {
                debtorsListElement.innerHTML = '<p class="loading-message">Nenhum devedor cadastrado ainda. Adicione um!</p>';
                return;
            }
            debtors.forEach(debtor => {
                const debtorItem = document.createElement('div');
                debtorItem.className = 'debtor-item';
                debtorItem.dataset.id = debtor.id; // Armazena o ID no dataset

                const totalPaid = debtor.payments ? debtor.payments.reduce((sum, p) => sum + p.amount, 0) : 0;
                // O saldo é sempre baseado no valor total emprestado.
                const currentBalance = debtor.totalAmount - totalPaid;

                debtorItem.innerHTML = `
                    <div class="debtor-info">
                        <h2>${debtor.name}</h2>
                        <p>Parcelas: ${debtor.installments}</p>
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

                // Adiciona listeners para os botões de ação e para abrir o detalhe
                debtorItem.addEventListener('click', (e) => {
                    // Impede que o clique nos botões de editar/excluir ative o detalhe do devedor
                    if (!e.target.classList.contains('edit-debtor-btn') && !e.target.classList.contains('delete-debtor-btn')) {
                        showDebtorDetail(debtor.id);
                    }
                });

                debtorItem.querySelector('.edit-debtor-btn').addEventListener('click', (e) => {
                    e.stopPropagation(); // Impede que o clique no botão ative o evento de clique do item pai
                    editDebtor(debtor.id);
                });
                debtorItem.querySelector('.delete-debtor-btn').addEventListener('click', (e) => {
                    e.stopPropagation(); // Impede que o clique no botão ative o evento de clique do item pai
                    deleteDebtor(debtor.id);
                });

                debtorsListElement.appendChild(debtorItem);
            });
        };

        // Exibe os detalhes de um devedor específico na modal
        const showDebtorDetail = async (id) => {
            hideErrorMessage();
            try {
                const response = await fetchWithAuth(`${API_URL}/debtors/${id}`);
                if (!response || !response.ok) {
                    throw new Error(`HTTP error! status: ${response ? response.status : 'N/A'}`);
                }
                const debtor = await response.json();

                currentDebtor = debtor; // Armazena o devedor atual
                selectedPaymentSquare = null; // Reseta a seleção ao abrir um novo devedor
                selectedInstallmentAmount = 0; // Reseta o valor da parcela selecionada
                paymentAmountInput.value = ''; // Limpa o campo de valor
                
                // Preenche a data de pagamento com a data atual por padrão
                paymentDateInput.value = new Date().toISOString().split('T')[0];

                detailDebtorName.textContent = debtor.name;
                detailTotalAmount.textContent = `R$ ${debtor.totalAmount.toFixed(2).replace('.', ',')}`;
                detailInstallments.textContent = debtor.installments;
                
                // Exibe o valor da parcela calculado (totalAmount / installments)
                // Isso representa o valor que CADA PARCELA deveria valer com base no total emprestado.
                detailAmountPerInstallment.textContent = `R$ ${(debtor.totalAmount / debtor.installments).toFixed(2).replace('.', ',')}`;
                detailStartDate.textContent = new Date(debtor.startDate).toLocaleDateString('pt-BR');

                // NOVO: Exibe o valor da parcela definido pelo usuário, se existir
                if (debtor.customInstallmentAmount !== undefined && debtor.customInstallmentAmount !== null) {
                    detailCustomInstallmentAmount.textContent = `R$ ${parseFloat(debtor.customInstallmentAmount).toFixed(2).replace('.', ',')}`;
                    detailCustomInstallmentAmount.parentElement.style.display = 'block'; // Mostra o parágrafo
                } else {
                    detailCustomInstallmentAmount.textContent = 'Não definido';
                    detailCustomInstallmentAmount.parentElement.style.display = 'none'; // Esconde o parágrafo se não houver valor definido
                }

                // NOVO: Calcula e exibe o lucro
                if (debtor.customInstallmentAmount !== undefined && debtor.customInstallmentAmount !== null && debtor.installments) {
                    const totalExpectedReceived = parseFloat(debtor.customInstallmentAmount) * debtor.installments;
                    const estimatedProfit = totalExpectedReceived - debtor.totalAmount;
                    detailEstimatedProfit.textContent = `R$ ${estimatedProfit.toFixed(2).replace('.', ',')}`;
                    detailEstimatedProfit.parentElement.style.display = 'block'; // Mostra o parágrafo
                } else {
                    detailEstimatedProfit.textContent = 'Não aplicável (defina o valor da parcela)';
                    detailEstimatedProfit.parentElement.style.display = 'none'; // Esconde o parágrafo se não houver customInstallmentAmount
                }

                renderPayments(debtor.payments || []); // Garante que payments seja um array, mesmo que vazio

                debtorDetailModal.style.display = 'flex'; // Exibe a modal
            } catch (error) {
                console.error('Erro ao carregar detalhes do devedor:', error);
                if (!errorMessageElement.style.display || errorMessageElement.style.display === 'none') {
                    showErrorMessage('Não foi possível carregar os detalhes do devedor.');
                }
            }
        };

        // Função para renderizar as caixinhas de pagamentos
        const renderPayments = (payments) => {
            paymentsGrid.innerHTML = ''; // Limpa a grade de pagamentos

            if (!currentDebtor) return; // Se não houver devedor selecionado, não faz nada

            // Define o valor de cada parcela a ser exibido e para cálculo
            // Prioriza o `customInstallmentAmount` se for definido, caso contrário, usa o valor calculado
            const installmentValue = currentDebtor.customInstallmentAmount !== undefined && currentDebtor.customInstallmentAmount !== null
                ? parseFloat(currentDebtor.customInstallmentAmount)
                : (currentDebtor.totalAmount / currentDebtor.installments);

            const installmentData = [];
            // Popula a estrutura de dados das parcelas
            for (let i = 0; i < currentDebtor.installments; i++) {
                installmentData.push({
                    number: i + 1,
                    amount: installmentValue, // Usa o valor da parcela real/definida
                    paid: false,
                    paymentDate: null,
                    paymentId: null, // ID do pagamento que quitou a parcela
                    coveredAmount: 0 // Quantidade do valor da parcela já coberta por pagamentos
                });
            }

            // Criar uma cópia mutável dos pagamentos para controle de "usado"
            const paymentsWithUsage = payments.map(p => ({ ...p, usedAmount: 0 }));
            // Ordenar pagamentos por data para processamento sequencial
            const sortedPayments = [...paymentsWithUsage].sort((a, b) => new Date(a.date) - new Date(b.date));

            // Distribuir os pagamentos pelas parcelas
            let currentPaymentIndex = 0;
            for (let i = 0; i < installmentData.length; i++) {
                let installment = installmentData[i];
                let amountNeededForInstallment = installment.amount - installment.coveredAmount;

                // Loop para cobrir a parcela com pagamentos disponíveis
                // Usando tolerância para evitar problemas com números flutuantes
                while (amountNeededForInstallment > 0.005 && currentPaymentIndex < sortedPayments.length) {
                    let payment = sortedPayments[currentPaymentIndex];
                    let remainingPaymentAmount = payment.amount - payment.usedAmount;

                    if (remainingPaymentAmount > 0.005) { // Se ainda há saldo no pagamento
                        let amountToCover = Math.min(amountNeededForInstallment, remainingPaymentAmount);

                        installment.coveredAmount += amountToCover;
                        payment.usedAmount += amountToCover;
                        amountNeededForInstallment -= amountToCover;

                        // Se a parcela foi completamente paga (com tolerância)
                        if (installment.coveredAmount >= installment.amount - 0.005) {
                            installment.paid = true;
                            installment.paymentId = payment.id;
                            installment.paymentDate = payment.date;
                        }

                        // Se o pagamento foi completamente usado (com tolerância)
                        if (Math.abs(payment.usedAmount - payment.amount) < 0.005) {
                            currentPaymentIndex++; // Move para o próximo pagamento
                        }
                    } else {
                        currentPaymentIndex++; // Move para o próximo pagamento se este já foi todo usado
                    }
                }
            }

            // Calcular e exibir o saldo restante de pagamentos não atribuídos a parcelas
            let totalUnusedPaymentAmount = 0;
            sortedPayments.forEach(p => {
                totalUnusedPaymentAmount += (p.amount - p.usedAmount);
            });

            // Adicionar uma caixinha para pagamentos adicionais/saldo positivo
            if (totalUnusedPaymentAmount > 0.005) { // Se houver um valor significativo não usado
                 const unusedPaymentSquare = document.createElement('div');
                 unusedPaymentSquare.className = 'payment-square unused';
                 unusedPaymentSquare.innerHTML = `
                     <span>Pagamento Adicional</span>
                     <span>R$ ${totalUnusedPaymentAmount.toFixed(2).replace('.', ',')}</span>
                     <span>Ainda não atribuído</span>
                 `;
                 paymentsGrid.appendChild(unusedPaymentSquare);
            }

            // Renderizar as caixinhas de parcela com base no status de pagamento calculado
            installmentData.forEach(installment => {
                const paymentSquare = document.createElement('div');
                paymentSquare.className = 'payment-square';
                paymentSquare.dataset.installmentNumber = installment.number;
                paymentSquare.dataset.installmentAmount = installment.amount.toFixed(2); // Armazena o valor para o botão

                const displayAmount = installment.amount.toFixed(2).replace('.', ',');

                if (installment.paid) {
                    paymentSquare.classList.add('paid');
                    paymentSquare.innerHTML = `
                        <span>Parcela ${installment.number}</span>
                        <span>R$ ${displayAmount}</span>
                        <span>Pago em: ${new Date(installment.paymentDate).toLocaleDateString('pt-BR')}</span>
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

                // Adiciona evento de clique para seleção da caixinha e preenchimento do input
                paymentSquare.addEventListener('click', () => {
                    // Remove a seleção da caixinha anterior, se houver
                    if (selectedPaymentSquare) {
                        selectedPaymentSquare.classList.remove('selected');
                    }
                    paymentSquare.classList.add('selected'); // Adiciona a seleção à caixinha clicada
                    selectedPaymentSquare = paymentSquare;

                    // Preenche o input de valor com o valor da parcela selecionada
                    selectedInstallmentAmount = parseFloat(paymentSquare.dataset.installmentAmount);
                    paymentAmountInput.value = selectedInstallmentAmount.toFixed(2);
                });
            });

            // Adiciona evento para deletar pagamento (delegado para os botões)
            paymentsGrid.querySelectorAll('.delete-payment-btn').forEach(button => {
                button.addEventListener('click', async (e) => {
                    e.stopPropagation(); // Impede que o clique no botão ative o evento de clique do item pai
                    const paymentIdToDelete = e.target.dataset.paymentId;
                    if (confirm('Tem certeza que deseja excluir este pagamento?')) {
                        hideErrorMessage();
                        try {
                            const response = await fetchWithAuth(`${API_URL}/debtors/${currentDebtor.id}/payments/${paymentIdToDelete}`, {
                                method: 'DELETE'
                            });
                            if (response.ok) {
                                alert('Pagamento excluído com sucesso!');
                                showDebtorDetail(currentDebtor.id); // Recarrega os detalhes para atualizar as parcelas
                                loadDebtors(); // Recarrega a lista principal de devedores (para atualizar o saldo)
                            } else {
                                const errorText = await response.text();
                                showErrorMessage(errorText || 'Erro ao excluir pagamento.');
                            }
                        } catch (error) {
                            console.error('Erro ao excluir pagamento:', error);
                            showErrorMessage('Erro de rede ao excluir pagamento.');
                        }
                    }
                });
            });
        };

        // --- Event Listeners Globais do Dashboard ---

        // Event listener para o botão "Usar Valor da Parcela"
        fillAmountButton.addEventListener('click', () => {
            if (selectedInstallmentAmount > 0) {
                paymentAmountInput.value = selectedInstallmentAmount.toFixed(2);
            } else if (currentDebtor) { // Se não houver parcela selecionada, tenta usar a parcela padrão/definida do devedor
                 const defaultInstallmentValue = currentDebtor.customInstallmentAmount !== undefined && currentDebtor.customInstallmentAmount !== null
                    ? parseFloat(currentDebtor.customInstallmentAmount)
                    : (currentDebtor.totalAmount / currentDebtor.installments);
                
                if (!isNaN(defaultInstallmentValue) && defaultInstallmentValue > 0) {
                    paymentAmountInput.value = defaultInstallmentValue.toFixed(2);
                } else {
                    showErrorMessage('Selecione uma parcela ou defina o valor da parcela do devedor para preencher o valor.');
                }
            } else {
                showErrorMessage('Selecione uma parcela ou defina o valor da parcela do devedor para preencher o valor.');
            }
        });

        // Event listener para adicionar um novo pagamento
        addPaymentButton.addEventListener('click', async () => {
            hideErrorMessage();
            const amount = parseFloat(paymentAmountInput.value);
            const date = paymentDateInput.value;

            if (isNaN(amount) || amount <= 0 || !date) {
                showErrorMessage('Por favor, insira um valor e uma data válidos para o pagamento.');
                return;
            }

            if (!currentDebtor || !currentDebtor.id) {
                showErrorMessage('Nenhum devedor selecionado para adicionar pagamento.');
                return;
            }

            // Desabilita o botão para evitar cliques múltiplos
            addPaymentButton.disabled = true;
            addPaymentButton.textContent = 'Adicionando...';

            try {
                const response = await fetchWithAuth(`${API_URL}/debtors/${currentDebtor.id}/payments`, {
                    method: 'POST',
                    body: JSON.stringify({ amount, date })
                });

                if (response.ok) {
                    alert('Pagamento adicionado com sucesso!');
                    paymentAmountInput.value = '';
                    paymentDateInput.value = new Date().toISOString().split('T')[0]; // Resetar para data atual
                    selectedInstallmentAmount = 0; // Reseta o valor da parcela selecionada
                    if (selectedPaymentSquare) { // Desseleciona a caixinha
                        selectedPaymentSquare.classList.remove('selected');
                        selectedPaymentSquare = null;
                    }
                    showDebtorDetail(currentDebtor.id); // Recarrega os detalhes do devedor para atualizar a visualização
                    loadDebtors(); // Recarrega a lista principal para atualizar o saldo
                } else {
                    const errorText = await response.text();
                    showErrorMessage(errorText || 'Erro ao adicionar pagamento.');
                }
            } catch (error) {
                console.error('Erro ao adicionar pagamento:', error);
                showErrorMessage('Erro de rede ao adicionar pagamento.');
            } finally {
                // Reabilita o botão
                addPaymentButton.disabled = false;
                addPaymentButton.textContent = 'Adicionar Pagamento';
            }
        });

        // Event listener para abrir a modal de adicionar novo devedor
        addDebtorButton.addEventListener('click', () => {
            addEditModalTitle.textContent = 'Adicionar Novo Devedor';
            addEditDebtorForm.reset(); // Limpa o formulário
            // Preenche a data de início com a data atual por padrão
            startDateInput.value = new Date().toISOString().split('T')[0];
            customInstallmentAmountInput.value = ''; // Limpa o novo campo
            currentDebtor = null; // Reseta o devedor atual
            addEditDebtorModal.style.display = 'flex'; // Exibe a modal
            hideErrorMessage();
        });

        // Função para carregar dados de um devedor para edição
        const editDebtor = async (id) => {
            hideErrorMessage();
            try {
                const response = await fetchWithAuth(`${API_URL}/debtors/${id}`);
                if (!response || !response.ok) {
                    throw new Error(`HTTP error! status: ${response ? response.status : 'N/A'}`);
                }
                const debtor = await response.json();

                currentDebtor = debtor;
                addEditModalTitle.textContent = 'Editar Devedor';
                debtorNameInput.value = debtor.name;
                totalAmountInput.value = debtor.totalAmount;
                installmentsInput.value = debtor.installments;
                startDateInput.value = debtor.startDate; // A data já deve vir no formato YYYY-MM-DD
                // Preenche o novo campo com o valor existente
                customInstallmentAmountInput.value = debtor.customInstallmentAmount || ''; 

                addEditDebtorModal.style.display = 'flex';
            } catch (error) {
                console.error('Erro ao carregar devedor para edição:', error);
                if (!errorMessageElement.style.display || errorMessageElement.style.display === 'none') {
                    showErrorMessage('Não foi possível carregar os dados do devedor para edição.');
                }
            }
        };

        // Event listener para salvar (adicionar ou editar) um devedor
        addEditDebtorForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            hideErrorMessage();

            // Validação e tratamento de inputs
            const name = debtorNameInput.value.trim();
            const totalAmount = parseFloat(totalAmountInput.value);
            const installments = parseInt(installmentsInput.value);
            const startDate = startDateInput.value;
            // Captura o novo valor da parcela (pode ser vazio)
            const customInstallmentAmount = customInstallmentAmountInput.value !== '' ? parseFloat(customInstallmentAmountInput.value) : null;


            // Validação dos campos
            if (!name || isNaN(totalAmount) || totalAmount <= 0 || isNaN(installments) || installments <= 0 || !startDate || 
                (customInstallmentAmount !== null && (isNaN(customInstallmentAmount) || customInstallmentAmount <= 0))) {
                showErrorMessage('Por favor, preencha todos os campos corretamente (valores numéricos devem ser maiores que zero, e o valor da parcela, se preenchido, também deve ser maior que zero).');
                return;
            }

            const debtorData = {
                name,
                totalAmount,
                installments,
                // O amountPerInstallment agora será calculado com base no totalAmount / installments
                // mas a API deve ter lógica para usar customInstallmentAmount se fornecido para o cálculo total
                amountPerInstallment: totalAmount / installments, 
                startDate,
                // Adiciona o novo campo ao objeto de dados enviado para a API
                customInstallmentAmount: customInstallmentAmount 
            };

            // Desabilita o botão
            saveDebtorButton.disabled = true;
            saveDebtorButton.textContent = 'Salvando...';

            try {
                let response;
                if (currentDebtor) {
                    // Se for edição, envia um PUT para o ID do devedor atual
                    response = await fetchWithAuth(`${API_URL}/debtors/${currentDebtor.id}`, {
                        method: 'PUT',
                        body: JSON.stringify(debtorData)
                    });
                } else {
                    // Se for adição, envia um POST para criar um novo devedor
                    response = await fetchWithAuth(`${API_URL}/debtors`, {
                        method: 'POST',
                        body: JSON.stringify(debtorData)
                    });
                }

                if (response.ok) {
                    alert('Devedor salvo com sucesso!');
                    addEditDebtorModal.style.display = 'none'; // Esconde a modal
                    loadDebtors(); // Recarrega a lista de devedores
                } else {
                    const errorText = await response.text();
                    showErrorMessage(errorText || 'Erro ao salvar devedor.');
                }
            } catch (error) {
                console.error('Erro ao salvar devedor:', error);
                showErrorMessage('Erro de rede ao salvar devedor.');
            } finally {
                // Reabilita o botão
                saveDebtorButton.disabled = false;
                saveDebtorButton.textContent = 'Salvar Devedor';
            }
        });

        // Função para excluir um devedor
        const deleteDebtor = async (id) => {
            if (confirm('Tem certeza que deseja excluir este devedor e todos os seus pagamentos? Esta ação é irreversível!')) {
                hideErrorMessage();
                try {
                    const response = await fetchWithAuth(`${API_URL}/debtors/${id}`, {
                        method: 'DELETE'
                    });
                    if (response.ok) {
                        alert('Devedor excluído com sucesso!');
                        loadDebtors(); // Recarrega a lista após a exclusão
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

        // --- Fechamento de Modais ---
        closeDetailModalButton.addEventListener('click', () => {
            debtorDetailModal.style.display = 'none';
            hideErrorMessage();
            // Limpa a seleção e o input ao fechar o modal de detalhes
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

        // Fechar modais clicando fora deles
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

        // --- Logout ---
        logoutButton.addEventListener('click', () => {
            localStorage.removeItem('accessToken'); // Remove o token de autenticação
            window.location.href = 'index.html'; // Redireciona para a página de login
        });

        // Carrega os devedores ao iniciar o dashboard
        loadDebtors();
    }
});
