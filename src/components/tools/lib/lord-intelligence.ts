import type { Resultado } from "./lord-consulta";

export type SicafFornecedor = {
  razaoSocial: string | null;
  ativo: boolean | null;
  habilitadoLicitar: boolean | null;
  cnae: string | null;
  municipioUf: string | null;
  naturezaJuridica: string | null;
  porte: string | null;
};
export type SicafResultado = {
  estado: "encontrado" | "nao_encontrado" | "indisponivel";
  consulta: string;
  fonte: string;
  fonteUrl: string;
  horario: string;
  fornecedor: SicafFornecedor | null;
  mensagem?: string;
};

export type ContratoPublico = {
  id: string;
  numero: string;
  orgao: string;
  unidade: string;
  objeto: string;
  modalidade: string;
  inicio: string;
  fim: string;
  valorGlobal: number | null;
  pncp: string | null;
};
export type ContratosResultado = {
  estado: "encontrado" | "nao_encontrado" | "indisponivel";
  fonteUrl: string;
  horario: string;
  total: number;
  contratos: ContratoPublico[];
  mensagem?: string;
};

const text = (value: unknown) =>
  value === null || value === undefined || String(value).trim() === ""
    ? null
    : String(value).trim();
const brl = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : null;
type ApiRecord = Record<string, unknown>;
const asRecord = (value: unknown): ApiRecord =>
  value !== null && typeof value === "object" ? (value as ApiRecord) : {};

export function normalizarSicaf(
  json: unknown,
  cnpj: string,
  horario: string,
  fonteUrl: string,
): SicafResultado {
  const data = asRecord(json);
  const first = Array.isArray(data["resultado"]) ? data["resultado"][0] : null;
  const item = first !== null && typeof first === "object" ? asRecord(first) : null;
  if (!item)
    return {
      estado: "nao_encontrado",
      consulta: cnpj,
      fonte: "Compras.gov.br · SICAF",
      fonteUrl,
      horario,
      fornecedor: null,
    };
  return {
    estado: "encontrado",
    consulta: cnpj,
    fonte: "Compras.gov.br · SICAF",
    fonteUrl,
    horario,
    fornecedor: {
      razaoSocial: text(item["nomeRazaoSocialFornecedor"]),
      ativo: typeof item["ativo"] === "boolean" ? item["ativo"] : null,
      habilitadoLicitar:
        typeof item["habilitadoLicitar"] === "boolean" ? item["habilitadoLicitar"] : null,
      cnae: [text(item["codigoCnae"]), text(item["nomeCnae"])].filter(Boolean).join(" · ") || null,
      municipioUf:
        [text(item["nomeMunicipio"]), text(item["ufSigla"])].filter(Boolean).join("/") || null,
      naturezaJuridica: text(item["naturezaJuridicaNome"]),
      porte: text(item["porteEmpresaNome"]),
    },
  };
}

export function normalizarContratos(
  json: unknown,
  horario: string,
  fonteUrl: string,
): ContratosResultado {
  const data = asRecord(json);
  const rows = Array.isArray(data["resultado"]) ? data["resultado"].map(asRecord) : [];
  const contratos = rows.map((item: ApiRecord, index: number): ContratoPublico => ({
    id:
      text(item["numeroControlePncpContrato"]) ??
      `${text(item["numeroContrato"]) ?? "contrato"}-${index}`,
    numero: text(item["numeroContrato"]) ?? "Não informado",
    orgao: text(item["nomeOrgao"]) ?? "Órgão não informado",
    unidade: text(item["nomeUnidadeGestora"]) ?? "Unidade não informada",
    objeto: text(item["objeto"]) ?? "Objeto não informado",
    modalidade: text(item["nomeModalidadeCompra"]) ?? "Modalidade não informada",
    inicio: text(item["dataVigenciaInicial"]) ?? "",
    fim: text(item["dataVigenciaFinal"]) ?? "",
    valorGlobal: brl(item["valorGlobal"]),
    pncp: text(item["numeroControlePncpContrato"]),
  }));
  return {
    estado: contratos.length ? "encontrado" : "nao_encontrado",
    fonteUrl,
    horario,
    total: typeof data["totalRegistros"] === "number" ? data["totalRegistros"] : contratos.length,
    contratos,
  };
}

export type SinalCadastral = { tone: "ok" | "atencao" | "neutro"; title: string; detail: string };
export function analisarSinais(resultado: Resultado): SinalCadastral[] {
  if (resultado.tipo !== "cnpj" || resultado.estado !== "encontrado") return [];
  const campo = (label: string) =>
    resultado.campos.find((item) => item.rotulo === label)?.valor ?? null;
  const situacao = campo("Situação cadastral");
  const abertura = campo("Data de abertura");
  const sinais: SinalCadastral[] = [];
  if (situacao?.toUpperCase() === "ATIVA")
    sinais.push({
      tone: "ok",
      title: "Situação cadastral ativa",
      detail: "É um dado positivo, não um certificado de idoneidade, solvência ou confiança.",
    });
  else
    sinais.push({
      tone: "atencao",
      title: "Situação cadastral exige revisão",
      detail: situacao
        ? `A fonte informa: ${situacao}. Consulte o motivo antes de fechar negócio.`
        : "A fonte não informou a situação cadastral.",
    });
  const match = abertura?.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (match) {
    const opened = new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
    const years = (Date.now() - opened.getTime()) / (365.2425 * 24 * 60 * 60 * 1000);
    if (years < 2)
      sinais.push({
        tone: "atencao",
        title: "Menos de dois anos de abertura",
        detail:
          "Empresa recente merece checagem adicional de referências, capacidade operacional e vínculos.",
      });
    else
      sinais.push({
        tone: "neutro",
        title: `${Math.floor(years)} anos desde a abertura`,
        detail: "Tempo de registro não comprova atividade real nem saúde financeira.",
      });
  }
  if (!resultado.socios?.length)
    sinais.push({
      tone: "neutro",
      title: "Quadro societário não listado",
      detail: "A fonte não devolveu sócios. Isso é ausência de dado, não ausência de sócios.",
    });
  return sinais;
}

export const intelligenceSources = [
  {
    id: "sancoes",
    title: "Sanções federais",
    detail: "CEIS, CNEP e CEPIM exigem conferência nominal na consulta oficial.",
    source: "Portal da Transparência · CGU",
    url: "https://portaldatransparencia.gov.br/sancoes/consulta",
  },
  {
    id: "pgfn",
    title: "Dívida ativa e Dívida Aberta",
    detail: "Consulte débitos inscritos e a lista pública de devedores.",
    source: "PGFN",
    url: "https://www.listadevedores.pgfn.gov.br/",
  },
  {
    id: "cndt",
    title: "Débitos trabalhistas",
    detail: "Emita ou confira a Certidão Negativa de Débitos Trabalhistas.",
    source: "TST",
    url: "https://cndt-certidao.tst.jus.br/inicio.faces",
  },
  {
    id: "processos",
    title: "Processos públicos",
    detail: "Pesquise processos por CNPJ. Valor da causa não é dívida.",
    source: "CNJ",
    url: "https://comunica.pje.jus.br/",
  },
  {
    id: "fiscal",
    title: "Regularidade fiscal",
    detail: "Emita certidões na área conjunta da Receita Federal e PGFN.",
    source: "Receita Federal · PGFN",
    url: "https://servicos.receitafederal.gov.br/servico/certidoes/#/home",
  },
  {
    id: "compras",
    title: "Contratos e compras",
    detail: "Pesquise fornecedores, contratos e contratações públicas federais.",
    source: "Compras.gov.br",
    url: "https://www.gov.br/compras/pt-br",
  },
] as const;

export function resumoParaCopiar(resultado: Resultado, sicaf: SicafResultado | null): string {
  if (resultado.tipo !== "cnpj") return "";
  const lines = [
    "LORD INTELLIGENCE · DOSSIÊ DE FONTES PÚBLICAS",
    `CNPJ: ${resultado.consulta}`,
    `Consulta: ${new Date(resultado.horario).toLocaleString("pt-BR")}`,
    `Fonte cadastral: ${resultado.fonte}`,
    ...resultado.campos.filter((item) => item.valor).map((item) => `${item.rotulo}: ${item.valor}`),
    `SICAF: ${sicaf?.estado === "encontrado" ? "registro localizado" : sicaf?.estado === "nao_encontrado" ? "nenhum registro localizado" : "não consultado ou indisponível"}`,
    "",
    "Ausência de registro não é atestado de idoneidade. Confira sanções, dívidas e processos nas fontes oficiais.",
  ];
  return lines.join("\n");
}
