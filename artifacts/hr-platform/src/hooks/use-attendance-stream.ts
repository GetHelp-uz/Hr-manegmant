import { useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";

type AttendanceEvent = {
  action: "check_in" | "check_out" | "already_checked_out";
  employee: any;
  attendance: any;
  message?: string;
  lateMinutes?: number;
};

let globalEs: EventSource | null = null;
let refCount = 0;

function getBaseUrl() {
  return import.meta.env.BASE_URL?.replace(/\/$/, "") || "";
}

export function useAttendanceStream(onEvent?: (evt: AttendanceEvent) => void) {
  const queryClient = useQueryClient();

  const handleEvent = useCallback((raw: MessageEvent) => {
    try {
      const evt: AttendanceEvent = JSON.parse(raw.data);
      queryClient.invalidateQueries({ queryKey: ["/api/attendance/today"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/overview"] });
      if (onEvent) onEvent(evt);
    } catch {}
  }, [queryClient, onEvent]);

  useEffect(() => {
    const base = getBaseUrl();
    const url = `${base}/api/attendance/stream`;

    if (!globalEs) {
      globalEs = new EventSource(url, { withCredentials: true });
    }
    refCount++;

    globalEs.addEventListener("attendance", handleEvent);

    return () => {
      globalEs?.removeEventListener("attendance", handleEvent);
      refCount--;
      if (refCount <= 0 && globalEs) {
        globalEs.close();
        globalEs = null;
        refCount = 0;
      }
    };
  }, [handleEvent]);
}
