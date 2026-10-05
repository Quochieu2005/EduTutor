"use client";

type Props = { page: number; totalPages: number; onPageChange: (page: number) => void };

export function PaginationControls({ page, totalPages, onPageChange }: Props) {
  if (totalPages <= 1) return null;
  const pages = Array.from({ length: totalPages }, (_, index) => index + 1).filter(
    (item) => item === 1 || item === totalPages || Math.abs(item - page) <= 1,
  );
  return (
    <nav aria-label="Phân trang" className="flex flex-wrap items-center justify-center gap-2 pt-2">
      <button type="button" disabled={page === 1} onClick={() => onPageChange(page - 1)} className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:border-blue-300 disabled:cursor-not-allowed disabled:opacity-40">Trước</button>
      {pages.map((item, index) => <span key={item} className="contents">
        {index > 0 && item - pages[index - 1] > 1 && <span className="px-1 text-slate-400">…</span>}
        <button type="button" aria-current={item === page ? "page" : undefined} onClick={() => onPageChange(item)} className={`h-9 min-w-9 rounded-lg border px-3 text-xs font-bold ${item === page ? "border-blue-600 bg-blue-600 text-white" : "border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:text-blue-600"}`}>{item}</button>
      </span>)}
      <button type="button" disabled={page === totalPages} onClick={() => onPageChange(page + 1)} className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:border-blue-300 disabled:cursor-not-allowed disabled:opacity-40">Sau</button>
    </nav>
  );
}
