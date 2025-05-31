import { ChatInput } from "@/components/custom/chatinput";
import { PreviewMessage, ThinkingMessage } from "../../components/custom/message";
import { useScrollToBottom } from "@/components/custom/use-scroll-to-bottom";
import { useState, useEffect } from "react";
import { message } from "../../interfaces/interfaces";
import { Overview } from "@/components/custom/overview";
import { apiFetch } from "../../utils/api";
import Sidebar from "../../components/Sidebar";
import { useNavigate } from "react-router-dom";

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
  const navigate = useNavigate();

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
    fetchHistory();

    const userId = localStorage.getItem("user_id");
    const storedUsername = localStorage.getItem("username");
    console.log("Initial User Data from localStorage:", {
      userId,
      username: storedUsername,
      token: localStorage.getItem("token"),
    });

    if (!storedUsername) {
      console.warn("Username not found in localStorage, using fallback: 'User'");
      setUsername("User");
    } else {
      setUsername(storedUsername);
    }
  }, []);

  async function handleSubmit(text?: string) {
    if (isLoading) return;

    const messageText = text || question;
    const userIdRaw = localStorage.getItem("user_id");
    
    // Validate userId
    if (!userIdRaw) {
      console.error("No user_id found in localStorage. Redirecting to login.");
      setMessages((prev) => [
        ...prev,
        { content: "Erreur: Veuillez vous connecter.", role: "assistant", id: Date.now().toString() },
      ]);
      navigate("/login");
      return;
    }

    const userId = parseInt(userIdRaw, 10);
    if (isNaN(userId)) {
      console.error("Invalid user_id in localStorage:", userIdRaw);
      setMessages((prev) => [
        ...prev,
        { content: "Erreur: ID utilisateur invalide. Veuillez vous reconnecter.", role: "assistant", id: Date.now().toString() },
      ]);
      navigate("/login");
      return;
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
    });

    try {
      const data = await apiFetch("/chat", {
        method: "POST",
        body: JSON.stringify({ query: messageText, user_id: userId, messages: [] }),
      });
      console.log("Chat API Response:", data);
      setMessages((prev) => [
        ...prev,
        { content: data.answer, role: "assistant", id: Date.now().toString() },
      ]);
      const formattedResources = (data.sources || []).map((source) => ({ title: source, url: source }));
      console.log("Formatted Resources:", formattedResources);
      setResources(formattedResources);
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
    window.location.reload();
  };

  return (
    <div className="flex flex-row min-w-0 h-dvh bg-background">
      <Sidebar
        isOpen={true}
        toggleSidebar={() => {}}
        position="left"
        history={history}
        resources={[]}
        username={username}
        onLogout={handleLogout}
        onHistoryClick={restoreConversation}
        onNewChat={handleNewChat}
      />
      <div className="flex flex-col min-w-0 flex-1">
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