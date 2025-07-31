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


// --- Lógica de Login (mantida simples, mas o ideal seria usar autenticação Firebase) ---
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', (event) => {
            event.preventDefault();
            const username = loginForm.username.value;
            const password = loginForm.password.value;

            // Simples verificação de login (APENAS PARA EXEMPLO E TESTE DE DESENVOLVIMENTO!)
            // Para um app real, use Firebase Authentication!
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

        // --- Configuração e Inicialização do Firebase ---
        // SUBSTITUA ESTE OBJETO COM AS SUAS CREDENCIAIS DO FIREBASE!
        const firebaseConfig = {
            apiKey: "AIzaSyAEZVCbz39BiqTj5f129PcrVHxfS6OnzLc",
            authDomain: "gerenciadoremprestimos.firebaseapp.com",
            projectId: "gerenciadoremprestimos",
            storageBucket: "gerenciadoremprestimos.firebasestorage.app",
            messagingSenderId: "365277402196",
            appId: "1:365277402196:web:65016aa2dd316e718a89c1"
        };


        // Inicializa o Firebase
        firebase.initializeApp(firebaseConfig);
        const db = firebase.firestore(); // Obtém uma referência ao Firestore

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
        const detailLoanedAmount = document.getElementById('detailLoanedAmount');
        const detailTotalToReceive = document.getElementById('detailTotalToReceive');
        const detailInterestPercentage = document.getElementById('detailInterestPercentage');
        const toggleTotalToReceive = document.getElementById('toggleTotalToReceive'); // Checkbox
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
        const loanedAmountInput = document.getElementById('loanedAmount');
        const amountPerInstallmentInput = document.getElementById('amountPerInstallmentInput');
        const installmentsInput = document.getElementById('installments');
        const startDateInput = document.getElementById('startDate');
        const saveDebtorButton = document.getElementById('saveDebtorButton');

        let debtors = []; // Agora os devedores serão carregados do Firebase
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

        // Calcula o valor total a receber
        function calculateTotalToReceive(amountPerInstallment, installments) {
            return amountPerInstallment * installments;
        }

        // Calcula a porcentagem de juros
        function calculateInterestPercentage(loanedAmount, totalToReceive) {
            if (loanedAmount <= 0) return 0; // Evita divisão por zero
            const interestAmount = totalToReceive - loanedAmount;
            return ((interestAmount / loanedAmount) * 100).toFixed(2); // Duas casas decimais
        }

        function showError(message) {
            errorMessageDiv.textContent = message;
            errorMessageDiv.style.display = 'block';
            setTimeout(() => {
                errorMessageDiv.style.display = 'none';
            }, 5000);
        }

        // --- Renderização de Devedores na Lista Principal ---
        function renderDebtors() {
            debtorsList.innerHTML = ''; // Limpa a lista antes de renderizar
            if (debtors.length === 0) {
                debtorsList.innerHTML = '<p class="loading-message">Nenhum devedor cadastrado. Clique em "Adicionar Novo Devedor" para começar.</p>';
                return;
            }

            debtors.forEach(debtor => {
                // Ensure payments array exists and is valid
                const debtorPayments = Array.isArray(debtor.payments) ? debtor.payments : [];
                const totalPaid = debtorPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
                const remainingAmount = debtor.totalToReceive - totalPaid;

                const debtorItem = document.createElement('div');
                debtorItem.className = 'debtor-item';
                debtorItem.setAttribute('data-id', debtor.id);

                debtorItem.innerHTML = `
                    <div class="debtor-info">
                        <h2>${debtor.name}</h2>
                        <p>${debtor.description || 'Sem descrição'}</p>
                        <p>Emprestado: ${formatCurrency(debtor.loanedAmount)}</p>
                        <p>Total a Receber: ${formatCurrency(debtor.totalToReceive)}</p>
                        <p>Restante: <span style="color: ${remainingAmount > 0 ? 'var(--error-color)' : 'var(--success-color)'}">${formatCurrency(remainingAmount)}</span></p>
                    </div>
                    <div class="debtor-actions">
                        <button class="edit-debtor-btn small-button">Editar</button>
                        <button class="delete-debtor-btn small-button">Excluir</button>
                    </div>
                `;

                // Event Listener para abrir modal de detalhes
                debtorItem.querySelector('.debtor-info').addEventListener('click', (event) => {
                    if (!event.target.closest('.debtor-actions')) {
                         openDebtorDetailModal(debtor.id);
                    }
                });

                // Event Listener para o botão Editar
                debtorItem.querySelector('.edit-debtor-btn').addEventListener('click', (event) => {
                    event.stopPropagation();
                    openAddEditDebtorModal(debtor.id);
                });

                // Event Listener para o botão Excluir
                debtorItem.querySelector('.delete-debtor-btn').addEventListener('click', (event) => {
                    event.stopPropagation();
                    if (confirm(`Tem certeza que deseja excluir ${debtor.name}?`)) {
                        deleteDebtor(debtor.id);
                    }
                });

                debtorsList.appendChild(debtorItem);
            });
        }

        // --- Adicionar/Editar Devedor ---
        addDebtorButton.addEventListener('click', () => openAddEditDebtorModal());

        addEditDebtorForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            const name = debtorNameInput.value;
            const description = debtorDescriptionInput.value;
            const loanedAmount = parseFloat(loanedAmountInput.value);
            const amountPerInstallment = parseFloat(amountPerInstallmentInput.value);
            const installments = parseInt(installmentsInput.value);
            const startDate = startDateInput.value;

            if (isNaN(loanedAmount) || isNaN(amountPerInstallment) || isNaN(installments) ||
                loanedAmount <= 0 || amountPerInstallment <= 0 || installments <= 0) {
                showError('Por favor, insira valores válidos e maiores que zero para todos os campos numéricos.');
                return;
            }

            const totalToReceive = calculateTotalToReceive(amountPerInstallment, installments);
            const interestPercentage = calculateInterestPercentage(loanedAmount, totalToReceive);

            try {
                if (currentDebtorId) {
                    // Atualizar devedor existente no Firestore
                    const debtorRef = db.collection('debtors').doc(currentDebtorId);
                    const doc = await debtorRef.get();
                    if (doc.exists) {
                        const oldDebtor = doc.data();
                        let updatedPayments = Array.isArray(oldDebtor.payments) ? [...oldDebtor.payments] : [];

                        // Se o número de parcelas diminuir, remove pagamentos em excesso (conceitualmente)
                        if (updatedPayments.length > installments) {
                            updatedPayments = updatedPayments.slice(0, installments);
                        }

                        await debtorRef.update({
                            name,
                            description,
                            loanedAmount,
                            amountPerInstallment,
                            installments,
                            startDate,
                            totalToReceive,
                            interestPercentage,
                            payments: updatedPayments // Mantém os pagamentos existentes
                        });
                    } else {
                        showError("Devedor não encontrado para atualização.");
                    }
                } else {
                    // Adicionar novo devedor ao Firestore
                    await db.collection('debtors').add({
                        name,
                        description,
                        loanedAmount,
                        amountPerInstallment,
                        installments,
                        startDate,
                        totalToReceive,
                        interestPercentage,
                        payments: [] // Começa com um array de pagamentos vazio
                    });
                }
                addEditDebtorModal.style.display = 'none';
            } catch (error) {
                console.error("Erro ao salvar devedor:", error);
                showError('Erro ao salvar devedor. Verifique o console para mais detalhes.');
            }
        });

        function openAddEditDebtorModal(id = null) {
            addEditDebtorForm.reset();
            currentDebtorId = id;

            if (id) {
                addEditModalTitle.textContent = 'Editar Devedor';
                const debtor = debtors.find(d => d.id === id); // Busca nos dados locais carregados
                if (debtor) {
                    debtorNameInput.value = debtor.name;
                    debtorDescriptionInput.value = debtor.description;
                    loanedAmountInput.value = debtor.loanedAmount;
                    amountPerInstallmentInput.value = debtor.amountPerInstallment;
                    installmentsInput.value = debtor.installments;
                    startDateInput.value = debtor.startDate;
                }
            } else {
                addEditModalTitle.textContent = 'Adicionar Novo Devedor';
            }
            addEditDebtorModal.style.display = 'flex';
        }

        async function deleteDebtor(id) {
            try {
                await db.collection('debtors').doc(id).delete();
            } catch (error) {
                console.error("Erro ao excluir devedor:", error);
                showError('Erro ao excluir devedor. Verifique o console para mais detalhes.');
            }
        }

        // --- Modal de Detalhes do Devedor ---
        function openDebtorDetailModal(id) {
            currentDebtorId = id;
            const debtor = debtors.find(d => d.id === id);

            if (debtor) {
                detailDebtorName.textContent = debtor.name;
                detailDebtorDescription.textContent = debtor.description;
                detailLoanedAmount.textContent = formatCurrency(debtor.loanedAmount);
                detailTotalToReceive.textContent = formatCurrency(debtor.totalToReceive);
                detailInterestPercentage.textContent = `${debtor.interestPercentage}%`;
                detailInstallments.textContent = debtor.installments;
                detailAmountPerInstallment.textContent = formatCurrency(debtor.amountPerInstallment);
                detailStartDate.textContent = formatDate(debtor.startDate);

                const hideTotalToReceivePref = localStorage.getItem('hideTotalToReceive');
                if (hideTotalToReceivePref === 'true') {
                    toggleTotalToReceive.checked = true;
                    detailTotalToReceive.classList.add('hidden-value');
                } else {
                    toggleTotalToReceive.checked = false;
                    detailTotalToReceive.classList.remove('hidden-value');
                }

                renderPaymentsGrid(debtor);
                debtorDetailModal.style.display = 'flex';
            }
        }
        
        // Listener para o checkbox de ocultar/mostrar valor a receber
        toggleTotalToReceive.addEventListener('change', () => {
            if (toggleTotalToReceive.checked) {
                detailTotalToReceive.classList.add('hidden-value');
                localStorage.setItem('hideTotalToReceive', 'true');
            } else {
                detailTotalToReceive.classList.remove('hidden-value');
                localStorage.setItem('hideTotalToReceive', 'false');
            }
        });

        // --- RENDERIZAÇÃO E LÓGICA DOS QUADRADINHOS DE PAGAMENTO ---
        function renderPaymentsGrid(debtor) {
            paymentsGrid.innerHTML = '';
            selectedPaymentIndex = null; // Reseta seleção

            // Clonamos os pagamentos para poder manipulá-los temporariamente sem afetar o original
            // Mapeamos para garantir que cada pagamento tenha uma quantidade 'consumível'
            // Filtrar pagamentos inválidos que podem vir do Firestore
            const validPayments = (Array.isArray(debtor.payments) ? debtor.payments : []).filter(p => p && typeof p.amount === 'number' && p.amount > 0);
            let consumablePayments = validPayments.map(p => ({ ...p, amountRemaining: p.amount }));
            
            // Ordena os pagamentos por data para um consumo sequencial
            consumablePayments.sort((a, b) => new Date(a.date) - new Date(b.date));


            // Percorre cada parcela esperada
            for (let i = 0; i < debtor.installments; i++) {
                const installmentNumber = i + 1;
                const expectedAmountForThisInstallment = debtor.amountPerInstallment;
                let paidAmountForThisInstallment = 0;
                let paymentDateForThisInstallment = 'Pendente';
                let isPaid = false;

                // Tenta consumir os pagamentos disponíveis para esta parcela
                for (let j = 0; j < consumablePayments.length; j++) {
                    const payment = consumablePayments[j];
                    if (payment && payment.amountRemaining > 0) {
                        const amountNeededForThisInstallment = expectedAmountForThisInstallment - paidAmountForThisInstallment;
                        const amountToApply = Math.min(amountNeededForThisInstallment, payment.amountRemaining);
                        
                        paidAmountForThisInstallment += amountToApply;
                        payment.amountRemaining -= amountToApply;

                        // Se esta parcela foi coberta (total ou parcialmente) por este pagamento
                        // e se ainda não tem uma data definida, use a data deste pagamento
                        if (amountToApply > 0 && paymentDateForThisInstallment === 'Pendente') {
                             paymentDateForThisInstallment = payment.date;
                        }

                        if (paidAmountForThisInstallment >= expectedAmountForThisInstallment) {
                            isPaid = true;
                            break; // Parcela coberta, passa para a próxima
                        }
                    }
                }
                
                const displayAmount = Math.min(paidAmountForThisInstallment, expectedAmountForThisInstallment);
                const displayRemaining = expectedAmountForThisInstallment - displayAmount;

                const paymentSquare = document.createElement('div');
                paymentSquare.className = `payment-square ${isPaid ? 'paid' : ''}`;
                paymentSquare.setAttribute('data-index', i); // Índice da parcela esperada

                // Monta o HTML do quadradinho
                let valueHtml = `<span>${formatCurrency(expectedAmountForThisInstallment)}</span>`; // Sempre mostra o valor total da parcela
                if (!isPaid) {
                    valueHtml = `<span>${formatCurrency(displayAmount)} (Faltam: ${formatCurrency(displayRemaining)})</span>`;
                }

                let dateHtml = `<span style="font-size: 0.75em; color: ${isPaid ? 'rgba(255,255,255,0.8)' : 'var(--light-text)'};">` + 
                                (paymentDateForThisInstallment === 'Pendente' ? 'Pendente' : `Pago: ${formatDate(paymentDateForThisInstallment)}`) + 
                                `</span>`;

                paymentSquare.innerHTML = `
                    <span>Parc. ${installmentNumber}</span>
                    ${valueHtml}
                    ${dateHtml}
                    ${isPaid ? `<button class="delete-payment-btn" data-payment-original-index="${i}">X</button>` : ''}
                `;

                // Adiciona evento de clique para selecionar a caixinha (para adicionar pagamento)
                paymentSquare.addEventListener('click', () => {
                    document.querySelectorAll('.payment-square').forEach(sq => sq.classList.remove('selected'));
                    if (!isPaid) { // Só permite selecionar parcelas não pagas
                        paymentSquare.classList.add('selected');
                        selectedPaymentIndex = i; // Armazena o índice da parcela *esperada*
                        paymentAmountInput.value = (expectedAmountForThisInstallment - paidAmountForThisInstallment).toFixed(2); // Preenche com o valor que falta
                        paymentDateInput.valueAsDate = new Date();
                    } else {
                        selectedPaymentIndex = null;
                        paymentAmountInput.value = '';
                        paymentDateInput.valueAsDate = null;
                    }
                });

                // Evento para o botão de exclusão de pagamento
                const deleteBtn = paymentSquare.querySelector('.delete-payment-btn');
                if (deleteBtn) {
                    deleteBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        // Como a lógica de "qual pagamento cobriu qual parcela" é complexa,
                        // e o Firestore não armazena essa associação, para o botão "X"
                        // o mais prático é oferecer a opção de remover o ÚLTIMO pagamento registrado.
                        if (confirm('Tem certeza que deseja remover o último pagamento registrado deste devedor?')) {
                            removeLastPayment(currentDebtorId);
                        }
                    });
                }
                paymentsGrid.appendChild(paymentSquare);
            }

            // Define o valor padrão no input de pagamento e data para a próxima parcela pendente
            const nextPendingSquare = paymentsGrid.querySelector('.payment-square:not(.paid)');
            if (nextPendingSquare) {
                const nextExpectedAmount = debtor.amountPerInstallment; // Valor da próxima parcela
                const remainingInNext = nextExpectedAmount - parseFloat(nextPendingSquare.querySelector('span:nth-child(2)').textContent.match(/\((.*?)\)/)?.[1]?.replace(/[^\d.,]/g, '').replace(',', '.') || 0);
                
                paymentAmountInput.value = remainingInNext > 0 ? remainingInNext.toFixed(2) : nextExpectedAmount.toFixed(2);
                paymentDateInput.valueAsDate = new Date();
                nextPendingSquare.classList.add('selected'); // Pré-seleciona a próxima parcela
                selectedPaymentIndex = parseInt(nextPendingSquare.getAttribute('data-index'));
            } else {
                paymentAmountInput.value = ''; // Limpa se todas as parcelas foram pagas
                paymentDateInput.valueAsDate = null;
                selectedPaymentIndex = null;
            }
        }


        // --- Adicionar Pagamento (Lógica aprimorada para múltiplos pagamentos) ---
        addPaymentButton.addEventListener('click', async () => {
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

            try {
                const debtorRef = db.collection('debtors').doc(currentDebtorId);
                const doc = await debtorRef.get();
                if (doc.exists) {
                    const debtorData = doc.data();
                    let updatedPayments = Array.isArray(debtorData.payments) ? [...debtorData.payments] : [];
                    
                    // Adiciona o novo pagamento
                    updatedPayments.push({ amount: paymentAmount, date: paymentDate });
                    
                    // Ordena os pagamentos por data para um controle mais fácil
                    updatedPayments.sort((a, b) => new Date(a.date) - new Date(b.date));

                    await debtorRef.update({ payments: updatedPayments });

                    // A UI será atualizada automaticamente pelo listener do Firestore
                    paymentAmountInput.value = '';
                    paymentDateInput.valueAsDate = new Date();
                    selectedPaymentIndex = null; // Reseta a seleção
                } else {
                    showError("Devedor não encontrado para adicionar pagamento.");
                }
            } catch (error) {
                console.error("Erro ao adicionar pagamento:", error);
                showError('Erro ao adicionar pagamento. Verifique o console para mais detalhes.');
            }
        });

        // Preencher valor com o valor da parcela
        fillAmountButton.addEventListener('click', () => {
            if (currentDebtorId === null) return;
            const debtor = debtors.find(d => d.id === currentDebtorId);
            if (debtor) {
                const nextPendingSquare = paymentsGrid.querySelector('.payment-square:not(.paid)');
                if (nextPendingSquare) {
                     // Calcula o valor que falta para a próxima parcela pendente
                    const nextExpectedAmount = debtor.amountPerInstallment;
                    const paidForNext = parseFloat(nextPendingSquare.querySelector('span:nth-child(2)').textContent.match(/(\d[\d.,]*)/)?.[1]?.replace(/[^\d.,]/g, '').replace(',', '.') || 0);
                    const remainingToFill = nextExpectedAmount - paidForNext;

                    paymentAmountInput.value = remainingToFill.toFixed(2);
                    paymentDateInput.valueAsDate = new Date(); 
                    document.querySelectorAll('.payment-square').forEach(sq => sq.classList.remove('selected'));
                    nextPendingSquare.classList.add('selected');
                    selectedPaymentIndex = parseInt(nextPendingSquare.getAttribute('data-index'));
                } else {
                    // Se não há parcelas pendentes, preenche com o valor de uma parcela completa
                    paymentAmountInput.value = debtor.amountPerInstallment.toFixed(2);
                    paymentDateInput.valueAsDate = new Date();
                    selectedPaymentIndex = null;
                }
            }
        });


        // Função para remover o último pagamento
        async function removeLastPayment(debtorId) {
            try {
                const debtorRef = db.collection('debtors').doc(debtorId);
                const doc = await debtorRef.get();
                if (doc.exists) {
                    const debtorData = doc.data();
                    let updatedPayments = Array.isArray(debtorData.payments) ? [...debtorData.payments] : [];
                    
                    if (updatedPayments.length === 0) {
                        showError('Não há pagamentos para remover.');
                        return;
                    }
                    
                    updatedPayments.pop(); // Remove o último elemento
                    
                    await debtorRef.update({ payments: updatedPayments });
                    // A UI será atualizada automaticamente pelo listener do Firestore
                } else {
                    showError("Devedor não encontrado para remover pagamento.");
                }
            } catch (error) {
                console.error("Erro ao remover pagamento:", error);
                showError('Erro ao remover pagamento. Verifique o console para mais detalhes.');
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

        // --- Listener em Tempo Real do Firestore ---
        // Este é o coração da sincronização!
        db.collection('debtors').onSnapshot((snapshot) => {
            debtors = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            renderDebtors(); // Renderiza a lista principal com os dados mais recentes

            // Se o modal de detalhes estiver aberto para o devedor atual, re-renderize-o
            if (debtorDetailModal.style.display === 'flex' && currentDebtorId) {
                const currentDebtorInModal = debtors.find(d => d.id === currentDebtorId);
                if (currentDebtorInModal) {
                    renderPaymentsGrid(currentDebtorInModal);
                } else {
                    // Se o devedor foi excluído enquanto o modal estava aberto, feche-o
                    debtorDetailModal.style.display = 'none';
                }
            }
        }, (error) => {
            console.error("Erro ao carregar devedores do Firestore:", error);
            showError("Erro ao carregar dados. Verifique sua conexão ou as regras do Firebase.");
            debtorsList.innerHTML = '<p class="loading-message error">Erro ao carregar dados. Tente novamente mais tarde.</p>';
        });
    }
});
