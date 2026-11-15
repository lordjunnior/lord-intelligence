/** Lord Consulta: validação e normalização puras (sem DOM, sem rede). */
export type Estado = "encontrado" | "nao_encontrado" | "indisponivel";
export type Campo = { rotulo: string; valor: string | null };
export type Resultado = {
  tipo: "cnpj" | "cep";
  consulta: string;
  estado: Estado;
  fonte: string;
  fonteUrl: string;
  horario: string;
  campos: Campo[];
  atividades?: string[];
  socios?: string[];
  limitacoes: string[];
};

export const limparCnpj = (v: string) => v.toUpperCase().replace(/[^0-9A-Z]/g, "");
export const limparCep = (v: string) => v.replace(/\D/g, "");

const dv = (base: string) => {
  let soma = 0,
    peso = 2;
  for (let i = base.length - 1; i >= 0; i--) {
    soma += (base.charCodeAt(i) - 48) * peso;
    peso = peso === 9 ? 2 : peso + 1;
  }
  const r = soma % 11;
  return r < 2 ? 0 : 11 - r;
};

/** Aceita CNPJ numérico e o novo alfanumérico (12 posições A-Z/0-9 + 2 dígitos verificadores). */
export function validarCnpj(entrada: string): boolean {
  const c = limparCnpj(entrada);
  if (!/^[0-9A-Z]{12}\d{2}$/.test(c) || /^(\d)\1{13}$/.test(c)) return false;
  const d1 = dv(c.slice(0, 12));
  const d2 = dv(c.slice(0, 12) + d1);
  return c.endsWith(`${d1}${d2}`);
}
export const validarCep = (entrada: string) => /^\d{8}$/.test(limparCep(entrada));
export const ehAlfanumerico = (cnpj: string) => /[A-Z]/.test(limparCnpj(cnpj));

export function formatarCnpj(v: string) {
  const c = limparCnpj(v);
  return c.length === 14
    ? `${c.slice(0, 2)}.${c.slice(2, 5)}.${c.slice(5, 8)}/${c.slice(8, 12)}-${c.slice(12)}`
    : c;
}
const txt = (v: unknown) =>
  v === null || v === undefined || String(v).trim() === "" ? null : String(v).trim();
const data = (v: unknown) => {
  const s = txt(v);
  const m = s?.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : s;
};

/** Booleano da Receita: null quando a fonte não informa (nunca presume "Não"). */
export const simNao = (v: unknown) => (v === true ? "Sim" : v === false ? "Não" : null);

/** Classifica a resposta HTTP de uma fonte, como na referência lord-consulta: 400/404 = não encontrado; 429, 5xx e falha de rede = indisponível. */
export function classificarStatus(status: number | null): "ok" | "not_found" | "down" {
  if (status === null) return "down";
  if (status >= 200 && status < 300) return "ok";
  if (status === 400 || status === 404) return "not_found";
  return "down";
}

/** Máscara progressiva para digitação. */
export function mascararCnpj(v: string) {
  const c = limparCnpj(v).slice(0, 14);
  return (
    [c.slice(0, 2), c.slice(2, 5), c.slice(5, 8)].filter(Boolean).join(".") +
    (c.length > 8 ? `/${c.slice(8, 12)}` : "") +
    (c.length > 12 ? `-${c.slice(12)}` : "")
  );
}
export function mascararCep(v: string) {
  const c = limparCep(v).slice(0, 8);
  return c.length > 5 ? `${c.slice(0, 5)}-${c.slice(5)}` : c;
}

/** BrasilAPI e Minha Receita publicam o mesmo esquema de dados da Receita Federal. */
export function normalizarCnpj(j: any): Pick<Resultado, "campos" | "atividades" | "socios"> {
  const end = [txt(j.descricao_tipo_de_logradouro), txt(j.logradouro)].filter(Boolean).join(" ");
  const endereco = end
    ? [
        end,
        txt(j.numero),
        txt(j.complemento),
        txt(j.bairro),
        [txt(j.municipio), txt(j.uf)].filter(Boolean).join("/"),
        txt(j.cep),
      ]
        .filter(Boolean)
        .join(", ")
    : null;
  const atividades = [
    j.cnae_fiscal ? `${j.cnae_fiscal} · ${j.cnae_fiscal_descricao ?? ""} (principal)` : null,
    ...(Array.isArray(j.cnaes_secundarios)
      ? j.cnaes_secundarios
          .filter((x: any) => x?.codigo)
          .map((x: any) => `${x.codigo} · ${x.descricao ?? ""}`)
      : []),
  ].filter(Boolean) as string[];
  const socios = Array.isArray(j.qsa)
    ? j.qsa
        .map((s: any) => [txt(s.nome_socio), txt(s.qualificacao_socio)].filter(Boolean).join(" · "))
        .filter(Boolean)
    : [];
  return {
    campos: [
      { rotulo: "Razão social", valor: txt(j.razao_social) },
      { rotulo: "Nome fantasia", valor: txt(j.nome_fantasia) },
      { rotulo: "Situação cadastral", valor: txt(j.descricao_situacao_cadastral) },
      { rotulo: "Data da situação", valor: data(j.data_situacao_cadastral) },
      { rotulo: "Motivo da situação", valor: txt(j.descricao_motivo_situacao_cadastral) },
      { rotulo: "Situação especial", valor: txt(j.situacao_especial) },
      { rotulo: "Matriz ou filial", valor: txt(j.descricao_identificador_matriz_filial) },
      { rotulo: "Data de abertura", valor: data(j.data_inicio_atividade) },
      { rotulo: "Natureza jurídica", valor: txt(j.natureza_juridica) },
      { rotulo: "Porte", valor: txt(j.porte) },
      { rotulo: "Simples Nacional", valor: simNao(j.opcao_pelo_simples) },
      { rotulo: "MEI", valor: simNao(j.opcao_pelo_mei) },
      {
        rotulo: "Capital social",
        valor:
          typeof j.capital_social === "number"
            ? j.capital_social.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
            : txt(j.capital_social),
      },
      { rotulo: "Endereço", valor: endereco },
    ],
    atividades,
    socios,
  };
}
export function normalizarCepBrasilApi(j: any): Campo[] {
  const lat = txt(j?.location?.coordinates?.latitude),
    lon = txt(j?.location?.coordinates?.longitude);
  return [
    { rotulo: "CEP", valor: txt(j.cep) },
    { rotulo: "Logradouro", valor: txt(j.street) },
    { rotulo: "Complemento", valor: null },
    { rotulo: "Bairro", valor: txt(j.neighborhood) },
    { rotulo: "Município", valor: txt(j.city) },
    { rotulo: "UF", valor: txt(j.state) },
    { rotulo: "Código IBGE do município", valor: txt(j?.ibge?.city) },
    { rotulo: "Coordenadas aproximadas", valor: lat && lon ? `${lat}, ${lon}` : null },
    { rotulo: "Fuso horário", valor: txt(j.timezoneName) },
  ];
}
export function normalizarViaCep(j: any): Campo[] {
  return [
    { rotulo: "CEP", valor: txt(j.cep) },
    { rotulo: "Logradouro", valor: txt(j.logradouro) },
    { rotulo: "Complemento", valor: txt(j.complemento) },
    { rotulo: "Bairro", valor: txt(j.bairro) },
    { rotulo: "Município", valor: txt(j.localidade) },
    { rotulo: "UF", valor: txt(j.uf) },
  ];
}

/**
 * Base PGFN integrada: ainda NÃO existe neste ambiente. Depende da importação dos dados abertos
 * trimestrais da PGFN (arquivos de vários GB), de tabela indexada por CNPJ e de rotina de atualização.
 * Enquanto `disponivel` for false, a interface não pode afirmar que consultou a PGFN.
 */
export const basePgfn = {
  disponivel: false as boolean,
  fonte: "Dados abertos da PGFN",
  url: "https://www.gov.br/pgfn/pt-br/assuntos/divida-ativa-da-uniao/transparencia-fiscal-1/dados-abertos",
  dataReferencia: null as string | null,
};

/** Passivos e regularidade pública: verificação guiada nas fontes oficiais (sem raspagem). */
export const passivos = [
  {
    id: "pgfn",
    verificacao: "PGFN / Dívida Aberta",
    revela:
      "Débitos inscritos na dívida ativa da União e do FGTS, incluindo natureza e valores disponíveis",
    fonte: "Dívida Aberta, PGFN",
    url: "https://www.listadevedores.pgfn.gov.br/",
  },
  {
    id: "cndt",
    verificacao: "CNDT / TST",
    revela: "Existência de débitos trabalhistas em execução definitiva",
    fonte: "Certidão Negativa de Débitos Trabalhistas, TST",
    url: "https://cndt-certidao.tst.jus.br/inicio.faces",
  },
  {
    id: "mte",
    verificacao: "Ministério do Trabalho",
    revela: "Débitos e multas decorrentes de fiscalização trabalhista",
    fonte: "Certidão de Débitos Trabalhistas, Ministério do Trabalho",
    url: "https://eprocesso.sit.trabalho.gov.br/Certidao/Emitir",
  },
  {
    id: "processos",
    verificacao: "Processos judiciais",
    revela:
      "Ações públicas envolvendo a empresa, em módulo próprio e sem confundir valor da causa com dívida",
    fonte: "Consulta processual unificada, CNJ",
    url: "https://comunica.pje.jus.br/",
  },
  {
    id: "fiscal",
    verificacao: "Regularidade fiscal",
    revela: "Certidões e pendências que possam ser verificadas em fontes oficiais",
    fonte: "Certidão de regularidade, Receita Federal e PGFN",
    url: "https://servicos.receitafederal.gov.br/servico/certidoes/#/home",
  },
] as const;
