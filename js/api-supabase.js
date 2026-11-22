// Conversa com o Supabase de verdade. Só usa a chave "anon" (pública).
// Quem garante a segurança é o banco (RLS + funções); este arquivo só pede.
(function () {
  "use strict";

  const COLUNAS_PONTO =
    "id,nome,categoria,subtipo,regiao,referencia,o_que_tem,valor,como_pegar,codigo,x,y,precisao,confianca,observacoes,fontes,print_path,descoberto_em,autor:perfis!pontos_autor_id_fkey(nome)";

  function checar({ data, error }) {
    if (error) throw error;
    return data;
  }

  window.criarApiSupabase = function () {
    const cfg = window.CONFIG;
    const sb = window.supabase.createClient(
      cfg.SUPABASE_URL,
      cfg.SUPABASE_ANON_KEY,
      {
        auth: {
          flowType: "pkce",
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      },
    );
    let perfil = null;
    const ouvintes = new Set();

    async function carregarPerfil() {
      const { data: s } = await sb.auth.getSession();
      if (!s || !s.session) {
        perfil = null;
        return null;
      }
      // nome e foto vêm do Discord (auth.identities), nunca dos metadados do login
      await sb.rpc("sincronizar_perfil");
      const linhas = checar(await sb.rpc("meu_perfil"));
      perfil = (linhas && linhas[0]) || null;
      return perfil;
    }

    sb.auth.onAuthStateChange((evento) => {
      if (
        evento === "SIGNED_IN" ||
        evento === "SIGNED_OUT" ||
        evento === "USER_UPDATED"
      ) {
        // fora do callback (recomendação do supabase-js para não travar)
        setTimeout(async () => {
          try {
            await carregarPerfil();
          } catch (e) {
            perfil = null;
          }
          ouvintes.forEach((f) => f(perfil));
        }, 0);
      }
    });

    async function urlsPrints(caminhos) {
      const lista = [...new Set(caminhos.filter(Boolean))];
      if (!lista.length) return {};
      const { data, error } = await sb.storage
        .from("prints")
        .createSignedUrls(lista, 3600);
      if (error) return {};
      const mapa = {};
      for (const d of data || [])
        if (d && d.signedUrl && !d.error) mapa[d.path] = d.signedUrl;
      return mapa;
    }

    function nomeArquivo(ext) {
      const r = crypto.getRandomValues(new Uint8Array(12));
      return (
        Array.from(r, (b) => b.toString(16).padStart(2, "0")).join("") +
        "." +
        ext
      );
    }

    return {
      demo: false,
      async iniciar() {
        try {
          return await carregarPerfil();
        } catch (e) {
          return null;
        }
      },
      get perfil() {
        return perfil;
      },
      aoMudarSessao(f) {
        ouvintes.add(f);
      },
      async entrar() {
        const volta = location.origin + location.pathname;
        // Supabase sempre pede "identify" + "email" ao Discord; o site não guarda o e-mail no perfil.
        checar(
          await sb.auth.signInWithOAuth({
            provider: "discord",
            options: { redirectTo: volta, scopes: "identify" },
          }),
        );
      },
      async sair() {
        await sb.auth.signOut();
        perfil = null;
        ouvintes.forEach((f) => f(null));
      },
      async pontos() {
        const lista = checar(
          await sb
            .from("pontos")
            .select(COLUNAS_PONTO)
            .order("criado", { ascending: true })
            .limit(2000),
        );
        return lista;
      },
      urlsPrints,
      async enviarSugestao(campos, blob, ext) {
        if (!perfil) throw new Error("Entre com o Discord para sugerir.");
        let print_path = null;
        if (blob) {
          print_path = perfil.id + "/" + nomeArquivo(ext);
          checar(
            await sb.storage.from("prints").upload(print_path, blob, {
              contentType: ext === "webp" ? "image/webp" : "image/jpeg",
              upsert: false,
              cacheControl: "3600",
            }),
          );
        }
        const linha = {
          nome: campos.nome,
          categoria: campos.categoria,
          o_que_tem: campos.o_que_tem,
          valor: campos.valor,
          como_pegar: campos.como_pegar,
          codigo: campos.codigo || null,
          x: campos.x,
          y: campos.y,
          print_path,
        };
        const { error } = await sb.from("sugestoes").insert(linha);
        if (error) {
          if (print_path) await sb.storage.from("prints").remove([print_path]);
          throw error;
        }
      },
      async minhasSugestoes() {
        if (!perfil) return [];
        return checar(
          await sb
            .from("sugestoes")
            .select(
              "id,nome,categoria,status,motivo,criado,print_path,ponto_id",
            )
            .eq("autor_id", perfil.id)
            .order("criado", { ascending: false })
            .limit(100),
        );
      },
      async apagarSugestao(s) {
        checar(await sb.from("sugestoes").delete().eq("id", s.id));
        if (s.print_path)
          await sb.storage.from("prints").remove([s.print_path]);
      },
      async denunciar(pontoId, motivo) {
        checar(
          await sb.from("denuncias").insert({ ponto_id: pontoId, motivo }),
        );
      },
      async patrocinio() {
        const l = checar(
          await sb
            .from("patrocinio")
            .select("texto,link,imagem,ativo")
            .eq("ativo", true)
            .limit(1),
        );
        return l[0] || null;
      },
      async afiliados() {
        return checar(
          await sb
            .from("afiliados")
            .select("id,titulo,descricao,loja,preco_texto,link,imagem")
            .eq("ativo", true)
            .order("ordem")
            .limit(30),
        );
      },
      // Apaga tudo pela Edge Function "apagar-conta" (banco, prints e login, no servidor).
      async apagarConta() {
        const { data, error } = await sb.functions.invoke("apagar-conta", {
          method: "POST",
          body: {},
        });
        if (error) {
          let msg = "Não consegui apagar a conta. Tente de novo.";
          try {
            const corpo = await error.context.json();
            if (corpo && typeof corpo.erro === "string") msg = corpo.erro;
          } catch (e) {
            /* resposta sem corpo */
          }
          throw new Error(msg);
        }
        if (!data || data.ok !== true)
          throw new Error("Não consegui apagar a conta. Tente de novo.");
        await sb.auth.signOut();
        perfil = null;
      },

      // ----- moderação -----
      mod: {
        async fila(status) {
          return checar(
            await sb
              .from("sugestoes")
              .select("*,autor:perfis!sugestoes_autor_id_fkey(nome)")
              .eq("status", status || "pendente")
              .order("criado", { ascending: true })
              .limit(100),
          );
        },
        async aprovar(id, edicoes) {
          return checar(
            await sb.rpc("aprovar_sugestao", {
              p_id: id,
              p_edicoes: edicoes || {},
            }),
          );
        },
        async recusar(id, motivo) {
          checar(
            await sb.rpc("recusar_sugestao", { p_id: id, p_motivo: motivo }),
          );
        },
        async denuncias() {
          return checar(
            await sb
              .from("denuncias")
              .select("*,autor:perfis!denuncias_autor_id_fkey(nome)")
              .eq("status", "aberta")
              .order("criado")
              .limit(100),
          );
        },
        async resolverDenuncia(id, acao, nota) {
          checar(
            await sb.rpc("resolver_denuncia", {
              p_id: id,
              p_acao: acao,
              p_nota: nota || null,
            }),
          );
        },
        async log() {
          return checar(
            await sb
              .from("log_moderacao")
              .select(
                "id,acao,alvo_tipo,alvo_id,detalhes,criado,ator:perfis!log_moderacao_ator_id_fkey(nome)",
              )
              .order("criado", { ascending: false })
              .limit(100),
          );
        },
        async usuarios(busca) {
          return checar(
            await sb.rpc("listar_usuarios", {
              p_busca: busca || null,
              p_limite: 100,
            }),
          );
        },
        async definirPapel(id, papel) {
          checar(
            await sb.rpc("definir_papel", { p_usuario: id, p_papel: papel }),
          );
        },
        async banir(id, banir, motivo) {
          checar(
            await sb.rpc("banir_usuario", {
              p_usuario: id,
              p_banir: banir,
              p_motivo: motivo || null,
            }),
          );
        },
        async patrocinio() {
          const l = checar(
            await sb
              .from("patrocinio")
              .select("texto,link,imagem,ativo")
              .limit(1),
          );
          return l[0] || { texto: "", link: "", imagem: "", ativo: false };
        },
        async salvarPatrocinio(d) {
          checar(
            await sb.rpc("salvar_patrocinio", {
              p_texto: d.texto,
              p_link: d.link,
              p_imagem: d.imagem,
              p_ativo: d.ativo,
            }),
          );
        },
        async afiliados() {
          return checar(
            await sb.from("afiliados").select("*").order("ordem").limit(100),
          );
        },
        async salvarAfiliado(id, d) {
          return checar(
            await sb.rpc("salvar_afiliado", { p_id: id || null, p_dados: d }),
          );
        },
        async apagarAfiliado(id) {
          checar(await sb.rpc("apagar_afiliado", { p_id: id }));
        },
        async pontosRemovidos() {
          return checar(await sb.rpc("pontos_removidos")) || [];
        },
        async restaurarPonto(id) {
          checar(await sb.rpc("restaurar_ponto", { p_id: id }));
        },
        async limparRecusadas() {
          const caminhos =
            checar(await sb.rpc("limpar_recusadas", { p_dias: 90 })) || [];
          if (caminhos.length) await sb.storage.from("prints").remove(caminhos);
          return caminhos.length;
        },
      },
    };
  };
})();
