import { useNavigate } from "react-router-dom";

export const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="max-w-6xl w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="flex justify-center">
            <img
              src="/image.jpeg"
              className="w-full max-w-lg rounded-2xl shadow-xl border-4 border-amber-500/30 transition-transform hover:scale-105"
              alt="Chess Board"
            />
          </div>

          <div className="text-center lg:text-left space-y-8">
            <h1 className="flex justify-center text-5xl md:text-6xl font-bold text-white">
              Play Chess
              <span className="text-amber-400 ml-2">!!!</span>
            </h1>

            <div className="flex flex-col sm:flex-row lg:flex-col gap-4 justify-center lg:justify-start">
              <button
                onClick={() => navigate("/game")}
                className="px-8 py-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg shadow-lg transition-all hover:shadow-xl hover:-translate-y-1 text-xl"
              >
                Play Online
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
