// ========================================================
// 1. INICIALIZAÇÃO BLINDADA
// ========================================================
const firebaseConfig = {
    apiKey: "AIzaSyAEZVCbz39BiqTj5f129PcrVHxfS6OnzLc",
    authDomain: "gerenciadoremprestimos.firebaseapp.com",
    projectId: "gerenciadoremprestimos",
    storageBucket: "gerenciadoremprestimos.firebasestorage.app",
    messagingSenderId: "365277402196",
    appId: "1:365277402196:web:65016aa2dd316e718a89c1"
};

if (!firebase.apps.length) { firebase.initializeApp(firebaseConfig); }
const db = firebase.firestore();
const auth = firebase.auth();

const EMPLOYEES_COLLECTION = 'lista_funcionarios';
const REPASSES_COLLECTION = 'repasses_funcionarios';

let currentUserId = null;
let currentFuncId = null;
let currentQuadradoId = null;
let idParaExcluirAposRenovar = null; 
let repasses = []; 

// ========================================================
// 2. CONTROLE DE ACESSO (O SEGREDO DA SOLUÇÃO)
// ========================================================
auth.onAuthStateChanged(user => {
    if (user) {
        console.log("✅ Sistema Pronto: " + user.email);
        currentUserId = user.uid;
        carregarPastas();
    } else {
        console.warn("⏳ Aguardando validação de segurança...");
        // Em vez de sair direto, esperamos 5 segundos. 
        // Se após 5s o Firebase não confirmar o login, aí sim redireciona.
        setTimeout(() => {
            if (!auth.currentUser) {
                console.log("❌ Acesso Negado. Retornando ao login.");
                window.location.href = "index.html";
            }
        }, 5000); 
    }
});

// ========================================================
// 3. TODAS AS FUNÇÕES (PASTAS, REPASSES, CÁLCULOS)
// ========================================================

function getHojeFormatado() {
    const hoje = new Date();
    const offset = hoje.getTimezoneOffset();
    const dataLocal = new Date(hoje.getTime() - (offset * 60 * 1000));
    return dataLocal.toISOString().split('T')[0];
}

window.salvarPerfilFuncionario = async function() {
    const nome = document.getElementById('novoNomeFunc').value.toUpperCase();
    if (!nome) return alert("Digite um nome!");
    try {
        await db.collection(EMPLOYEES_COLLECTION).add({
            nome: nome, userId: currentUserId, createdAt: new Date().toISOString()
        });
        document.getElementById('novoNomeFunc').value = '';
        document.getElementById('modalPerfilFunc').style.display = 'none';
    } catch (e) { alert("Erro ao criar perfil."); }
};

function carregarPastas() {
    db.collection(EMPLOYEES_COLLECTION).where('userId', '==', currentUserId)
        .onSnapshot(snap => {
            const container = document.getElementById('listaNomesFuncionarios');
            if (!container) return;
            container.innerHTML = '';
            snap.forEach(doc => {
                const f = doc.data();
                const btn = document.createElement('button');
                btn.className = "button button-secondary";
                btn.style.margin = "5px";
                btn.innerText = f.nome;
                btn.onclick = () => {
                    currentFuncId = doc.id;
                    document.getElementById('dashboardFuncionario').style.display = 'block';
                    document.getElementById('nomeFuncionarioSelecionado').innerText = "REPASSE: " + f.nome;
                    setupRepassesListener();
                };
                container.appendChild(btn);
            });
        });
}

function setupRepassesListener() {
    db.collection(REPASSES_COLLECTION).where('funcionarioId', '==', currentFuncId)
        .onSnapshot(snap => {
            repasses = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderRepasses();
            if (currentQuadradoId && document.getElementById('debtorDetailModal').style.display === 'flex') {
                const rAct = repasses.find(r => r.id === currentQuadradoId);
                if (rAct) document.getElementById('paymentsGrid').innerHTML = atualizarLayoutParcelas(rAct);
            }
        });
}

function renderRepasses() {
    const list = document.getElementById('repassesList');
    if (!list) return;
    list.innerHTML = '';
    repasses.forEach(d => {
        const paid = (d.payments || []).reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
        const total = parseFloat(d.totalToReceive) || 0;
        const remaining = total - paid;
        const progress = total > 0 ? Math.min((paid / total) * 100, 100).toFixed(0) : 0;
        const isFinished = parseFloat(progress) >= 99.9;

        const card = document.createElement('div');
        card.className = 'debtor-card';
        card.innerHTML = `
            <h3>R$ ${parseFloat(d.loanedAmount).toFixed(2)}</h3>
            <div class="info-row"><span>Falta:</span> <strong style="color:${isFinished ? '#2ecc71' : '#e74c3c'}">R$ ${remaining.toFixed(2)}</strong></div>
            <div class="progress-container"><div class="progress-bar" style="width: ${progress}%"></div></div>
            <div style="text-align:right; font-size:11px; margin-bottom:10px; color:#aaa;">${isFinished ? '✅ QUITADO' : progress + '% Pago'}</div>
            <div class="card-footer-actions">
                ${isFinished ? `<button onclick="renewRepasse('${d.id}')" class="btn-action" style="background:#27ae60; flex:1;">🔄 Renovar</button>` : `<button onclick="openPaymentModal('${d.id}')" class="btn-action btn-pay">Baixar</button>`}
                <button onclick="editRepasse('${d.id}')" class="btn-action btn-edit">📝</button>
                <button onclick="deleteRepasse('${d.id}')" class="btn-action btn-delete">🗑️</button>
            </div>
        `;
        list.appendChild(card);
    });
}

window.openAddModal = function() {
    currentQuadradoId = null; idParaExcluirAposRenovar = null;
    document.getElementById('addEditDebtorForm').reset();
    document.getElementById('startDate').value = getHojeFormatado();
    document.getElementById('addEditDebtorModal').style.display = 'flex';
};

document.getElementById('addEditDebtorForm').onsubmit = async (e) => {
    e.preventDefault();
    const loanedAmount = parseFloat(document.getElementById('loanedAmount').value);
    const installments = parseInt(document.getElementById('installments').value);
    const calcType = document.getElementById('calculationType').value;
    let totalToReceive, amountPerInstallment, interestPercentage;

    if (calcType === 'perInstallment') {
        amountPerInstallment = parseFloat(document.getElementById('amountPerInstallmentInput').value);
        totalToReceive = amountPerInstallment * installments;
        interestPercentage = ((totalToReceive - loanedAmount) / loanedAmount) * 100;
    } else {
        interestPercentage = parseFloat(document.getElementById('interestPercentageInput').value) || 0;
        totalToReceive = loanedAmount * (1 + interestPercentage / 100);
        amountPerInstallment = totalToReceive / installments;
    }

    const data = {
        funcionarioId: currentFuncId, loanedAmount, installments, totalToReceive, amountPerInstallment, interestPercentage,
        frequency: document.getElementById('frequency').value, startDate: document.getElementById('startDate').value,
        userId: currentUserId, lastEdited: new Date().toISOString()
    };

    if (currentQuadradoId) {
        await db.collection(REPASSES_COLLECTION).doc(currentQuadradoId).update(data);
    } else {
        data.payments = [];
        if (idParaExcluirAposRenovar) { await db.collection(REPASSES_COLLECTION).doc(idParaExcluirAposRenovar).delete(); }
        await db.collection(REPASSES_COLLECTION).add(data);
    }
    closeModal('addEditDebtorModal');
};

window.renewRepasse = function(id) {
    const r = repasses.find(item => item.id === id);
    idParaExcluirAposRenovar = id; currentQuadradoId = null;
    document.getElementById('loanedAmount').value = r.loanedAmount;
    document.getElementById('installments').value = r.installments;
    document.getElementById('startDate').value = getHojeFormatado();
    document.getElementById('addEditDebtorModal').style.display = 'flex';
};

window.openPaymentModal = function(id) {
    currentQuadradoId = id;
    const repasse = repasses.find(r => r.id === id);
    document.getElementById('paymentsGrid').innerHTML = atualizarLayoutParcelas(repasse);
    document.getElementById('paymentDate').value = getHojeFormatado();
    document.getElementById('paymentAmount').value = repasse.amountPerInstallment.toFixed(2);
    document.getElementById('debtorDetailModal').style.display = 'flex';
};

document.getElementById('addPaymentButton').onclick = async () => {
    const amount = parseFloat(document.getElementById('paymentAmount').value);
    const date = document.getElementById('paymentDate').value;
    if (!amount || !date) return alert("Preencha tudo!");
    await db.collection(REPASSES_COLLECTION).doc(currentQuadradoId).update({
        payments: firebase.firestore.FieldValue.arrayUnion({ amount, date, timestamp: new Date().toISOString() })
    });
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
                hist += `<div style="font-size:0.65rem; color:#fff;">📅 ${p.date.split('-').reverse().join('/')}: R$ ${u.toFixed(2)}</div>`;
            }
        }
        let cor = pago >= valParc - 0.01 ? 'paid' : (pago > 0 ? 'partial' : 'pending');
        html += `<div class="payment-square ${cor}" onclick="document.getElementById('paymentAmount').value='${valParc.toFixed(2)}'">
            <div style="font-size:0.7rem;">Parc ${i}</div>
            <div style="font-weight:bold;">R$ ${valParc.toFixed(2)}</div>
            <div style="margin-top:5px;">${hist}</div>
        </div>`;
    }
    return html;
}

window.editRepasse = function(id) {
    currentQuadradoId = id; const d = repasses.find(r => r.id === id);
    document.getElementById('loanedAmount').value = d.loanedAmount;
    document.getElementById('installments').value = d.installments;
    document.getElementById('startDate').value = d.startDate;
    document.getElementById('addEditDebtorModal').style.display = 'flex';
};

window.deleteRepasse = async (id) => { if(confirm("Excluir?")) await db.collection(REPASSES_COLLECTION).doc(id).delete(); };
window.closeModal = (id) => { document.getElementById(id).style.display = 'none'; };
