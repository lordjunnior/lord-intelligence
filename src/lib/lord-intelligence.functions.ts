async function call(action: string, data: Record<string,string>) {
  const r = await fetch('/api/lord-intelligence', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action, ...data }) });
  const j = await r.json(); if (!r.ok) throw new Error(j.erro || 'Consulta indisponível.'); return j;
}
export const consultarSicaf = ({ data }: { data: { cnpj: string } }) => call('sicaf', data);
export const consultarContratos = ({ data }: { data: { cnpj: string; orgao: string } }) => call('contratos', data);
