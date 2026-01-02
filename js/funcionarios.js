// ========================================================
// 1. CONFIGURAÇÃO E INICIALIZAÇÃO
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

const EMPLOYEES_COLLECTION = 'lista_funcionarios';
const REPASSES_COLLECTION = 'repasses_funcionarios';

let currentUserId = null;
let currentFuncId = null;
let currentQuadradoId = null;
let idParaExcluirAposRenovar = null; 
let repasses = []; 

// Controle de Acesso - Trava de Segurança para não deslogar por lag
auth.onAuthStateChanged(user => {
    if (user) {
        currentUserId = user.uid;
        carregarPastas();
    } else {
        setTimeout(() => {
            if (!auth.currentUser) {
                window.location.href = "index.html";
            }
        }, 4000); // 4 segundos de tolerância
    }
});

function getHojeFormatado() {
    const hoje = new Date();
    const offset = hoje.getTimezoneOffset();
    const dataLocal = new Date(hoje.getTime() - (offset * 60 * 1000));
    return dataLocal.toISOString().split('T')[0];
}

// ========================================================
// 2. GESTÃO DE PERFIS (PASTAS)
// ========================================================
window.salvarPerfilFuncionario = async function() {
    const nome = document.getElementById('novoNomeFunc').value.toUpperCase();
    if (!nome) return alert("Digite um nome!");

    try {
        await db.collection(EMPLOYEES_COLLECTION).add({
            nome: nome,
            userId: currentUserId,
            createdAt: new Date().toISOString()
        });
        document.getElementById('novoNomeFunc').value = '';
        document.getElementById('modalPerfilFunc').style.display = 'none';
    } catch (e) {
        console.error("Erro ao criar perfil:", e);
    }
};

function carregarPastas() {
    db.collection(EMPLOYEES_COLLECTION)
        .where('userId', '==', currentUserId)
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
                    document.getElementById('nomeFuncionarioSelecionado').innerText = "PASTA: " + f.nome;
                    setupRepassesListener();
                };
                container.appendChild(btn);
            });
        });
}

// ========================================================
// 3. LÓGICA DE REPASSES (QUADRADOS)
// ========================================================
function setupRepassesListener() {
    db.collection(REPASSES_COLLECTION)
        .where('funcionarioId', '==', currentFuncId)
        .onSnapshot(snap => {
            repasses = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderRepasses();
            
            if (currentQuadradoId && document.getElementById('debtorDetailModal').style.display === 'flex') {
                const repasseAtivo = repasses.find(r => r.id === currentQuadradoId);
                if (repasseAtivo) {
                    document.getElementById('paymentsGrid').innerHTML = atualizarLayoutParcelas(repasseAtivo);
                }
            }
        });
}

function renderRepasses() {
    const list = document.getElementById('repassesList');
    if (!list) return;
    list.innerHTML = '';

    repasses.forEach(d => {
        const paid = (d.payments || []).reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
        const totalToReceive = parseFloat(d.totalToReceive) || 0;
        const remaining = totalToReceive - paid;
        const progress = totalToReceive > 0 ? Math.min((paid / totalToReceive) * 100, 100).toFixed(0) : 0;
        const isFinished = parseFloat(progress) >= 99.9;

        const card = document.createElement('div');
        card.className = 'debtor-card';
        
        let botoes = isFinished ? 
            `<button onclick="renewRepasse('${d.id}')" class="btn-action" style="background:#27ae60; flex:1;">🔄 Renovar</button>
             <button onclick="deleteRepasse('${d.id}')" class="btn-action btn-delete" style="flex:1;">Excluir</button>` :
            `<button onclick="openPaymentModal('${d.id}')" class="btn-action btn-pay">Baixar</button>
             <button onclick="editRepasse('${d.id}')" class="btn-action btn-edit">Editar</button>
             <button onclick="deleteRepasse('${d.id}')" class="btn-action btn-delete">Excluir</button>`;

        card.innerHTML = `
            <h3>R$ ${parseFloat(d.loanedAmount).toFixed(2)}</h3>
            <div class="info-row"><span>Falta:</span> <strong style="color:${isFinished ? '#2ecc71' : '#e74c3c'}">R$ ${remaining.toFixed(2)}</strong></div>
            <div class="progress-container"><div class="progress-bar" style="width: ${progress}%"></div></div>
            <div style="text-align:right; font-size:12px; margin-bottom:10px; color:#aaa;">${isFinished ? '✅ QUITADO' : progress + '% Pago'}</div>
            <div class="card-footer-actions">${botoes}</div>
        `;
        list.appendChild(card);
    });
}

// ========================================================
// 4. SALVAR / EDITAR / RENOVAR
// ========================================================
window.openAddModal = function() {
    currentQuadradoId = null;
    idParaExcluirAposRenovar = null;
    document.getElementById('addEditDebtorForm').reset();
    document.getElementById('startDate').value = getHojeFormatado();
    document.getElementById('addEditModalTitle').innerText = "Novo Repasse";
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
        funcionarioId: currentFuncId,
        loanedAmount, installments, totalToReceive, amountPerInstallment, interestPercentage,
        frequency: document.getElementById('frequency').value,
        startDate: document.getElementById('startDate').value,
        userId: currentUserId,
        lastEdited: new Date().toISOString()
    };

    try {
        if (currentQuadradoId) {
            await db.collection(REPASSES_COLLECTION).doc(currentQuadradoId).update(data);
        } else {
            data.payments = [];
            data.accessCode = Math.random().toString(36).substring(2, 8).toUpperCase();
            
            if (idParaExcluirAposRenovar) {
                await db.collection(REPASSES_COLLECTION).doc(idParaExcluirAposRenovar).delete();
                idParaExcluirAposRenovar = null;
            }
            await db.collection(REPASSES_COLLECTION).add(data);
        }
        closeModal('addEditDebtorModal');
    } catch (error) {
        console.error("Erro ao salvar:", error);
    }
};

window.renewRepasse = function(id) {
    const r = repasses.find(item => item.id === id);
    if (!r) return;
    currentQuadradoId = null; 
    idParaExcluirAposRenovar = id; 
    document.getElementById('loanedAmount').value = r.loanedAmount;
    document.getElementById('installments').value = r.installments;
    document.getElementById('frequency').value = r.frequency;
    document.getElementById('startDate').value = getHojeFormatado();
    document.getElementById('addEditModalTitle').innerText = "🔄 Renovar Repasse";
    document.getElementById('addEditDebtorModal').style.display = 'flex';
};

// ========================================================
// 5. PAGAMENTOS (BAIXAR) E LAYOUT COLORIDO
// ========================================================
window.openPaymentModal = function(id) {
    currentQuadradoId = id;
    const repasse = repasses.find(r => r.id === id);
    if (!repasse) return;
    document.getElementById('modalDebtorName').innerText = "Baixar Parcela";
    document.getElementById('paymentsGrid').innerHTML = atualizarLayoutParcelas(repasse);
    document.getElementById('paymentDate').value = getHojeFormatado();
    document.getElementById('paymentAmount').value = repasse.amountPerInstallment.toFixed(2);
    document.getElementById('debtorDetailModal').style.display = 'flex';
};

document.getElementById('addPaymentButton').onclick = async () => {
    const amount = parseFloat(document.getElementById('paymentAmount').value);
    const date = document.getElementById('paymentDate').value;
    if (!amount || !date) return alert("Preencha valor e data!");
    
    await db.collection(REPASSES_COLLECTION).doc(currentQuadradoId).update({
        payments: firebase.firestore.FieldValue.arrayUnion({ 
            amount, 
            date, 
            timestamp: new Date().toISOString() 
        })
    });
    document.getElementById('paymentAmount').value = ""; 
};

function atualizarLayoutParcelas(debtor) {
    const totalParcelas = parseInt(debtor.installments) || 0;
    const valorCadaParcela = parseFloat(debtor.amountPerInstallment) || 0;
    let pool = (debtor.payments || []).map(p => ({ ...p, amount: parseFloat(p.amount) }));
    pool.sort((a, b) => a.date.localeCompare(b.date));
    
    let htmlFinal = '';
    for (let i = 1; i <= totalParcelas; i++) {
        let pagoNestaParcela = 0;
        let aindaFaltaPagar = valorCadaParcela;
        let listaDatasHTML = '';
        
        for (let p of pool) {
            if (p.amount > 0 && aindaFaltaPagar > 0) {
                let valorUsado = Math.min(p.amount, aindaFaltaPagar);
                pagoNestaParcela += valorUsado;
                p.amount -= valorUsado;
                aindaFaltaPagar -= valorUsado;
                const dataBR = p.date.split('-').reverse().join('/');
                listaDatasHTML += `
                    <div style="font-size:0.7rem; color: #ffffff; margin-top: 2px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 2px;">
                        <span style="color: #f1c40f;">📅</span> ${dataBR}: <strong>R$ ${valorUsado.toFixed(2)}</strong>
                    </div>`;
            }
        }
        
        let classeCor = pagoNestaParcela >= valorCadaParcela - 0.01 ? 'paid' : (pagoNestaParcela > 0.01 ? 'partial' : 'pending');
        let statusTexto = classeCor === 'paid' ? 'PAGO' : (classeCor === 'partial' ? 'PARCIAL' : 'PENDENTE');

        htmlFinal += `
            <div class="payment-square ${classeCor}" onclick="document.getElementById('paymentAmount').value='${valorCadaParcela.toFixed(2)}'">
                <div style="font-size:0.75rem; font-weight: bold; text-transform: uppercase; opacity: 0.9;">Parcela ${i}</div>
                <div style="font-size:1.1rem; font-weight:bold; margin: 4px 0;">R$ ${valorCadaParcela.toFixed(2)}</div>
                <div style="font-size:0.7rem; font-weight:bold; letter-spacing: 1px;">${statusTexto}</div>
                <div class="payment-history" style="margin-top:8px; text-align: left;">${listaDatasHTML}</div>
            </div>`;
    }
    return htmlFinal;
}

// ========================================================
// 6. FUNÇÕES AUXILIARES
// ========================================================
window.editRepasse = function(id) {
    currentQuadradoId = id;
    idParaExcluirAposRenovar = null; 
    const d = repasses.find(r => r.id === id);
    document.getElementById('loanedAmount').value = d.loanedAmount;
    document.getElementById('installments').value = d.installments;
    document.getElementById('frequency').value = d.frequency;
    document.getElementById('startDate').value = d.startDate;
    document.getElementById('addEditModalTitle').innerText = "Editar Repasse";
    document.getElementById('addEditDebtorModal').style.display = 'flex';
};

window.deleteRepasse = async (id) => {
    if (confirm("Excluir permanentemente?")) await db.collection(REPASSES_COLLECTION).doc(id).delete();
};

window.closeModal = function(id) { 
    document.getElementById(id).style.display = 'none'; 
};

window.abrirModalNovoQuadrado = openAddModal;
