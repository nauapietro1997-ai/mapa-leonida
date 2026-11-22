// MODO DEMONSTRAÇÃO: banco de mentira dentro do navegador (sessionStorage).
// Serve para ver e testar o site sem Supabase. Imita as MESMAS regras do banco real
// (papel, banido, limite de 5 por dia, só moderador aprova) para os testes valerem algo.
(function () {
  "use strict";
  const CHAVE = "mapa-publico-demo-v1";

  const USUARIOS = {
    "u-jogador": {
      id: "u-jogador",
      nome: "Você (jogador)",
      avatar: null,
      papel: "usuario",
      banido: false,
      discord_id: "100000000000000001",
    },
    "u-mod": {
      id: "u-mod",
      nome: "Lia (moderadora)",
      avatar: null,
      papel: "moderador",
      banido: false,
      discord_id: "100000000000000002",
    },
    "u-dono": {
      id: "u-dono",
      nome: "Nauã (dono)",
      avatar: null,
      papel: "dono",
      banido: false,
      discord_id: "100000000000000003",
    },
    "u-ataque": {
      id: "u-ataque",
      nome: '<img src=x onerror="window.__xss=1">Hacker',
      avatar: null,
      papel: "usuario",
      banido: false,
      discord_id: "100000000000000004",
    },
  };

  function agora(diasAtras) {
    return new Date(Date.now() - (diasAtras || 0) * 864e5).toISOString();
  }

  function inicial() {
    return {
      usuarios: USUARIOS,
      logado: null,
      pontos: [
        {
          id: "d1",
          nome: "Cofre do posto em Port Gellhorn",
          categoria: "dinheiro",
          regiao: "Port Gellhorn",
          o_que_tem: "Maleta com dinheiro",
          valor: 2500,
          como_pegar:
            "Entrar pelos fundos do posto e abrir o cofre atrás do balcão.",
          codigo: null,
          x: 1214,
          y: 1948,
          fontes: [],
          print_path: null,
          autor_id: "u-mod",
          descoberto_em: agora(3),
        },
        {
          id: "d2",
          nome: "Pistola dourada no barco encalhado",
          categoria: "armas",
          regiao: "Sandbars",
          o_que_tem: "Pistola dourada",
          valor: null,
          como_pegar:
            "Nadar até o barco encalhado e subir pela escada lateral.",
          codigo: null,
          x: 574,
          y: 2215,
          fontes: ["https://exemplo.com/guia"],
          print_path: null,
          autor_id: null,
          descoberto_em: agora(5),
        },
        {
          id: "d3",
          nome: "Óvni no lago",
          categoria: "misterios",
          regiao: "Lake Leonida",
          o_que_tem: "Easter egg do óvni",
          valor: null,
          como_pegar: "Ficar na margem norte às 3h da manhã do jogo.",
          codigo: null,
          x: 2414,
          y: 1722,
          fontes: [],
          print_path: null,
          autor_id: "u-jogador",
          descoberto_em: agora(1),
        },
        {
          id: "d4",
          nome: "Moto clássica escondida",
          categoria: "veiculos", subtipo: "moto",
          regiao: "Ambrosia",
          o_que_tem: "Moto clássica",
          valor: null,
          como_pegar: "Garagem aberta atrás do bar.",
          codigo: null,
          x: 2220,
          y: 1955,
          fontes: [],
          print_path: null,
          autor_id: null,
          descoberto_em: agora(7),
        },
        {
          id: "d5",
          nome: "Loja de armas do Rockridge",
          categoria: "lojas",
          regiao: "Rockridge",
          o_que_tem: "Loja de armas",
          valor: null,
          como_pegar: "Sempre aberta.",
          codigo: null,
          x: 2587,
          y: 2722,
          fontes: [],
          print_path: null,
          autor_id: null,
          descoberto_em: agora(9),
        },
        {
          id: "d6",
          nome: "Cofre com código em Vinewood Beach",
          categoria: "dinheiro",
          regiao: "Vinewood Beach",
          o_que_tem: "Dinheiro e relógio",
          valor: 8000,
          como_pegar: "Mansão azul de frente para o mar; cofre no escritório.",
          codigo: "Cofre: 4417",
          x: 3160,
          y: 1832,
          fontes: [],
          print_path: null,
          autor_id: "u-mod",
          descoberto_em: agora(2),
        },
        {
          id: "d7",
          nome: '<img src=x onerror="window.__xss=1">Teste de XSS',
          categoria: "easter-eggs",
          regiao: "<script>window.__xss=2</script>",
          o_que_tem: "<b>negrito?</b>",
          valor: null,
          como_pegar:
            'Texto com <a href="javascript:alert(1)">link</a> que deve aparecer como texto.',
          codigo: null,
          x: 1920,
          y: 2589,
          fontes: ["javascript:alert(1)", "https://exemplo.com/ok"],
          print_path: null,
          autor_id: "u-ataque",
          descoberto_em: agora(0),
        },
        {
          id: "d8",
          nome: "Figurinha rara (sem posição ainda)",
          categoria: "colecionaveis",
          regiao: "Vice City",
          o_que_tem: "Figurinha",
          valor: null,
          como_pegar: "Ninguém achou o lugar exato ainda.",
          codigo: null,
          x: null,
          y: null,
          fontes: [],
          print_path: null,
          autor_id: null,
          descoberto_em: agora(4),
        },
      ],
      sugestoes: [
        {
          id: "s1",
          autor_id: "u-ataque",
          status: "pendente",
          motivo: null,
          nome: "<script>window.__xss=3</script>Bazuca",
          categoria: "armas",
          o_que_tem: "Bazuca",
          valor: null,
          como_pegar: "No telhado do prédio mais alto.",
          codigo: null,
          x: 3100,
          y: 2286,
          print_path: null,
          criado: agora(0.2),
        },
        {
          id: "s2",
          autor_id: "u-mod",
          status: "pendente",
          motivo: null,
          nome: "Dinheiro no cais",
          categoria: "dinheiro",
          o_que_tem: "Pacote de dinheiro",
          valor: 1200,
          como_pegar: "Embaixo do píer, mergulhar.",
          codigo: null,
          x: 3320,
          y: 2369,
          print_path: null,
          criado: agora(0.5),
        },
      ],
      denuncias: [
        {
          id: "n1",
          ponto_id: "d7",
          ponto_nome: '<img src=x onerror="window.__xss=1">Teste de XSS',
          autor_id: "u-jogador",
          motivo: "Texto estranho, parece ataque.",
          status: "aberta",
          criado: agora(0.1),
        },
      ],
      log: [],
      patrocinio: {
        texto: "Este espaço pode ser seu: patrocine o mapa da comunidade.",
        link: "https://exemplo.com/patrocinio",
        imagem: null,
        ativo: true,
      },
      afiliados: [
        {
          id: "a1",
          titulo: "Headset gamer",
          descricao: "O mesmo que uso na live.",
          loja: "Loja exemplo",
          preco_texto: "a partir de R$ 199",
          link: "https://exemplo.com/headset",
          imagem: null,
          ordem: 1,
          ativo: true,
        },
        {
          id: "a2",
          titulo: "Controle sem fio",
          descricao: "Bom para jogar GTA no PC.",
          loja: "Loja exemplo",
          preco_texto: "R$ 289",
          link: "https://exemplo.com/controle",
          imagem: null,
          ordem: 2,
          ativo: true,
        },
        {
          id: "a3",
          titulo: "Link perigoso (teste)",
          descricao: "Não deve aparecer: link não é https.",
          loja: "",
          preco_texto: "",
          link: "javascript:alert(1)",
          imagem: null,
          ordem: 3,
          ativo: true,
        },
      ],
      arquivos: {},
    };
  }

  let db;
  try {
    db = JSON.parse(sessionStorage.getItem(CHAVE)) || inicial();
  } catch (e) {
    db = inicial();
  }
  function salvar() {
    try {
      sessionStorage.setItem(CHAVE, JSON.stringify(db));
    } catch (e) {
      /* sem espaço: segue só na memória */
    }
  }

  const ouvintes = new Set();
  const espera = (ms) => new Promise((r) => setTimeout(r, ms || 120));
  const eu = () => (db.logado ? db.usuarios[db.logado] : null);
  const papel = () => {
    const u = eu();
    return !u ? null : u.banido ? "usuario" : u.papel;
  };
  const ehMod = () => papel() === "moderador" || papel() === "dono";
  function exigirMod() {
    if (!ehMod()) throw new Error("Sem permissão: só moderadores.");
  }
  function exigirDono() {
    if (papel() !== "dono") throw new Error("Sem permissão: só o dono.");
  }
  function registrar(acao, tipo, alvo, det) {
    db.log.unshift({
      id: Date.now() + Math.random(),
      acao,
      alvo_tipo: tipo,
      alvo_id: alvo,
      detalhes: det || {},
      criado: agora(),
      ator: { nome: eu().nome },
    });
  }
  function publico(u) {
    // público vê só o nome (a foto do Discord tem o Discord ID no endereço)
    return u ? { nome: u.nome } : null;
  }
  function novoId(p) {
    return p + Math.random().toString(36).slice(2, 10);
  }
  function aplicar(alvo, e) {
    for (const k of [
      "nome",
      "categoria",
      "regiao",
      "o_que_tem",
      "como_pegar",
      "codigo",
    ])
      if (k in e) alvo[k] = e[k] === "" ? null : e[k];
    if ("valor" in e)
      alvo.valor = e.valor === "" || e.valor === null ? null : Number(e.valor);
    if ("x" in e) alvo.x = Math.round(Number(e.x));
    if ("y" in e) alvo.y = Math.round(Number(e.y));
  }

  window.criarApiDemo = function () {
    return {
      demo: true,
      async iniciar() {
        await espera(60);
        return eu() ? { ...eu() } : null;
      },
      get perfil() {
        return eu() ? { ...eu() } : null;
      },
      aoMudarSessao(f) {
        ouvintes.add(f);
      },
      // No demo, "entrar" pergunta com qual papel (no site real é o Discord).
      async entrar(papelEscolhido) {
        const mapa = {
          usuario: "u-jogador",
          moderador: "u-mod",
          dono: "u-dono",
        };
        db.logado = mapa[papelEscolhido] || "u-jogador";
        salvar();
        ouvintes.forEach((f) => f({ ...eu() }));
      },
      async sair() {
        db.logado = null;
        salvar();
        ouvintes.forEach((f) => f(null));
      },
      async pontos() {
        await espera();
        return db.pontos.filter((p) => !p.removido_em).map((p) => ({
          ...p,
          autor: publico(db.usuarios[p.autor_id]),
        }));
      },
      async urlsPrints(caminhos) {
        const m = {};
        for (const c of caminhos)
          if (c && db.arquivos[c]) m[c] = db.arquivos[c];
        return m;
      },
      async enviarSugestao(campos, blob, ext) {
        await espera(250);
        const u = eu();
        if (!u) throw new Error("Entre com o Discord para sugerir.");
        if (u.banido) throw new Error("Sua conta não pode enviar sugestões.");
        const ultimas = db.sugestoes.filter(
          (s) => s.autor_id === u.id && Date.now() - new Date(s.criado) < 864e5,
        );
        if (ultimas.length >= 5)
          throw new Error(
            "Limite de 5 sugestões a cada 24 horas. Tente amanhã.",
          );
        let print_path = null;
        if (blob) {
          if (blob.size > 2 * 1024 * 1024)
            throw new Error("Print maior que 2 MB.");
          print_path = u.id + "/" + novoId("p") + "." + ext;
          db.arquivos[print_path] = await new Promise((r) => {
            const fr = new FileReader();
            fr.onload = () => r(fr.result);
            fr.readAsDataURL(blob);
          });
        }
        db.sugestoes.push({
          id: novoId("s"),
          autor_id: u.id,
          status: "pendente",
          motivo: null,
          ...campos,
          print_path,
          criado: agora(),
        });
        salvar();
      },
      async minhasSugestoes() {
        const u = eu();
        if (!u) return [];
        return db.sugestoes
          .filter((s) => s.autor_id === u.id)
          .sort((a, b) => (a.criado < b.criado ? 1 : -1))
          .map((s) => ({ ...s }));
      },
      async apagarSugestao(s) {
        const i = db.sugestoes.findIndex(
          (x) =>
            x.id === s.id &&
            x.autor_id === (eu() || {}).id &&
            x.status === "pendente",
        );
        if (i < 0)
          throw new Error(
            "Só dá para apagar sugestão sua que ainda está em análise.",
          );
        const [x] = db.sugestoes.splice(i, 1);
        if (x.print_path) delete db.arquivos[x.print_path];
        salvar();
      },
      async denunciar(pontoId, motivo) {
        const u = eu();
        if (!u || u.banido) throw new Error("Sua conta não pode denunciar.");
        const p = db.pontos.find((x) => x.id === pontoId && !x.removido_em);
        if (!p) throw new Error("Esse ponto não existe mais.");
        if (
          db.denuncias.some(
            (d) =>
              d.ponto_id === pontoId &&
              d.autor_id === u.id &&
              d.status === "aberta",
          )
        )
          throw new Error("Você já denunciou este ponto.");
        db.denuncias.push({
          id: novoId("n"),
          ponto_id: pontoId,
          ponto_nome: p.nome,
          autor_id: u.id,
          motivo,
          status: "aberta",
          criado: agora(),
        });
        salvar();
      },
      async patrocinio() {
        return db.patrocinio.ativo ? { ...db.patrocinio } : null;
      },
      async afiliados() {
        return db.afiliados
          .filter((a) => a.ativo)
          .sort((a, b) => a.ordem - b.ordem);
      },
      async apagarConta() {
        const u = eu();
        if (!u) throw new Error("Entre para apagar a conta.");
        if (u.papel === "dono")
          throw new Error(
            "O dono não pode apagar a conta pelo site (passe o papel antes).",
          );
        for (const p of db.pontos) {
          if (p.autor_id === u.id) p.autor_id = null;
          if (p.print_path && p.print_path.startsWith(u.id + "/"))
            p.print_path = null;
        }
        db.sugestoes = db.sugestoes.filter((s) => s.autor_id !== u.id);
        db.denuncias = db.denuncias.filter((d) => d.autor_id !== u.id);
        for (const k of Object.keys(db.arquivos))
          if (k.startsWith(u.id + "/")) delete db.arquivos[k];
        db.logado = null;
        salvar();
        ouvintes.forEach((f) => f(null));
      },
      // volta o demo ao começo (botão na tela de moderação)
      reiniciarDemo() {
        db = inicial();
        salvar();
      },

      mod: {
        async fila(status) {
          exigirMod();
          await espera();
          return db.sugestoes
            .filter((s) => s.status === (status || "pendente"))
            .map((s) => ({ ...s, autor: publico(db.usuarios[s.autor_id]) }));
        },
        async aprovar(id, edicoes) {
          exigirMod();
          const s = db.sugestoes.find((x) => x.id === id);
          if (!s) throw new Error("Sugestão não encontrada.");
          if (s.status !== "pendente")
            throw new Error("Essa sugestão já foi revisada.");
          if (s.autor_id === eu().id && papel() !== "dono")
            throw new Error("Moderador não aprova a própria sugestão.");
          const e = edicoes || {};
          aplicar(s, e);
          const ponto = {
            id: novoId("d"),
            nome: s.nome,
            categoria: s.categoria,
            regiao: e.regiao || null,
            o_que_tem: s.o_que_tem,
            valor: s.valor,
            como_pegar: s.como_pegar,
            codigo: s.codigo,
            x: s.x,
            y: s.y,
            fontes: [],
            print_path: s.print_path,
            autor_id: s.autor_id,
            descoberto_em: s.criado,
            precisao: "marcado pela comunidade",
          };
          db.pontos.push(ponto);
          s.status = "aprovada";
          s.ponto_id = ponto.id;
          registrar("aprovar_sugestao", "sugestao", id, {
            nome: s.nome,
            editou: Object.keys(e).length > 0,
          });
          salvar();
          return ponto.id;
        },
        async recusar(id, motivo) {
          exigirMod();
          const s = db.sugestoes.find((x) => x.id === id);
          if (!s || s.status !== "pendente")
            throw new Error("Essa sugestão já foi revisada.");
          if (!motivo || motivo.length < 3)
            throw new Error("Escreva o motivo da recusa.");
          s.status = "recusada";
          s.motivo = motivo;
          registrar("recusar_sugestao", "sugestao", id, {
            nome: s.nome,
            motivo,
          });
          salvar();
        },
        async denuncias() {
          exigirMod();
          return db.denuncias
            .filter((d) => d.status === "aberta")
            .map((d) => ({ ...d, autor: publico(db.usuarios[d.autor_id]) }));
        },
        async resolverDenuncia(id, acao, nota) {
          exigirMod();
          const d = db.denuncias.find((x) => x.id === id);
          if (!d || d.status !== "aberta")
            throw new Error("Essa denúncia já foi resolvida.");
          if (acao === "remover_ponto") {
            const alvo = db.pontos.find((p) => p.id === d.ponto_id);
            if (alvo && !alvo.removido_em) {
              // moderador: no máximo 10 remoções por hora (o dono não tem limite)
              if (papel() !== "dono") {
                const hora = Date.now() - 3600000;
                db.remocoes = (db.remocoes || []).filter((t) => t > hora);
                if (db.remocoes.length >= 10)
                  throw new Error(
                    "Limite de 10 remoções por hora. Chame o dono se precisar de mais.",
                  );
                db.remocoes.push(Date.now());
              }
              // remoção macia: some do mapa, o dono pode restaurar
              alvo.removido_em = agora();
              alvo.removido_motivo = nota || "denúncia aceita";
              alvo.removido_por_nome = eu().nome;
            }
            registrar("remover_ponto", "ponto", d.ponto_id, {
              motivo: nota || "denúncia aceita",
              nome: d.ponto_nome,
            });
          }
          d.status = acao === "descartar" ? "descartada" : "resolvida";
          d.nota = nota || null;
          registrar("resolver_denuncia", "denuncia", id, {
            acao,
            ponto: d.ponto_nome,
          });
          salvar();
        },
        async log() {
          exigirMod();
          return db.log.slice(0, 100);
        },
        async usuarios(busca) {
          exigirDono();
          const b = (busca || "").toLowerCase();
          return Object.values(db.usuarios)
            .filter((u) => !b || u.nome.toLowerCase().includes(b))
            .map((u) => ({
              ...u,
              sugestoes: db.sugestoes.filter((s) => s.autor_id === u.id).length,
              aprovadas: db.sugestoes.filter(
                (s) => s.autor_id === u.id && s.status === "aprovada",
              ).length,
              criado: agora(10),
            }));
        },
        async definirPapel(id, novo) {
          exigirDono();
          const u = db.usuarios[id];
          if (!u) throw new Error("Usuário não encontrado.");
          if (novo === "dono")
            throw new Error(
              "O papel de dono só é dado pelo painel do Supabase.",
            );
          if (id === eu().id)
            throw new Error("Você não pode mudar o próprio papel.");
          if (u.papel === "dono")
            throw new Error("Não dá para mudar outro dono.");
          registrar("definir_papel", "usuario", id, {
            nome: u.nome,
            de: u.papel,
            para: novo,
          });
          u.papel = novo;
          salvar();
        },
        async banir(id, banir, motivo) {
          exigirDono();
          const u = db.usuarios[id];
          if (!u) throw new Error("Usuário não encontrado.");
          if (id === eu().id) throw new Error("Você não pode se banir.");
          if (u.papel === "dono") throw new Error("Não dá para banir um dono.");
          u.banido = !!banir;
          if (banir)
            for (const s of db.sugestoes)
              if (s.autor_id === id && s.status === "pendente")
                Object.assign(s, {
                  status: "recusada",
                  motivo: "Conta suspensa.",
                });
          registrar(banir ? "banir" : "desbanir", "usuario", id, {
            nome: u.nome,
            motivo,
          });
          salvar();
        },
        async patrocinio() {
          exigirDono();
          return { ...db.patrocinio };
        },
        async salvarPatrocinio(d) {
          exigirDono();
          if (d.link && !window.U.linkSeguro(d.link))
            throw new Error("O link precisa começar com https://");
          db.patrocinio = {
            texto: d.texto || "",
            link: d.link || null,
            imagem: d.imagem || null,
            ativo: !!d.ativo,
          };
          registrar("salvar_patrocinio", "patrocinio", "1", { texto: d.texto });
          salvar();
        },
        async afiliados() {
          exigirDono();
          return db.afiliados.map((a) => ({ ...a }));
        },
        async salvarAfiliado(id, d) {
          exigirDono();
          if (!window.U.linkSeguro(d.link))
            throw new Error("O link precisa começar com https://");
          if (!d.titulo || d.titulo.length < 2)
            throw new Error("Escreva o título.");
          let a = id && db.afiliados.find((x) => x.id === id);
          if (!a) {
            a = { id: novoId("a") };
            db.afiliados.push(a);
          }
          Object.assign(a, {
            titulo: d.titulo,
            descricao: d.descricao || null,
            loja: d.loja || null,
            preco_texto: d.preco_texto || null,
            link: d.link,
            imagem: d.imagem || null,
            ordem: Number(d.ordem) || 0,
            ativo: d.ativo !== false,
          });
          registrar("salvar_afiliado", "afiliado", a.id, { titulo: d.titulo });
          salvar();
          return a.id;
        },
        async apagarAfiliado(id) {
          exigirDono();
          db.afiliados = db.afiliados.filter((a) => a.id !== id);
          registrar("apagar_afiliado", "afiliado", id, {});
          salvar();
        },
        async pontosRemovidos() {
          exigirDono();
          return db.pontos
            .filter((p) => p.removido_em)
            .map((p) => ({
              id: p.id,
              nome: p.nome,
              categoria: p.categoria,
              removido_em: p.removido_em,
              removido_motivo: p.removido_motivo,
              removido_por_nome: p.removido_por_nome || null,
            }));
        },
        async restaurarPonto(id) {
          exigirDono();
          const p = db.pontos.find((x) => x.id === id && x.removido_em);
          if (!p) throw new Error("Ponto removido não encontrado.");
          p.removido_em = null;
          p.removido_motivo = null;
          p.removido_por_nome = null;
          registrar("restaurar_ponto", "ponto", id, { nome: p.nome });
          salvar();
        },
        async limparRecusadas() {
          exigirDono();
          registrar("limpar_recusadas", "sugestao", null, { dias: 90 });
          salvar();
          return 0;
        },
      },
    };
  };
})();
