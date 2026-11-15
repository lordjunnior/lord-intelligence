import { useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowUpRight,
  Building2,
  Check,
  Copy,
  FileDown,
  Landmark,
  Search,
  ShieldAlert,
} from "lucide-react";
import { consultar } from "@/lib/lord-consulta.functions";
import { consultarContratos, consultarSicaf } from "@/lib/lord-intelligence.functions";
import {
  ehAlfanumerico,
  formatarCnpj,
  limparCnpj,
  mascararCnpj,
  validarCnpj,
  type Resultado,
} from "@/components/tools/lib/lord-consulta";
import {
  analisarSinais,
  intelligenceSources,
  resumoParaCopiar,
  type ContratosResultado,
  type SicafResultado,
} from "@/components/tools/lib/lord-intelligence";
import { SupportFuel } from "@/components/SupportFuel";
import { Faq, SuiteCover } from "./SovereignKit";

const dataCurta = (value: string) => {
  if (!value) return "Não informada";
  const parsed = new Date(value.replace(" ", "T"));
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString("pt-BR");
};
const moeda = (value: number | null) =>
  value === null
    ? "Não informado"
    : value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function LordIntelligence() {
  const [valor, setValor] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [sicaf, setSicaf] = useState<SicafResultado | null>(null);
  const [orgao, setOrgao] = useState("");
  const [contratos, setContratos] = useState<ContratosResultado | null>(null);
  const [buscandoContratos, setBuscandoContratos] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const valido = validarCnpj(valor);

  const enviar = async (event: FormEvent) => {
    event.preventDefault();
    if (!valido || carregando) return;
    setCarregando(true);
    setErro(null);
    setResultado(null);
    setSicaf(null);
    setContratos(null);
    try {
      const cnpj = limparCnpj(valor);
      const [cadastral, fornecedor] = await Promise.all([
        consultar({ data: { tipo: "cnpj", valor: cnpj } }),
        ehAlfanumerico(cnpj) ? Promise.resolve(null) : consultarSicaf({ data: { cnpj } }),
      ]);
      if ("erro" in cadastral) {
        setErro(cadastral.erro);
        return;
      }
      setResultado(cadastral);
      if (fornecedor && !("erro" in fornecedor)) setSicaf(fornecedor);
    } catch {
      setErro("Não foi possível concluir o dossiê agora. Nenhum dado foi salvo; tente novamente.");
    } finally {
      setCarregando(false);
    }
  };
  const cnpjAtual =
    resultado?.tipo === "cnpj" ? resultado.consulta : valido ? limparCnpj(valor) : "";
  const buscarContratos = async (event: FormEvent) => {
    event.preventDefault();
    if (!cnpjAtual || !/^\d{1,10}$/.test(orgao) || buscandoContratos) return;
    setBuscandoContratos(true);
    setContratos(null);
    setErro(null);
    try {
      const response = await consultarContratos({ data: { cnpj: cnpjAtual, orgao } });
      if ("erro" in response) setErro(response.erro);
      else setContratos(response);
    } catch {
      setErro("A consulta de contratos falhou. O restante do dossiê continua disponível.");
    } finally {
      setBuscandoContratos(false);
    }
  };
  const copiarDossie = async () => {
    if (!resultado) return;
    await navigator.clipboard.writeText(resumoParaCopiar(resultado, sicaf));
    setCopiado(true);
    setTimeout(() => setCopiado(false), 1500);
  };

  return (
    <div className="ss-root">
      <SuiteCover
        src="/paginas/lord-intelligence.jpg"
        alt="Dossiê de investigação com lupa diante de um edifício institucional brasileiro"
        kicker="Investigação Empresarial · Fontes públicas brasileiras"
        title="LORD"
        accent="INTELLIGENCE"
        lead="Um CNPJ, um dossiê organizado. Cadastro Receita, quadro societário, SICAF, contratos federais por órgão e caminhos oficiais para sanções, dívidas e processos."
        badges={[
          "Sem histórico",
          "Fontes identificadas",
          "Relatório imprimível",
          "Sem consulta de CPF",
        ]}
      />
      <div className="ss-wrap">
        <section className="ss-plate ss-no-print">
          <span className="ss-tag">01 · INVESTIGAÇÃO</span>
          <h2>
            <Search size={24} style={{ display: "inline", marginRight: 10 }} />
            Comece pelo CNPJ
          </h2>
          <p className="ss-sub">
            O sistema consulta a base cadastral pública e o registro de fornecedor federal em
            paralelo. As fontes que exigem verificação humana continuam sinalizadas, sem resultado
            inventado.
          </p>
          <form onSubmit={enviar}>
            <label className="ss-label" htmlFor="li-cnpj">
              CNPJ numérico ou alfanumérico
            </label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              <input
                id="li-cnpj"
                className="ss-input"
                style={{ flex: "1 1 280px", fontSize: 18, letterSpacing: ".06em" }}
                value={valor}
                maxLength={18}
                autoComplete="off"
                spellCheck={false}
                placeholder="00.000.000/0000-00"
                onChange={(event) => setValor(mascararCnpj(event.target.value))}
              />
              <button className="ss-btn" type="submit" disabled={!valido || carregando}>
                {carregando ? "MONTANDO DOSSIÊ…" : "INVESTIGAR CNPJ"}
              </button>
            </div>
            <p className="ss-source-note" style={{ marginTop: 10 }}>
              {valor && !valido
                ? "Os dígitos verificadores ainda não conferem."
                : "Sem cadastro, sem histórico e sem banco de dados das consultas."}
            </p>
          </form>
          <button
            type="button"
            className="ss-btn ghost"
            style={{ marginTop: 12 }}
            onClick={() => {
              setValor("27.865.757/0001-02");
              setResultado(null);
              setSicaf(null);
              setContratos(null);
              setErro(null);
            }}
          >
            Usar um CNPJ empresarial público como exemplo
          </button>
          {erro && (
            <p className="ss-message error" role="alert">
              {erro}
            </p>
          )}
        </section>

        {resultado?.tipo === "cnpj" && (
          <>
            <section className="ss-plate" id="dossie">
              <span className="ss-tag">02 · DOSSIÊ CADASTRAL</span>
              <h2>
                <Building2 size={25} style={{ display: "inline", marginRight: 10 }} />
                {formatarCnpj(resultado.consulta)}
              </h2>
              <p className="ss-sub">
                Fonte:{" "}
                <a
                  href={resultado.fonteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "var(--primary)" }}
                >
                  {resultado.fonte}
                </a>{" "}
                · consultado em {new Date(resultado.horario).toLocaleString("pt-BR")}
              </p>
              {resultado.estado === "encontrado" ? (
                <>
                  <dl className="ss-data-grid">
                    {resultado.campos.map((campo) => (
                      <div key={campo.rotulo}>
                        <dt>{campo.rotulo}</dt>
                        <dd>{campo.valor ?? "Não informado na fonte"}</dd>
                      </div>
                    ))}
                  </dl>
                  <div className="ss-row ss-no-print">
                    <button
                      type="button"
                      className="ss-btn ghost"
                      onClick={() => void copiarDossie()}
                    >
                      {copiado ? <Check size={14} /> : <Copy size={14} />}
                      {copiado ? "Resumo copiado" : "Copiar resumo"}
                    </button>
                    <button type="button" className="ss-btn ghost" onClick={() => window.print()}>
                      <FileDown size={14} />
                      Imprimir ou salvar em PDF
                    </button>
                  </div>
                </>
              ) : (
                <p className="ss-message error">
                  {resultado.estado === "nao_encontrado"
                    ? "CNPJ não localizado na fonte consultada. Confira o número e o suporte ao formato alfanumérico."
                    : "As fontes cadastrais estão indisponíveis no momento."}
                </p>
              )}
              <h3 className="ss-label">Limitações desta leitura</h3>
              <ul className="ss-list">
                {resultado.limitacoes.map((item, index) => (
                  <li key={item}>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>

            {resultado.estado === "encontrado" && (
              <>
                <section className="ss-plate">
                  <span className="ss-tag">03 · SINAIS, NÃO SENTENÇA</span>
                  <h2>Leitura para due diligence</h2>
                  <p className="ss-sub">
                    Estes sinais apenas organizam o que merece atenção. Não existe nota de confiança
                    nem diagnóstico automático de fraude.
                  </p>
                  <div className="ss-signals">
                    {analisarSinais(resultado).map((sinal) => (
                      <article key={sinal.title} className={`ss-signal ${sinal.tone}`}>
                        <strong>{sinal.title}</strong>
                        <p>{sinal.detail}</p>
                      </article>
                    ))}
                  </div>
                </section>

                <section className="ss-plate">
                  <span className="ss-tag">04 · VÍNCULOS E ATIVIDADES</span>
                  <h2>Quadro societário</h2>
                  {resultado.socios?.length ? (
                    <ol className="ss-list">
                      {resultado.socios.map((socio, index) => (
                        <li key={`${socio}-${index}`}>
                          <span>{String(index + 1).padStart(2, "0")}</span>
                          <span>{socio}</span>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <p className="ss-message neutral">
                      A fonte não devolveu o quadro societário para este CNPJ.
                    </p>
                  )}
                  <h3 className="ss-label">Atividades econômicas</h3>
                  {resultado.atividades?.length ? (
                    <ol className="ss-list">
                      {resultado.atividades.map((atividade, index) => (
                        <li key={`${atividade}-${index}`}>
                          <span>{String(index + 1).padStart(2, "0")}</span>
                          <span>{atividade}</span>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <p className="ss-message neutral">
                      Nenhuma atividade foi devolvida pela fonte.
                    </p>
                  )}
                </section>
              </>
            )}
          </>
        )}

        {resultado?.tipo === "cnpj" && resultado.estado === "encontrado" && (
          <>
            <section className="ss-plate">
              <span className="ss-tag">05 · SICAF</span>
              <h2>
                <Landmark size={24} style={{ display: "inline", marginRight: 10 }} />
                Fornecedor do governo federal
              </h2>
              {!sicaf || sicaf.estado === "indisponivel" ? (
                <p className="ss-message neutral">
                  {sicaf?.mensagem ??
                    "O SICAF não respondeu ou não aceita este formato de CNPJ. Isso não significa ausência de cadastro."}
                </p>
              ) : sicaf.estado === "nao_encontrado" ? (
                <p className="ss-message neutral">
                  Nenhum fornecedor ativo foi localizado nesta consulta. O recorte é o cadastro
                  federal consultado, não uma certidão negativa.
                </p>
              ) : (
                sicaf.fornecedor && (
                  <>
                    <p className="ss-message">
                      Registro ativo localizado no SICAF. Situação de habilitação:{" "}
                      <strong>
                        {sicaf.fornecedor.habilitadoLicitar === null
                          ? "não informada"
                          : sicaf.fornecedor.habilitadoLicitar
                            ? "habilitado para licitar"
                            : "não habilitado nesta resposta"}
                      </strong>
                      .
                    </p>
                    <dl className="ss-data-grid">
                      <div>
                        <dt>Razão social no SICAF</dt>
                        <dd>{sicaf.fornecedor.razaoSocial ?? "Não informada"}</dd>
                      </div>
                      <div>
                        <dt>CNAE</dt>
                        <dd>{sicaf.fornecedor.cnae ?? "Não informado"}</dd>
                      </div>
                      <div>
                        <dt>Município e UF</dt>
                        <dd>{sicaf.fornecedor.municipioUf ?? "Não informado"}</dd>
                      </div>
                      <div>
                        <dt>Natureza jurídica</dt>
                        <dd>{sicaf.fornecedor.naturezaJuridica ?? "Não informada"}</dd>
                      </div>
                      <div>
                        <dt>Porte</dt>
                        <dd>{sicaf.fornecedor.porte ?? "Não informado"}</dd>
                      </div>
                    </dl>
                  </>
                )
              )}
              {sicaf && (
                <p className="ss-source-note">
                  Fonte:{" "}
                  <a href={sicaf.fonteUrl} target="_blank" rel="noopener noreferrer">
                    {sicaf.fonte}
                  </a>{" "}
                  · {new Date(sicaf.horario).toLocaleString("pt-BR")}
                </p>
              )}
            </section>

            <section className="ss-plate">
              <span className="ss-tag">06 · CONTRATOS FEDERAIS</span>
              <h2>Recorte por órgão, últimos 365 dias</h2>
              <p className="ss-sub">
                A API pública exige o código do órgão e limita a janela a 365 dias. Informe o código
                oficial para buscar contratos em que o CNPJ aparece como fornecedor.
              </p>
              <form onSubmit={buscarContratos} className="ss-no-print">
                <label className="ss-label" htmlFor="li-orgao">
                  Código do órgão no Compras.gov.br
                </label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                  <input
                    id="li-orgao"
                    className="ss-input"
                    inputMode="numeric"
                    style={{ flex: "1 1 240px" }}
                    value={orgao}
                    onChange={(event) =>
                      setOrgao(event.target.value.replace(/\D/g, "").slice(0, 10))
                    }
                    placeholder="Ex.: código numérico do ministério"
                  />
                  <button
                    className="ss-btn"
                    disabled={!/^\d{1,10}$/.test(orgao) || buscandoContratos}
                  >
                    {buscandoContratos ? "CONSULTANDO…" : "BUSCAR CONTRATOS"}
                  </button>
                </div>
              </form>
              {contratos && (
                <div role="status">
                  <p
                    className={`ss-message ${contratos.estado === "indisponivel" ? "error" : "neutral"}`}
                  >
                    {contratos.mensagem ??
                      (contratos.estado === "encontrado"
                        ? `${contratos.total} contrato${contratos.total === 1 ? "" : "s"} localizado${contratos.total === 1 ? "" : "s"} neste recorte. A tabela mostra até 50 registros da primeira página.`
                        : "Nenhum contrato localizado para este órgão e período. Isso não descarta contratos com outros órgãos ou em outras datas.")}
                  </p>
                  {!!contratos.contratos.length && (
                    <div className="ss-table-wrap">
                      <table className="ss-table">
                        <thead>
                          <tr>
                            <th>Contrato e órgão</th>
                            <th>Objeto</th>
                            <th>Vigência</th>
                            <th>Valor global</th>
                          </tr>
                        </thead>
                        <tbody>
                          {contratos.contratos.map((contrato) => (
                            <tr key={contrato.id}>
                              <td>
                                <strong>{contrato.numero}</strong>
                                <br />
                                {contrato.orgao}
                                <br />
                                {contrato.modalidade}
                              </td>
                              <td>{contrato.objeto}</td>
                              <td>
                                {dataCurta(contrato.inicio)}
                                <br />
                                até {dataCurta(contrato.fim)}
                              </td>
                              <td>{moeda(contrato.valorGlobal)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  <p className="ss-source-note">
                    Fonte:{" "}
                    <a href={contratos.fonteUrl} target="_blank" rel="noopener noreferrer">
                      Compras.gov.br, contratos
                    </a>{" "}
                    · {new Date(contratos.horario).toLocaleString("pt-BR")}
                  </p>
                </div>
              )}
            </section>
          </>
        )}

        <section className="ss-plate">
          <span className="ss-tag">07 · VERIFICAÇÃO OFICIAL</span>
          <h2>
            <ShieldAlert size={24} style={{ display: "inline", marginRight: 10 }} />O que ainda
            precisa dos seus olhos
          </h2>
          <p className="ss-sub">
            Sanções, certidões e processos podem exigir nome, captcha ou emissão formal. Estes
            atalhos não fingem consulta automática.{" "}
            {cnpjAtual && (
              <>
                CNPJ pronto para copiar:{" "}
                <button
                  type="button"
                  className="ss-btn ghost"
                  style={{ padding: "5px 8px" }}
                  onClick={() => void navigator.clipboard.writeText(cnpjAtual)}
                >
                  {formatarCnpj(cnpjAtual)}
                </button>
              </>
            )}
          </p>
          <div className="ss-source-grid">
            {intelligenceSources.map((source) => (
              <a
                key={source.id}
                className="ss-source-card"
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                <small>{source.source}</small>
                <strong>{source.title}</strong>
                <p>{source.detail}</p>
                <i>Abrir fonte oficial ↗</i>
              </a>
            ))}
          </div>
        </section>

        <section className="ss-linked ss-no-print">
          <div>
            <h2>Feche o dossiê antes de compartilhar</h2>
            <p>
              O relatório pode conter dados empresariais sensíveis para sua operação. Criptografe
              uma cópia no próprio navegador antes de enviar.
            </p>
          </div>
          <Link to="/ferramentas/lord-vault" className="ss-btn ghost">
            Proteger com LORD VAULT
            <ArrowUpRight size={14} />
          </Link>
        </section>

        <Faq
          items={[
            {
              q: "O LORD INTELLIGENCE consulta pessoas por CPF?",
              a: "Não. A ferramenta foi desenhada para informação pública de empresas, contratos e fontes oficiais. Não consulta CPF, score privado, Serasa, SPC ou conta bancária.",
            },
            {
              q: "Por que sanções não aparecem automaticamente?",
              a: "A API de sanções do Portal da Transparência exige credencial e verificação de escopo. Sem uma base importada e datada, afirmar que uma empresa está limpa seria enganoso. O atalho oficial fica disponível para conferência humana.",
            },
            {
              q: "Nenhum contrato encontrado significa que não existe contrato?",
              a: "Não. O recorte automático reúne um órgão e os últimos 365 dias, com até 50 resultados na primeira página. Outros órgãos, períodos e esferas federativas precisam de novas consultas.",
            },
            {
              q: "O relatório tem valor de certidão?",
              a: "Não. É uma organização de fontes públicas com horário e origem. Para certidões formais, use os serviços oficiais indicados no dossiê.",
            },
          ]}
        />
        <p className="ss-source-note">
          Referência de fontes:{" "}
          <a
            href="https://github.com/nferdica/brazil-visible"
            target="_blank"
            rel="noopener noreferrer"
          >
            Brazil Visible
          </a>
          . Consultas implementadas diretamente contra as fontes públicas identificadas.
        </p>
        <div className="ss-no-print">
          <SupportFuel />
        </div>
      </div>
    </div>
  );
}
