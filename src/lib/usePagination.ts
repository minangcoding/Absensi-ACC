import { useEffect, useMemo, useState } from "react";

export function usePagination<T>(rows: T[], pageSize = 10) {
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage = Math.min(page, pageCount);

  // Reset ke halaman 1 kalau data berubah drastis (mis. ganti filter tanggal)
  // dan halaman saat ini jadi di luar jangkauan.
  useEffect(() => {
    if (page > pageCount) setPage(1);
  }, [pageCount, page]);

  const pageRows = useMemo(
    () => rows.slice((safePage - 1) * pageSize, safePage * pageSize),
    [rows, safePage, pageSize],
  );

  return { page: safePage, setPage, pageCount, pageRows, totalItems: rows.length, pageSize };
}
