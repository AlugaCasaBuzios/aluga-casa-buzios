"use client";

type VirtualTourReportActionsProps = {
  primaryColor?: string;
};

export default function VirtualTourReportActions({
  primaryColor = "#172554",
}: VirtualTourReportActionsProps) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      style={{ backgroundColor: primaryColor }}
      className="rounded-xl px-5 py-3 text-sm font-black text-white shadow-sm transition hover:brightness-110"
    >
      Imprimir ou salvar em PDF
    </button>
  );
}
