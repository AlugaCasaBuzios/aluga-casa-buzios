"use client";

import Link from "next/link";
import { useEffect } from "react";

type PrintActionsProps = {
  backHref: string;
  documentTitle: string;
};

export default function PrintActions({
  backHref,
  documentTitle,
}: PrintActionsProps) {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = documentTitle;

    return () => {
      document.title = previousTitle;
    };
  }, [documentTitle]);

  return (
    <div className="print-actions">
      <button type="button" onClick={() => window.print()}>
        Imprimir / Salvar como PDF
      </button>
      <Link href={backHref}>Voltar aos relatórios</Link>
      <span>
        Na janela de impressão, escolha <strong>Salvar como PDF</strong>.
      </span>
    </div>
  );
}
