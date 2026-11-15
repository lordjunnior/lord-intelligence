import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Check, Copy, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const LN = "securecorn53@walletofsatoshi.com";
const QR = "/acervo/img/8c15098f-qrcode-lightning.webp";
const SATS = [{ sats: 1000, brl: "~R$ 3,30" }, { sats: 5000, brl: "~R$ 16,50" }, { sats: 21000, brl: "~R$ 69,30" }];

function Donation() {
  const [sel, setSel] = useState<number>(1);
  const [custom, setCustom] = useState("");
  const customSats = Math.max(0, Math.floor(Number(custom.replace(/\D/g, "")) || 0));
  const amount = sel === -1 ? customSats : SATS[sel]!.sats;
  const [copied, setCopied] = useState(false);
  const copy = async () => { try { await navigator.clipboard.writeText(LN); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* sem permissão */ } };
  return <div className="border border-primary/40 bg-background p-6 sm:p-8">
    <div className="mb-6 flex items-center justify-between font-mono text-xs"><span className="flex items-center gap-2 text-primary"><Zap className="size-4" /> Lightning</span><span className="text-muted-foreground">Doar via Lightning</span></div>
    <p className="silo-title text-3xl">Combustível Soberano</p>
    <p className="mt-6 font-mono text-[11px] text-muted-foreground">Endereço Lightning</p>
    <div className="mt-3 grid grid-cols-[auto_1fr] items-center gap-5">
      <a href={`lightning:${LN}`} aria-label="Abrir carteira Lightning" className="group block border border-primary/40 bg-foreground p-2 transition hover:scale-[1.03] hover:shadow-[0_0_40px_rgba(232,163,61,.45)]"><img src={QR} alt="QR code do endereço Lightning" width={168} height={168} className="size-40 sm:size-44" /></a>
      <p className="break-all font-mono text-sm text-primary">{LN}</p>
    </div>
    <p className="mt-6 font-mono text-[11px] text-muted-foreground">Valor sugerido (sats)</p>
    <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
      {SATS.map((s, i) => <button key={s.sats} type="button" onClick={() => setSel(i)} aria-pressed={sel === i}
        className={`border p-3 text-left transition-colors ${sel === i ? "border-primary bg-primary/15" : "border-border hover:border-primary/60"}`}>
        <span className="silo-title block text-2xl">{s.sats.toLocaleString("pt-BR")}</span><span className="font-mono text-[10px] text-muted-foreground">{s.brl}</span>
      </button>)}
      <button type="button" onClick={() => setSel(-1)} aria-pressed={sel === -1}
        className={`border p-3 text-left transition-colors ${sel === -1 ? "border-primary bg-primary/15" : "border-border hover:border-primary/60"}`}>
        <span className="silo-title block text-2xl">Livre</span><span className="font-mono text-[10px] text-muted-foreground">Você escolhe</span>
      </button>
    </div>
    {sel === -1 && <div className="mt-3 flex items-center gap-2 border border-primary bg-card px-3">
      <Input autoFocus inputMode="numeric" aria-label="Quantia em sats" placeholder="Digite quantos sats quer enviar" value={custom}
        onChange={e => setCustom(e.target.value.replace(/\D/g, ""))} className="border-0 bg-transparent px-0 font-mono focus-visible:ring-0" />
      <span className="font-mono text-xs text-primary">sats</span>
    </div>}
    <p className="mt-6 font-mono text-[11px] text-muted-foreground">Valor a enviar</p>
    <p className="silo-title text-5xl text-primary">{amount.toLocaleString("pt-BR")} sats</p>
    <div className="mt-6 grid grid-cols-2 gap-2">
      <Button variant="outline" onClick={copy} className="rounded-none">{copied ? <Check /> : <Copy />} Copiar</Button>
      <Button asChild className="rounded-none"><a href={`lightning:${LN}`}><Zap /> Enviar via Lightning</a></Button>
    </div>
    <p className="mt-4 text-center font-mono text-[10px] text-muted-foreground">P2P · Sem KYC · Sem intermediários</p>
  </div>;
}

/** Bloco "Combustível Operacional" compartilhado entre as páginas. */
export function SupportFuel() {
  return <>
      <section className="grid gap-12 py-28 lg:grid-cols-[1.2fr_1fr]">
        <div>
          <h2 className="silo-title text-5xl sm:text-7xl">Combustível Operacional</h2>
          <div className="mt-8 space-y-5 text-lg leading-8 text-muted-foreground">
            <p>Este conteúdo foi construído sem patrocinadores, sem anúncios invasivos e sem nenhum vínculo com corretoras ou instituições financeiras. Cada linha que você leu aqui custou tempo, pesquisa e infraestrutura: mantidos exclusivamente por quem acredita que informação de qualidade não deveria ter dono corporativo.</p>
            <p>Se este material te deu clareza, te poupou de um erro ou te mostrou um caminho que você não conhecia, você pode retribuir da forma mais soberana possível: enviando sats diretamente, sem intermediários, sem burocracia, sem rastro bancário.</p>
            <p className="text-foreground">Cada sat enviado é um voto direto pela independência editorial. Você não está "doando". Você está financiando soberania.</p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            <div className="border border-border p-6 transition-all duration-500 hover:-translate-y-1 hover:border-primary hover:shadow-[0_30px_80px_-30px_rgba(232,163,61,.45)]"><p className="silo-title text-2xl">Não sabe usar a Lightning Network?</p><p className="mt-3 text-sm leading-7 text-muted-foreground">Sem problema. Criamos um guia completo que te leva do zero à primeira transação em menos de 10 minutos. Aprenda o que é, como funciona e qual carteira usar.</p><Button asChild variant="link" className="mt-3 px-0"><Link to="/lightning">APRENDER A USAR LIGHTNING <ArrowRight /></Link></Button></div>
            <div className="border border-border p-6 transition-all duration-500 hover:-translate-y-1 hover:border-primary hover:shadow-[0_30px_80px_-30px_rgba(232,163,61,.45)]"><p className="silo-title text-2xl">Prefere enviar Bitcoin via PIX?</p><p className="mt-3 text-sm leading-7 text-muted-foreground">Se o anonimato não é a sua prioridade no momento, você também pode adquirir Bitcoin usando PIX e enviar para o endereço acima. Rápido, simples e funcional , o importante é que o valor chegue sem depender de plataformas centralizadas.</p><Button asChild variant="link" className="mt-3 px-0"><Link to="/pix-cripto">VER TUTORIAL: BITCOIN VIA PIX <ArrowRight /></Link></Button></div>
          </div>
        </div>
        <Donation />
      </section>
  </>;
}
