import { ChatInput } from "@/components/custom/chatinput";
import { PreviewMessage, ThinkingMessage } from "../../components/custom/message";
import { useScrollToBottom } from "@/components/custom/use-scroll-to-bottom";
import { useState, useEffect, useRef } from "react";
import { message } from "../../interfaces/interfaces";
import { Overview } from "@/components/custom/overview";
import { apiFetch } from "../../utils/api";
import Sidebar from "../../components/Sidebar";
import { useNavigate, useLocation } from "react-router-dom";

export function Chat() {
  const [messagesContainerRef, messagesEndRef] = useScrollToBottom<HTMLDivElement>();
  const [messages, setMessages] = useState<message[]>([]);
  const [question, setQuestion] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [resources, setResources] = useState<{ title: string; url?: string }[]>([]);
  const [history, setHistory] = useState<
    { id: number; search_query: string; conversation: { messages: message[]; sources: string[] }; timestamp: string }[]
  >([]);
  const [username, setUsername] = useState<string>(localStorage.getItem("username") || "User");
  const [historyError, setHistoryError] = useState<string | null>(null);
  const processedQueries = useRef<Set<string>>(new Set());
  const navigate = useNavigate();
  const { state } = useLocation();

  // Model selector state
  const isAuthenticated = !!localStorage.getItem("token");
  const models = isAuthenticated 
    ? ['llama2', 'gemma', 'llama3', 'mistral'] 
    : ['llama3', 'mistral'];
  const [selectedModel, setSelectedModel] = useState<string>(state?.model || models[0]);

  // Log state on every render
  console.log("Chat Component Render", {
    state,
    isAuthenticated,
    selectedModel,
    messagesLength: messages.length,
    processedQueries: Array.from(processedQueries.current),
    timestamp: Date.now(),
  });

  // Handle initial query from HomePage
  useEffect(() => {
    console.log("useEffect for initial query triggered", {
      stateQuery: state?.query,
      isLoading,
      processedQueries: Array.from(processedQueries.current),
      timestamp: Date.now(),
    });
    if (state?.query && !isLoading) {
      const queryId = `${state.query}-${state.model || models[0]}`;
      if (!processedQueries.current.has(queryId)) {
        console.log("Processing initial query", { queryId, query: state.query, model: state.model || models[0] });
        processedQueries.current.add(queryId);
        handleSubmit(state.query, state.model || models[0]);
        // Clear state to prevent re-processing
        navigate("/chat", { state: null, replace: true });
      } else {
        console.log("Skipping duplicate query", { queryId, query: state.query });
      }
    }
  }, [state?.query, state?.model, isLoading, models, navigate]);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const data = await apiFetch("/history", { method: "GET" });
        console.log("Fetched History Data:", data);
        setHistory(data.history || []);
        setHistoryError(null);
      } catch (error) {
        console.error("Failed to fetch history:", error);
        setHistoryError(error.message || "Failed to load history");
      }
    };
    if (isAuthenticated) {
      fetchHistory();
    } else {
      setHistory([]);
      setHistoryError(null);
    }

    const storedUsername = localStorage.getItem("username");
    console.log("Initial User Data from localStorage:", {
      userId: localStorage.getItem("user_id"),
      username: storedUsername,
      token: localStorage.getItem("token"),
    });

    if (!storedUsername) {
      console.warn("Username not found in localStorage, using fallback: 'User'");
      setUsername("User");
    } else {
      setUsername(storedUsername);
    }
  }, [isAuthenticated]);

  async function handleSubmit(text?: string, model: string = selectedModel) {
    if (isLoading) return;

    const messageText = text || question;
    const queryId = `${messageText}-${model}`;
    console.log("handleSubmit called", {
      queryId,
      messageText,
      model,
      isAuthenticated,
      timestamp: Date.now(),
    });

    if (processedQueries.current.has(queryId)) {
      console.log("Skipping duplicate handleSubmit", { queryId, messageText });
      return;
    }
    processedQueries.current.add(queryId);

    const userIdRaw = localStorage.getItem("user_id");
    let userId: number | null = null;

    if (isAuthenticated && userIdRaw) {
      userId = parseInt(userIdRaw, 10);
      if (isNaN(userId)) {
        console.error("Invalid user_id in localStorage:", userIdRaw);
        setMessages((prev) => [
          ...prev,
          { content: "Erreur: ID utilisateur invalide. Veuillez vous reconnecter.", role: "assistant", id: Date.now().toString() },
        ]);
        return;
      }
    }

    setIsLoading(true);
    setMessages((prev) => [
      ...prev,
      { content: messageText, role: "user", id: Date.now().toString() },
    ]);
    setQuestion("");
    console.log("User Data before Chat Request:", {
      userId,
      username,
      messageText,
      model,
    });

    try {
      const data = await apiFetch("/chat", {
        method: "POST",
        body: JSON.stringify({ 
          query: messageText, 
          user_id: userId, 
          messages: [], 
          model 
        }),
      });
      console.log("Chat API Response:", data);
      setMessages((prev) => [
        ...prev,
        { content: data.answer, role: "assistant", id: Date.now().toString() },
      ]);
      const formattedResources = (data.sources || []).map((source) => ({ title: source, url: source }));
      console.log("Formatted Resources:", formattedResources);
      setResources(formattedResources);

      // Refresh history after new chat for authenticated users
      if (isAuthenticated) {
        const historyData = await apiFetch("/history", { method: "GET" });
        setHistory(historyData.history || []);
      }
    } catch (error) {
      console.error("Chat error details:", {
        message: error.message,
        stack: error.stack,
        status: (error as any).status,
      });
      setMessages((prev) => [
        ...prev,
        { content: `Erreur: ${error.message || "Une erreur interne est survenue."}`, role: "assistant", id: Date.now().toString() },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  const handleLogout = () => {
    console.log("Logging out user:", {
      userId: localStorage.getItem("user_id"),
      username,
      token: localStorage.getItem("token"),
    });
    localStorage.removeItem("token");
    localStorage.removeItem("user_id");
    localStorage.removeItem("username");
    console.log("User data cleared from localStorage");
    navigate("/");
  };

  const restoreConversation = (historyItem) => {
    setMessages(historyItem.conversation.messages);
    setResources(historyItem.conversation.sources.map((source) => ({ title: source, url: source })));
    setQuestion("");
  };

  const handleNewChat = () => {
    setMessages([]);
    setResources([]);
    setQuestion("");
    processedQueries.current.clear();
    window.location.reload();
  };

  return (
    <div className="flex flex-row min-w-0 h-dvh bg-background">
      <Sidebar
        isOpen={true}
        toggleSidebar={() => {}}
        position="left"
        resources={[]}
        history={history}
        username={username}
        onLogout={handleLogout}
        onHistoryClick={restoreConversation}
        onNewChat={handleNewChat}
      />
      <div className="flex flex-col min-w-0 flex-1">
        <div className="flex justify-center pt-4">
          <div className="relative inline-block text-left">
            <select
              className="block appearance-none w-40 bg-white border border-gray-300 hover:border-gray-400 px-4 py-2 pr-8 rounded shadow leading-tight focus:outline-none focus:shadow-outline"
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
            >
              {models.map((model) => (
                <option key={model} value={model}>
                  {model.charAt(0).toUpperCase() + model.slice(1)}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
              <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
              </svg>
            </div>
          </div>
        </div>
        <div className="flex flex-col min-w-0 gap-6 flex-1 overflow-y-scroll pt-4" ref={messagesContainerRef}>
          {messages.length === 0 && <Overview />}
          {messages.map((message, index) => (
            <PreviewMessage key={index} message={message} />
          ))}
          {isLoading && <ThinkingMessage />}
          {historyError && <div className="text-red-500 p-4">History Error: {historyError}</div>}
          <div ref={messagesEndRef} className="shrink-0 min-w-[24px] min-h-[24px]" />
        </div>
        <div className="flex mx-auto px-4 bg-background pb-4 md:pb-6 gap-2 w-full md:max-w-3xl">
          <ChatInput
            question={question}
            setQuestion={setQuestion}
            onSubmit={handleSubmit}
            isLoading={isLoading}
          />
        </div>
      </div>
      <Sidebar
        isOpen={true}
        toggleSidebar={() => {}}
        position="right"
        resources={resources}
        history={[]}
        username={username}
        onLogout={handleLogout}
        onHistoryClick={restoreConversation}
        onNewChat={handleNewChat}
      />
    </div>
  );
}