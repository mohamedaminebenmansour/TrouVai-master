import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function HomePage() {
  const [query, setQuery] = useState("");
  const [selectedModel, setSelectedModel] = useState("llama3");
  const navigate = useNavigate();
  
  const isAuthenticated = !!localStorage.getItem("token");
  
  const modelOptions = isAuthenticated
    ? ["llama2", "gemma", "llama3", "mistral"]
    : ["llama3", "mistral"];

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey && query.trim()) {
      e.preventDefault();
      navigate("/chat", {
        state: {
          query: query.trim(),
          model: selectedModel,
        },
      });
      setQuery("");
    }
  };

  return (
    <div className="flex flex-col min-w-0 h-dvh bg-background text-gray-600">
      <main className="flex-1 overflow-y-auto flex items-center justify-center">
        <div className="w-full max-w-2xl p-6 text-center">
          <h1 className="text-3xl font-semibold mb-6">
            Welcome to ChatChout. How can I help you today?
          </h1>
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="mb-6">
              <textarea
                placeholder="What do you want to know?"
                className="w-full h-24 p-4 bg-gray-50 rounded-lg resize-none outline-none text-gray-900 placeholder-gray-500"
                rows={3}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyPress={handleKeyPress}
              />
            </div>
            <div className="flex flex-col items-center space-y-4">
              <div className="flex space-x-4 mb-4">
                <button className="p-2 rounded-full hover:bg-gray-200">Think</button>
                <select
                  className="p-2 rounded-full bg-gray-50 border-none outline-none"
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                >
                  {modelOptions.map((model) => (
                    <option key={model} value={model}>
                      {model.charAt(0).toUpperCase() + model.slice(1)}
                    </option>
                  ))}
                </select>
                <button className="p-2 rounded-full hover:bg-gray-200">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                  </svg>
                </button>
              </div>
            </div>
          </div>
          <p className="text-sm mt-4">
            By messaging ChatChout, you agree to our Terms and Privacy Policy.
          </p>
        </div>
      </main>
    </div>
  );
}