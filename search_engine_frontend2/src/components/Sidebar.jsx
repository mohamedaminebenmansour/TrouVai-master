import { MoreVertical, ChevronLast, ChevronFirst } from "lucide-react";
import { useContext, createContext, useState, useEffect } from "react";
import HistoryItem from "./HistoryItem";
import ResourceItem from "./ResourceItem";
import { apiFetch } from "../utils/api";

const SidebarContext = createContext();
export { SidebarContext };

export default function Sidebar({
  isOpen,
  toggleSidebar,
  position,
  resources,
  history: initialHistory,
  username,
  onLogout,
  onHistoryClick,
  onNewChat,
}) {
  const [expanded, setExpanded] = useState(isOpen);
  const [menuOpen, setMenuOpen] = useState(false);
  const [history, setHistory] = useState(initialHistory || []);
  const [historyError, setHistoryError] = useState(null);

  useEffect(() => {
    console.log("Sidebar Initial History Prop:", initialHistory);
    const fetchHistory = async () => {
      try {
        const data = await apiFetch("/history", { method: "GET" });
        console.log("Sidebar Fetched History Data:", data);
        setHistory(data.history || []);
        setHistoryError(null);
      } catch (error) {
        console.error("History fetch error:", error);
        setHistoryError(error.message);
        if (error.message.includes("Session expired") || error.message.includes("401")) {
          console.log("Attempting token refresh...");
          // Implement token refresh logic here if needed
        }
      }
    };
    fetchHistory();
  }, []);

  useEffect(() => {
    console.log("Sidebar Resources Prop:", resources);
  }, [resources]);

  const handleToggle = () => {
    setExpanded(!expanded);
    toggleSidebar();
  };

  const handleProfileMenuToggle = () => {
    setMenuOpen(!menuOpen);
  };

  return (
    <aside
      className={`h-screen transition-all duration-300 ${
        expanded
          ? position === "right"
            ? "w-64"
            : "w-60"
          : "w-12"
      }`}
    >
      <nav className="h-full flex flex-col bg-zinc-50 border-zinc-300 shadow-sm">
        <div className="p-4 pb-2 flex justify-between items-center">
          <button
            onClick={handleToggle}
            className="p-1.5 rounded-lg bg-gray-50 hover:bg-gray-100"
          >
            {expanded ? <ChevronFirst /> : <ChevronLast />}
          </button>
        </div>

        <SidebarContext.Provider value={{ expanded }}>
          <ul className="flex-1 px-3">
            {position === "left" ? (
              <>
                <li className="flex items-center py-2 px-3 my-1 font-medium rounded-md cursor-pointer hover:bg-indigo-50 text-gray-600">
                  <button
                    onClick={onNewChat}
                    className={`w-full flex items-center justify-center bg-blue-100 text-blue-600 rounded-lg px-4 py-2 transition-all ${
                      expanded ? "opacity-100" : "opacity-0 w-0 h-0"
                    }`}
                  >
                    <svg
                      className="w-5 h-5 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                    {expanded && "New chat"}
                  </button>
                </li>
                {expanded && historyError && (
                  <li className="py-2 px-3 my-1 text-red-500">
                    Failed to load history: {historyError}
                  </li>
                )}
                {expanded && !historyError && history.length === 0 && (
                  <li className="py-2 px-3 my-1 text-gray-500">
                    No history available.
                  </li>
                )}
                {expanded &&
                  !historyError &&
                  history.map((item, index) => (
                    <HistoryItem
                      key={index}
                      item={item}
                      onClick={() => onHistoryClick(item)}
                    />
                  ))}
                <li className="flex items-center py-2 px-3 my-1 font-medium rounded-md cursor-pointer hover:bg-indigo-50 text-gray-600 mt-auto relative">
                  <div
                    className={`flex items-center transition-all ${
                      expanded ? "opacity-100" : "opacity-0 w-0 h-0"
                    }`}
                  >
                    <img
                      src={`https://ui-avatars.com/api/?name=${encodeURIComponent(
                        username || "User"
                      )}&background=c7d2fe&color=3730a3&bold=true`}
                      alt="Profile"
                      className="w-10 h-10 rounded-md mr-3"
                    />
                    <span>{expanded ? username || "User" : ""}</span>
                  </div>
                  {expanded && (
                    <div className="ml-2 relative">
                      <MoreVertical
                        size={20}
                        className="cursor-pointer text-gray-500 hover:text-gray-700"
                        onClick={handleProfileMenuToggle}
                      />
                      {menuOpen && (
                        <div className="absolute right-0 mt-2 w-48 bg-white border rounded-md shadow-lg z-10">
                          <button
                            onClick={onLogout}
                            className="w-full text-left px-4 py-2 text-red-500 hover:bg-gray-100"
                          >
                            Sign out
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </li>
              </>
            ) : (
              <>
                {expanded &&
                  resources.map((resource, index) => (
                    <ResourceItem key={index} resource={resource} />
                  ))}
                {expanded && resources.length > 5 && (
                  <li className="flex items-center py-2 px-3 my-1 font-medium rounded-md cursor-pointer hover:bg-indigo-50 text-gray-600">
                    <button className="w-full text-center">See All</button>
                  </li>
                )}
              </>
            )}
          </ul>
        </SidebarContext.Provider>
      </nav>
    </aside>
  );
}