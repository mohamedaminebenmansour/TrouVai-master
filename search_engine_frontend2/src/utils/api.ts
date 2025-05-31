const BASE_URL = "http://localhost:5000/api";

export const apiFetch = async (
  endpoint: string,
  options: RequestInit = {}
) => {
  const token = localStorage.getItem("token");

  // Create headers object
  const headers = new Headers();
  headers.append("Content-Type", "application/json");
  if (token) {
    headers.append("Authorization", `Bearer ${token}`);
  }

  // Ensure credentials are included for CORS
  const config: RequestInit = {
    ...options,
    headers,
    mode: "cors",
    credentials: "include",
  };

  try {
    // First check if we can make a simple OPTIONS request
    const preflightResponse = await fetch(`${BASE_URL}${endpoint}`, {
      method: "OPTIONS",
      headers,
      mode: "cors",
      credentials: "include",
    });
    
    if (!preflightResponse.ok) {
      console.error("Preflight failed:", {
        endpoint,
        status: preflightResponse.status,
        statusText: preflightResponse.statusText,
      });
      throw new Error(`CORS preflight failed: ${preflightResponse.statusText}`);
    }

    // Now make the actual request
    const response = await fetch(`${BASE_URL}${endpoint}`, config);

    // Handle 401 Unauthorized specifically
    if (response.status === 401) {
      clearToken();
      window.location.href = '/login';
      throw new Error("Session expired. Please login again.");
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("API Error:", {
        endpoint,
        status: response.status,
        error: errorData.error || "Unknown error",
      });
      throw new Error(errorData.error || `Request failed with status ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("API Fetch Failed:", {
      endpoint,
      error: error.message,
    });
    
    // Provide more specific error message
    if (error.message.includes("CORS preflight failed")) {
      throw new Error("CORS configuration error. Please check server settings.");
    }
    
    throw new Error(`API call to ${endpoint} failed: ${error.message}`);
  }
};

// Add functions to manage the token in localStorage
export const setToken = (token: string) => {
  localStorage.setItem("token", token);
};

export const clearToken = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user_id");
  localStorage.removeItem("username");
};