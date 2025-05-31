import React, { useState, useEffect } from "react";
import { scrapeQuery, chatQuery } from "../utils/api";

const SearchPage = () => {
  const [query, setQuery] = useState("");
  const [chatHistory, setChatHistory] = useState([]); // historique du chat
  const [results, setResults] = useState([]);
  const [errorApi, setErrorApi] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [scrapLoading, setScrapLoading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    setIsLoggedIn(!!token);
  }, []);

  const handleAIAnswer = async () => {
    if (!query.trim()) return;
    setSearchLoading(true);
    setErrorApi(null);

    try {
      const userId = localStorage.getItem("user_id") || "guest";

      // Ajout de la question de l'utilisateur à l'historique
      const newHistory = [...chatHistory, { role: "user", content: query }];

      // Envoi du contexte complet
      const data = await chatQuery(query, userId, newHistory);
      console.log("Chat result:", data);

      if (data?.answer) {
        // Ajoute la réponse de l'IA à l'historique
        const updatedHistory = [
          ...newHistory,
          { role: "assistant", content: data.answer },
        ];
        setChatHistory(updatedHistory);
        setQuery("");
      } else {
        setErrorApi("Aucune réponse générée.");
      }
    } catch (error) {
      setErrorApi(error.message || "Erreur lors de la requête IA");
    } finally {
      setSearchLoading(false);
    }
  };

  const handleScrap = async () => {
    if (!query.trim()) return;
    setScrapLoading(true);
    setErrorApi(null);
    setResults([]);

    try {
      const data = await scrapeQuery(query);
      console.log("Scrap result:", data);

      if (data?.results?.length > 0) {
        setResults(
          data.results.map((res, index) => ({
            ...res,
            source: "Scraping Web",
            score: 0.9 - index * 0.1,
            id: index,
          }))
        );
      } else {
        setErrorApi("Aucun résultat trouvé.");
      }
    } catch (error) {
      setErrorApi(error.message || "Erreur lors du scraping.");
    } finally {
      setScrapLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-center text-blue-700 dark:text-blue-300 mb-4">
          Chat Recherche IA 🔍💬
        </h1>

        <div className="space-y-4 mb-6">
          {chatHistory.map((msg, idx) => (
            <div
              key={idx}
              className={`p-3 rounded-lg w-fit max-w-[80%] ${
                msg.role === "user"
                  ? "bg-blue-500 text-white ml-auto"
                  : "bg-gray-300 text-black"
              }`}
            >
              {msg.content}
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Pose ta question..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAIAnswer()}
            className="flex-1 p-3 rounded-lg border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
          />

          {isLoggedIn && (
            <button
              onClick={handleAIAnswer}
              disabled={searchLoading || !query.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              {searchLoading ? "IA..." : "Envoyer"}
            </button>
          )}

          <button
            onClick={handleScrap}
            disabled={scrapLoading || !query.trim()}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
          >
            {scrapLoading ? "Scraping..." : "Résultats Web"}
          </button>
        </div>

        {errorApi && (
          <div className="p-3 text-sm text-red-700 bg-red-100 rounded-lg dark:bg-red-200 dark:text-red-800 mt-4">
            <strong>Erreur :</strong> {errorApi}
          </div>
        )}

        {results.length > 0 && (
          <div className="space-y-4 mt-6">
            {results.map((res, index) => (
              <div
                key={res.id || index}
                className="p-4 border rounded-lg bg-white dark:bg-gray-800 shadow"
              >
                <p className="text-lg font-semibold text-blue-600 dark:text-blue-300 mb-2">
                  {res.text}
                </p>
                {res.url && (
                  <a
                    href={res.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-500 dark:text-blue-300 hover:underline"
                  >
                    Voir la source  
                  </a>
                )}
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 flex justify-between">
                  <span>{res.source}</span>
                  {typeof res.score === "number" && (
                    <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded dark:bg-blue-900 dark:text-blue-200">
                      Score : {res.score.toFixed(2)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchPage;
