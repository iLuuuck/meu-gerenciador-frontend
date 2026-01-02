// --- CONFIGURAÇÃO DO FIREBASE (EVITA DUPLICIDADE) ---
if (!firebase.apps.length) {
    const firebaseConfig = {
        apiKey: "AIzaSyAEZVCbz39BiqTj5f129PcrVHxfS6OnzLc",
        authDomain: "gerenciadoremprestimos.firebaseapp.com",
        projectId: "gerenciadoremprestimos",
        storageBucket: "gerenciadoremprestimos.firebasestorage.app",
        messagingSenderId: "365277402196",
        appId: "1:365277402196:web:65016aa2dd316e718a89c1"
    };
    firebase.initializeApp(firebaseConfig);
}

// Inicializa db e auth globalmente
if (typeof db === 'undefined') window.db = firebase.firestore();
if (typeof auth === 'undefined') window.auth = firebase.auth();

// Declaração de variáveis globais seguras
if (typeof currentUserId === 'undefined') window.currentUserId = null;
if (typeof currentFuncId === 'undefined') window.currentFuncId = null;
if (typeof currentQuadradoId === 'undefined') window.currentQuadradoId = null;
if (typeof idParaExcluirAposRenovar === 'undefined') window.idParaExcluirAposRenovar = null;
if (typeof repasses === 'undefined') window.repasses = [];
if (typeof filtroFreqAtual === 'undefined') window.filtroFreqAtual = 'todos';

// --- FUNÇÕES DE UTILIDADE E MODAIS ---
window.closeModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'none';
};

function getHojeFormatado() {
    const hoje = new Date();
    const offset = hoje.getTimezoneOffset();
    const dataLocal = new Date(hoje.getTime() - (offset * 60 * 1000));
    return dataLocal.toISOString().split('T')[0];
}

// --- CONTROLE DE ACESSO ---
auth.onAuthStateChanged(user => {
    if (user) {
        window.currentUserId = user.uid;
        if (document.getElementById('listaNomesFuncionarios')) carregarPastas();
    } else {
        setTimeout(() => { 
            if (!auth.currentUser && !window.location.href.includes("index.html")) {
                window.location.href = "index.html";
            }
        }, 5000);
    }
});

// --- GESTÃO DE PASTAS (FUNCIONÁRIOS) ---
window.salvarPerfilFuncionario = async function() {
    const nome = document.getElementById('novoNomeFunc').value.toUpperCase().trim();
    if (!nome) return alert("Digite um nome!");
    await db.collection('lista_funcionarios').add({ 
        nome, userId: window.currentUserId, createdAt: new Date().toISOString() 
    });
    document.getElementById('novoNomeFunc').value = '';
    window.closeModal('modalPerfilFunc');
};

function carregarPastas() {
    db.collection('lista_funcionarios').where('userId', '==', window.currentUserId).onSnapshot(snap => {
        const container = document.getElementById('listaNomesFuncionarios');
        if (!container) return;
        container.innerHTML = '';
        snap.forEach(doc => {
            const btn = document.createElement('button');
            btn.className = "button button-secondary";
            btn.style.margin = "5px"; btn.innerText = doc.data().nome;
            btn.onclick = () => {
                window.currentFuncId = doc.id;
                document.getElementById('dashboardFuncionario').style.display = 'block';
                document.getElementById('nomeFuncionarioSelecionado').innerText = "PASTA: " + doc.data().nome;
                setupRepassesListener();
            };
            container.appendChild(btn);
        });
    });
}

window.excluirPastaFuncionario = async function() {
    if (!window.currentFuncId) return;
    if (confirm("⚠️ ATENÇÃO: Isso excluirá esta PASTA e TODOS os repasses. Continuar?")) {
        try {
            const snapshot = await db.collection('repasses_funcionarios').where('funcionarioId', '==', window.currentFuncId).get();
            const batch = db.batch();
            snapshot.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
            await db.collection('lista_funcionarios').doc(window.currentFuncId).delete();
            document.getElementById('dashboardFuncionario').style.display = 'none';
            alert("Pasta excluída com sucesso!");
        } catch (e) { console.error(e); alert("Erro ao excluir pasta."); }
    }
};

// --- GESTÃO DE REPASSES (LOGICA E FILTROS) ---
window.setFiltroFreq = function(freq, btn) {
    window.filtroFreqAtual = freq;
    document.querySelectorAll('.button-filter').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderRepasses();
};

function setupRepassesListener() {
    db.collection('repasses_funcionarios').where('funcionarioId', '==', window.currentFuncId).onSnapshot(snap => {
        window.repasses = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderRepasses();
        if (window.currentQuadradoId && document.getElementById('debtorDetailModal').style.display === 'flex') {
            const r = window.repasses.find(x => x.id === window.currentQuadradoId);
            if (r) document.getElementById('paymentsGrid').innerHTML = atualizarLayoutParcelas(r);
        }
    });
}

function renderRepasses() {
    const list = document.getElementById('repassesList');
    if (!list) return;
    list.innerHTML = '';

    const repassesExibidos = window.repasses.filter(d => {
        if (window.filtroFreqAtual === 'todos') return true;
        return d.frequency === window.filtroFreqAtual;
    });

    repassesExibidos.forEach(d => {
        const paid = (d.payments || []).reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
        const total = parseFloat(d.totalToReceive) || 0;
        const remaining = total - paid;
        const progress = total > 0 ? Math.min((paid / total) * 100, 100).toFixed(0) : 0;
        const isFinished = parseFloat(progress) >= 99.9;
        const dataFormatada = d.startDate ? d.startDate.split('-').reverse().join('/') : '--/--/----';
        const freqPt = { 'daily': 'DIÁRIO', 'weekly': 'SEMANAL', 'monthly': 'MENSAL' }[d.frequency] || d.frequency;

        const card = document.createElement('div');
        card.className = 'debtor-card';
        card.innerHTML = `
            <div class="card-header">
                <h3>💰 Valor Emprestado: R$ ${parseFloat(d.loanedAmount).toFixed(2)}</h3>
                ${isFinished ? '<span class="status-badge status-paid">QUITADO</span>' : ''}
            </div>
            <div class="info-row"><span> 📅 Início:</span> <strong>${dataFormatada}</strong></div>
            <div class="info-row"><span> ⏱ Frequência:</span> <strong style="color: #2ecc71;">${freqPt}</strong></div>
            <div class="info-row"><span> 💵 Falta:</span> <strong style="color:${isFinished ? '#2ecc71' : '#e74c3c'}">R$ ${remaining.toFixed(2)}</strong></div>
            <div class="progress-container"><div class="progress-bar" style="width: ${progress}%"></div></div>
            <div class="card-footer-actions">
                ${isFinished ? 
                    `<button onclick="window.renewRepasse('${d.id}')" class="btn-action" style="background:#27ae60; flex:1;">🔄 Renovar</button>` : 
                    `<button onclick="window.openPaymentModal('${d.id}')" class="btn-action btn-pay">Pagar</button>`
                }
                <button onclick="window.editRepasse('${d.id}')" class="btn-action btn-edit">Editar</button>
                <button onclick="window.deleteRepasse('${d.id}')" class="btn-action btn-delete">Excluir</button>
            </div>
        `;
        list.appendChild(card);
    });
}

// --- MODAIS DE ADICIONAR / EDITAR / PAGAR ---
window.openAddModal = function() {
    window.currentQuadradoId = null; window.idParaExcluirAposRenovar = null;
    const form = document.getElementById('addEditDebtorForm');
    if(form) form.reset();
    document.getElementById('startDate').value = getHojeFormatado();
    document.getElementById('addEditModalTitle').innerText = "Novo Repasse";
    document.getElementById('addEditDebtorModal').style.display = 'flex';
    // ADICIONE ESTAS LINHAS AQUI:
    document.getElementById('percentageFields').style.display = 'block';
    document.getElementById('perInstallmentFields').style.display = 'none';
    document.getElementById('calculationType').value = 'percentage';
    
    document.getElementById('startDate').value = getHojeFormatado();
    document.getElementById('addEditModalTitle').innerText = "Novo Repasse";
    document.getElementById('addEditDebtorModal').style.display = 'flex';
};

// Função para alternar entre campos de Porcentagem ou Valor por Parcela
function gerenciarCamposCalculo() {
    const calcType = document.getElementById('calculationType');
    const divPercentage = document.getElementById('percentageFields');
    const divPerInstallment = document.getElementById('perInstallmentFields');

    if (calcType && divPercentage && divPerInstallment) {
        calcType.addEventListener('change', function() {
            if (this.value === 'percentage') {
                divPercentage.style.display = 'block';
                divPerInstallment.style.display = 'none';
            } else {
                divPercentage.style.display = 'none';
                divPerInstallment.style.display = 'block';
            }
        });
    }
}

// Chame essa função uma vez para ela começar a monitorar o Select
gerenciarCamposCalculo();

window.editRepasse = function(id) {
    window.currentQuadradoId = id; 
    const d = window.repasses.find(r => r.id === id);
    if (!d) return;
    document.getElementById('loanedAmount').value = d.loanedAmount;
    document.getElementById('installments').value = d.installments;
    document.getElementById('startDate').value = d.startDate;
    document.getElementById('frequency').value = d.frequency;
    document.getElementById('addEditModalTitle').innerText = "Editar Repasse";
    document.getElementById('addEditDebtorModal').style.display = 'flex';
};

window.deleteRepasse = async function(id) {
    if (confirm("Excluir este repasse permanentemente?")) {
        await db.collection('repasses_funcionarios').doc(id).delete();
    }
};

const formRepasse = document.getElementById('addEditDebtorForm');
if (formRepasse) {
    formRepasse.onsubmit = async (e) => {
        e.preventDefault();
        const loanedAmount = parseFloat(document.getElementById('loanedAmount').value);
        const installments = parseInt(document.getElementById('installments').value);
        const calcType = document.getElementById('calculationType').value;
        let totalToReceive, amountPerInstallment;

        if (calcType === 'perInstallment') {
            amountPerInstallment = parseFloat(document.getElementById('amountPerInstallmentInput').value);
            totalToReceive = amountPerInstallment * installments;
        } else {
            let juros = parseFloat(document.getElementById('interestPercentageInput').value) || 0;
            totalToReceive = loanedAmount * (1 + juros / 100);
            amountPerInstallment = totalToReceive / installments;
        }

        const data = {
            funcionarioId: window.currentFuncId, loanedAmount, installments, totalToReceive, amountPerInstallment,
            frequency: document.getElementById('frequency').value, startDate: document.getElementById('startDate').value,
            userId: window.currentUserId, lastEdited: new Date().toISOString()
        };

        if (window.currentQuadradoId) {
            await db.collection('repasses_funcionarios').doc(window.currentQuadradoId).update(data);
        } else {
            if (window.idParaExcluirAposRenovar) await db.collection('repasses_funcionarios').doc(window.idParaExcluirAposRenovar).delete();
            data.payments = [];
            await db.collection('repasses_funcionarios').add(data);
        }
        window.closeModal('addEditDebtorModal');
    };
}

window.openPaymentModal = function(id) {
    window.currentQuadradoId = id; 
    const r = window.repasses.find(x => x.id === id);
    if (!r) return;
    document.getElementById('paymentsGrid').innerHTML = atualizarLayoutParcelas(r);
    document.getElementById('paymentDate').value = getHojeFormatado();
    document.getElementById('paymentAmount').value = r.amountPerInstallment.toFixed(2);
    document.getElementById('debtorDetailModal').style.display = 'flex';
};

const payBtn = document.getElementById('addPaymentButton');
if (payBtn) {
    payBtn.onclick = async () => {
        const amount = parseFloat(document.getElementById('paymentAmount').value);
        const date = document.getElementById('paymentDate').value;
        if (!amount || !date) return alert("Preencha valor e data!");
        await db.collection('repasses_funcionarios').doc(window.currentQuadradoId).update({
            payments: firebase.firestore.FieldValue.arrayUnion({ amount, date, timestamp: new Date().toISOString() })
        });
        document.getElementById('paymentAmount').value = '';
    };
}

function atualizarLayoutParcelas(debtor) {
    const totalParc = parseInt(debtor.installments);
    const valParc = parseFloat(debtor.amountPerInstallment);
    let pool = (debtor.payments || []).map(p => ({ ...p, amount: parseFloat(p.amount) }));
    pool.sort((a, b) => a.date.localeCompare(b.date));
    let html = '';
    for (let i = 1; i <= totalParc; i++) {
        let pago = 0, falta = valParc, hist = '';
        for (let p of pool) {
            if (p.amount > 0 && falta > 0) {
                let u = Math.min(p.amount, falta);
                pago += u; p.amount -= u; falta -= u;
                hist += `<div style="font-size:0.65rem; color:#f1c40f;">📅${p.date.split('-').reverse().slice(0,2).join('/')}: R$${u.toFixed(0)}</div>`;
            }
        }
        let cor = pago >= valParc - 0.01 ? 'paid' : (pago > 0 ? 'partial' : 'pending');
        html += `<div class="payment-square ${cor}" onclick="document.getElementById('paymentAmount').value='${valParc.toFixed(2)}'">
            <small>Parc ${i}</small><strong>R$${valParc.toFixed(2)}</strong>
            <div class="hist">${hist}</div>
        </div>`;
    }
    return html;
}

window.renewRepasse = function(id) {
    const r = window.repasses.find(item => item.id === id);
    if (!r) return;
    window.idParaExcluirAposRenovar = id; window.currentQuadradoId = null;
    document.getElementById('loanedAmount').value = r.loanedAmount;
    document.getElementById('installments').value = r.installments;
    document.getElementById('frequency').value = r.frequency;
    document.getElementById('startDate').value = getHojeFormatado();

    if (r.amountPerInstallment && !r.interestPercentageInput) {
        document.getElementById('calculationType').value = 'perInstallment';
        document.getElementById('amountPerInstallmentInput').value = r.amountPerInstallment;
        document.getElementById('perInstallmentFields').style.display = 'block';
        document.getElementById('percentageFields').style.display = 'none';
    } else {
        document.getElementById('calculationType').value = 'percentage';
        const jurosOrig = ((r.totalToReceive / r.loanedAmount) - 1) * 100;
        document.getElementById('interestPercentageInput').value = jurosOrig.toFixed(2);
        document.getElementById('perInstallmentFields').style.display = 'none';
        document.getElementById('percentageFields').style.display = 'block';
    }
    document.getElementById('addEditModalTitle').innerText = "Renovar Repasse";
    document.getElementById('addEditDebtorModal').style.display = 'flex';
};

// --- SINCRONIZAÇÃO COM A DASHBOARD ---
function atualizarStatsRepasse() {
    auth.onAuthStateChanged(user => {
        if (user) {
            db.collection('repasses_funcionarios').where('userId', '==', user.uid).onSnapshot(snap => {
                let qtd = 0, lent = 0, total = 0;
                snap.forEach(doc => {
                    const data = doc.data();
                    qtd++;
                    lent += parseFloat(data.loanedAmount || 0);
                    total += parseFloat(data.totalToReceive || 0);
                });
                const elQtd = document.getElementById('stat-repasse-qtd');
                const elLent = document.getElementById('stat-repasse-lent');
                const elLucro = document.getElementById('stat-repasse-lucro');
                if (elQtd) {
                    elQtd.innerText = qtd;
                    elLent.innerText = lent.toLocaleString('pt-br', {style: 'currency', currency: 'BRL'});
                    elLucro.innerText = total.toLocaleString('pt-br', {style: 'currency', currency: 'BRL'});
                }
            });
        }
    });
}

atualizarStatsRepasse();
