import { useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";

import { normalizeAbbr } from "../lib/nbaModel";
import {
  gradePredictionLog,
  parsePredictionTrackerCsv,
  parseResultsTrackerCsv,
  summarizeTrackedPredictions,
} from "../lib/resultsTracker";
import { downloadCSV } from "../lib/espn";
import { PROXY_URL } from "../lib/proxyConfig";
import type { GradedPredictionRow, PredictionLogEntry, ResultLogEntry, TeamAbbr, TrackerStats } from "../lib/nbaTypes";

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export type UseResultsTrackerReturn = {
  resultsPaste: string;
  setResultsPaste: Dispatch<SetStateAction<string>>;
  resultsLog: ResultLogEntry[];
  setResultsLog: Dispatch<SetStateAction<ResultLogEntry[]>>;
  resultsStatus: string;
  setResultsStatus: Dispatch<SetStateAction<string>>;
  resultsError: string;
  fetchingResults: boolean;
  showResultsPaste: boolean;
  setShowResultsPaste: Dispatch<SetStateAction<boolean>>;
  predPaste: string;
  setPredPaste: Dispatch<SetStateAction<string>>;
  predLog: PredictionLogEntry[];
  setPredLog: Dispatch<SetStateAction<PredictionLogEntry[]>>;
  showPredPaste: boolean;
  setShowPredPaste: Dispatch<SetStateAction<boolean>>;
  // eslint-disable-next-line no-unused-vars
  handleFetchResults: (...ARGS: [boolean?]) => Promise<void>;
  handleImportResults(): void;
  handleImportPredictions(): void;
  gradedRows: GradedPredictionRow[];
  stats: TrackerStats;
};

export function useResultsTracker(): UseResultsTrackerReturn {
  const [resultsPaste, setResultsPaste] = useState("");
  const [resultsLog, setResultsLog] = useState<ResultLogEntry[]>([]);
  const [resultsStatus, setResultsStatus] = useState("");
  const [resultsError, setResultsError] = useState("");
  const [fetchingResults, setFetchingResults] = useState(false);
  const [showResultsPaste, setShowResultsPaste] = useState(false);
  const [predPaste, setPredPaste] = useState("");
  const [predLog, setPredLog] = useState<PredictionLogEntry[]>([]);
  const [showPredPaste, setShowPredPaste] = useState(false);

  const handleFetchResults = async (forPredictor = false) => {
    setFetchingResults(true);
    setResultsError("");
    setResultsStatus("Fetching yesterday's scoresâ€¦");
    try {
      const yest = new Date();
      yest.setDate(yest.getDate() - 1);
      const pad = (n: number) => String(n).padStart(2, "0");
      const dateStr = `${yest.getFullYear()}${pad(yest.getMonth() + 1)}${pad(yest.getDate())}`;
      const isoDate = `${yest.getFullYear()}-${pad(yest.getMonth() + 1)}-${pad(yest.getDate())}`;
      const res = await fetch(`${PROXY_URL}${encodeURIComponent(`https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates=${dateStr}`)}`);
      const data = await res.json();
      const events = data?.events ?? [];
      const rows: Array<{
        date: string;
        home: TeamAbbr;
        away: TeamAbbr;
        hScore: number | null;
        aScore: number | null;
        completed: boolean;
      }> = [];

      for (const ev of events) {
        const comp = ev.competitions?.[0];
        if (!comp) continue;
        const status = comp.status?.type?.completed;
        const home = comp.competitors?.find((team: { homeAway?: string }) => team.homeAway === "home");
        const away = comp.competitors?.find((team: { homeAway?: string }) => team.homeAway === "away");
        if (!home || !away) continue;
        rows.push({
          date: isoDate,
          home: normalizeAbbr(home.team?.abbreviation?.toUpperCase() ?? "") as TeamAbbr,
          away: normalizeAbbr(away.team?.abbreviation?.toUpperCase() ?? "") as TeamAbbr,
          hScore: status ? parseInt(home.score ?? 0) : null,
          aScore: status ? parseInt(away.score ?? 0) : null,
          completed: !!status,
        });
      }

      const completed = rows.filter((row): row is ResultLogEntry & { completed: true } => row.completed && row.hScore != null && row.aScore != null);
      if (!completed.length) {
        setResultsStatus(`No completed games found for ${isoDate}`);
        setFetchingResults(false);
        return;
      }

      const esc = (v: unknown) => `"${String(v).replace(/"/g, '""')}"`;
      const headers = ["Date", "Home", "Away", "Home Score", "Away Score", "Winner", "Total", "LookupKey"];
      const csvRows = completed.map((row) => {
        const winner = row.hScore > row.aScore ? row.home : row.away;
        const total = row.hScore + row.aScore;
        const lookupKey = `${dateStr}${row.home}${row.away}`;
        return [row.date, row.home, row.away, row.hScore, row.aScore, winner, total, lookupKey];
      });
      const csvText = [headers.map(esc).join(","), ...csvRows.map((row) => row.map(esc).join(","))].join("\n");
      downloadCSV(csvText, `nba-results-${isoDate}.csv`);
      setResultsStatus(`âœ“ ${completed.length} games from ${isoDate} â€” CSV downloading`);

      if (forPredictor) {
        setResultsLog((prev) => {
          const existing = new Set(prev.map((row) => `${row.date}_${row.home}_${row.away}`));
          const added = completed.filter((row) => !existing.has(`${row.date}_${row.home}_${row.away}`));
          return [...prev, ...added].sort((a, b) => b.date.localeCompare(a.date));
        });
      }
    } catch (error) {
      setResultsError(`ESPN fetch failed â€” ensure proxy is running on :3002. ${getErrorMessage(error)}`);
    }
    setFetchingResults(false);
  };

  const handleImportResults = () => {
    setResultsError("");
    try {
      const parsed = parseResultsTrackerCsv(resultsPaste);
      setResultsLog((prev) => {
        const existing = new Set(prev.map((row) => `${row.date}_${row.home}_${row.away}`));
        const added = parsed.filter((row) => !existing.has(`${row.date}_${row.home}_${row.away}`));
        return [...prev, ...added].sort((a, b) => b.date.localeCompare(a.date));
      });
      setResultsStatus(`âœ“ Imported ${parsed.length} results`);
      setResultsPaste("");
      setShowResultsPaste(false);
    } catch (error) {
      setResultsError(getErrorMessage(error));
    }
  };

  const handleImportPredictions = () => {
    setResultsError("");
    try {
      const parsed = parsePredictionTrackerCsv(predPaste);
      setPredLog((prev) => {
        const existing = new Set(prev.map((row) => `${row.date}_${row.home}_${row.away}`));
        const added = parsed.filter((row) => !existing.has(`${row.date}_${row.home}_${row.away}`));
        return [...prev, ...added].sort((a, b) => b.date.localeCompare(a.date));
      });
      setResultsStatus(`âœ“ Imported ${parsed.length} predictions`);
      setPredPaste("");
      setShowPredPaste(false);
    } catch (error) {
      setResultsError(getErrorMessage(error));
    }
  };

  const gradedRows = useMemo(() => gradePredictionLog(predLog, resultsLog), [predLog, resultsLog]);
  const stats = useMemo(() => summarizeTrackedPredictions(gradedRows), [gradedRows]);

  return {
    resultsPaste,
    setResultsPaste,
    resultsLog,
    setResultsLog,
    resultsStatus,
    setResultsStatus,
    resultsError,
    fetchingResults,
    showResultsPaste,
    setShowResultsPaste,
    predPaste,
    setPredPaste,
    predLog,
    setPredLog,
    showPredPaste,
    setShowPredPaste,
    handleFetchResults,
    handleImportResults,
    handleImportPredictions,
    gradedRows,
    stats,
  };
}

