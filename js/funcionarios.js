const firebaseConfig = {
    apiKey: "AIzaSyAEZVCbz39BiqTj5f129PcrVHxfS6OnzLc",
    authDomain: "gerenciadoremprestimos.firebaseapp.com",
    projectId: "gerenciadoremprestimos",
    storageBucket: "gerenciadoremprestimos.firebasestorage.app",
    messagingSenderId: "365277402196",
    appId: "1:365277402196:web:65016aa2dd316e718a89c1"
};

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

let currentUserId = null, currentFuncId = null, currentQuadradoId = null, idParaExcluirAposRenovar = null, repasses = [];
let filtroFreqAtual = 'todos'; // Variável para controlar o filtro

// Trava de Segurança para Servidor Online
auth.onAuthStateChanged(user => {
    if (user) {
        currentUserId = user.uid;
        carregarPastas();
    } else {
        setTimeout(() => { 
            if (!auth.currentUser) window.location.href = "index.html"; 
        }, 5000);
    }
});

function getHojeFormatado() {
    const hoje = new Date();
    const offset = hoje.getTimezoneOffset();
    const dataLocal = new Date(hoje.getTime() - (offset * 60 * 1000));
    return dataLocal.toISOString().split('T')[0];
}

window.salvarPerfilFuncionario = async function() {
    const nome = document.getElementById('novoNomeFunc').value.toUpperCase().trim();
    if (!nome) return alert("Digite um nome!");
    await db.collection('lista_funcionarios').add({ 
        nome, userId: currentUserId, createdAt: new Date().toISOString() 
    });
    document.getElementById('novoNomeFunc').value = '';
    closeModal('modalPerfilFunc');
};

function carregarPastas() {
    db.collection('lista_funcionarios').where('userId', '==', currentUserId).onSnapshot(snap => {
        const container = document.getElementById('listaNomesFuncionarios');
        if (!container) return; container.innerHTML = '';
        snap.forEach(doc => {
            const btn = document.createElement('button');
            btn.className = "button button-secondary";
            btn.style.margin = "5px"; btn.innerText = doc.data().nome;
            btn.onclick = () => {
                currentFuncId = doc.id;
                document.getElementById('dashboardFuncionario').style.display = 'block';
                document.getElementById('nomeFuncionarioSelecionado').innerText = "PASTA: " + doc.data().nome;
                setupRepassesListener();
            };
            container.appendChild(btn);
        });
    });
}

// NOVA FUNÇÃO PARA OS FILTROS
window.setFiltroFreq = function(freq, btn) {
    filtroFreqAtual = freq;
    document.querySelectorAll('.button-filter').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderRepasses(); // Re-renderiza aplicando o filtro
};

function setupRepassesListener() {
    db.collection('repasses_funcionarios').where('funcionarioId', '==', currentFuncId).onSnapshot(snap => {
        repasses = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderRepasses();
        if (currentQuadradoId && document.getElementById('debtorDetailModal').style.display === 'flex') {
            const r = repasses.find(x => x.id === currentQuadradoId);
            if (r) document.getElementById('paymentsGrid').innerHTML = atualizarLayoutParcelas(r);
        }
    });
}

function renderRepasses() {
    const list = document.getElementById('repassesList');
    if (!list) return;
    list.innerHTML = '';

    // FILTRAGEM ANTES DO LOOP
    const repassesExibidos = repasses.filter(d => {
        if (filtroFreqAtual === 'todos') return true;
        return d.frequency === filtroFreqAtual;
    });

    repassesExibidos.forEach(d => {
        const paid = (d.payments || []).reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
        const total = parseFloat(d.totalToReceive) || 0;
        const remaining = total - paid;
        const progress = total > 0 ? Math.min((paid / total) * 100, 100).toFixed(0) : 0;
        const isFinished = parseFloat(progress) >= 99.9;

        const dataFormatada = d.startDate ? d.startDate.split('-').reverse().join('/') : '--/--/----';
        
        const freqPt = {
            'daily': 'DIÁRIO',
            'weekly': 'SEMANAL',
            'monthly': 'MENSAL'
        }[d.frequency] || d.frequency;

        const card = document.createElement('div');
        card.className = 'debtor-card';
        card.innerHTML = `
            <div class="card-header">
                <h3>R$ ${parseFloat(d.loanedAmount).toFixed(2)}</h3>
                ${isFinished ? '<span class="status-badge status-paid">QUITADO</span>' : ''}
            </div>
            
            <div class="info-row">
                <span><i class="icon">📅</i> Início:</span>
                <strong>${dataFormatada}</strong>
            </div>
            <div class="info-row">
                <span><i class="icon">🔄</i> Freq:</span>
                <strong style="color: #2ecc71; font-weight: 800;">${freqPt}</strong>
            </div>
            <div class="info-row">
                <span><i class="icon">💰</i> Falta:</span>
                <strong style="color:${isFinished ? '#2ecc71' : '#e74c3c'}">R$ ${remaining.toFixed(2)}</strong>
            </div>

            <div class="progress-container">
                <div class="progress-bar" style="width: ${progress}%"></div>
            </div>
            <div style="text-align:right; font-size:11px; margin-top:5px; color:#aaa;">${progress}% Pago</div>

            <div class="card-footer-actions">
                ${isFinished ? 
                    `<button onclick="renewRepasse('${d.id}')" class="btn-action" style="background:#27ae60; flex:1;">🔄 Renovar</button>` : 
                    `<button onclick="openPaymentModal('${d.id}')" class="btn-action btn-pay">Adicionar Pagamento</button>`
                }
                <button onclick="editRepasse('${d.id}')" class="btn-action btn-edit">Editar</button>
                <button onclick="deleteRepasse('${d.id}')" class="btn-action btn-delete">Excluir</button>
            </div>
        `;
        list.appendChild(card);
    });
}

window.openAddModal = function() {
    currentQuadradoId = null; idParaExcluirAposRenovar = null;
    document.getElementById('addEditDebtorForm').reset();
    document.getElementById('startDate').value = getHojeFormatado();
    document.getElementById('addEditModalTitle').innerText = "Novo Repasse";
    document.getElementById('addEditDebtorModal').style.display = 'flex';
};

window.editRepasse = function(id) {
    currentQuadradoId = id; const d = repasses.find(r => r.id === id);
    document.getElementById('loanedAmount').value = d.loanedAmount;
    document.getElementById('installments').value = d.installments;
    document.getElementById('startDate').value = d.startDate;
    document.getElementById('addEditModalTitle').innerText = "Editar Repasse";
    document.getElementById('addEditDebtorModal').style.display = 'flex';
};

document.getElementById('addEditDebtorForm').onsubmit = async (e) => {
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
        funcionarioId: currentFuncId, loanedAmount, installments, totalToReceive, amountPerInstallment,
        frequency: document.getElementById('frequency').value, startDate: document.getElementById('startDate').value,
        userId: currentUserId, lastEdited: new Date().toISOString()
    };

    if (currentQuadradoId) {
        await db.collection('repasses_funcionarios').doc(currentQuadradoId).update(data);
    } else {
        if (idParaExcluirAposRenovar) await db.collection('repasses_funcionarios').doc(idParaExcluirAposRenovar).delete();
        data.payments = [];
        await db.collection('repasses_funcionarios').add(data);
    }
    closeModal('addEditDebtorModal');
};

window.openPaymentModal = function(id) {
    currentQuadradoId = id; const r = repasses.find(x => x.id === id);
    document.getElementById('paymentsGrid').innerHTML = atualizarLayoutParcelas(r);
    document.getElementById('paymentDate').value = getHojeFormatado();
    document.getElementById('paymentAmount').value = r.amountPerInstallment.toFixed(2);
    document.getElementById('debtorDetailModal').style.display = 'flex';
};

document.getElementById('addPaymentButton').onclick = async () => {
    const amount = parseFloat(document.getElementById('paymentAmount').value);
    const date = document.getElementById('paymentDate').value;
    if (!amount || !date) return alert("Preencha valor e data!");
    await db.collection('repasses_funcionarios').doc(currentQuadradoId).update({
        payments: firebase.firestore.FieldValue.arrayUnion({ amount, date, timestamp: new Date().toISOString() })
    });
    document.getElementById('paymentAmount').value = '';
};

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
    const r = repasses.find(item => item.id === id);
    if (!r) return;

    // 1. Prepara para criar um novo (limpa o ID atual e guarda o antigo para deletar depois)
    idParaExcluirAposRenovar = id; 
    currentQuadradoId = null;

    // 2. Preenche os campos básicos
    document.getElementById('loanedAmount').value = r.loanedAmount;
    document.getElementById('installments').value = r.installments;
    document.getElementById('frequency').value = r.frequency;
    document.getElementById('startDate').value = getHojeFormatado();

    // 3. Lógica para preencher o Tipo de Cálculo e os valores específicos
    // Se o totalToReceive dividido pelas parcelas for igual ao amountPerInstallment,
    // é provável que tenha sido definido por Valor por Parcela.
    if (r.amountPerInstallment && !r.interestPercentageInput) {
        document.getElementById('calculationType').value = 'perInstallment';
        document.getElementById('amountPerInstallmentInput').value = r.amountPerInstallment;
        document.getElementById('perInstallmentFields').style.display = 'block';
        document.getElementById('percentageFields').style.display = 'none';
    } else {
        document.getElementById('calculationType').value = 'percentage';
        // Se você salvou a porcentagem no banco, coloque aqui. 
        // Caso contrário, ele calcula a diferença.
        const jurosOrig = ((r.totalToReceive / r.loanedAmount) - 1) * 100;
        document.getElementById('interestPercentageInput').value = jurosOrig.toFixed(2);
        document.getElementById('perInstallmentFields').style.display = 'none';
        document.getElementById('percentageFields').style.display = 'block';
    }

    document.getElementById('addEditModalTitle').innerText = "Renovar Repasse";
    document.getElementById('addEditDebtorModal').style.display = 'flex';
};;

// Função para atualizar as estatísticas de repasse na Dashboard
function atualizarStatsRepasse() {
    // Usamos auth.onAuthStateChanged para garantir que o ID do usuário já carregou
    auth.onAuthStateChanged(user => {
        if (user) {
            db.collection('repasses_funcionarios')
              .where('userId', '==', user.uid)
              .onSnapshot(snap => {
                let qtdRepasses = 0;
                let totalEmprestado = 0;
                let totalReceber = 0;

                snap.forEach(doc => {
                    const data = doc.data();
                    qtdRepasses++;
                    totalEmprestado += parseFloat(data.loanedAmount || 0);
                    totalReceber += parseFloat(data.totalToReceive || 0);
                });

                // Seleciona os elementos no HTML
                const elQtd = document.getElementById('stat-repasse-qtd');
                const elLent = document.getElementById('stat-repasse-lent');
                const elLucro = document.getElementById('stat-repasse-lucro');

                // Só tenta atualizar se os elementos existirem na página atual
                if (elQtd) {
                    elQtd.innerText = qtdRepasses;
                    elLent.innerText = totalEmprestado.toLocaleString('pt-br', {style: 'currency', currency: 'BRL'});
                    elLucro.innerText = totalReceber.toLocaleString('pt-br', {style: 'currency', currency: 'BRL'});
                }
            }, error => {
                console.error("Erro no Snapshot de Repasses:", error);
            });
        }
    });
}

// Chama a função imediatamente para ela ficar "escutando" o banco de dados
atualizarStatsRepasse();
