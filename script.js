const SUPABASE_URL = 'https://tqrrwbzgmknaeigcdubv.supabase.co';
const SUPABASE_KEY = 'sb_publishable__-UNsCCqqGv7ZXB0G_9RRA_7Cchr4c6';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ====================== AUTH ======================

async function initAuthPage() {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    window.location.href = 'dashboard.html';
    return;
  }

  let isLogin = true;
  const title = document.getElementById('authTitle');
  const btnAuth = document.getElementById('btnAuth');
  const btnToggle = document.getElementById('btnToggle');
  const message = document.getElementById('authMessage');

  btnToggle.addEventListener('click', () => {
    isLogin = !isLogin;
    title.textContent = isLogin ? 'Entrar' : 'Criar Conta';
    btnAuth.textContent = isLogin ? 'Entrar' : 'Criar Conta';
    btnToggle.textContent = isLogin ? 'Criar uma conta' : 'Já tenho conta';
    message.textContent = '';
  });

  btnAuth.addEventListener('click', async () => {
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
      result = await supabase.auth.signInWithPassword({ email, password });
    } else {
      result = await supabase.auth.signUp({ email, password });
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
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    window.location.href = 'index.html';
    return;
  }

  document.getElementById('btnLogout').addEventListener('click', async () => {
    await supabase.auth.signOut();
    window.location.href = 'index.html';
  });

  const formLoja = document.getElementById('formLoja');
  const btnNovaLoja = document.getElementById('btnNovaLoja');

  btnNovaLoja.addEventListener('click', () => {
    formLoja.classList.remove('hidden');
    document.getElementById('nomeLoja').focus();
  });

  document.getElementById('btnCancelarLoja').addEventListener('click', () => {
    formLoja.classList.add('hidden');
  });

  document.getElementById('btnSalvarLoja').addEventListener('click', async () => {
    const nome = document.getElementById('nomeLoja').value.trim();
    if (!nome) return alert('Digite o nome da loja');

    const { error } = await supabase.from('lojas').insert({
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
  const { data, error } = await supabase
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
  lista.innerHTML = data.map(loja => `
    <a href="corredor.html?loja=${loja.id}&nome=${encodeURIComponent(loja.nome)}" class="loja-card">
      <div class="nome">${loja.nome}</div>
      <div class="seta">→</div>
    </a>
  `).join('');
}

// ====================== CORREDOR ======================

let lojaId = null;
let corredorAtual = null;
let editandoId = null;

async function initCorredorPage() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    window.location.href = 'index.html';
    return;
  }

  const params = new URLSearchParams(window.location.search);
  lojaId = params.get('loja');
  const nomeLoja = params.get('nome') || 'Loja';

  if (!lojaId) {
    window.location.href = 'dashboard.html';
    return;
  }

  // Por enquanto vamos direto para o corredor 1 (depois melhoramos a navegação)
  corredorAtual = 1;
  document.getElementById('tituloCorredor').textContent = nomeLoja + ' - Corredor 1';

  renderLista();
  setupFormulario();
}

async function renderLista() {
  const { data, error } = await supabase
    .from('mercadorias')
    .select('*')
    .eq('loja_id', lojaId)
    .eq('corredor', corredorAtual)
    .order('nome');

  const container = document.getElementById('listaMercadorias');
  const msgVazio = document.getElementById('msgVazio');

  if (error || !data || data.length === 0) {
    container.innerHTML = '';
    msgVazio.classList.remove('hidden');
    return;
  }

  msgVazio.classList.add('hidden');
  container.innerHTML = data.map(item => `
    <div class="item-card">
      <div class="info">
        <div class="nome">${item.nome}</div>
        <div class="qtd">${item.quantidade} palete${item.quantidade > 1 ? 's' : ''}</div>
      </div>
      <div class="item-actions">
        <button class="btn-edit" onclick="editarItem('${item.id}')">✍🏻</button>
        <button class="btn-move" onclick="moverItem('${item.id}')">🔄</button>
        <button class="btn-delete" onclick="removerItem('${item.id}')">🗑️</button>
      </div>
    </div>
  `).join('');
}

function setupFormulario() {
  const formBox = document.getElementById('formBox');
  const btnAdicionar = document.getElementById('btnAdicionar');

  btnAdicionar.addEventListener('click', () => {
    editandoId = null;
    document.getElementById('formTitle').textContent = 'Nova mercadoria';
    document.getElementById('inputNome').value = '';
    document.getElementById('inputQtd').value = '1';
    formBox.classList.remove('hidden');
  });

  document.getElementById('btnCancelar').addEventListener('click', () => {
    formBox.classList.add('hidden');
  });

  document.getElementById('btnSalvar').addEventListener('click', async () => {
    const nome = document.getElementById('inputNome').value.trim();
    const qtd = parseInt(document.getElementById('inputQtd').value) || 1;

    if (!nome) return alert('Digite o nome da mercadoria');

    if (editandoId) {
      await supabase.from('mercadorias').update({
        nome,
        quantidade: qtd,
        atualizado_em: new Date()
      }).eq('id', editandoId);
    } else {
      await supabase.from('mercadorias').insert({
        loja_id: lojaId,
        corredor: corredorAtual,
        nome,
        quantidade: qtd
      });
    }

    formBox.classList.add('hidden');
    renderLista();
  });
}

async function editarItem(id) {
  const { data } = await supabase.from('mercadorias').select('*').eq('id', id).single();
  if (!data) return;

  editandoId = id;
  document.getElementById('formTitle').textContent = 'Editar mercadoria';
  document.getElementById('inputNome').value = data.nome;
  document.getElementById('inputQtd').value = data.quantidade;
  document.getElementById('formBox').classList.remove('hidden');
}

async function removerItem(id) {
  if (!confirm('Remover esta mercadoria?')) return;
  await supabase.from('mercadorias').delete().eq('id', id);
  renderLista();
}

async function moverItem(id) {
  const novo = prompt('Para qual corredor deseja mover? (1 a 60)');
  if (!novo) return;

  const destino = parseInt(novo);
  if (isNaN(destino) || destino < 1 || destino > 60) {
    alert('Número inválido');
    return;
  }

  await supabase.from('mercadorias').update({
    corredor: destino,
    atualizado_em: new Date()
  }).eq('id', id);

  renderLista();
  alert('Mercadoria movida para o corredor ' + destino);
}
