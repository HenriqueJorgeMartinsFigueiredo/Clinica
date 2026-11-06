import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getSettings, parseFees } from "@/lib/finance";
import { PAYMENT_METHODS } from "@/lib/utils";
import { saveFees, saveSettings, saveTemplate } from "./actions";

export default async function Configuracoes({ searchParams }: { searchParams: Promise<{ termo?: string }> }) {
  await requireUser(["ADMIN"]);
  const { termo } = await searchParams;
  const [s, templates, procedures] = await Promise.all([
    getSettings(),
    db.consentTemplate.findMany({ include: { procedure: true }, orderBy: { title: "asc" } }),
    db.procedure.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
  ]);
  const fees = parseFees(s.methodFees);
  const editing = termo === "novo" ? null : templates.find((t) => t.id === termo);
  const showForm = termo === "novo" || !!editing;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="page-title">Configurações</h1>

      <form action={saveSettings} className="card grid gap-3 p-5 sm:grid-cols-2">
        <h2 className="font-semibold sm:col-span-2">Dados da clínica <span className="text-xs font-normal text-stone-500">(aparecem nos recibos, orçamentos e termos)</span></h2>
        <div className="sm:col-span-2"><label className="label">Nome da clínica</label><input name="name" className="input" defaultValue={s.name} required /></div>
        <div><label className="label">CNPJ / CPF</label><input name="document" className="input" defaultValue={s.document ?? ""} /></div>
        <div><label className="label">Telefone</label><input name="phone" className="input" defaultValue={s.phone ?? ""} /></div>
        <div><label className="label">E-mail</label><input name="email" className="input" defaultValue={s.email ?? ""} /></div>
        <div><label className="label">Cidade/UF</label><input name="city" className="input" defaultValue={s.city ?? ""} placeholder="São Paulo/SP" /></div>
        <div className="sm:col-span-2"><label className="label">Endereço</label><input name="address" className="input" defaultValue={s.address ?? ""} /></div>
        <div className="flex justify-end sm:col-span-2"><button className="btn-primary">Salvar dados</button></div>
      </form>

      <form action={saveFees} className="card space-y-3 p-5">
        <div>
          <h2 className="font-semibold">Taxas da maquininha / banco</h2>
          <p className="text-xs text-stone-500">
            Percentual descontado em cada forma de pagamento. A comissão das profissionais é calculada sobre o valor líquido
            (pago pela cliente − taxa). A taxa é preenchida sozinha no recebimento e pode ser ajustada caso a caso.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Object.entries(PAYMENT_METHODS).map(([k, v]) => (
            <div key={k}>
              <label className="label">{v} (%)</label>
              <input name={`fee_${k}`} className="input" inputMode="decimal" placeholder="0"
                defaultValue={fees[k] ? String(fees[k]).replace(".", ",") : ""} />
            </div>
          ))}
        </div>
        <div className="flex justify-end"><button className="btn-primary">Salvar taxas</button></div>
      </form>

      <div className="card">
        <div className="flex items-center justify-between border-b border-stone-100 p-4">
          <h2 className="font-semibold">Modelos de termo de consentimento</h2>
          <Link href="?termo=novo" className="btn-secondary btn-sm">+ Novo modelo</Link>
        </div>
        {showForm && (
          <form action={saveTemplate} key={editing?.id ?? "novo"} className="space-y-3 border-b border-stone-100 bg-stone-50 p-4">
            {editing && <input type="hidden" name="id" value={editing.id} />}
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="sm:col-span-2"><label className="label">Título</label><input name="title" required className="input" defaultValue={editing?.title} /></div>
              <div><label className="label">Procedimento</label>
                <select name="procedureId" className="input" defaultValue={editing?.procedureId ?? ""}>
                  <option value="">Geral</option>{procedures.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="label">Texto do termo</label>
              <textarea name="body" rows={14} className="input font-mono text-xs" defaultValue={editing?.body} required />
              <p className="mt-1 text-xs text-stone-500">
                Campos automáticos: {"{{paciente}} {{cpf}} {{idade}} {{procedimento}} {{clinica}} {{data}}"}. Deixe uma linha em branco entre parágrafos.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2">
              <select name="active" className="input w-auto" defaultValue={editing?.active === false ? "0" : "1"}><option value="1">Ativo</option><option value="0">Inativo</option></select>
              <Link href="/configuracoes" className="btn-secondary">Cancelar</Link>
              <button className="btn-primary">Salvar modelo</button>
            </div>
          </form>
        )}
        <div className="divide-y divide-stone-100">
          {templates.length === 0 && <p className="p-6 text-center text-sm text-stone-500">Nenhum modelo cadastrado.</p>}
          {templates.map((t) => (
            <div key={t.id} className={`flex items-center gap-3 p-4 text-sm ${t.active ? "" : "opacity-50"}`}>
              <span className="flex-1 font-medium">{t.title}<span className="block text-xs font-normal text-stone-500">{t.procedure?.name ?? "Geral"}</span></span>
              <Link href={`?termo=${t.id}`} className="text-brand-700 hover:underline">Editar</Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
