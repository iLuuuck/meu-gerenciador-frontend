// ========================================================
// 1. CONFIGURAÇÃO FIREBASE
// ========================================================
const firebaseConfig = {
    apiKey: "AIzaSyAEZVCbz39BiqTj5f129PcrVHxfS6OnzLc",
    authDomain: "gerenciadoremprestimos.firebaseapp.com",
    projectId: "gerenciadoremprestimos",
    storageBucket: "gerenciadoremprestimos.firebasestorage.app",
    messagingSenderId: "365277402196",
    appId: "1:365277402196:web:65016aa2dd316e718a89c1"
};

// Inicializa o Firebase com verificação
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const db = firebase.firestore();
const auth = firebase.auth();

const EMPLOYEES_COLLECTION = 'lista_funcionarios';
const REPASSES_COLLECTION = 'repasses_funcionarios';

let currentFuncId = null;
let currentUserId = null;
let currentQuadradoId = null;
let idParaExcluirAposRenovar = null; 
let repasses = []; 

// ========================================================
// 2. CONTROLE DE ACESSO (TRAVA DEFINITIVA)
// ========================================================

// Removi o redirecionamento imediato. 
// O sistema agora vai esperar o tempo que for preciso para validar o login.
auth.onAuthStateChanged(user => {
    if (user) {
        console.log("✅ LOGIN CONFIRMADO:", user.email);
        currentUserId = user.uid;
        carregarPastas();
    } else {
        console.warn("⏳ Aguardando Firebase validar sessão...");
        
        // SÓ VAI REDIRECIONAR SE VOCÊ CLICAR EM ALGO E NÃO ESTIVER LOGADO
        // Ou após 10 segundos de espera (tempo de sobra para qualquer internet)
        setTimeout(() => {
            if (!auth.currentUser) {
                console.error("❌ Sessão não encontrada após 10s");
                // window.location.href = "index.html"; // Mantenha comentado para testar
            }
        }, 10000);
    }
});

// ========================================================
// 3. GESTÃO DE PASTAS
// ========================================================
function carregarPastas() {
    if(!currentUserId) return;
    
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
                    document.getElementById('nomeFuncionarioSelecionado').innerText = "REPASSE: " + f.nome;
                    setupRepassesListener();
                };
                container.appendChild(btn);
            });
        }, error => {
            console.error("Erro ao carregar pastas:", error);
        });
}

// ... (Mantenha o resto das funções: renderRepasses, renewRepasse, etc., que você já tem)

// FUNÇÃO AUXILIAR DATA
function getHojeFormatado() {
    const hoje = new Date();
    const offset = hoje.getTimezoneOffset();
    const dataLocal = new Date(hoje.getTime() - (offset * 60 * 1000));
    return dataLocal.toISOString().split('T')[0];
}

function setupRepassesListener() {
    if (!currentFuncId) return;
    db.collection(REPASSES_COLLECTION)
        .where('funcionarioId', '==', currentFuncId)
        .onSnapshot(snap => {
            repasses = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderRepasses();
        });
}

function renderRepasses() {
    const list = document.getElementById('repassesList');
    if (!list) return;
    list.innerHTML = '';
    repasses.forEach(d => {
        const paid = (d.payments || []).reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
        const totalToReceive = parseFloat(d.totalToReceive) || 0;
        const progress = totalToReceive > 0 ? Math.min((paid / totalToReceive) * 100, 100).toFixed(0) : 0;
        const isFinished = parseFloat(progress) >= 99.9;

        const card = document.createElement('div');
        card.className = 'debtor-card';
        card.innerHTML = `
            <h3>R$ ${parseFloat(d.loanedAmount).toFixed(2)}</h3>
            <div class="progress-container"><div class="progress-bar" style="width: ${progress}%"></div></div>
            <div style="text-align:right; font-size:12px; margin-bottom:10px; color:#aaa;">${isFinished ? '✅ QUITADO' : progress + '% Pago'}</div>
            <div class="card-footer-actions">
                ${isFinished ? 
                    `<button onclick="renewRepasse('${d.id}')" class="btn-action" style="background:#27ae60; flex:1;">🔄 Renovar</button>` : 
                    `<button onclick="openPaymentModal('${d.id}')" class="btn-action btn-pay">Baixar</button>`
                }
                <button onclick="deleteRepasse('${d.id}')" class="btn-action btn-delete">Excluir</button>
            </div>
        `;
        list.appendChild(card);
    });
}

// FUNÇÕES DO MODAL (RENOVAR / SALVAR)
window.openAddModal = function() {
    currentQuadradoId = null;
    idParaExcluirAposRenovar = null;
    document.getElementById('addEditDebtorForm').reset();
    document.getElementById('startDate').value = getHojeFormatado();
    document.getElementById('addEditDebtorModal').style.display = 'flex';
};

document.getElementById('addEditDebtorForm').onsubmit = async (e) => {
    e.preventDefault();
    const data = {
        funcionarioId: currentFuncId,
        loanedAmount: parseFloat(document.getElementById('loanedAmount').value),
        installments: parseInt(document.getElementById('installments').value),
        totalToReceive: parseFloat(document.getElementById('loanedAmount').value), // Simplificado para teste
        frequency: document.getElementById('frequency').value,
        startDate: document.getElementById('startDate').value,
        userId: currentUserId,
        lastEdited: new Date().toISOString()
    };

    if (idParaExcluirAposRenovar) {
        await db.collection(REPASSES_COLLECTION).doc(idParaExcluirAposRenovar).delete();
        idParaExcluirAposRenovar = null;
    }
    await db.collection(REPASSES_COLLECTION).add(data);
    document.getElementById('addEditDebtorModal').style.display = 'none';
};

window.renewRepasse = function(id) {
    const r = repasses.find(item => item.id === id);
    idParaExcluirAposRenovar = id; 
    currentQuadradoId = null;
    document.getElementById('loanedAmount').value = r.loanedAmount;
    document.getElementById('startDate').value = getHojeFormatado();
    document.getElementById('addEditDebtorModal').style.display = 'flex';
};

function closeModal(id) { document.getElementById(id).style.display = 'none'; }
window.abrirModalNovoQuadrado = openAddModal;
