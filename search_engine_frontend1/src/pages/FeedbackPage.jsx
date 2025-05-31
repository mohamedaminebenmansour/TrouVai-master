import { useEffect, useState } from "react";

function FeedbackPage() {
  const [message, setMessage] = useState("");
  const [feedbacks, setFeedbacks] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [selectedFeedbackId, setSelectedFeedbackId] = useState(null);

  const fetchFeedbacks = async () => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch("http://localhost:5000/api/feedback/", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setFeedbacks(data.feedbacks);
      } else {
        const err = await res.json();
        alert(err.error || "Erreur inconnue");
      }
    } catch (err) {
      console.error("Erreur réseau", err);
    }
  };

  useEffect(() => {
    fetchFeedbacks();
  }, []);

  const submitFeedback = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("token");

    if (!message) {
      setError("Le message est requis !");
      return;
    }

    try {
      const res = await fetch("http://localhost:5000/api/feedback/", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message }),
      });

      if (res.ok) {
        setSuccess("Feedback envoyé avec succès !");
        setMessage("");
        setError("");
        fetchFeedbacks();
      } else {
        const err = await res.json();
        setError(err.error || "Erreur lors de l'envoi");
      }
    } catch (err) {
      console.error("Erreur réseau", err);
    }
  };

  const handleDelete = async () => {
    const token = localStorage.getItem("token");

    try {
      const res = await fetch(`http://localhost:5000/api/feedback/${selectedFeedbackId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        setSuccess("Feedback supprimé !");
        setShowModal(false);
        setSelectedFeedbackId(null);
        fetchFeedbacks();
      } else {
        const err = await res.json();
        alert(err.error || "Erreur lors de la suppression");
      }
    } catch (err) {
      console.error("Erreur réseau", err);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-xl font-semibold">Envoyer un Feedback</h2>

      <form onSubmit={submitFeedback} className="space-y-4">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full p-2 border rounded"
          placeholder="Écrivez votre message..."
          rows="4"
        />
        {error && <p className="text-red-500">{error}</p>}
        {success && <p className="text-green-500">{success}</p>}
        <button type="submit" className="px-4 py-2 bg-blue-500 text-white rounded">
          Soumettre Feedback
        </button>
      </form>

      <h3 className="text-xl font-semibold">Mes Feedbacks</h3>
      {feedbacks.length === 0 ? (
        <p>Aucun feedback envoyé pour le moment.</p>
      ) : (
        <ul className="space-y-4">
          {feedbacks.map((f) => (
            <li key={f.id} className="border p-4 rounded-lg relative">
              <p>{f.message}</p>
              <span className="text-sm text-gray-500">
                {new Date(f.timestamp).toLocaleString()}
              </span>
              <button
                onClick={() => {
                  setSelectedFeedbackId(f.id);
                  setShowModal(true);
                }}
                className="absolute top-2 right-2 text-red-500 hover:text-red-700"
              >
                Supprimer
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Modale de confirmation */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow-md max-w-sm w-full">
            <h4 className="text-lg font-semibold mb-4">Confirmer la suppression</h4>
            <p className="mb-4">Êtes-vous sûr de vouloir supprimer ce feedback ?</p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
              >
                Annuler
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default FeedbackPage;
