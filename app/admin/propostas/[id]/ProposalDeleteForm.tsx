"use client";

import {
  FormEvent,
  useState,
} from "react";

import {
  useFormStatus,
} from "react-dom";

import {
  deleteProposal,
} from "./actions";

type ProposalDeleteFormProps = {
  proposalId: string;
  propertyName: string;
};

type DeleteSubmitButtonProps = {
  enabled: boolean;
};

function DeleteSubmitButton({
  enabled,
}: DeleteSubmitButtonProps) {
  const {
    pending,
  } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={
        !enabled ||
        pending
      }
      className="inline-flex min-h-12 items-center justify-center rounded-xl bg-red-700 px-5 py-3 font-bold shadow-sm transition hover:bg-red-800 disabled:cursor-not-allowed disabled:bg-red-300"
      style={{
        color: "#ffffff",
      }}
    >
      {pending
        ? "Excluindo..."
        : "Excluir definitivamente"}
    </button>
  );
}

export default function ProposalDeleteForm({
  proposalId,
  propertyName,
}: ProposalDeleteFormProps) {
  const [
    deleteFormOpen,
    setDeleteFormOpen,
  ] = useState(false);

  const [
    confirmation,
    setConfirmation,
  ] = useState("");

  const confirmationIsValid =
    confirmation
      .trim()
      .toUpperCase() ===
    "EXCLUIR";

  function closeDeleteForm() {
    setDeleteFormOpen(false);
    setConfirmation("");
  }

  function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    if (
      !confirmationIsValid
    ) {
      event.preventDefault();

      return;
    }

    const confirmed =
      window.confirm(
        `Excluir definitivamente a proposta de "${propertyName}"?\n\nAs informações e todas as fotos serão removidas. Esta ação não poderá ser desfeita.`
      );

    if (!confirmed) {
      event.preventDefault();
    }
  }

  return (
    <section className="rounded-3xl border border-red-200 bg-red-50 p-6 shadow-sm">
      <p className="text-sm font-bold uppercase tracking-widest text-red-700">
        Zona de perigo
      </p>

      <h2 className="mt-2 text-xl font-bold text-red-950">
        Excluir proposta
      </h2>

      <p className="mt-3 text-sm leading-6 text-red-900/80">
        Use esta opção somente para
        propostas de teste, duplicadas ou
        que realmente não precisam ser
        mantidas. As informações e fotos
        serão removidas definitivamente.
      </p>

      {!deleteFormOpen ? (
        <button
          type="button"
          onClick={() =>
            setDeleteFormOpen(true)
          }
          className="mt-5 inline-flex min-h-12 items-center justify-center rounded-xl border border-red-700 bg-white px-5 py-3 font-bold text-red-700 transition hover:bg-red-100"
        >
          Excluir esta proposta
        </button>
      ) : (
        <form
          action={
            deleteProposal
          }
          onSubmit={
            handleSubmit
          }
          className="mt-6 rounded-2xl border border-red-200 bg-white p-5"
        >
          <input
            type="hidden"
            name="proposal_id"
            value={
              proposalId
            }
          />

          <label
            htmlFor="delete-confirmation"
            className="block font-bold text-red-950"
          >
            Digite EXCLUIR para confirmar
          </label>

          <input
            id="delete-confirmation"
            name="confirmation"
            type="text"
            value={
              confirmation
            }
            onChange={(
              event
            ) =>
              setConfirmation(
                event.target
                  .value
              )
            }
            autoComplete="off"
            spellCheck={false}
            placeholder="EXCLUIR"
            className="mt-3 w-full rounded-xl border border-red-300 bg-white px-4 py-3 font-bold uppercase text-slate-900 outline-none transition focus:border-red-600 focus:ring-4 focus:ring-red-100"
          />

          <p className="mt-3 text-xs leading-5 text-red-700">
            Esta ação não poderá ser
            desfeita.
          </p>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <DeleteSubmitButton
              enabled={
                confirmationIsValid
              }
            />

            <button
              type="button"
              onClick={
                closeDeleteForm
              }
              className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-3 font-bold text-slate-700 transition hover:bg-slate-100"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}
    </section>
  );
}