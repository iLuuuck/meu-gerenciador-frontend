// ========================================================
// 1. CONFIGURAÇÃO E INICIALIZAÇÃO DO FIREBASE
// ========================================================
const firebaseConfig = {
    apiKey: "AIzaSyAEZVCbz39BiqTj5f129PcrVHxfS6OnzLc",
    authDomain: "gerenciadoremprestimos.firebaseapp.com",
    projectId: "gerenciadoremprestimos",
    storageBucket: "gerenciadoremprestimos.firebasestorage.app",
    messagingSenderId: "365277402196",
    appId: "1:365277402196:web:65016aa2dd316e718a89c1"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const db = firebase.firestore();
const auth = firebase.auth();
const DEBTORS_COLLECTION = 'debtors';

// Variáveis de Controle
let currentUserId = null;
let debtors = [];
let currentFilter = 'all';
let currentDebtorId = null;


// ========================================================
// 2. CONTROLE DE ACESSO E TEMA
// ========================================================
auth.onAuthStateChanged((user) => {
    if (!user) {
        if (!window.location.pathname.includes('index.html') && window.location.pathname !== '/') {
            window.location.href = "index.html";
        }
    } else {
        currentUserId = user.uid;
        setupFirestoreListener();
        if (window.location.pathname.includes('perfil.html')) loadUserProfile();
    }
});

function applyTheme(theme) {
    if (theme === 'light') document.body.classList.add('light-theme');
    else document.body.classList.remove('light-theme');
    localStorage.setItem('themePreference', theme);
}
applyTheme(localStorage.getItem('themePreference') || 'dark');

// ========================================================
// 3. SINCRONIZAÇÃO EM TEMPO REAL (FIRESTORE)
// ========================================================
function setupFirestoreListener() {
    if (!currentUserId) return;

    db.collection(DEBTORS_COLLECTION)
        .where('userId', '==', currentUserId)
        .onSnapshot((snapshot) => {
            debtors = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            refreshUI();
        }, (error) => console.error("Erro Firestore:", error));
}

function refreshUI() {
    // 1. Atualiza Dashboard (inicio.html)
    if (document.getElementById('stat-total-lent')) updateInicioDashboard();
    
    // 2. Atualiza Lista (clientes.html)
    if (document.getElementById('debtorsList')) renderDebtors();
    
    // 3. Mensagem Boas Vindas
    const welcomeMsg = document.getElementById('welcomeMessage');
    if (welcomeMsg && auth.currentUser) {
        const name = auth.currentUser.displayName || auth.currentUser.email.split('@')[0];
        welcomeMsg.innerText = `Olá, ${name.charAt(0).toUpperCase() + name.slice(1)}! 👋`;
    }
}

// ========================================================
// 4. LÓGICA DO DASHBOARD (INICIO.HTML)
// ========================================================
// ========================================================
// 4. LÓGICA DO DASHBOARD (INICIO.HTML) - ATUALIZADO
// ========================================================
function updateInicioDashboard() {
    const elActive = document.getElementById('stat-active-clients');
    const elLent = document.getElementById('stat-total-lent');
    const elReceive = document.getElementById('stat-total-receive');

    // Soma apenas o capital inicial emprestado
    const totalLent = debtors.reduce((acc, d) => acc + (parseFloat(d.loanedAmount) || 0), 0);

    // SOMA TOTAL COM LUCRO: Soma o valor total que deve ser recebido (Capital + Juros)
    const totalComLucro = debtors.reduce((acc, d) => acc + (parseFloat(d.totalToReceive) || 0), 0);

    if (elActive) elActive.innerText = debtors.length;
    if (elLent) elLent.innerText = formatBRL(totalLent);
    
    // Agora o "Total a Receber" mostrará o montante global (lucro incluso)
    if (elReceive) elReceive.innerText = formatBRL(totalComLucro);
}

// ========================================================
// 5. LÓGICA DE CLIENTES E FILTROS (ATUALIZADA COM RENOVAÇÃO)
// ========================================================
function renderDebtors() {
    const list = document.getElementById('debtorsList');
    if (!list) return;
    list.innerHTML = '';

    const filteredDebtors = currentFilter === 'all' 
        ? debtors 
        : debtors.filter(d => d.frequency === currentFilter);

    if (filteredDebtors.length === 0) {
        list.innerHTML = `<p class="empty-msg" style="text-align:center; color:#888; margin-top:20px;">
            Nenhum cliente encontrado para o filtro: ${currentFilter}
        </p>`;
        return;
    }

    filteredDebtors.forEach(d => {
        const paid = (d.payments || []).reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
        const totalToReceive = parseFloat(d.totalToReceive) || 0;
        const remaining = totalToReceive - paid;
        
        // Cálculo de progresso (máximo 100%)
        const progress = totalToReceive > 0 ? Math.min((paid / totalToReceive) * 100, 100).toFixed(0) : 0;
        
        // Verifica se está 100% pago
        const isFinished = parseFloat(progress) >= 100;

        const card = document.createElement('div');
        card.className = 'debtor-card';
        card.innerHTML = `
            <h3>${d.name}</h3>
            <p>${d.description || ''}</p>
            <div class="info-row frequency-row">
                <span>⏱ Frequência:</span> 
                <strong class="badge-freq">${translateFrequency(d.frequency)}</strong>
            </div>
            <div class="info-row"><span>Emprestado:</span> <strong>R$ ${parseFloat(d.loanedAmount).toFixed(2)}</strong></div>
            <div class="info-row"><span>Falta:</span> <strong style="color:${isFinished ? 'green' : 'red'}">R$ ${remaining.toFixed(2)}</strong></div>
            
            <div class="progress-container"><div class="progress-bar" style="width: ${progress}%"></div></div>
            <div style="text-align:right; font-size:12px; color:${isFinished ? '#00e676' : '#888'}">${isFinished ? '✅ TOTALMENTE PAGO' : progress + '% Pago'}</div>

            <div class="card-footer-actions">
                ${isFinished ? `
                    <button onclick="renewDebtor('${d.id}')" class="btn-action btn-renew" style="background:#27ae60 !important; color:white; flex:2;">🔄 Renovar Cliente</button>
                    <button onclick="deleteDebtor('${d.id}')" class="btn-action btn-delete" style="flex:1;">Excluir</button>
                ` : `
                    <button onclick="openPaymentModal('${d.id}')" class="btn-action btn-pay">Adicionar Pagamento</button>
                    <button onclick="showAllInstallments('${d.id}')" class="btn-action btn-view">Ver Parcelas</button>
                    <button onclick="openInfoModal('${d.id}')" class="btn-action btn-info">Informações</button>
                    <button onclick="copiarTextoAcesso('${d.accessCode}')" class="btn-action btn-copy-access">Copiar Acesso</button>
                    <button onclick="editDebtor('${d.id}')" class="btn-action btn-edit">Editar</button>
                    <button onclick="deleteDebtor('${d.id}')" class="btn-action btn-delete">Excluir</button>
                `}
            </div>
        `;
        list.appendChild(card);
    });
}

// ========================================================
// 6. CADASTRO E CÁLCULOS (MODAL)
// ========================================================
// A função PRECISA começar com "async"
async function handleFormSubmit(e) {
    e.preventDefault();
    
    // Captura o formulário e verifica se é uma renovação
    const formElement = e.target;
    const isRenewal = formElement.dataset.isRenewal === "true";
    
    // Busca os dados antigos caso seja uma edição ou renovação
    const oldData = currentDebtorId ? debtors.find(d => d.id === currentDebtorId) : null;

    const loanedAmount = parseFloat(document.getElementById('loanedAmount').value) || (oldData ? oldData.loanedAmount : 0);
    const installments = parseInt(document.getElementById('installments').value) || (oldData ? oldData.installments : 1);
    const calcType = document.getElementById('calculationType').value;
    
    let totalToReceive = 0;
    let amountPerInstallment = 0;
    let interestPercentage = 0;

    // Lógica de cálculo
    if (calcType === 'perInstallment') {
        amountPerInstallment = parseFloat(document.getElementById('amountPerInstallmentInput').value) || 0;
        totalToReceive = amountPerInstallment * installments;
        interestPercentage = loanedAmount > 0 ? ((totalToReceive - loanedAmount) / loanedAmount) * 100 : 0;
    } else {
        interestPercentage = parseFloat(document.getElementById('interestPercentageInput').value) || 0;
        totalToReceive = loanedAmount * (1 + interestPercentage / 100);
        amountPerInstallment = installments > 0 ? totalToReceive / installments : 0;
    }

    // Montagem do objeto de dados
    const debtorData = {
        name: document.getElementById('debtorName').value,
        description: document.getElementById('debtorDescription').value,
        loanedAmount: loanedAmount,
        frequency: document.getElementById('frequency').value,
        installments: installments,
        interestPercentage: interestPercentage,
        amountPerInstallment: amountPerInstallment,
        totalToReceive: totalToReceive,
        startDate: document.getElementById('startDate').value,
        userId: currentUserId,
        
        // Se renovar, limpa pagamentos. Se editar, mantém.
        payments: isRenewal ? [] : (oldData?.payments || []),
        
        // Gera novo acesso se for renovação ou cliente novo
        accessCode: (isRenewal || !currentDebtorId) 
            ? Math.random().toString(36).substring(2, 8).toUpperCase() 
            : (oldData?.accessCode || Math.random().toString(36).substring(2, 8).toUpperCase()),
            
        lastEdited: new Date().toISOString()
    };

    try {
        // Agora o await está seguro dentro da função async
        if (currentDebtorId) {
            await db.collection(DEBTORS_COLLECTION).doc(currentDebtorId).update(debtorData);
            alert(isRenewal ? "✅ Renovado! Histórico zerado para o novo ciclo." : "✅ Atualizado com sucesso!");
        } else {
            await db.collection(DEBTORS_COLLECTION).add(debtorData);
            alert("✅ Cadastrado com sucesso!");
        }
        
        // Limpa o estado e fecha o modal
        formElement.dataset.isRenewal = "false"; 
        closeModal('addEditDebtorModal');
        currentDebtorId = null; 

    } catch (err) {
        console.error("Erro ao salvar:", err);
        alert("Erro ao salvar os dados: " + err.message);
    }
}

// ========================================================
// 6. CADASTRO E CÁLCULOS (MODAL) - VERSÃO CORRIGIDA
// ========================================================
async function handleFormSubmit(e) {
    e.preventDefault();
    
    try {
        // 1. Identifica se é uma renovação e busca dados antigos para segurança
        const formElement = e.target;
        const isRenewal = formElement.dataset.isRenewal === "true";
        const oldData = currentDebtorId ? debtors.find(d => d.id === currentDebtorId) : null;
        
        // 2. Captura os valores dos inputs (usa os antigos como "plano B")
        const loanedAmount = parseFloat(document.getElementById('loanedAmount').value) || (oldData ? oldData.loanedAmount : 0);
        const installments = parseInt(document.getElementById('installments').value) || (oldData ? oldData.installments : 1);
        const calcType = document.getElementById('calculationType').value;
        
        let totalToReceive = 0;
        let amountPerInstallment = 0;
        let interestPercentage = 0;

        // 3. Lógica de cálculo
        if (calcType === 'perInstallment') {
            amountPerInstallment = parseFloat(document.getElementById('amountPerInstallmentInput').value) || 0;
            totalToReceive = amountPerInstallment * installments;
            interestPercentage = loanedAmount > 0 ? ((totalToReceive - loanedAmount) / loanedAmount) * 100 : 0;
        } else {
            interestPercentage = parseFloat(document.getElementById('interestPercentageInput').value) || 0;
            totalToReceive = loanedAmount * (1 + interestPercentage / 100);
            amountPerInstallment = installments > 0 ? totalToReceive / installments : 0;
        }

        // 4. Montagem do objeto de dados
        const debtorData = {
            name: document.getElementById('debtorName').value,
            description: document.getElementById('debtorDescription').value,
            loanedAmount: loanedAmount,
            frequency: document.getElementById('frequency').value,
            installments: installments,
            interestPercentage: interestPercentage,
            amountPerInstallment: amountPerInstallment,
            totalToReceive: totalToReceive,
            startDate: document.getElementById('startDate').value,
            userId: currentUserId,
            
            // LÓGICA DE RENOVAÇÃO: Se renovar, limpa pagamentos. Se editar, mantém.
            payments: isRenewal ? [] : (oldData?.payments || []),
            
            // Gera novo acesso se for renovação ou cliente novo
            accessCode: (isRenewal || !currentDebtorId) 
                ? Math.random().toString(36).substring(2, 8).toUpperCase() 
                : (oldData?.accessCode || Math.random().toString(36).substring(2, 8).toUpperCase()),
                
            lastEdited: new Date().toISOString()
        };

        // 5. Operação no Firebase
        if (currentDebtorId) {
            await db.collection(DEBTORS_COLLECTION).doc(currentDebtorId).update(debtorData);
            alert(isRenewal ? "✅ Cliente RENOVADO! Histórico zerado para o novo ciclo." : "✅ Cliente atualizado com sucesso!");
        } else {
            await db.collection(DEBTORS_COLLECTION).add(debtorData);
            alert("✅ Cliente cadastrado com sucesso!");
        }
        
        // 6. Limpeza e finalização
        formElement.dataset.isRenewal = "false"; 
        closeModal('addEditDebtorModal');
        currentDebtorId = null; 

    } catch (err) {
        console.error("Erro ao salvar:", err);
        alert("Erro ao salvar os dados: " + err.message);
    }
}

// ========================================================
// 7. EVENTOS DE INICIALIZAÇÃO (LISTENERS)
// ========================================================
document.addEventListener('DOMContentLoaded', () => {
    
    // Listeners dos Filtros
const filterBtns = {
        'filterAllButton': 'all',
        'filterDailyButton': 'daily',
        'filterWeeklyButton': 'weekly',
        'filterMonthlyButton': 'monthly'
    };

    Object.keys(filterBtns).forEach(id => {
        const btn = document.getElementById(id);
        if (btn) {
            btn.onclick = () => {
                // Remove classe 'active' de todos e adiciona no clicado
                Object.keys(filterBtns).forEach(bId => {
                    const b = document.getElementById(bId);
                    if (b) b.classList.remove('active');
                });
                btn.classList.add('active');

                // Define o filtro e atualiza a lista
                currentFilter = filterBtns[id];
                renderDebtors(); // Chama a função que desenha os cards
            };
        }

        const themeBtn = document.getElementById('inlineThemeBtn');
    if (themeBtn) themeBtn.onclick = toggleTheme;

    // Listener do Formulário de Perfil
    const profileForm = document.getElementById('profileForm');
    if (profileForm) profileForm.onsubmit = handleProfileSubmit;

    // Carregar dados quando o Firebase estiver pronto
    auth.onAuthStateChanged(user => {
        if (user && window.location.pathname.includes('perfil.html')) {
            const nameInput = document.getElementById('profileName');
            const emailInput = document.getElementById('profileEmail');
            const avatar = document.getElementById('userAvatar');

            if (nameInput) nameInput.value = user.displayName || "";
            if (emailInput) emailInput.value = user.email;
            if (avatar && user.displayName) avatar.innerText = user.displayName.charAt(0).toUpperCase();
        }
    });
});

    // Alternância de Campos no Form
    const calcSelect = document.getElementById('calculationType');
    if (calcSelect) {
        calcSelect.onchange = () => {
            document.getElementById('perInstallmentFields').style.display = calcSelect.value === 'perInstallment' ? 'block' : 'none';
            document.getElementById('percentageFields').style.display = calcSelect.value === 'percentage' ? 'block' : 'none';
        };
    }

    // Formulário
    const form = document.getElementById('addEditDebtorForm');
    if (form) form.onsubmit = handleFormSubmit;

    // Abrir Modal
const addBtn = document.getElementById('addDebtorButton');

if (addBtn) {
    addBtn.onclick = () => {
        // 1. Limpa o ID para garantir que o sistema saiba que é um NOVO cadastro
        currentDebtorId = null; 

        // 2. Reseta todos os campos do formulário
        const form = document.getElementById('addEditDebtorForm');
        if (form) form.reset();

        // 3. Reseta o título do Modal
        document.getElementById('addEditModalTitle').innerText = "Adicionar Novo Devedor";

        // 4. Garante que os campos de cálculo voltem ao padrão (Parcela visível, Porcentagem oculta)
        const perInstallmentFields = document.getElementById('perInstallmentFields');
        const percentageFields = document.getElementById('percentageFields');
        
        if (perInstallmentFields) perInstallmentFields.style.display = 'block';
        if (percentageFields) percentageFields.style.display = 'none';

        // 5. Exibe o modal
        const modal = document.getElementById('addEditDebtorModal');
        if (modal) modal.style.display = 'flex';
    };
}

    // Sidebar e Logout
    const toggle = document.getElementById('toggleSidebar');
    if (toggle) toggle.onclick = () => document.getElementById('sidebar').classList.toggle('collapsed');

    const logout = document.getElementById('sidebarLogoutBtn');
    if (logout) logout.onclick = () => auth.signOut().then(() => window.location.href = 'index.html');
});

// ========================================================
// 8. FUNÇÕES AUXILIARES GLOBAIS
// ========================================================
function formatBRL(val) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
}

function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.style.display = 'none';
}

window.deleteDebtor = async (id) => {
    if (confirm("Deseja realmente excluir este cliente?")) {
        try { await db.collection(DEBTORS_COLLECTION).doc(id).delete(); }
        catch (e) { console.error(e); }
    }
};

function loadUserProfile() {
    const user = auth.currentUser;
    if (!user) return;
    const emailInput = document.getElementById('profileEmail');
    const nameInput = document.getElementById('profileName');
    if (emailInput) emailInput.value = user.email;
    if (nameInput) nameInput.value = user.displayName || "";
}

// --- FUNÇÃO GLOBAL PARA RENDERIZAR OS QUADRADINHOS (A que estava faltando) ---
window.renderPaymentsGrid = function(debtor) {
    const grid = document.getElementById('paymentsGrid');
    if (!grid) return;
    grid.innerHTML = '';

    const installments = parseInt(debtor.installments) || 0;
    const amountPerInstallment = parseFloat(debtor.amountPerInstallment) || 0;
    const payments = Array.isArray(debtor.payments) ? debtor.payments : [];

    // Cópia do array de pagamentos para processar um a um
    let poolPagamentos = payments.map(p => ({ ...p }));

    for (let i = 1; i <= installments; i++) {
        let totalPagoNestaParcela = 0;
        let historicoDatas = [];
        let restoNecessario = amountPerInstallment;

        // Distribui os pagamentos do histórico nesta parcela
        for (let j = 0; j < poolPagamentos.length; j++) {
            let p = poolPagamentos[j];
            if (p.amount > 0) {
                let valorUsado = Math.min(p.amount, restoNecessario);
                
                totalPagoNestaParcela += valorUsado;
                historicoDatas.push({
                    data: formatDate(p.date),
                    valor: valorUsado
                });
                
                p.amount -= valorUsado;
                restoNecessario -= valorUsado;
            }
            if (restoNecessario <= 0) break;
        }

        // Definição de Status e Visual
        let statusClass = 'pending';
        let statusTexto = 'Pendente';
        let detalheHTML = '';

        if (totalPagoNestaParcela >= amountPerInstallment - 0.01) {
            statusClass = 'paid';
            statusTexto = 'PAGO TOTAL';
        } else if (totalPagoNestaParcela > 0) {
            statusClass = 'partial';
            let falta = amountPerInstallment - totalPagoNestaParcela;
            statusTexto = `PAGO: R$ ${totalPagoNestaParcela.toFixed(2)}<br>FALTA: R$ ${falta.toFixed(2)}`;
        }

        // Monta o histórico de datas para aparecer no card
        if (historicoDatas.length > 0) {
            detalheHTML = `<div class="payment-history">` + 
                historicoDatas.map(h => `<span class="history-item">📅 ${h.data}: R$ ${h.valor.toFixed(2)}</span>`).join('') + 
                `</div>`;
        }

        const square = document.createElement('div');
        square.className = `payment-square ${statusClass}`;
        square.innerHTML = `
            <span>Parc. ${i}</span>
            <strong>R$ ${amountPerInstallment.toFixed(2)}</strong>
            <small class="status-info" style="display:block; margin:5px 0;">${statusTexto}</small>
            ${detalheHTML}
        `;

        grid.appendChild(square);
    }
};

// --- FUNÇÃO PARA ABRIR O MODAL DE PAGAMENTO ---
window.openPaymentModal = function(id) {
    currentDebtorId = id;
    const debtor = debtors.find(d => d.id === id);
    if (!debtor) return;

    const modalTitle = document.getElementById('modalDebtorName');
    if (modalTitle) modalTitle.textContent = debtor.name;

    window.renderPaymentsGrid(debtor);

    const modal = document.getElementById('debtorDetailModal');
    if (modal) modal.style.display = 'flex';

    const amountInput = document.getElementById('paymentAmount');
    if (amountInput) amountInput.value = debtor.amountPerInstallment.toFixed(2);

    const dateInput = document.getElementById('paymentDate');
    if (dateInput) {
        // SOLUÇÃO DEFINITIVA: Força o fuso horário de Brasília
        // O formato 'sv-SE' gera YYYY-MM-DD (exato para o input date)
        const dataBrasil = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
        dateInput.value = dataBrasil;
    }
};

// --- LOGICA DOS BOTÕES DENTRO DO MODAL (CORRIGIDO PARA ACEITAR DATA RETROATIVA) ---
document.addEventListener('DOMContentLoaded', () => {
    const addPaymentBtn = document.getElementById('addPaymentButton');
    if (addPaymentBtn) {
        addPaymentBtn.onclick = async () => {
            const amountInput = document.getElementById('paymentAmount');
            const dateInput = document.getElementById('paymentDate');
            
            const amount = parseFloat(amountInput.value);
            
            // PEGA A DATA DO INPUT (O que o usuário escolheu no calendário)
            let dataEscolhida = dateInput.value; 

            // Se por acaso o input estiver vazio, aí sim usamos a data de hoje como padrão
            if (!dataEscolhida) {
                dataEscolhida = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
            }

            const horaBrasilia = new Date().toLocaleTimeString('pt-BR', { 
                timeZone: 'America/Sao_Paulo', 
                hour: '2-digit', 
                minute: '2-digit' 
            });

            if (!amount) return alert("Preencha o valor!");

            try {
                const debtorRef = db.collection(DEBTORS_COLLECTION).doc(currentDebtorId);
                const doc = await debtorRef.get();
                const currentData = doc.data();
                
                let payments = Array.isArray(currentData.payments) ? currentData.payments : [];
                
                const newPayment = { 
                    amount: amount, 
                    date: dataEscolhida, // Agora usa a data que você selecionou no modal
                    time: horaBrasilia 
                };

                payments.push(newPayment);
                await debtorRef.update({ payments });

                const updatedDebtor = { ...currentData, id: currentDebtorId, payments };
                renderPaymentsGrid(updatedDebtor);

                amountInput.value = ""; 
                alert("Pagamento registrado para o dia: " + dataEscolhida.split('-').reverse().join('/'));

            } catch (e) {
                console.error("Erro:", e);
                alert("Erro ao salvar.");
            }
        };
    }
});
                            
// Helper para formatar data (garante que não dê erro se estiver fora do bloco)
function formatDate(dateStr) {
    if (!dateStr || dateStr === "-") return "-";
    
    // Se a data vier no formato YYYY-MM-DD (ex: 2025-12-31)
    const partes = dateStr.split('-');
    if (partes.length === 3) {
        const ano = partes[0];
        const mes = partes[1];
        const dia = partes[2];
        return `${dia}/${mes}/${ano}`; // Retorna 31/12/2025
    }
    return dateStr;
}

window.showAllInstallments = function(id) {
    const debtor = debtors.find(d => d.id === id);
    if (!debtor) return;

    // 1. Preenche o cabeçalho
    const printNome = document.getElementById('printNomeCliente');
    if (printNome) printNome.innerText = `Parcelas: ${debtor.name}`;

    const printStats = document.getElementById('printStats');
    if (printStats) {
        printStats.innerHTML = `
            <div style="display: flex; justify-content: space-between; flex-wrap: wrap; margin-bottom: 10px;">
                <span>Total: <strong>${formatBRL(debtor.totalToReceive)}</strong></span>
                <span>Plano: <strong>${debtor.installments}x de ${formatBRL(debtor.amountPerInstallment)}</strong></span>
            </div>
        `;
    }

    const grid = document.getElementById('printGrid');
    if (!grid) return;
    grid.innerHTML = '';

    const payments = Array.isArray(debtor.payments) ? debtor.payments : [];
    let totalPaid = payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);

    for (let i = 1; i <= debtor.installments; i++) {
        const expected = parseFloat(debtor.amountPerInstallment);
        let statusClass = 'pending';
        let statusText = 'Pendente';

        // Lógica de saldo para definir o status da parcela
        if (totalPaid >= expected - 0.01) {
            statusClass = 'paid';
            statusText = 'Paga';
            totalPaid -= expected;
        } else if (totalPaid > 0.01) {
            statusClass = 'partial';
            statusText = `Falta ${formatBRL(expected - totalPaid)}`;
            totalPaid = 0;
        }

        const square = document.createElement('div');
        square.className = `installment-square ${statusClass}`;
        
        square.innerHTML = `
            <h4>PARCELA ${i}</h4>
            <p>${formatBRL(expected)}</p>
            <span class="status-badge">${statusText}</span>
        `;
        grid.appendChild(square);
    }

    // 2. Abre o modal
    const modal = document.getElementById('modalVerParcelas');
    if (modal) modal.style.display = 'flex';
};

// Função para o visual de parcelas (Comprovante/Print)
window.showAllInstallments = function() {
    // A função que mandei na resposta anterior (fullscreen-modal)
    // Se você não a tiver completa, me avise que mando de novo.
    console.log("Abrindo comprovante de parcelas...");
    const debtor = debtors.find(d => d.id === currentDebtorId);
    if (debtor) {
        // ... (código da modal de print que enviamos antes)
    }
};

// Função para o botão Informações
window.openInfoModal = function(id) {
    alert("Função Informações em desenvolvimento para o cliente ID: " + id);
};

// Função para abrir o modal de pagamento (os quadradinhos de baixa)
window.openPaymentModal = function(id) {
    currentDebtorId = id;
    const debtor = debtors.find(d => d.id === id);
    if (!debtor) return;

    const modalTitle = document.getElementById('modalDebtorName');
    if (modalTitle) modalTitle.textContent = debtor.name;

    window.renderPaymentsGrid(debtor);

    const modal = document.getElementById('debtorDetailModal');
    if (modal) modal.style.display = 'flex';

    const amountInput = document.getElementById('paymentAmount');
    if (amountInput) amountInput.value = debtor.amountPerInstallment.toFixed(2);

    const dateInput = document.getElementById('paymentDate');
    if (dateInput) {
        // --- SOLUÇÃO DEFINITIVA ---
        // Intl.DateTimeFormat força o fuso de Brasília e entrega o formato YYYY-MM-DD
        const d = new Intl.DateTimeFormat('pt-BR', {
            timeZone: 'America/Sao_Paulo',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        }).formatToParts(new Date());

        const dataFormatada = `${d.find(p => p.type === 'year').value}-${d.find(p => p.type === 'month').value}-${d.find(p => p.type === 'day').value}`;
        
        dateInput.value = dataFormatada;
    }
};

window.showAllInstallments = function(id) {
    const debtor = debtors.find(d => d.id === id);
    if (!debtor) return;

    // Preenche o cabeçalho do modal
    document.getElementById('printNomeCliente').innerText = `Parcelas: ${debtor.name}`;
    document.getElementById('printStats').innerHTML = `
        <p>Total a Receber: <strong>R$ ${parseFloat(debtor.totalToReceive).toFixed(2)}</strong></p>
        <p>Valor da Parcela: <strong>${debtor.installments}x de R$ ${parseFloat(debtor.amountPerInstallment).toFixed(2)}</strong></p>
    `;

    const grid = document.getElementById('printGrid');
    grid.innerHTML = '';

    const payments = Array.isArray(debtor.payments) ? debtor.payments : [];
    let totalPaid = payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);

    for (let i = 1; i <= debtor.installments; i++) {
        const expected = parseFloat(debtor.amountPerInstallment);
        let statusClass = 'pending';
        let statusText = 'PENDENTE';

        if (totalPaid >= expected - 0.01) {
            statusClass = 'paid';
            statusText = 'PAGA';
            totalPaid -= expected;
        } else if (totalPaid > 0) {
            statusClass = 'partial';
            statusText = `FALTA R$ ${(expected - totalPaid).toFixed(2)}`;
            totalPaid = 0;
        }

        const square = document.createElement('div');
        square.className = `installment-square ${statusClass}`;
        square.style.cssText = "background:#222; padding:10px; border-radius:8px; border-left:5px solid #444; margin-bottom:10px;";
        
        // Aplica cores nas bordas
        if(statusClass === 'paid') square.style.borderLeftColor = "#2ecc71";
        if(statusClass === 'partial') square.style.borderLeftColor = "#f1c40f";
        if(statusClass === 'pending') square.style.borderLeftColor = "#e74c3c";

        square.innerHTML = `
            <h4 style="margin:0">Parc. ${i}</h4>
            <p style="margin:5px 0; font-size:14px;">R$ ${expected.toFixed(2)}</p>
            <span style="font-weight:bold; font-size:12px;">${statusText}</span>
        `;
        grid.appendChild(square);
    }

    // Mostra o modal
    document.getElementById('modalVerParcelas').style.display = 'flex';
};

window.openInfoModal = function(id) {
    const debtor = debtors.find(d => d.id === id);
    if (!debtor) return;

    // Cálculos de saldo
    const paid = (debtor.payments || []).reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
    const remaining = (parseFloat(debtor.totalToReceive) || 0) - paid;

    // Preenchimento dos campos
    document.getElementById('infoNomeCliente').innerText = debtor.name;
    document.getElementById('infoDescricao').innerText = debtor.description || "Nenhuma";
    document.getElementById('infoFrequencia').innerText = translateFrequency(debtor.frequency);
    document.getElementById('infoCodigo').innerText = debtor.accessCode || "Não gerado";
    
    document.getElementById('infoEmprestado').innerText = formatBRL(debtor.loanedAmount);
    document.getElementById('infoReceber').innerText = formatBRL(debtor.totalToReceive);
    document.getElementById('infoFalta').innerText = formatBRL(remaining);
    document.getElementById('infoJuros').innerText = (debtor.interestPercentage || 0).toFixed(2) + "%";
    
    document.getElementById('infoParcelas').innerText = debtor.installments + "x";
    document.getElementById('infoValorParcela').innerText = formatBRL(debtor.amountPerInstallment);
    document.getElementById('infoDataInicio').innerText = formatDate(debtor.startDate);

    // Abre o modal
    document.getElementById('modalInformacoes').style.display = 'flex';
};

// Funções auxiliares caso não as tenha:
function translateFrequency(freq) {
    const map = { 'daily': 'Diário', 'weekly': 'Semanal', 'monthly': 'Mensal' };
    return map[freq] || freq;
}

function formatDate(dateStr) {
    if(!dateStr) return "-";
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
}

window.editDebtor = function(id) {
    // 1. Define o ID do devedor atual para a edição
    currentDebtorId = id;
    const debtor = debtors.find(d => d.id === id);
    if (!debtor) return;

    // 2. Preenche os campos básicos do formulário
    document.getElementById('debtorName').value = debtor.name || '';
    document.getElementById('debtorDescription').value = debtor.description || '';
    document.getElementById('loanedAmount').value = debtor.loanedAmount || '';
    document.getElementById('frequency').value = debtor.frequency || 'daily';
    document.getElementById('installments').value = debtor.installments || '';
    document.getElementById('startDate').value = debtor.startDate || '';

    // 3. Lógica para o Tipo de Cálculo
    const calcType = document.getElementById('calculationType');
    // Se o devedor já tem interestPercentage salvo, assumimos que foi por porcentagem
    if (debtor.interestPercentage > 0 && !debtor.amountPerInstallmentManuallySet) {
        calcType.value = 'percentage';
        document.getElementById('interestPercentageInput').value = debtor.interestPercentage;
        document.getElementById('percentageFields').style.display = 'block';
        document.getElementById('perInstallmentFields').style.display = 'none';
    } else {
        calcType.value = 'perInstallment';
        document.getElementById('amountPerInstallmentInput').value = debtor.amountPerInstallment;
        document.getElementById('perInstallmentFields').style.display = 'block';
        document.getElementById('percentageFields').style.display = 'none';
    }

    // 4. Muda o título do modal e abre
    document.getElementById('addEditModalTitle').innerText = "Editar Devedor";
    document.getElementById('addEditDebtorModal').style.display = 'flex';
};

// ==========================================
// 1. CONTROLE DE TEMA (MODO CLARO/ESCURO)
// ==========================================
function toggleTheme() {
    const isLight = document.body.classList.toggle('light-theme');
    const theme = isLight ? 'light' : 'dark';
    localStorage.setItem('themePreference', theme);
    
    const btn = document.getElementById('inlineThemeBtn');
    if (btn) btn.innerText = isLight ? "Mudar para Escuro" : "Mudar para Claro";
}

(function initTheme() {
    const savedTheme = localStorage.getItem('themePreference');
    if (savedTheme === 'light') {
        document.body.classList.add('light-theme');
    }
})();

// ==========================================
// 2. ATUALIZAÇÃO DO PERFIL (SALVAMENTO LOCAL)
// ==========================================
async function handleProfileSubmit(e) {
    e.preventDefault();
    const user = auth.currentUser;
    const nameInput = document.getElementById('profileName');
    
    if (!nameInput) return;

    try {
        const newName = nameInput.value.trim();
        if (newName === "") return alert("Digite um nome válido.");

        // SALVA LOCALMENTE (Para evitar erro de permissão do Firebase)
        localStorage.setItem('userNameLocal', newName);

        // Opcional: Tenta atualizar apenas o nome na sessão do Firebase Auth (não gera erro de regra)
        if (user) {
            await user.updateProfile({ displayName: newName });
        }

        alert("Perfil atualizado localmente! 👋");
        
        // Atualiza o Avatar e Mensagens na tela imediatamente
        const avatar = document.getElementById('userAvatar');
        if (avatar) avatar.innerText = newName.charAt(0).toUpperCase();

        const welcomeMsg = document.getElementById('welcomeMessage');
        if (welcomeMsg) welcomeMsg.innerText = `Olá, ${newName}! 👋`;

    } catch (error) {
        console.error("Erro ao salvar perfil:", error);
        alert("Erro ao atualizar o nome.");
    }
}

// Vincula o formulário de perfil se ele existir na página
document.addEventListener('DOMContentLoaded', () => {
    const profileForm = document.getElementById('profileForm');
    if (profileForm) {
        profileForm.onsubmit = handleProfileSubmit;
        
        // Carrega o nome salvo ao abrir a página de perfil
        auth.onAuthStateChanged((user) => {
            if (user) {
                const nameInput = document.getElementById('profileName');
                const emailInput = document.getElementById('profileEmail');
                const avatar = document.getElementById('userAvatar');
                
                const savedName = localStorage.getItem('userNameLocal') || user.displayName || "";
                
                if (nameInput) nameInput.value = savedName;
                if (emailInput) emailInput.value = user.email;
                if (avatar && savedName) avatar.innerText = savedName.charAt(0).toUpperCase();
            }
        });
    }
});

// ==========================================
// 3. LÓGICA DE PARCELAS E PAGAMENTOS
// ==========================================
function translateFrequency(freq) {
    const map = { 'daily': 'Diário', 'weekly': 'Semanal', 'monthly': 'Mensal' };
    return map[freq] || freq;
}

function atualizarLayoutParcelas(debtor, tipo) {
    const totalParcelas = parseInt(debtor.installments) || 0;
    const valorCadaParcela = parseFloat(debtor.amountPerInstallment) || 0;
    
    // CORREÇÃO: Mantenha uma referência ao índice original antes de qualquer ordenação
    let pagamentosComIndice = [];
    if (debtor.payments && Array.isArray(debtor.payments)) {
        pagamentosComIndice = debtor.payments.map((p, index) => ({
            ...p,
            amount: parseFloat(p.amount) || 0,
            originalIndex: index // Guardamos a posição real no banco de dados
        }));
    }
    
    let htmlFinal = '';
    
    // Ordenamos apenas para exibição visual
    let pool = pagamentosComIndice.sort((a, b) => a.date.localeCompare(b.date));

    for (let i = 1; i <= totalParcelas; i++) {
        let pagoNestaParcela = 0;
        let listaDatasHTML = '';
        let aindaFaltaPagar = valorCadaParcela;

        for (let j = 0; j < pool.length; j++) {
            let p = pool[j];
            if (p.amount > 0) {
                let valorParaEstaParcela = Math.min(p.amount, aindaFaltaPagar);
                
                if (valorParaEstaParcela > 0) {
                    pagoNestaParcela += valorParaEstaParcela;
                    
                    let dataBr = "S/D";
                    if (p.date) {
                        const partes = p.date.split('-'); 
                        if (partes.length === 3) {
                            dataBr = `${partes[2]}/${partes[1]}/${partes[0]}`;
                        } else {
                            dataBr = p.date;
                        }
                    }

                    // CORREÇÃO NO ONCLICK: Agora passamos o originalIndex
                    listaDatasHTML += `
                        <div class="history-item" style="display:flex; justify-content:space-between; align-items:center; margin-top:2px;">
                            <span>📅 ${dataBr}: R$ ${valorParaEstaParcela.toFixed(2)}</span>
                            <button onclick="event.stopPropagation(); window.excluirPagamentoPorIndice('${debtor.id}', ${p.originalIndex})" 
                                    style="background:none; border:none; color:#ff4d4d; cursor:pointer; font-weight:bold; padding:0 5px; font-size:12px;">
                                ✕
                            </button>
                        </div>`;
                    
                    p.amount -= valorParaEstaParcela;
                    aindaFaltaPagar -= valorParaEstaParcela;
                }
            }
            if (aindaFaltaPagar <= 0) break;
        }

        let classeCor = 'pending';
        let textoStatus = 'Pendente';
        let avisoFalta = '';

        if (pagoNestaParcela >= valorCadaParcela - 0.01) {
            classeCor = 'paid';
            textoStatus = 'PAGO TOTAL';
        } else if (pagoNestaParcela > 0.01) {
            classeCor = 'partial';
            textoStatus = `PAGO: R$ ${pagoNestaParcela.toFixed(2)}`;
            avisoFalta = `<div style="font-weight:bold; color:red">FALTA: R$ ${aindaFaltaPagar.toFixed(2)}</div>`;
        }

        const classeItem = (tipo === 'gestao') ? 'payment-square' : 'installment-square';

        htmlFinal += `
            <div class="${classeItem} ${classeCor}" style="padding:10px; border-radius:8px; margin-bottom:5px;">
                <div style="font-size:0.7rem;">PARCELA ${i}</div>
                <div style="font-size:1rem; font-weight:bold">R$ ${valorCadaParcela.toFixed(2)}</div>
                <div style="font-size:0.7rem; font-weight:bold; margin-top:5px;">${textoStatus}</div>
                ${avisoFalta}
                <div class="payment-history" style="margin-top:5px; border-top:1px solid rgba(255,255,255,0.1); padding-top:3px;">
                    ${listaDatasHTML}
                </div>
            </div>`;
    }
    return htmlFinal;
}

window.renderPaymentsGrid = function(debtor) {
    const divCentral = document.getElementById('paymentsGrid');
    if (divCentral) divCentral.innerHTML = atualizarLayoutParcelas(debtor, 'gestao');
};

window.showAllInstallments = function(id) {
    const debtor = debtors.find(d => d.id === id);
    if (!debtor) return;
    const nomePrint = document.getElementById('printNomeCliente');
    if (nomePrint) nomePrint.innerText = "Cliente: " + debtor.name;
    const gridImpressao = document.getElementById('printGrid');
    if (gridImpressao) gridImpressao.innerHTML = atualizarLayoutParcelas(debtor, 'impressao');
    document.getElementById('modalVerParcelas').style.display = 'flex';
};

// ==========================================
// 4. SIDEBAR E INTERFACE
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const sidebar = document.getElementById('sidebar');
    const toggleBtn = document.getElementById('toggleSidebar');
    const overlay = document.getElementById('menuOverlay');

    if (toggleBtn && sidebar) {
        toggleBtn.onclick = (e) => {
            e.stopPropagation();
            if (window.innerWidth <= 768) {
                sidebar.classList.toggle('active');
                if (overlay) overlay.classList.toggle('active');
            } else {
                sidebar.classList.toggle('collapsed');
                const main = document.querySelector('.main-content');
                if (main) main.classList.toggle('expanded');
            }
        };
    }

    if (overlay) {
        overlay.onclick = () => {
            sidebar.classList.remove('active');
            overlay.classList.remove('active');
        };
    }

    // Fechar ao clicar fora (Mobile)
    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 768 && sidebar && sidebar.classList.contains('active')) {
            if (!sidebar.contains(e.target) && !toggleBtn.contains(e.target)) {
                sidebar.classList.remove('active');
                if (overlay) overlay.classList.remove('active');
            }
        }
    });
});

// ==========================================
// 5. LOGIN E RECUPERAÇÃO
// ==========================================
window.recoveryPassword = function() {
    const email = document.getElementById('loginEmail')?.value;
    if (!email) return alert("Digite seu e-mail no campo acima primeiro.");
    auth.sendPasswordResetEmail(email)
        .then(() => alert("E-mail de recuperação enviado!"))
        .catch(err => alert("Erro: " + err.message));
};

const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.onsubmit = async (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        try {
            await auth.signInWithEmailAndPassword(email, password);
            window.location.href = "inicio.html";
        } catch (error) {
            const errorMsg = document.getElementById('loginError');
            if (errorMsg) errorMsg.innerText = "E-mail ou senha incorretos.";
        }
    };
}

window.copiarTextoAcesso = function(codigo) {
    const linkSite = "https://portalrusso.moraes.fun/"; 
    const mensagem = `Olá! Acompanhe o status do seu empréstimo em nosso site:\n\n🔗 Acesse: ${linkSite}\n🔑 Seu Código de Acesso: *${codigo}*\n\nGuarde este código para futuras consultas!`;
    navigator.clipboard.writeText(mensagem).then(() => {
        alert("Texto de acesso copiado!");
    }).catch(err => {
        const tempInput = document.createElement("textarea");
        tempInput.value = mensagem;
        document.body.appendChild(tempInput);
        tempInput.select();
        document.execCommand("copy");
        document.body.removeChild(tempInput);
        alert("Texto de acesso copiado!");
    });
};

window.renewDebtor = function(id) {
    const debtor = debtors.find(d => d.id === id);
    if (!debtor) return;

    currentDebtorId = id; 
    
    // Preenche os campos do modal com os dados que o cliente JÁ TINHA
    document.getElementById('debtorName').value = debtor.name;
    document.getElementById('debtorDescription').value = debtor.description || '';
    document.getElementById('loanedAmount').value = debtor.loanedAmount;
    document.getElementById('installments').value = debtor.installments;
    document.getElementById('frequency').value = debtor.frequency;
    
    // Se o seu formulário tiver campos de juros, preencha também:
    if(document.getElementById('interestPercentageInput')) {
        document.getElementById('interestPercentageInput').value = debtor.interestPercentage || 0;
    }

    // Define a data de início para hoje
    const hoje = new Date().toISOString().split('T')[0];
    document.getElementById('startDate').value = hoje;

    document.getElementById('addEditModalTitle').innerText = "🔄 Renovar: " + debtor.name;
    document.getElementById('addEditDebtorModal').style.display = 'flex';

    // Ativa o modo renovação
    document.getElementById('addEditDebtorForm').dataset.isRenewal = "true";
};


// =============================

// Função para marcar o menu ativo automaticamente
function destacarMenuAtivo() {
    const path = window.location.pathname;
    const pagina = path.split("/").pop(); // Pega apenas o nome do arquivo (ex: perfil.html)

    // Remove a classe active de todos os links primeiro
    const links = document.querySelectorAll('.sidebar-nav ul li a, .mobile-nav .nav-item');
    links.forEach(link => link.classList.remove('active'));

    // Verifica qual página está aberta e adiciona a classe active
    links.forEach(link => {
        const href = link.getAttribute('href');
        if (pagina === href || (pagina === "" && href === "inicio.html")) {
            link.classList.add('active');
        }
    });
}

// Executa a função assim que a página carrega
window.addEventListener('DOMContentLoaded', destacarMenuAtivo);



window.excluirPagamentoPorIndice = async function(debtorId, index) {
    if (!confirm("⚠️ Deseja realmente remover este pagamento específico?")) return;

    try {
        const docRef = db.collection('debtors').doc(debtorId);
        const doc = await docRef.get();

        if (doc.exists) {
            const data = doc.data();
            let listaPagamentos = data.payments || [];

            // Remove apenas 1 item na posição 'index'
            listaPagamentos.splice(index, 1);

            // Atualiza o Firebase
            await docRef.update({
                payments: listaPagamentos
            });

            // Atualiza a tela na hora
            const debtorAtualizado = { ...data, id: debtorId, payments: listaPagamentos };
            const grid = document.getElementById('paymentsGrid');
            if (grid) {
                grid.innerHTML = atualizarLayoutParcelas(debtorAtualizado, 'gestao');
            }

            console.log("Pagamento removido com sucesso!");
        }
    } catch (error) {
        console.error("Erro ao excluir:", error);
        alert("Erro ao remover o pagamento.");
    }
};


