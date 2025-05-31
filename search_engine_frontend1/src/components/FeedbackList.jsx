import { useEffect, useState } from "react";

function FeedbackList() {
  const [feedbacks, setFeedbacks] = useState([]);

  const fetchFeedbacks = async () => {
    const token = localStorage.getItem("token");
    const res = await fetch("http://localhost:5000/api/feedback/", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (res.ok) {
      const data = await res.json();
      setFeedbacks(data.feedbacks);
    }
  };

  const handleDelete = async (id) => {
    const token = localStorage.getItem("token");

    const res = await fetch(`http://localhost:5000/api/feedback/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (res.ok) {
      alert("Feedback supprimé !");
      setFeedbacks(feedbacks.filter((f) => f.id !== id)); // MAJ de l'état local
    } else {
      const err = await res.json();
      alert("Erreur : " + err.error);
    }
  };

  useEffect(() => {
    fetchFeedbacks();
  }, []);

  return (
    <div className="space-y-4 mt-6">
      <h2 className="text-xl font-bold">Mes Feedbacks</h2>
      {feedbacks.map((f) => (
        <div
          key={f.id}
          className="border p-4 rounded flex justify-between items-center"
        >
          <p>{f.message}</p>
          <button
            onClick={() => handleDelete(f.id)}
            className="bg-red-500 text-white px-2 py-1 rounded"
          >
            Supprimer
          </button>
        </div>
      ))}
    </div>
  );
}

export default FeedbackList;
