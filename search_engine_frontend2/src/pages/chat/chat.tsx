import { ChatInput } from "@/components/custom/chatinput";
import { PreviewMessage, ThinkingMessage } from "../../components/custom/message";
import { useScrollToBottom } from "@/components/custom/use-scroll-to-bottom";
import { useState, useEffect, useRef } from "react";
import { Overview } from "@/components/custom/overview";
import { apiFetch } from "../../utils/api";
import Sidebar from "../../components/Sidebar";
import { useNavigate, useLocation, useNavigationType } from "react-router-dom";

export function Chat() {
  const [isNewConversation, setIsNewConversation] = useState(false);
  const [messagesContainerRef, messagesEndRef] = useScrollToBottom();
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [resources, setResources] = useState([]);
  const [history, setHistory] = useState([]);
  const [historyId, setHistoryId] = useState(null);
  const [username, setUsername] = useState(localStorage.getItem("username") || "User");
  const [historyError, setHistoryError] = useState(null);
  const hasProcessedInitialQuery = useRef(false);
  const navigate = useNavigate();
  const { state } = useLocation();
  const navigationType = useNavigationType();

  const isAuthenticated = !!localStorage.getItem("token");
  const models = isAuthenticated ? ['llama2', 'gemma', 'llama3', 'mistral'] : ['llama3', 'mistral'];
  const [selectedModel, setSelectedModel] = useState(state?.model || models[0]);

  console.log("Chat Component Render", {
    state,
    isAuthenticated,
    selectedModel,
    messagesLength: messages.length,
    historyId,
    hasProcessedInitialQuery: hasProcessedInitialQuery.current,
    timestamp: Date.now(),
  });

  useEffect(() => {
    console.log("useEffect for initial query triggered", {
      stateQuery: state?.query,
      isLoading,
      hasProcessedInitialQuery: hasProcessedInitialQuery.current,
      navigationType,
      timestamp: Date.now(),
    });
    if (
      state?.query &&
      !isLoading &&
      !hasProcessedInitialQuery.current &&
      navigationType === "PUSH"
    ) {
      console.log("Processing initial query", {
        query: state.query,
        model: state.model || models[0],
        timestamp: Date.now(),
      });
      hasProcessedInitialQuery.current = true;
      setQuestion(state.query); // Set input field to show the query
      handleSubmit(state.query, state.model || models[0]);
      navigate(
        { pathname: window.location.pathname },
        { replace: true, state: {} } // Clear state.query to prevent re-processing
      );
    }
  }, [state?.query, state?.model, isLoading, models, navigationType, navigate]);

  useEffect(() => {
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

    console.log("Clearing conversation state on initial load", { timestamp: Date.now() });
    setMessages([]);
    setResources([]);
    setHistory([]);
    setHistoryId(null);
    setHistoryError(null);
  }, []);

  const fetchHistory = async () => {
    if (!isAuthenticated) {
      console.log("User not authenticated, clearing history");
      setHistory([]);
      setHistoryError(null);
      return;
    }

    try {
      console.log("Fetching history for authenticated user");
      const data = await apiFetch("/history", { method: "GET" });
      console.log("Fetched History Data:", data);
      setHistory(data.history || []);
      setHistoryError(null);
    } catch (error) {
      console.error("Failed to fetch history:", error);
      setHistoryError(error.message || "Failed to load history");
    }
  };

  async function handleSubmit(text, model = selectedModel) {
    if (isLoading) return;

    const messageText = text || question;
    console.log("Submitting message:", {
      messageText,
      model,
      isAuthenticated,
      historyId,
      messagesLength: messages.length,
      timestamp: Date.now(),
    });

    // Prevent adding duplicate user message
    if (messages.some((msg) => msg.content === messageText && msg.role === "user")) {
      console.log("Duplicate message detected, skipping addition:", messageText);
      setIsLoading(true); // Still allow the API call to proceed
    } else {
      const newMessage = { content: messageText, role: "user", id: Date.now().toString() };
      setMessages((prev) => [...prev, newMessage]);
      setIsLoading(true);
    }

    const userIdRaw = localStorage.getItem("user_id");

    if (isAuthenticated && !userIdRaw) {
      console.error("No user_id found in localStorage. Redirecting to login.");
      setMessages((prev) => [
        ...prev,
        { content: "Erreur: Veuillez vous connecter.", role: "assistant", id: Date.now().toString() },
      ]);
      navigate("/login");
      setIsLoading(false);
      return;
    }

    const userId = isAuthenticated ? parseInt(userIdRaw || "0", 10) : null;
    if (isAuthenticated && isNaN(userId)) {
      console.error("Invalid user_id in localStorage:", userIdRaw);
      setMessages((prev) => [
        ...prev,
        { content: "Erreur: ID utilisateur invalide. Veuillez vous reconnecter.", role: "assistant", id: Date.now().toString() },
      ]);
      navigate("/login");
      setIsLoading(false);
      return;
    }

    setQuestion(""); // Clear input field after submission

    const payload = {
      query: messageText,
      user_id: isAuthenticated ? userId : null,
      messages: isNewConversation ? [{ content: messageText, role: "user", id: Date.now().toString() }] : messages.concat([{ content: messageText, role: "user", id: Date.now().toString() }]),
      history_id: isNewConversation ? null : historyId,
      model,
    };
    console.log("Sending payload to /chat:", payload);

    try {
      const data = await apiFetch("/chat", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      console.log("Received response from /chat:", data);

      const assistantMessage = { content: data.answer, role: "assistant", id: Date.now().toString() };
      setMessages((prev) => [...prev, assistantMessage]);
      const formattedResources = (data.sources || []).map((source) => ({ title: source, url: source }));
      console.log("Formatted Resources:", formattedResources);
      setResources(formattedResources);

      if (!data.history_id) {
        console.warn("No history_id returned from /chat endpoint");
        setMessages((prev) => [
          ...prev,
          { content: "Avertissement: La conversation n'a pas été sauvegardée correctement.", role: "assistant", id: Date.now().toString() },
        ]);
      } else {
        setHistoryId(data.history_id);
        setIsNewConversation(false);
        console.log("Conversation saved with history_id:", data.history_id);
      }

      if (isAuthenticated) {
        await fetchHistory(); // Refresh history to update sidebar
      }
    } catch (error) {
      console.error("Chat error details:", {
        message: error.message,
        stack: error.stack,
        status: error.status,
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
    console.log("Restoring conversation:", {
      historyId: historyItem.id,
      searchQuery: historyItem.search_query,
      messages: historyItem.conversation.messages,
      sources: historyItem.conversation.sources,
    });
    setMessages(historyItem.conversation.messages);
    setResources(historyItem.conversation.sources.map((source) => ({ title: source, url: source })));
    setQuestion("");
    setHistoryId(historyItem.id);
  };

  const handleNewChat = () => {
    console.log("Starting new chat, clearing conversation state", { timestamp: Date.now() });
    setMessages([]);
    setResources([]);
    setQuestion("");
    setHistory([]);
    setHistoryId(null);
    setHistoryError(null);
    setIsNewConversation(true);
    hasProcessedInitialQuery.current = false;
    navigate(
      { pathname: window.location.pathname },
      { replace: true, state: {} }
    );
    if (isAuthenticated) {
      fetchHistory(); // Fetch history to update sidebar
    }
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