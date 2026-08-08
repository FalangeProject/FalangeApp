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
  const lista = document.getElementById('listaLojas');
  const msg = document.getElementById('msgVazioLojas');

  lista.innerHTML = '<div class="loading"><div class="loading-spinner"></div>Carregando lojas...</div>';
  msg.classList.add('hidden');

  const { data, error } = await sb
    .from('lojas')
    .select('*')
    .order('created_at', { ascending: false });

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

// ====================== VALIDADE ======================

function aplicarMascaraData(input) {
  if (!input) return;

  input.addEventListener('input', function() {
    var v = input.value.replace(/\D/g, '').slice(0, 8);
    if (v.length >= 5) {
      input.value = v.slice(0, 2) + '/' + v.slice(2, 4) + '/' + v.slice(4);
    } else if (v.length >= 3) {
      input.value = v.slice(0, 2) + '/' + v.slice(2);
    } else {
      input.value = v;
    }
  });
}

function parseDataBR(texto) {
  if (!texto) return null;
  var partes = texto.trim().split('/');
  if (partes.length !== 3) return null;

  var dia = parseInt(partes[0], 10);
  var mes = parseInt(partes[1], 10);
  var ano = parseInt(partes[2], 10);

  if (isNaN(dia) || isNaN(mes) || isNaN(ano)) return null;
  if (ano < 100) ano += 2000;
  if (dia < 1 || dia > 31 || mes < 1 || mes > 12) return null;

  var data = new Date(ano, mes - 1, dia);
  if (data.getFullYear() !== ano || data.getMonth() !== mes - 1 || data.getDate() !== dia) {
    return null;
  }
  return data;
}

function statusValidade(textoValidade) {
  var data = parseDataBR(textoValidade);
  if (!data) return { classe: '', texto: '' };

  var hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  data.setHours(0, 0, 0, 0);

  if (data.getTime() < hoje.getTime()) {
    return { classe: 'vencido', texto: 'VENCIDO' };
  }
  if (data.getTime() === hoje.getTime()) {
    return { classe: 'vencido', texto: 'VENCE HOJE' };
  }

  var limite = new Date(hoje);
  limite.setMonth(limite.getMonth() + 1);

  if (data.getTime() <= limite.getTime()) {
    var dias = Math.round((data.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
    if (dias > 30) dias = 30;
    return { classe: 'proximo', texto: 'Vence em ' + dias + ' dia' + (dias === 1 ? '' : 's') };
  }

  return { classe: '', texto: '' };
}

// ====================== CORREDOR ======================

var lojaId = null;
var nomeLoja = '';
var corredorAtual
