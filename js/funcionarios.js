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

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const db = firebase.firestore();
const auth = firebase.auth();

// CRIAR UM ALERT NA TELA PARA VER O ERRO (DEBUG)
const debugDiv = document.createElement('div');
debugDiv.style = "position:fixed; top:0; left:0; width:100%; background:red; color:white; z-index:9999; padding:10px; font-family:sans-serif; display:none;";
debugDiv.id = "debug-error";
document.body.prepend(debugDiv);

function mostrarErroNaTela(msg) {
    const div = document.getElementById('debug-error');
    div.style.display = 'block';
    div.innerHTML = "<strong>ERRO DETECTADO:</strong> " + msg;
}

// ========================================================
// 2. CONTROLE DE ACESSO COM DIAGNÓSTICO
// ========================================================
auth.onAuthStateChanged(user => {
    if (user) {
        console.log("✅ Usuário reconhecido:", user.email);
        currentUserId = user.uid;
        carregarPastas();
    } else {
        mostrarErroNaTela("O Firebase diz que você NÃO está logado. Redirecionando em 5 segundos...");
        setTimeout(() => {
            if (!auth.currentUser) {
                // window.location.href = "index.html"; // COMENTADO PARA VOCÊ VER O ERRO
            }
        }, 5000);
    }
}, error => {
    mostrarErroNaTela("Erro na Autenticação: " + error.message);
});

// MODIFIQUE A FUNÇÃO CARREGAR PASTAS PARA PEGAR ERROS DE PERMISSÃO
function carregarPastas() {
    if(!currentUserId) {
        mostrarErroNaTela("Tentou carregar pastas mas currentUserId está vazio!");
        return;
    }
    
    db.collection('lista_funcionarios')
        .where('userId', '==', currentUserId)
        .onSnapshot(snap => {
            console.log("Pastas carregadas com sucesso!");
            // ... (resto do seu código de renderizar os botões)
        }, error => {
            mostrarErroNaTela("Erro no Firestore (Regras): " + error.message);
        });
}
