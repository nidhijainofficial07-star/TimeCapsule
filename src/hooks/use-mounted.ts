import { useEffect, useState } from "react";

/** True after hydration — browser-stored archive data is only read on the client. */
export function useMounted() {
  const [m, setM] = useState(false);
  useEffect(() => setM(true), []);
  return m;
}
