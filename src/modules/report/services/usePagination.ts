import { useCallback, useEffect, useRef, useState } from "react";

export interface PaginationPage<T> {
  data: T[];
  total: number;
  metadata?: unknown;
}

interface UsePaginationOptions<T> {
  queryKey: string;
  limit: number;
  fetchPage: (
    page: number,
    limit: number,
    signal: AbortSignal,
  ) => Promise<PaginationPage<T>>;
}

export function usePagination<T>({ queryKey, limit, fetchPage }: UsePaginationOptions<T>) {
  const mounted = useRef(false);
  const generation = useRef(0);
  const requestController = useRef<AbortController | null>(null);
  const navigation = useRef(0);
  const [data, setData] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [metadata, setMetadata] = useState<unknown>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [previousQuery, setPreviousQuery] = useState({ queryKey, limit, fetchPage });

  if (
    previousQuery.queryKey !== queryKey ||
    previousQuery.limit !== limit ||
    previousQuery.fetchPage !== fetchPage
  ) {
    setPreviousQuery({ queryKey, limit, fetchPage });
    setData([]);
    setTotal(0);
    setPage(1);
    setMetadata(undefined);
    setLoading(true);
    setError(undefined);
  }

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      generation.current += 1;
      requestController.current?.abort();
    };
  }, []);

  const loadPage = useCallback((target: number) => {
    const currentGeneration = generation.current;
    const requestId = ++navigation.current;
    requestController.current?.abort();
    const controller = new AbortController();
    requestController.current = controller;
    return Promise.resolve().then(() => fetchPage(target, limit, controller.signal))
      .then((result) => {
        if (!mounted.current || generation.current !== currentGeneration || navigation.current !== requestId) return;
        setData(result.data);
        setTotal(result.total);
        setPage(target);
        setMetadata(result.metadata);
      })
      .catch((cause: unknown) => {
        if (!mounted.current || generation.current !== currentGeneration || navigation.current !== requestId || controller.signal.aborted) return;
        setError(cause instanceof Error ? cause.message : "Unable to load report data.");
      })
      .finally(() => {
        if (mounted.current && generation.current === currentGeneration && navigation.current === requestId) setLoading(false);
      });
  }, [fetchPage, limit]);

  useEffect(() => {
    generation.current += 1;
    void loadPage(1);
    return () => {
      generation.current += 1;
      requestController.current?.abort();
    };
  }, [loadPage, queryKey]);

  const goToPage = useCallback((targetPage: number) => {
    const lastPage = Math.ceil(total / limit);
    if (!Number.isInteger(targetPage) || targetPage < 1 || targetPage > lastPage) return;
    setLoading(true);
    setError(undefined);
    void loadPage(targetPage);
  }, [limit, loadPage, total]);

  return { data, total, page, metadata, loading, error, goToPage };
}
