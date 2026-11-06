"use client";
import { useActionState, startTransition, type FormEvent } from "react";

/**
 * Como useActionState, mas NÃO limpa o formulário quando o servidor devolve erro
 * (o padrão do React 19 é resetar os campos após cada envio).
 */
export function useFormAction<S>(fn: (prev: S | null, fd: FormData) => Promise<S>) {
  const [state, action, pending] = useActionState(fn, null);
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(() => action(fd));
  };
  return [state, onSubmit, pending] as const;
}
