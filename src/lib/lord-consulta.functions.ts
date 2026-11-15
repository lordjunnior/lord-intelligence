export async function consultar({ data }: { data: { tipo: 'cnpj' | 'cep'; valor: string } }) {
  const r = await fetch('/api/lord-consulta', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(data) });
  const j = await r.json(); if (!r.ok) throw new Error(j.erro || 'Consulta indisponível.'); return j;
}
