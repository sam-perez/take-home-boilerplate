import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { config } from "../config";

/**
 * Page to view a secret share.
 *
 * Handles secrets requiring a password.
 */
function ViewSecretPage() {
  const { shareId } = useParams();
  const [secretText, setSecretText] = useState<string | null>(null);
  const [password, setPassword] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [passwordRequired, setPasswordRequired] = useState(false);

  // Ok to recompute this on each render, should be lightweight enough
  const fetchSecret = async () => {
    try {
      let url = `${config.API_URL}/api/secrets/${shareId}`;
      if (password !== null && password.length > 0) {
        url += `?password=${encodeURIComponent(password)}`;
      }

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSecretText(data.secret_text);
        setError(null);
        setPasswordRequired(false);
      } else if (response.status === 401) {
        const errorData = await response.json();
        if (errorData.error === "Password required") {
          setPasswordRequired(true);
          setError(null);
        } else {
          setError(errorData.error);
        }
      } else {
        setError(
          "Failed to retrieve secret. It may never have existed or expired."
        );
      }
    } catch (err) {
      console.error(err);
      setError("Failed to retrieve secret");
    }
  };

  // This should be run only once when the component mounts. It's the initial fetch of the secret.
  useEffect(() => {
    fetchSecret();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (password === null || password.length === 0) {
        return;
      }

      fetchSecret();
    } catch (err) {
      console.error(err);
      setError("Failed to retrieve secret");
    }
  };

  if (!shareId) {
    return (
      <div className="h-screen bg-black flex justify-center items-center flex-col space-y-4 text-white">
        <h1 className="text-2xl font-bold">View Secret</h1>
        <p className="text-red-500">Invalid or missing share ID.</p>
      </div>
    );
  }

  return (
    <div className="h-screen bg-black flex justify-center items-center flex-col space-y-4 text-white">
      <h1 className="text-2xl font-bold">View Secret</h1>
      {passwordRequired ? (
        <form
          onSubmit={handlePasswordSubmit}
          className="flex flex-col space-y-2"
        >
          <p className="text-red-500">
            Password required to view this secret. Please enter it below.
          </p>
          <input
            type="password"
            placeholder="Enter password"
            value={password || ""}
            onChange={(e) => setPassword(e.target.value)}
            className="bg-gray-800 text-white p-2 rounded"
          />
          <button
            type="submit"
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Submit Password
          </button>
          {error && <p className="text-red-500">{error}</p>}
        </form>
      ) : secretText ? (
        <div className="text-center">
          <p className="mb-2">Secret deciphered! The secret text:</p>
          <textarea
            value={secretText}
            readOnly
            className="bg-gray-800 text-white p-2 rounded w-full h-48"
          />
        </div>
      ) : (
        <p>{error || "Loading secret..."}</p>
      )}
    </div>
  );
}

export default ViewSecretPage;
