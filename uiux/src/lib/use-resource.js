import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Nạp dữ liệu từ API kèm trạng thái loading / error và hàm reload.
 *
 * @param {() => Promise<any>} loader hàm trả về dữ liệu đã bóc `data`
 * @param {Array} deps mảng phụ thuộc; đổi giá trị sẽ tự nạp lại
 */
export function useResource(loader, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await loaderRef.current());
    } catch (err) {
      setError(err.message || "Không tải được dữ liệu");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    reload();
  }, [reload]);

  return { data, loading, error, reload, setData };
}
