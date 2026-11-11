import { useEffect, useMemo, useReducer, useRef } from "react";
import type { Dispatch } from "react";

import { createSession, describeGame, gameStatus, reduce } from "./session";
import type { Action, Game, GameStatus, Session, Setup } from "./session";
import { createSolverClient } from "./solver-client";
import type { SolverClient, SolverWorker } from "./solver-client";

const STORAGE_KEY = "hoh-tools.negotiation.setup";

/** Reads the remembered setup. Storage may be unavailable; everything works without it. */
const loadSetup = (): Partial<Setup> | undefined => {
  try {
    const stored: unknown = JSON.parse(
      localStorage.getItem(STORAGE_KEY) ?? "null"
    );
    return typeof stored === "object" && stored !== null ? stored : undefined;
  } catch {
    return undefined;
  }
};

const saveSetup = (setup: Setup): void => {
  try {
    const { age, difficultyIndex, encounterKey, slots } = setup;
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ age, difficultyIndex, encounterKey, slots })
    );
  } catch {
    // Storage is unavailable or full: the setup is simply not remembered.
  }
};

const initSession = (): Session => createSession(loadSetup());

export interface Negotiation {
  dispatch: Dispatch<Action>;
  game: Game;
  session: Session;
  status: GameStatus;
}

/** Session state for the solver page. Client-only: it reads storage and starts a worker. */
export const useNegotiation = (
  createWorker: () => SolverWorker
): Negotiation => {
  const [session, dispatch] = useReducer(reduce, undefined, initSession);
  const clientRef = useRef<SolverClient | null>(null);

  useEffect(() => {
    const client = createSolverClient(
      createWorker,
      ({ generation, result }) => {
        dispatch({ generation, result, type: "solved" });
      }
    );
    clientRef.current = client;
    return () => {
      client.dispose();
      clientRef.current = null;
    };
  }, [createWorker]);

  const { request, setup } = session;
  useEffect(() => {
    clientRef.current?.request(request);
  }, [request]);

  useEffect(() => {
    saveSetup(setup);
  }, [setup]);

  const game = useMemo(() => describeGame(setup), [setup]);
  return { dispatch, game, session, status: gameStatus(session) };
};
