"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  useFormStatus,
} from "react-dom";

import {
  deletePropertyPermanently,
  setPropertyActive,
} from "@/app/admin/imoveis/catalog-actions";

type PropertyDeleteButtonProps = {
  propertyId: string;
  propertyName: string;
  active: boolean;
};

type SubmitDeleteButtonProps = {
  enabled: boolean;
};

function SubmitDeleteButton({
  enabled,
}: SubmitDeleteButtonProps) {
  const { pending } =
    useFormStatus();

  return (
    <button
      type="submit"
      disabled={
        !enabled || pending
      }
      className="inline-flex min-h-11 items-center justify-center rounded-xl bg-red-700 px-5 py-3 font-bold text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:bg-slate-300"
    >
      {pending
        ? "Excluindo..."
        : "Excluir definitivamente"}
    </button>
  );
}

function SubmitDeactivateButton() {
  const { pending } =
    useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex min-h-11 items-center justify-center rounded-xl bg-red-700 px-5 py-3 font-bold text-white transition hover:bg-red-800 disabled:cursor-wait disabled:bg-slate-400"
    >
      {pending
        ? "Desativando..."
        : "Desativar imóvel"}
    </button>
  );
}

export default function PropertyDeleteButton({
  propertyId,
  propertyName,
  active,
}: PropertyDeleteButtonProps) {
  const [isOpen, setIsOpen] =
    useState(false);

  const [confirmation, setConfirmation] =
    useState("");

  const [acknowledged, setAcknowledged] =
    useState(false);

  const canDelete =
    confirmation === propertyId &&
    acknowledged;

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleKeyDown(
      event: KeyboardEvent
    ) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      document.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [isOpen]);

  function closeDialog() {
    setIsOpen(false);
    setConfirmation("");
    setAcknowledged(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() =>
          setIsOpen(true)
        }
        className={`inline-flex items-center justify-center rounded-lg px-4 py-2 font-bold transition ${
          active
            ? "bg-red-700 text-white hover:bg-red-800"
            : "border border-red-700 bg-white text-red-700 hover:bg-red-50"
        }`}
      >
        Excluir
      </button>

      {isOpen && (
        <div
          role="presentation"
          className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/70 p-4"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeDialog();
            }
          }}
        >
          {active ? (
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby={`deactivate-title-${propertyId}`}
              className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl sm:p-8"
            >
              <p className="text-sm font-bold uppercase tracking-widest text-amber-700">
                Imóvel ativo
              </p>

              <h2
                id={`deactivate-title-${propertyId}`}
                className="mt-2 text-2xl font-black text-slate-950"
              >
                Desative antes de excluir
              </h2>

              <p className="mt-4 leading-7 text-slate-700">
                O imóvel <strong>{propertyName}</strong> ainda está ativo. Para impedir uma exclusão acidental, ele precisa ser desativado primeiro.
              </p>

              <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900">
                Desativar apenas retira o imóvel do site público. Nenhum cadastro, preço ou foto será apagado nesta etapa.
              </p>

              <div className="mt-6 flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeDialog}
                  className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-3 font-bold text-slate-800 transition hover:bg-slate-100"
                >
                  Cancelar
                </button>

                <form
                  action={setPropertyActive}
                >
                  <input
                    type="hidden"
                    name="propertyId"
                    value={propertyId}
                  />

                  <input
                    type="hidden"
                    name="nextActive"
                    value="false"
                  />

                  <SubmitDeactivateButton />
                </form>
              </div>
            </section>
          ) : (
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby={`delete-title-${propertyId}`}
              className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl sm:p-8"
            >
              <p className="text-sm font-bold uppercase tracking-widest text-red-700">
                Exclusão definitiva
              </p>

              <h2
                id={`delete-title-${propertyId}`}
                className="mt-2 text-2xl font-black text-slate-950"
              >
                Excluir {propertyName}?
              </h2>

              <p className="mt-4 leading-7 text-slate-700">
                Esta ação remove o cadastro, os preços e as fotos armazenadas no Supabase. Ela não pode ser desfeita.
              </p>

              <form
                action={
                  deletePropertyPermanently
                }
                className="mt-6 space-y-5"
              >
                <input
                  type="hidden"
                  name="propertyId"
                  value={propertyId}
                />

                <div>
                  <label
                    htmlFor={`confirmation-${propertyId}`}
                    className="block font-bold text-slate-900"
                  >
                    Digite o identificador para confirmar
                  </label>

                  <code className="mt-2 inline-flex rounded-lg bg-slate-100 px-3 py-2 text-sm font-bold text-slate-800">
                    {propertyId}
                  </code>

                  <input
                    id={`confirmation-${propertyId}`}
                    name="confirmation"
                    value={confirmation}
                    onChange={(event) =>
                      setConfirmation(
                        event.target.value
                      )
                    }
                    autoComplete="off"
                    spellCheck={false}
                    className="mt-3 block w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-950 outline-none transition focus:border-red-600 focus:ring-4 focus:ring-red-100"
                  />
                </div>

                <label className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-900">
                  <input
                    type="checkbox"
                    name="acknowledge"
                    checked={acknowledged}
                    onChange={(event) =>
                      setAcknowledged(
                        event.target.checked
                      )
                    }
                    className="mt-1 h-4 w-4"
                  />

                  <span>
                    Entendo que o imóvel e suas fotos serão removidos definitivamente.
                  </span>
                </label>

                <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={closeDialog}
                    className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-3 font-bold text-slate-800 transition hover:bg-slate-100"
                  >
                    Cancelar
                  </button>

                  <SubmitDeleteButton
                    enabled={canDelete}
                  />
                </div>
              </form>
            </section>
          )}
        </div>
      )}
    </>
  );
}
