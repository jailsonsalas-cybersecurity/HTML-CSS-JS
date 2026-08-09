const API_BASE = 'https://pokeapi.co/api/v2';
const ITENS_POR_PAGINA = 9; // 3 linhas do padrão "2 pequenos + 1 grande"

let paginaAtual = 1;
let totalPokemons = 0;

const telaLista = document.getElementById('tela-lista');
const telaDetalhe = document.getElementById('tela-detalhe');
const gridPokemons = document.getElementById('grid-pokemons');
const inputBusca = document.getElementById('input-busca');
const btnRetroceder = document.getElementById('btn-retroceder');
const btnAvancar = document.getElementById('btn-avancar');
const paginaAtualSpan = document.getElementById('pagina-atual');
const btnVoltar = document.getElementById('btn-voltar');

// ---------- NAVEGAÇÃO ENTRE TELAS ----------
function mostrarTela(tela) {
  document.querySelectorAll('.tela').forEach(t => t.classList.remove('ativa'));
  tela.classList.add('ativa');
  window.scrollTo(0, 0);
}

btnVoltar.addEventListener('click', () => mostrarTela(telaLista));

// ---------- LISTA DE POKÉMONS ----------
async function carregarLista(pagina) {
  gridPokemons.innerHTML = '<div class="loading">Carregando...</div>';
  const offset = (pagina - 1) * ITENS_POR_PAGINA;

  try {
    const resp = await fetch(`${API_BASE}/pokemon?limit=${ITENS_POR_PAGINA}&offset=${offset}`);
    const data = await resp.json();
    totalPokemons = data.count;

    // busca detalhes de cada pokémon em paralelo (pra pegar sprite)
    const detalhes = await Promise.all(
      data.results.map(p => fetch(p.url).then(r => r.json()))
    );

    renderizarGrid(detalhes);
    atualizarPaginacao();
  } catch (err) {
    gridPokemons.innerHTML = '<div class="erro">Erro ao carregar pokémons.</div>';
    console.error(err);
  }
}

function renderizarGrid(pokemons) {
  gridPokemons.innerHTML = '';

  pokemons.forEach((poke, index) => {
    const card = document.createElement('div');
    card.className = 'poke-card';

    // padrão: a cada grupo de 3, o 3º card é o "grande" (ocupa a coluna larga)
    const posicaoNoGrupo = index % 3;
    if (posicaoNoGrupo === 2) {
      card.classList.add('grande');
    }

    const sprite = poke.sprites.front_default || '';
    card.innerHTML = `
      <img src="${sprite}" alt="${poke.name}">
      <span class="nome-card">${poke.name}</span>
    `;

    card.addEventListener('click', () => abrirDetalhe(poke.id));
    gridPokemons.appendChild(card);
  });
}

function atualizarPaginacao() {
  paginaAtualSpan.textContent = paginaAtual;
  btnRetroceder.disabled = paginaAtual === 1;
  btnAvancar.disabled = paginaAtual * ITENS_POR_PAGINA >= totalPokemons;
}

btnRetroceder.addEventListener('click', () => {
  if (paginaAtual > 1) {
    paginaAtual--;
    carregarLista(paginaAtual);
  }
});

btnAvancar.addEventListener('click', () => {
  paginaAtual++;
  carregarLista(paginaAtual);
});

// ---------- BUSCA ----------
let timeoutBusca;
inputBusca.addEventListener('input', (e) => {
  clearTimeout(timeoutBusca);
  const termo = e.target.value.trim().toLowerCase();

  timeoutBusca = setTimeout(async () => {
    if (termo === '') {
      carregarLista(paginaAtual);
      return;
    }
    gridPokemons.innerHTML = '<div class="loading">Buscando...</div>';
    try {
      const resp = await fetch(`${API_BASE}/pokemon/${termo}`);
      if (!resp.ok) throw new Error('não encontrado');
      const poke = await resp.json();
      renderizarGrid([poke]);
    } catch {
      gridPokemons.innerHTML = '<div class="erro">Pokémon não encontrado.</div>';
    }
  }, 400);
});

// ---------- TELA DE DETALHE ----------
async function abrirDetalhe(id) {
  mostrarTela(telaDetalhe);
  document.getElementById('detalhe-nome').textContent = 'Carregando...';

  try {
    const poke = await fetch(`${API_BASE}/pokemon/${id}`).then(r => r.json());
    const species = await fetch(poke.species.url).then(r => r.json());

    preencherDetalhe(poke);
    await carregarEvolucoes(species.evolution_chain.url);
  } catch (err) {
    console.error(err);
  }
}

function pegarStat(poke, nome) {
  const stat = poke.stats.find(s => s.stat.name === nome);
  return stat ? stat.base_stat : 0;
}

function preencherDetalhe(poke) {
  const nomeCapitalizado = poke.name.charAt(0).toUpperCase() + poke.name.slice(1);

  document.getElementById('detalhe-nome').textContent = nomeCapitalizado;
  document.getElementById('detalhe-nome-faixa').textContent = nomeCapitalizado;

  const tiposDiv = document.getElementById('detalhe-tipos');
  tiposDiv.innerHTML = '';
  poke.types.forEach(t => {
    const pill = document.createElement('span');
    pill.className = 'tipo-pill';
    pill.textContent = t.type.name;
    tiposDiv.appendChild(pill);
  });

  const sprite = poke.sprites.other['official-artwork']?.front_default || poke.sprites.front_default;
  document.getElementById('detalhe-sprite').src = sprite;

  const hp = pegarStat(poke, 'hp');
  document.getElementById('detalhe-hp-label').textContent = `HP ${hp}/${hp}`;
  document.getElementById('detalhe-hp-label-2').textContent = `HP ${hp}/${hp}`;
  document.getElementById('detalhe-hp-barra').style.width = '100%';

  const attack = pegarStat(poke, 'attack');
  const defense = pegarStat(poke, 'defense');
  const spAttack = pegarStat(poke, 'special-attack');
  const spDefense = pegarStat(poke, 'special-defense');
  const speed = pegarStat(poke, 'speed');
  const total = hp + attack + defense + spAttack + spDefense + speed;

  document.getElementById('stat-attack').textContent = attack;
  document.getElementById('stat-defense').textContent = defense;
  document.getElementById('stat-spattack').textContent = spAttack;
  document.getElementById('stat-spdefense').textContent = spDefense;
  document.getElementById('stat-speed').textContent = speed;
  document.getElementById('stat-total').textContent = total;
}

// ---------- CADEIA DE EVOLUÇÃO ----------
async function carregarEvolucoes(url) {
  const container = document.getElementById('cadeia-evolucao');
  container.innerHTML = '<div class="loading">Carregando evoluções...</div>';

  try {
    const data = await fetch(url).then(r => r.json());
    container.innerHTML = '';
    await renderizarNoEvolucao(data.chain, container);
  } catch (err) {
    container.innerHTML = '<div class="erro">Não foi possível carregar.</div>';
    console.error(err);
  }
}

// pega id a partir da url tipo https://pokeapi.co/api/v2/pokemon-species/25/
function idDaUrl(url) {
  const partes = url.split('/').filter(Boolean);
  return partes[partes.length - 1];
}

async function criarItemEvolucao(nome, id) {
  const div = document.createElement('div');
  div.className = 'evo-item';
  const spriteUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;
  div.innerHTML = `
    <img src="${spriteUrl}" alt="${nome}">
    <span>${nome}</span>
  `;
  return div;
}

async function renderizarNoEvolucao(no, container) {
  const id = idDaUrl(no.species.url);
  const item = await criarItemEvolucao(no.species.name, id);
  container.appendChild(item);

  if (no.evolves_to.length === 0) return;

  const seta = document.createElement('span');
  seta.className = 'evo-seta';
  seta.textContent = '→';
  container.appendChild(seta);

  if (no.evolves_to.length === 1) {
    await renderizarNoEvolucao(no.evolves_to[0], container);
  } else {
    // bifurcação (ex: Eevee) — cria uma coluna com os ramos
    const ramoContainer = document.createElement('div');
    ramoContainer.className = 'evo-ramo';
    container.appendChild(ramoContainer);

    for (const filho of no.evolves_to) {
      const linha = document.createElement('div');
      linha.style.display = 'flex';
      linha.style.alignItems = 'center';
      linha.style.gap = '6px';
      ramoContainer.appendChild(linha);
      await renderizarNoEvolucao(filho, linha);
    }
  }
}

// ---------- INICIALIZAÇÃO ----------
carregarLista(paginaAtual);
