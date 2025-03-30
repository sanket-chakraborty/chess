/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-case-declarations */
import { Chessboard } from "../components/Chessboard";
import { Button } from "../components/Button";
import { useSocket } from "../hooks/useSocket";
import { useEffect, useState } from "react";
import { Chess } from "chess.js";

export const INIT_GAME = "init_game";
export const MOVE = "move";
export const GAME_OVER = "game_over";
export const JOIN_QUEUE = "join_queue";
export const CLOCK_UPDATE = "clock_update";
export const GAME_STATUS = "game_status";
export const RESIGN = "resign";
export const OFFER_DRAW = "offer_draw";
export const DRAW_RESPONSE = "draw_response";

export const Game = () => {
  const socket = useSocket();
  const [chess] = useState(new Chess());
  const [board, setBoard] = useState(chess.board());
  const [playerColor, setPlayerColor] = useState<"white" | "black" | null>(
    null
  );
  const [gameState, setGameState] = useState<"waiting" | "playing" | "over">(
    "waiting"
  );
  const [gameStatus, setGameStatus] = useState<string>("");
  const [winner, setWinner] = useState<string | null>(null);
  const [whiteTime, setWhiteTime] = useState<number>(0);
  const [blackTime, setBlackTime] = useState<number>(0);
  const [timeControl, setTimeControl] = useState<number | null>(null);
  const [moveHistory, setMoveHistory] = useState<
    Array<{ moveNumber: number; white: string; black: string }>
  >([]);
  const [showPopup, setShowPopup] = useState<boolean>(false);
  const [popupMessage, setPopupMessage] = useState<string>("");
  const [drawOffered, setDrawOffered] = useState<boolean>(false);
  const [gameStarted, setGameStarted] = useState<boolean>(false);

  useEffect(() => {
    if (!socket) return;

    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);

      switch (message.type) {
        case INIT_GAME:
          chess.reset();
          setBoard(chess.board());
          setPlayerColor(message.payload.color);
          setGameState("playing");
          setWhiteTime(message.payload.timeLimit);
          setBlackTime(message.payload.timeLimit);
          setMoveHistory([]);
          setGameStarted(true);

          // Show who starts the game
          const startMessage = `Game started! ${
            message.payload.color === "white" ? "You" : "Opponent"
          } play as White and start the game.`;
          showStatusPopup(startMessage);
          break;

        case MOVE:
          const move = message.payload;
          try {
            const moveResult = chess.move(move);
            setBoard(chess.board());

            if (moveResult) {
              const fullMoveNumber = Math.ceil(chess.moveNumber() / 2);

              const existingMoveIndex = moveHistory.findIndex(
                (m) => m.moveNumber === fullMoveNumber
              );

              if (existingMoveIndex >= 0) {
                // Update existing move
                const updatedHistory = [...moveHistory];
                if (moveResult.color === "w") {
                  updatedHistory[existingMoveIndex].white = moveResult.san;
                } else {
                  updatedHistory[existingMoveIndex].black = moveResult.san;
                }
                setMoveHistory(updatedHistory);
              } else {
                // Create new move entry
                if (moveResult.color === "w") {
                  setMoveHistory((prev) => [
                    ...prev,
                    {
                      moveNumber: fullMoveNumber,
                      white: moveResult.san,
                      black: "",
                    },
                  ]);
                } else {
                  setMoveHistory((prev) => [
                    ...prev,
                    {
                      moveNumber: fullMoveNumber,
                      white: "",
                      black: moveResult.san,
                    },
                  ]);
                }
              }
            }

            if (chess.isCheck()) setGameStatus("check");
            else if (chess.isCheckmate()) setGameStatus("checkmate");
            else if (chess.isDraw()) setGameStatus("draw");
            else if (chess.isStalemate()) setGameStatus("stalemate");
            else setGameStatus("");
          } catch (error) {
            console.error("Failed to apply move:", error);
          }
          break;

        case CLOCK_UPDATE:
          setWhiteTime(Number.parseFloat(message.payload.whiteTime));
          setBlackTime(Number.parseFloat(message.payload.blackTime));
          break;

        case GAME_STATUS:
          setGameStatus(message.payload.status);
          break;

        case GAME_OVER:
          setGameState("over");
          setWinner(message.payload.winner);
          setGameStatus(message.payload.reason);
          break;

        case OFFER_DRAW:
          setDrawOffered(true);
          showStatusPopup("Your opponent has offered a draw. Accept?", true);
          break;

        case DRAW_RESPONSE:
          setDrawOffered(false);
          break;

        default:
          console.log("Unknown message type:", message.type);
      }
    };

    return () => {
      socket.onmessage = null;
    };
  }, [socket, chess, moveHistory]);

  const joinQueue = (timeLimit: number) => {
    if (!socket) return;
    setTimeControl(timeLimit);
    socket.send(JSON.stringify({ type: JOIN_QUEUE, payload: { timeLimit } }));
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const showStatusPopup = (message: string, isDrawOffer = false) => {
    setPopupMessage(message);
    setShowPopup(true);
    if (!isDrawOffer) setTimeout(() => setShowPopup(false), 3000);
  };

  const resignGame = () => {
    if (!socket || gameState !== "playing") return;
    if (window.confirm("Are you sure you want to resign?")) {
      socket.send(JSON.stringify({ type: RESIGN }));
    }
  };

  const offerDraw = () => {
    if (!socket || gameState !== "playing") return;
    socket.send(JSON.stringify({ type: OFFER_DRAW }));
    showStatusPopup("Draw offered. Waiting for opponent's response...");
  };

  const respondToDraw = (accepted: boolean) => {
    if (!socket || gameState !== "playing") return;
    socket.send(JSON.stringify({ type: DRAW_RESPONSE, payload: { accepted } }));
    setShowPopup(false);
    setDrawOffered(false);
  };

  if (!socket)
    return <div className="text-white text-center p-10">Connecting...</div>;

  return (
    <div className="min-h-screen bg-slate-950 flex justify-center items-center p-4">
      <div className="max-w-7xl w-full bg-slate-900 rounded-xl shadow-2xl overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-0 h-full">
          <div className="lg:col-span-3 p-6 flex flex-col items-center">
            <div className="w-full max-w-2xl">
              <div className="flex justify-between items-center mb-4">
                <div className="bg-slate-800 text-white px-6 py-3 rounded-lg text-xl font-bold">
                  Black: {formatTime(blackTime)}
                </div>
                <div className="text-xl font-bold text-amber-400">
                  {gameStatus === "check" && "Check!"}
                  {gameStatus === "checkmate" && "Checkmate!"}
                  {gameStatus === "draw" && "Draw!"}
                  {gameStatus === "stalemate" && "Stalemate!"}
                </div>
                <div className="bg-slate-800 text-white px-6 py-3 rounded-lg text-xl font-bold">
                  White: {formatTime(whiteTime)}
                </div>
              </div>

              <div className="bg-slate-800 rounded-xl p-4 shadow-inner">
                <Chessboard
                  chess={chess}
                  setBoard={setBoard}
                  socket={socket}
                  board={board}
                  playerColor={playerColor}
                  gameState={gameState}
                />
              </div>

              {gameState === "playing" && (
                <div className="flex justify-center space-x-4 mt-6">
                  <Button
                    onClick={resignGame}
                    className="bg-red-600 hover:bg-red-700 px-6 py-3 text-lg"
                  >
                    Resign
                  </Button>
                  <Button
                    onClick={offerDraw}
                    className="bg-blue-600 hover:bg-blue-700 px-6 py-3 text-lg"
                  >
                    Offer Draw
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div className="bg-slate-800 p-6 border-l border-slate-700">
            {gameState === "waiting" ? (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-white mb-6">
                  Time Control
                </h2>
                <div className="space-y-4">
                  <Button
                    onClick={() => joinQueue(180)}
                    className={`w-full py-4 text-lg ${
                      timeControl === 180 ? "bg-green-600" : "bg-slate-700"
                    }`}
                  >
                    3 Minutes
                  </Button>
                  <Button
                    onClick={() => joinQueue(300)}
                    className={`w-full py-4 text-lg ${
                      timeControl === 300 ? "bg-green-600" : "bg-slate-700"
                    }`}
                  >
                    5 Minutes
                  </Button>
                  <Button
                    onClick={() => joinQueue(600)}
                    className={`w-full py-4 text-lg ${
                      timeControl === 600 ? "bg-green-600" : "bg-slate-700"
                    }`}
                  >
                    10 Minutes
                  </Button>
                </div>
                {timeControl && (
                  <div className="text-slate-300 text-center mt-4">
                    Waiting for opponent...
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full flex flex-col">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-white mb-2">
                    Game Info
                  </h2>
                  <div className="text-slate-300">
                    <div className="mb-2">
                      Playing as:{" "}
                      <span className="font-bold">{playerColor}</span>
                    </div>
                    <div>
                      Time control:{" "}
                      <span className="font-bold">
                        {timeControl ? timeControl / 60 : "-"} min
                      </span>
                    </div>
                    {gameStarted && playerColor && (
                      <div className="mt-2 text-white">
                        {playerColor === "white"
                          ? "You start the game (White)"
                          : "Opponent starts the game (White)"}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex-1 overflow-hidden flex flex-col">
                  <h2 className="text-xl font-bold text-white mb-3">
                    Move History
                  </h2>
                  <div className="bg-slate-900 rounded-lg p-3 flex-1 overflow-y-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-slate-700">
                          <th className="text-left pb-2 text-slate-400">#</th>
                          <th className="text-left pb-2 text-slate-400">
                            White
                          </th>
                          <th className="text-left pb-2 text-slate-400">
                            Black
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {moveHistory.map((move, i) => (
                          <tr
                            key={i}
                            className="border-b border-slate-700 last:border-0"
                          >
                            <td className="py-2 text-slate-300">
                              {move.moveNumber}.
                            </td>
                            <td className="py-2 font-medium text-white">
                              {move.white || "-"}
                            </td>
                            <td className="py-2 font-medium text-white">
                              {move.black || "-"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {gameState === "over" && (
                  <Button
                    onClick={() => window.location.reload()}
                    className="w-full mt-6 py-3 bg-amber-600 hover:bg-amber-700"
                  >
                    New Game
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {showPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl p-6 max-w-md w-full mx-4 shadow-xl">
            <p className="text-white text-xl mb-6 text-center">
              {popupMessage}
            </p>
            {drawOffered ? (
              <div className="flex justify-center space-x-4">
                <Button
                  onClick={() => respondToDraw(true)}
                  className="px-8 py-3 bg-green-600 hover:bg-green-700"
                >
                  Accept
                </Button>
                <Button
                  onClick={() => respondToDraw(false)}
                  className="px-8 py-3 bg-red-600 hover:bg-red-700"
                >
                  Decline
                </Button>
              </div>
            ) : (
              <Button
                onClick={() => setShowPopup(false)}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700"
              >
                OK
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
