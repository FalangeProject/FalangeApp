const SUPABASE_URL = 'https://tqrrwbzgmknaeigcdubv.supabase.co';
const SUPABASE_KEY = 'sb_publishable__-UNsCCqqGv7ZXB0G_9RRA_7Cchr4c6';

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ====================== AUTH ======================

async function initAuthPage() {
  const { data: { session } } = await sb.auth.getSession();
  if (session) {
    window.location.href = 'dashboard.html';
    return;
  }

  let isLogin = true;
  const title = document.getElementById('authTitle');
  const btnAuth = document.getElementById('btnAuth');
  const btnToggle = document.getElementById('btnToggle');
  const message = document.getElementById('authMessage');

  btnToggle.addEventListener('click', function() {
    isLogin = !isLogin;
    title.textContent = isLogin ? 'Entrar' : 'Criar Conta';
    btnAuth.textContent = isLogin ? 'Entrar' : 'Criar Conta';
    btnToggle.textContent = isLogin ? 'Criar uma conta' : 'Já tenho conta';
    message.textContent = '';
  });

  btnAuth.addEventListener('click', async function() {
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    if (!email || !password) {
      message.textContent = 'Preencha e-mail e senha';
      return;
    }

    btnAuth.disabled = true;
    btnAuth.textContent = 'Aguarde...';

    let result;
    if (isLogin) {
      result = await sb.auth.signInWithPassword({ email: email, password: password });
    } else {
      result = await sb.auth.signUp({ email: email, password: password });
    }

    if (result.error) {
      message.textContent = result.error.message;
      btnAuth.disabled = false;
      btnAuth.textContent = isLogin ? 'Entrar' : 'Criar Conta';
      return;
    }

    window.location.href = 'dashboard.html';
  });
}

// ====================== DASHBOARD ======================

async function initDashboard() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) {
    window.location.href = 'index.html';
    return;
  }

  document.getElementById('btnLogout').addEventListener('click', async function() {
    await sb.auth.signOut();
    window.location.href = 'index.html';
  });

  const formLoja = document.getElementById('formLoja');
  const btnNovaLoja = document.getElementById('btnNovaLoja');

  btnNovaLoja.addEventListener('click', function() {
    formLoja.classList.remove('hidden');
    document.getElementById('nomeLoja').focus();
  });

  document.getElementById('btnCancelarLoja').addEventListener('click', function() {
    formLoja.classList.add('hidden');
  });

  document.getElementById('btnSalvarLoja').addEventListener('click', async function() {
    const nome = document.getElementById('nomeLoja').value.trim();
    if (!nome) {
      alert('Digite o nome da loja');
      return;
    }

    const { error } = await sb.from('lojas').insert({
      nome: nome,
      user_id: session.user.id
    });

    if (error) {
      alert('Erro ao criar loja: ' + error.message);
      return;
    }

    formLoja.classList.add('hidden');
    document.getElementById('nomeLoja').value = '';
    carregarLojas();
  });

  carregarLojas();
}

async function carregarLojas() {
  const { data, error } = await sb
    .from('lojas')
    .select('*')
    .order('created_at', { ascending: false });

  const lista = document.getElementById('listaLojas');
  const msg = document.getElementById('msgVazioLojas');

  if (error || !data || data.length === 0) {
    lista.innerHTML = '';
    msg.classList.remove('hidden');
    return;
  }

  msg.classList.add('hidden');

  let html = '';
  data.forEach(function(loja) {
    html += '<div class="loja-card">';
    html += '<a href="corredor.html?loja=' + loja.id + '&nome=' + encodeURIComponent(loja.nome) + '" class="loja-link">';
    html += '<div class="nome">' + loja.nome + '</div>';
    html += '</a>';
    html += '<button class="btn-delete-loja" onclick="removerLoja(\'' + loja.id + '\', \'' + loja.nome.replace(/'/g, "\\'") + '\')">🗑️</button>';
    html += '</div>';
  });

  lista.innerHTML = html;
}

async function removerLoja(id, nome) {
  if (!confirm('Tem certeza que deseja remover a loja "' + nome + '"?\n\nTodas as mercadorias dela também serão apagadas.')) {
    return;
  }

  const { error } = await sb.from('lojas').delete().eq('id', id);

  if (error) {
    alert('Erro ao remover loja: ' + error.message);
    return;
  }

  carregarLojas();
}

// ====================== CORREDOR ======================

let lojaId = null;
let nomeLoja = '';
let corredorAtual = null;
let editandoId = null;

async function initCorredorPage() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) {
    window.location.href = 'index.html';
    return;
  }

  const params = new URLSearchParams(window.location.search);
  lojaId = params.get('loja');
  nomeLoja = params.get('nome') || 'Loja';
  const corredorParam = params.get('corredor');

  if (!lojaId) {
    window.location.href = 'dashboard.html';
    return;
  }

  if (!corredorParam) {
    document.getElementById('tituloPagina').textContent = nomeLoja;
    document.getElementById('secaoCorredores').classList.remove('hidden');
    document.getElementById('secaoMercadorias').classList.add('hidden');
    renderCorredores();
    return;
  }

  corredorAtual = parseInt(corredorParam);
  document.getElementById('tituloPagina').textContent = nomeLoja + ' - Corredor ' + corredorAtual;
  document.getElementById('secaoCorredores').classList.add('hidden');
  document.getElementById('secaoMercadorias').classList.remove('hidden');

  renderLista();
  setupFormulario();
}

async function renderCorredores() {
  const container = document.getElementById('corredoresGrupos');
  if (!container) return;

  const { data } = await sb
    .from('mercadorias')
    .select('corredor')
    .eq('loja_id', lojaId);

  const corredoresComItens = {};
  if (data) {
    data.forEach(function(item) {
      corredoresComItens[item.corredor] = true;
    });
  }

  let html = '';
  for (let inicio = 1; inicio <=
