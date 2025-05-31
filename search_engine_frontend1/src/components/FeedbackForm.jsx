import { useState } from "react";

function FeedbackForm() {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false); // Ajout de l'état de chargement
  const [error, setError] = useState(null); // Ajouter un état d'erreur
  const [success, setSuccess] = useState(null); // Ajouter un état de succès

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("token");

    if (!token) {
      setError("Veuillez vous connecter !");
      return;
    }

    setLoading(true); // Activer le chargement

    try {
      const res = await fetch("http://localhost:5000/api/feedback/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message }),
      });

      const data = await res.json();

      if (res.status === 401) {
        setError("Veuillez vous connecter !");
        window.location.href = "/login";
      } else if (res.ok) {
        setSuccess("Feedback envoyé avec succès !");
        setMessage("");
      } else {
        setError(data.error || "Une erreur inconnue est survenue.");
      }
    } catch (err) {
      setError("Erreur réseau, veuillez vérifier votre connexion.");
    } finally {
      setLoading(false); // Désactiver le chargement
    }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <textarea
          placeholder="Écris ton feedback ici"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full border rounded p-2"
        />
        <button
          type="submit"
          className="bg-blue-500 text-white px-4 py-2 rounded"
          disabled={loading}
        >
          {loading ? "Envoi en cours..." : "Envoyer le feedback"}
        </button>
      </form>

      {/* Affichage des messages d'erreur ou de succès */}
      {error && <p className="text-red-500">{error}</p>}
      {success && <p className="text-green-500">{success}</p>}
    </div>
  );
}

export default FeedbackForm;
