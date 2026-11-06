// Ficha de anamnese para estética. Para mudar perguntas, edite esta lista.
export type Question =
  | { key: string; label: string; type: "yesno"; detail?: string }
  | { key: string; label: string; type: "text" | "textarea" }
  | { key: string; label: string; type: "select"; options: string[] };

export const ANAMNESE: { section: string; questions: Question[] }[] = [
  {
    section: "Queixa e objetivos",
    questions: [
      { key: "queixa", label: "Queixa principal / o que deseja melhorar", type: "textarea" },
      { key: "tratamentos_anteriores", label: "Já fez procedimentos estéticos? Quais e quando?", type: "textarea" },
    ],
  },
  {
    section: "Saúde",
    questions: [
      { key: "alergia", label: "Possui alergias (medicamentos, cosméticos, látex, anestésico)?", type: "yesno", detail: "Quais?" },
      { key: "medicamentos", label: "Usa algum medicamento contínuo?", type: "yesno", detail: "Quais?" },
      { key: "anticoagulante", label: "Usa anticoagulante / AAS?", type: "yesno" },
      { key: "roacutan", label: "Usou isotretinoína (Roacutan) nos últimos 6 meses?", type: "yesno" },
      { key: "gestante", label: "Está gestante ou amamentando?", type: "yesno" },
      { key: "diabetes", label: "Diabetes?", type: "yesno" },
      { key: "hipertensao", label: "Hipertensão / problemas cardíacos?", type: "yesno" },
      { key: "marcapasso", label: "Marca-passo ou implante metálico?", type: "yesno" },
      { key: "autoimune", label: "Doença autoimune?", type: "yesno", detail: "Qual?" },
      { key: "herpes", label: "Histórico de herpes?", type: "yesno" },
      { key: "queloide", label: "Tendência a queloide / cicatrização ruim?", type: "yesno" },
      { key: "cancer", label: "Histórico de câncer?", type: "yesno", detail: "Detalhes" },
      { key: "cirurgias", label: "Cirurgias recentes?", type: "yesno", detail: "Quais e quando?" },
    ],
  },
  {
    section: "Hábitos",
    questions: [
      { key: "fumante", label: "Fumante?", type: "yesno" },
      { key: "alcool", label: "Consumo de álcool", type: "select", options: ["Não", "Socialmente", "Frequente"] },
      { key: "atividade_fisica", label: "Atividade física", type: "select", options: ["Sedentária", "1-2x por semana", "3x ou mais por semana"] },
      { key: "agua", label: "Ingestão de água por dia", type: "select", options: ["Menos de 1L", "1 a 2L", "Mais de 2L"] },
      { key: "sol", label: "Exposição solar frequente?", type: "yesno" },
      { key: "protetor", label: "Usa protetor solar diariamente?", type: "yesno" },
    ],
  },
  {
    section: "Avaliação da pele",
    questions: [
      { key: "tipo_pele", label: "Tipo de pele", type: "select", options: ["Normal", "Seca", "Oleosa", "Mista", "Sensível"] },
      { key: "fototipo", label: "Fototipo (Fitzpatrick)", type: "select", options: ["I", "II", "III", "IV", "V", "VI"] },
      { key: "rotina", label: "Rotina de cuidados / cosméticos em uso", type: "textarea" },
      { key: "observacoes", label: "Observações da profissional", type: "textarea" },
    ],
  },
];
