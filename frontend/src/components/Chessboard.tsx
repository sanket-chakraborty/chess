/* eslint-disable @typescript-eslint/no-explicit-any */
import { Color, PieceSymbol, Square } from "chess.js";
import { useState } from "react";
import { MOVE } from "../screens/Game";

export const Chessboard = ({
  board,
  socket,
  setBoard,
  chess,
  playerColor,
  gameState,
}: {
  chess: any;
  setBoard: any;
  board: ({
    square: Square;
    type: PieceSymbol;
    color: Color;
  } | null)[][];
  socket: WebSocket;
  playerColor: "white" | "black" | null;
  gameState: "waiting" | "playing" | "over";
}) => {
  const [from, setFrom] = useState<Square | null>(null);

  // Function to check if the current player can make a move
  const canMove = () => {
    if (gameState !== "playing") return false;
    if (!playerColor) return false;

    const currentTurn = chess.turn();
    return (
      (currentTurn === "w" && playerColor === "white") ||
      (currentTurn === "b" && playerColor === "black")
    );
  };

  const getHighlightClass = (square: Square) => {
    if (from === square) return "bg-yellow-400";
    return "";
  };

  return (
    <div className="text-white-200">
      {board.map((row, i) => {
        return (
          <div key={i} className="flex">
            {row.map((square, j) => {
              const squareRepresentation = (String.fromCharCode(97 + (j % 8)) +
                "" +
                (8 - i)) as Square;

              return (
                <div
                  onClick={() => {
                    if (!canMove() || gameState === "over") return;

                    if (!from) {
                      if (
                        square &&
                        ((square.color === "w" && playerColor === "white") ||
                          (square.color === "b" && playerColor === "black"))
                      ) {
                        setFrom(squareRepresentation);
                      }
                    } else {
                      try {
                        // Check if the move is valid
                        const moveObj = {
                          from,
                          to: squareRepresentation,
                        };

                        const validMove = chess.move(moveObj);

                        // If move is valid, send it to the server
                        if (validMove) {
                          socket.send(
                            JSON.stringify({
                              type: MOVE,
                              payload: {
                                from,
                                to: squareRepresentation,
                                promotion: "q", // Default to queen promotion if needed
                              },
                            })
                          );

                          setBoard(chess.board());
                          console.log({
                            from,
                            to: squareRepresentation,
                          });
                        }

                        setFrom(null);
                      } catch (error) {
                        console.log("Invalid move: ", error);
                        setFrom(null);
                      }
                    }
                  }}
                  key={j}
                  className={`w-16 h-16 ${
                    getHighlightClass(squareRepresentation) ||
                    ((i + j) % 2 === 0 ? "bg-green-500" : "bg-white")
                  } relative`}
                >
                  <div className="w-full justify-center flex h-full">
                    <div className="h-full justify-center flex flex-col text-3xl">
                      {square ? getPieceSymbol(square.type, square.color) : ""}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
};

function getPieceSymbol(type: PieceSymbol, color: Color) {
  const symbols: Record<string, string> = {
    p: color === "b" ? "♟" : "♙",
    n: color === "b" ? "♞" : "♘",
    b: color === "b" ? "♝" : "♗",
    r: color === "b" ? "♜" : "♖",
    q: color === "b" ? "♛" : "♕",
    k: color === "b" ? "♚" : "♔",
  };
  return symbols[type] || "";
}
