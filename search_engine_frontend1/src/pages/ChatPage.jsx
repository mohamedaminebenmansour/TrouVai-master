import React, { useState, useEffect } from "react";

const ChatPage = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState("");

  useEffect(() => {
    // Simuler un ID utilisateur unique (à remplacer par l'auth réelle)
    const uid = localStorage.getItem("user_id") || `user-${Date.now()}`;
    localStorage.setItem("user_id", uid);
    setUserId(uid);
  }, []);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("http://localhost:5000/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: input, user_id: userId }),
      });

      const data = await response.json();

      if (data.answer) {
        setMessages((prev) => [...prev, { role: "assistant", content: data.answer }]);
      } else {
        setMessages((prev) => [...prev, { role: "assistant", content: "Erreur de réponse." }]);
      }
    } catch (e) {
      setMessages((prev) => [...prev, { role: "assistant", content: "Erreur serveur." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-6">
      <h1 className="text-2xl font-bold text-center text-blue-600 dark:text-blue-300 mb-4">Chat intelligent 💬</h1>
      
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="bg-white dark:bg-gray-800 p-4 rounded shadow max-h-[60vh] overflow-y-auto">
          {messages.map((msg, index) => (
            <div key={index} className={`my-2 ${msg.role === "user" ? "text-right" : "text-left"}`}>
              <span className={`inline-block px-4 py-2 rounded-lg ${msg.role === "user" ? "bg-blue-500 text-white" : "bg-gray-200 dark:bg-gray-700 dark:text-white"}`}>
                {msg.content}
              </span>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Tape ta question..."
            className="flex-1 p-3 rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          />
          <button
            onClick={sendMessage}
            disabled={loading}
            className="bg-blue-600 text-white px-5 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "..." : "Envoyer"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
