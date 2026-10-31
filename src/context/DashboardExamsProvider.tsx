import axios from "axios";
import { useCallback, useRef, useState } from "react";
import { Outlet } from "react-router-dom";
import { getExams } from "../API/examApi";
import {
  DashboardExamsContext,
  type DashboardExamsState,
} from "./dashboardExamsContext";

export function DashboardExamsProvider() {
  const [exams, setExams] = useState<DashboardExamsState["exams"]>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasLoaded = useRef(false);
  const request = useRef<Promise<void> | null>(null);

  const loadExams = useCallback(async () => {
    if (hasLoaded.current) return;
    if (request.current) return request.current;

    setIsLoading(true);
    setError(null);
    request.current = (async () => {
      try {
        const response = await getExams();
        setExams(response.data);
        hasLoaded.current = true;
      } catch (loadError) {
        setError(getRequestError(loadError, "Unable to load examinations."));
      } finally {
        setIsLoading(false);
        request.current = null;
      }
    })();

    return request.current;
  }, []);

  const retryExams = useCallback(async () => {
    hasLoaded.current = false;
    setExams(null);
    await loadExams();
  }, [loadExams]);

  return (
    <DashboardExamsContext.Provider
      value={{ exams, isLoading, error, loadExams, retryExams }}
    >
      <Outlet />
    </DashboardExamsContext.Provider>
  );
}

function getRequestError(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    const responseData = error.response?.data;
    if (typeof responseData === "string" && responseData.trim()) {
      return responseData;
    }
    if (responseData && typeof responseData === "object") {
      const message = responseData.message ?? responseData.error ?? responseData.detail;
      if (typeof message === "string" && message.trim()) return message;
    }
    if (!error.response) return "Unable to reach the server. Please try again.";
  }
  return error instanceof Error && error.message ? error.message : fallback;
}
