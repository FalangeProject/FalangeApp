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

async function verificarAlertaLoja() {
  var boxPaletes = document.getElementById('alertaPaletes');
  var boxBrigada = document.getElementById('alertaBrigada');
  if (!lojaId) return;

  var vencidosPaletes = 0;
  var proximosPaletes = 0;

  var r1 = await sb.from('mercadorias').select('validade').eq('loja_id', lojaId);
  if (r1.data) {
    r1.data.forEach(function(item) {
      var st = statusValidade(item.validade);
      if (st.classe === 'vencido') vencidosPaletes++;
      if (st.classe === 'proximo') proximosPaletes++;
    });
  }

  if (boxPaletes) {
    if (vencidosPaletes === 0 && proximosPaletes === 0) {
      boxPaletes.classList.add('hidden');
      boxPaletes.innerHTML = '';
    } else {
      var partesP = [];
      if (vencidosPaletes > 0) partesP.push(vencidosPaletes + ' palete(s) vencido(s)');
      if (proximosPaletes > 0) partesP.push(proximosPaletes + ' palete(s) perto de vencer');
      boxPaletes.innerHTML = '⚠️ Você tem ' + partesP.join(' e ');
      boxPaletes.classList.remove('hidden');
      if (vencidosPaletes > 0) boxPaletes.classList.add('critico');
      else boxPaletes.classList.remove('critico');
    }
  }

  var vencidosBrigada = 0;
  var proximosBrigada = 0;

  var r2 = await sb.from('brigada').select('validade').eq('loja_id', lojaId);
  if (r2.data) {
    r2.data.forEach(function(item) {
      var st = statusValidade(item.validade);
      if (st.classe === 'vencido') vencidosBrigada++;
      if (st.classe === 'proximo') proximosBrigada++;
    });
  }

  if (boxBrigada) {
    if (vencidosBrigada === 0 && proximosBrigada === 0) {
      boxBrigada.classList.add('hidden');
      boxBrigada.innerHTML = '';
    } else {
      var partesB = [];
      if (vencidosBrigada > 0) partesB.push(vencidosBrigada + ' item(ns) vencido(s)');
      if (proximosBrigada > 0) partesB.push(proximosBrigada + ' item(ns) perto de vencer');
      boxBrigada.innerHTML = '🛡️ Você tem ' + partesB.join(' e ') + ' na brigada';
      boxBrigada.classList.remove('hidden');
      if (vencidosBrigada > 0) boxBrigada.classList.add('critico');
      else boxBrigada.classList.remove('critico');
    }
  }
}

// ====================== CORREDOR ======================

var lojaId = null;
var nomeLoja = '';
var corredorAtual = null;
var editandoId = null;

async function initCorredorPage() {
  var sessionResult = await sb.auth.getSession();
  var session = sessionResult.data.session;
  if (!session) {
    window.location.href = 'index.html';
    return;
  }

  var params = new URLSearchParams(window.location.search);
  lojaId = params.get('loja');
  nomeLoja = params.get('nome') || 'Loja';
  var corredorParam = params.get('corredor');

  if (!lojaId) {
    window.location.href = 'dashboard.html';
    return;
  }

  var backBtn = document.querySelector('.back-btn');
  if (backBtn) {
    if (corredorParam) {
      backBtn.href = 'corredor.html?loja=' + lojaId + '&nome=' + encodeURIComponent(nomeLoja);
    } else {
      backBtn.href = 'dashboard.html';
    }
  }

  setupSearch();

  var btnExportar = document.getElementById('btnExportar');
  if (btnExportar) {
    btnExportar.addEventListener('click', exportarPDF);
  }

  if (!corredorParam) {
    document.getElementById('tituloPagina').textContent = nomeLoja;
    document.getElementById('secaoCorredores').classList.remove('hidden');
    document.getElementById('secaoMercadorias').classList.add('hidden');
    document.getElementById('searchBox').classList.remove('hidden');
    renderCorredores();
    verificarAlertaLoja();

    var btnBrigada = document.getElementById('btnMinhaBrigada');
    if (btnBrigada) {
      btnBrigada.href = 'brigada.html?loja=' + lojaId + '&nome=' + encodeURIComponent(nomeLoja);
    }

    return;
  }

  corredorAtual = parseInt(corredorParam, 10);
  document.getElementById('tituloPagina').textContent = nomeLoja + ' - Corredor ' + corredorAtual;
  document.getElementById('secaoCorredores').classList.add('hidden');
  document.getElementById('secaoMercadorias').classList.remove('hidden');
  document.getElementById('searchBox').classList.add('hidden');
  document.getElementById('searchResults').classList.add('hidden');

  renderLista();
  setupFormulario();
}

function setupSearch() {
  var input = document.getElementById('searchInput');
  var btn = document.getElementById('searchBtn');
  var resultsBox = document.getElementById('searchResults');
  var secaoCorredores = document.getElementById('secaoCorredores');

  if (!input || !btn) return;

  async function executarBusca() {
    var termo = input.value.trim().toLowerCase();

    if (!termo) {
      resultsBox.classList.add('hidden');
      secaoCorredores.classList.remove('hidden');
      return;
    }

    if (/^\d+$/.test(termo)) {
      var num = parseInt(termo, 10);
      if (num >= 1 && num <= 60) {
        window.location.href = 'corredor.html?loja=' + lojaId + '&nome=' + encodeURIComponent(nomeLoja) + '&corredor=' + num;
        return;
      }
    }

    var result = await sb.from('mercadorias').select('*').eq('loja_id', lojaId);
    var data = result.data;
    var error = result.error;

    if (error || !data) {
      resultsBox.innerHTML = '<h3>Erro ao buscar</h3>';
      resultsBox.classList.remove('hidden');
      secaoCorredores.classList.add('hidden');
      return;
    }

    var resultados = data.filter(function(item) {
      return item.nome && item.nome.toLowerCase().indexOf(termo) !== -1;
    });

    resultados.sort(function(a, b) {
      return Number(a.corredor) - Number(b.corredor);
    });

    if (resultados.length === 0) {
      resultsBox.innerHTML = '<h3>Nenhum resultado para "' + input.value + '"</h3>';
    } else {
      var html = '<h3>Resultados (' + resultados.length + ')</h3>';
      resultados.forEach(function(r) {
        var st = statusValidade(r.validade);
        html += '<div class="result-item">';
        html += '<div class="info">';
        html += '<div class="nome">' + r.nome + '</div>';
        html += '<div class="corredor-tag">Corredor ' + r.corredor + '</div>';
        html += '<div class="qtd">' + r.quantidade + ' palete' + (Number(r.quantidade) > 1 ? 's' : '') + '</div>';
        if (r.validade) {
          html += '<div class="qtd">Validade: ' + r.validade + (st.texto ? ' — ' + st.texto : '') + '</div>';
        }
        html += '</div>';
        html += '<a href="corredor.html?loja=' + lojaId + '&nome=' + encodeURIComponent(nomeLoja) + '&corredor=' + r.corredor + '">Abrir</a>';
        html += '</div>';
      });
      resultsBox.innerHTML = html;
    }

    resultsBox.classList.remove('hidden');
    secaoCorredores.classList.add('hidden');
  }

  btn.addEventListener('click', executarBusca);
  input.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') executarBusca();
  });
  input.addEventListener('input', function() {
    if (input.value.trim() === '') {
      resultsBox.classList.add('hidden');
      secaoCorredores.classList.remove('hidden');
    }
  });
}

async function renderCorredores() {
  var container = document.getElementById('corredoresGrupos');
  if (!container) return;

  container.innerHTML = '<div class="loading"><div class="loading-spinner"></div>Carregando corredores...</div>';

  var result = await sb.from('mercadorias').select('corredor').eq('loja_id', lojaId);
  var data = result.data;

  var corredoresComItens = {};
  if (data) {
    data.forEach(function(item) {
      corredoresComItens[item.corredor] = true;
    });
  }

  var html = '';
  for (var inicio = 1; inicio <= 60; inicio += 10) {
    var fim = Math.min(inicio + 9, 60);
    html += '<div class="grupo"><h3>Corredores ' + inicio + ' a ' + fim + '</h3><div class="botoes-corredor">';
    for (var i = inicio; i <= fim; i++) {
      var temItens = corredoresComItens[i] ? 'has-items' : '';
      html += '<a href="corredor.html?loja=' + lojaId + '&nome=' + encodeURIComponent(nomeLoja) + '&corredor=' + i + '" class="' + temItens + '">' + i + '</a>';
    }
    html += '</div></div>';
  }
  container.innerHTML = html;
}

async function renderLista() {
  var container = document.getElementById('listaMercadorias');
  var msgVazio = document.getElementById('msgVazio');

  container.innerHTML = '<div class="loading"><div class="loading-spinner"></div>Carregando mercadorias...</div>';
  msgVazio.classList.add('hidden');

  var result = await sb
    .from('mercadorias')
    .select('*')
    .eq('loja_id', lojaId)
    .eq('corredor', corredorAtual)
    .order('nome');

  var data = result.data;
  var error = result.error;

  if (error || !data || data.length === 0) {
    container.innerHTML = '';
    msgVazio.classList.remove('hidden');
    return;
  }

  msgVazio.classList.add('hidden');

  var html = '';
  data.forEach(function(item) {
    var st = statusValidade(item.validade);
    var classeCard = st.classe ? (' ' + st.classe) : '';

    html += '<div class="item-card' + classeCard + '">';
    html += '<div class="info">';
    html += '<div class="nome">' + item.nome + '</div>';
    html += '<div class="qtd">' + item.quantidade + ' palete' + (item.quantidade > 1 ? 's' : '') + '</div>';
    if (item.validade) {
      html += '<div class="qtd">Validade: ' + item.validade + '</div>';
      if (st.texto) {
        html += '<div class="validade-alerta">' + st.texto + '</div>';
      }
    }
    html += '</div>';
    html += '<div class="item-actions">';
    html += '<button class="btn-edit" onclick="editarItem(\'' + item.id + '\')">✍🏻</button>';
    html += '<button class="btn-move" onclick="moverItem(\'' + item.id + '\')">🔄</button>';
    html += '<button class="btn-delete" onclick="removerItem(\'' + item.id + '\')">🗑️</button>';
    html += '</div>';
    html += '</div>';
  });

  container.innerHTML = html;
}

function setupFormulario() {
  var formBox = document.getElementById('formBox');
  var btnAdicionar = document.getElementById('btnAdicionar');
  var inputValidade = document.getElementById('inputValidade');

  aplicarMascaraData(inputValidade);

  btnAdicionar.addEventListener('click', function() {
    editandoId = null;
    document.getElementById('formTitle').textContent = 'Nova mercadoria';
    document.getElementById('inputNome').value = '';
    document.getElementById('inputValidade').value = '';
    document.getElementById('inputQtd').value = '1';
    formBox.classList.remove('hidden');
  });

  document.getElementById('btnCancelar').addEventListener('click', function() {
    formBox.classList.add('hidden');
  });

  document.getElementById('btnSalvar').addEventListener('click', async function() {
    var nome = document.getElementById('inputNome').value.trim();
    var validade = document.getElementById('inputValidade').value.trim();
    var qtd = parseInt(document.getElementById('inputQtd').value, 10) || 1;

    if (!nome) {
      alert('Digite o nome da mercadoria');
      return;
    }

    if (validade && !parseDataBR(validade)) {
      alert('Data de validade inválida. Use o formato DD/MM/AAAA');
      return;
    }

    if (editandoId) {
      await sb.from('mercadorias').update({
        nome: nome,
        validade: validade || null,
        quantidade: qtd,
        atualizado_em: new Date()
      }).eq('id', editandoId);
    } else {
      await sb.from('mercadorias').insert({
        loja_id: lojaId,
        corredor: corredorAtual,
        nome: nome,
        validade: validade || null,
        quantidade: qtd
      });
    }

    formBox.classList.add('hidden');
    renderLista();
  });
}

async function editarItem(id) {
  var result = await sb.from('mercadorias').select('*').eq('id', id).single();
  var data = result.data;
  if (!data) return;

  editandoId = id;
  document.getElementById('formTitle').textContent = 'Editar mercadoria';
  document.getElementById('inputNome').value = data.nome;
  document.getElementById('inputValidade').value = data.validade || '';
  document.getElementById('inputQtd').value = data.quantidade;
  document.getElementById('formBox').classList.remove('hidden');
}

async function removerItem(id) {
  if (!confirm('Remover esta mercadoria?')) return;
  await sb.from('mercadorias').delete().eq('id', id);
  renderLista();
}

async function moverItem(id) {
  var novo = prompt('Para qual corredor deseja mover? (1 a 60)');
  if (!novo) return;

  var destino = parseInt(novo, 10);
  if (isNaN(destino) || destino < 1 || destino > 60) {
    alert('Número inválido');
    return;
  }

  await sb.from('mercadorias').update({
    corredor: destino,
    atualizado_em: new Date()
  }).eq('id', id);

  renderLista();
  alert('Mercadoria movida para o corredor ' + destino);
}

// ====================== EXPORTAR PDF CORREDOR ======================

async function exportarPDF() {
  var btn = document.getElementById('btnExportar');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Gerando PDF...';
  }

  try {
    var result = await sb
      .from('mercadorias')
      .select('*')
      .eq('loja_id', lojaId)
      .order('corredor')
      .order('nome');

    var data = result.data;
    var error = result.error;

    if (error) {
      alert('Erro ao buscar dados: ' + error.message);
      return;
    }

    var jsPDF = window.jspdf.jsPDF;
    var doc = new jsPDF();
    var dataAtual = new Date().toLocaleString('pt-BR');

    doc.setFontSize(16);
    doc.text('Falange - Controle de Paletes', 14, 18);
    doc.setFontSize(12);
    doc.text('Loja: ' + nomeLoja, 14, 28);
    doc.text('Exportado em: ' + dataAtual, 14, 36);

    if (!data || data.length === 0) {
      doc.setFontSize(11);
      doc.text('Nenhuma mercadoria cadastrada nesta loja.', 14, 50);
    } else {
      var rows = data.map(function(item) {
        var st = statusValidade(item.validade);
        return [
          String(item.corredor),
          item.nome,
          item.validade || '-',
          st.texto || '-',
          String(item.quantidade)
        ];
      });

      doc.autoTable({
        startY: 45,
        head: [['Corredor', 'Mercadoria', 'Validade', 'Status', 'Qtd.']],
        body: rows,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [37, 99, 235] }
      });
    }

    var nomeArquivo = 'Falange_' + nomeLoja.replace(/[^a-zA-Z0-9]/g, '_') + '.pdf';
    doc.save(nomeArquivo);
  } catch (e) {
    console.error(e);
    alert('Erro ao gerar o PDF. Tente novamente.');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = '📄 Exportar PDF';
    }
  }
}

// ====================== BRIGADA ======================

var brigadaLojaId = null;
var brigadaNomeLoja = '';
var editandoBrigadaId = null;

async function initBrigadaPage() {
  var sessionResult = await sb.auth.getSession();
  var session = sessionResult.data.session;
  if (!session) {
    window.location.href = 'index.html';
    return;
  }

  var params = new URLSearchParams(window.location.search);
  brigadaLojaId = params.get('loja');
  brigadaNomeLoja = params.get('nome') || 'Loja';

  if (!brigadaLojaId) {
    window.location.href = 'dashboard.html';
    return;
  }

  document.getElementById('tituloBrigada').textContent = 'Brigada - ' + brigadaNomeLoja;

  var btnVoltar = document.getElementById('btnVoltarBrigada');
  if (btnVoltar) {
    btnVoltar.href = 'corredor.html?loja=' + brigadaLojaId + '&nome=' + encodeURIComponent(brigadaNomeLoja);
  }

  document.getElementById('btnExportarBrigada').addEventListener('click', exportarPDFBrigada);
  setupFormularioBrigada();
  renderListaBrigada();
}

function setupFormularioBrigada() {
  var formBox = document.getElementById('formBrigada');
  var btnAdicionar = document.getElementById('btnAdicionarBrigada');
  var inputValidade = document.getElementById('inputValidadeBrigada');

  aplicarMascaraData(inputValidade);

  btnAdicionar.addEventListener('click', function() {
    editandoBrigadaId = null;
    document.getElementById('formTitleBrigada').textContent = 'Novo produto';
    document.getElementById('inputCodigo').value = '';
    document.getElementById('inputNomeBrigada').value = '';
    document.getElementById('inputValidadeBrigada').value = '';
    document.getElementById('inputQtdBrigada').value = '1';
    formBox.classList.remove('hidden');
  });

  document.getElementById('btnCancelarBrigada').addEventListener('click', function() {
    formBox.classList.add('hidden');
  });

  document.getElementById('btnSalvarBrigada').addEventListener('click', async function() {
    var codigo = document.getElementById('inputCodigo').value.trim();
    var nome = document.getElementById('inputNomeBrigada').value.trim();
    var validade = document.getElementById('inputValidadeBrigada').value.trim();
    var qtd = parseInt(document.getElementById('inputQtdBrigada').value, 10) || 1;

    if (!nome) {
      alert('Digite o nome do produto');
      return;
    }

    if (validade && !parseDataBR(validade)) {
      alert('Data de validade inválida. Use o formato DD/MM/AAAA');
      return;
    }

    if (editandoBrigadaId) {
      await sb.from('brigada').update({
        codigo: codigo || null,
        nome: nome,
        validade: validade || null,
        quantidade: qtd
      }).eq('id', editandoBrigadaId);
    } else {
      await sb.from('brigada').insert({
        loja_id: brigadaLojaId,
        codigo: codigo || null,
        nome: nome,
        validade: validade || null,
        quantidade: qtd
      });
    }

    formBox.classList.add('hidden');
    renderListaBrigada();
  });
}

async function renderListaBrigada() {
  var container = document.getElementById('listaBrigada');
  var msgVazio = document.getElementById('msgVazioBrigada');

  container.innerHTML = '<div class="loading"><div class="loading-spinner"></div>Carregando brigada...</div>';
  msgVazio.classList.add('hidden');

  var result = await sb
    .from('brigada')
    .select('*')
    .eq('loja_id', brigadaLojaId)
    .order('nome');

  var data = result.data;
  var error = result.error;

  if (error || !data || data.length === 0) {
    container.innerHTML = '';
    msgVazio.classList.remove('hidden');
    return;
  }

  msgVazio.classList.add('hidden');

  var html = '';
  data.forEach(function(item) {
    var st = statusValidade(item.validade);
    var classeCard = st.classe ? (' ' + st.classe) : '';

    html += '<div class="item-card' + classeCard + '">';
    html += '<div class="info">';
    html += '<div class="nome">' + item.nome + '</div>';
    if (item.codigo) {
      html += '<div class="qtd">Código: ' + item.codigo + '</div>';
    }
    html += '<div class="qtd">Qtd: ' + item.quantidade + '</div>';
    if (item.validade) {
      html += '<div class="qtd">Validade: ' + item.validade + '</div>';
      if (st.texto) {
        html += '<div class="validade-alerta">' + st.texto + '</div>';
      }
    }
    html += '</div>';
    html += '<div class="item-actions">';
    html += '<button class="btn-edit" onclick="editarBrigada(\'' + item.id + '\')">✍🏻</button>';
    html += '<button class="btn-delete" onclick="removerBrigada(\'' + item.id + '\')">🗑️</button>';
    html += '</div>';
    html += '</div>';
  });

  container.innerHTML = html;
}

async function editarBrigada(id) {
  var result = await sb.from('brigada').select('*').eq('id', id).single();
  var data = result.data;
  if (!data) return;

  editandoBrigadaId = id;
  document.getElementById('formTitleBrigada').textContent = 'Editar produto';
  document.getElementById('inputCodigo').value = data.codigo || '';
  document.getElementById('inputNomeBrigada').value = data.nome;
  document.getElementById('inputValidadeBrigada').value = data.validade || '';
  document.getElementById('inputQtdBrigada').value = data.quantidade;
  document.getElementById('formBrigada').classList.remove('hidden');
}

async function removerBrigada(id) {
  if (!confirm('Remover este produto da brigada?')) return;
  await sb.from('brigada').delete().eq('id', id);
  renderListaBrigada();
}

async function exportarPDFBrigada() {
  var btn = document.getElementById('btnExportarBrigada');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Gerando PDF...';
  }

  try {
    var result = await sb
      .from('brigada')
      .select('*')
      .eq('loja_id', brigadaLojaId)
      .order('nome');

    var data = result.data;
    var error = result.error;

    if (error) {
      alert('Erro ao buscar dados: ' + error.message);
      return;
    }

    var jsPDF = window.jspdf.jsPDF;
    var doc = new jsPDF();
    var dataAtual = new Date().toLocaleString('pt-BR');

    doc.setFontSize(16);
    doc.text('Falange - Brigada de Validade', 14, 18);
    doc.setFontSize(12);
    doc.text('Loja: ' + brigadaNomeLoja, 14, 28);
    doc.text('Exportado em: ' + dataAtual, 14, 36);

    if (!data || data.length === 0) {
      doc.setFontSize(11);
      doc.text('Nenhum produto na brigada desta loja.', 14, 50);
    } else {
      var rows = data.map(function(item) {
        var st = statusValidade(item.validade);
        return [
          item.codigo || '-',
          item.nome,
          item.validade || '-',
          st.texto || '-',
          String(item.quantidade)
        ];
      });

      doc.autoTable({
        startY: 45,
        head: [['Código', 'Produto', 'Validade', 'Status', 'Qtd.']],
        body: rows,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [124, 58, 237] }
      });
    }

    var nomeArquivo = 'Brigada_' + brigadaNomeLoja.replace(/[^a-zA-Z0-9]/g, '_') + '.pdf';
    doc.save(nomeArquivo);
  } catch (e) {
    console.error(e);
    alert('Erro ao gerar o PDF. Tente novamente.');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = '📄 Exportar PDF';
    }
  }
}
