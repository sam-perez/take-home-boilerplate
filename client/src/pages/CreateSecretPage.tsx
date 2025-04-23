import React, { useState } from "react";
import { config } from "../config";

/**
 * CreateSecret component allows users to create a secret share.
 */
function CreateSecretPage() {
  const [secretText, setSecretText] = useState("");
  const [expirationDays, setExpirationDays] = useState<number | undefined>(
    undefined
  );
  const [password, setPassword] = useState<string | null>(null);
  const [shareId, setShareId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetch(config.API_URL + "/api/secrets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          secret_text: secretText,
          expiration_days: expirationDays,
          password: password === "" || password === null ? undefined : password,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.error || "Failed to create secret");
        return;
      }

      const data = await response.json();
      setShareId(data.share_id);
      setError(null);
    } catch (err) {
      console.error(err);
      setError("Failed to create secret");
    }
  };

  if (error !== null) {
    <p className="text-red-500">{error}</p>;
  }

  return (
    <div className="h-screen bg-black flex justify-center items-center flex-col space-y-4 text-white">
      {shareId === null ? (
        <>
          <h1 className="text-2xl font-bold">Create a Secret Share</h1>
          <form
            onSubmit={handleSubmit}
            className="flex flex-col space-y-2 w-96"
          >
            <textarea
              placeholder="Enter your secret text"
              value={secretText}
              onChange={(e) => setSecretText(e.target.value)}
              className="bg-gray-800 text-white p-2 rounded"
            />
            <input
              type="number"
              placeholder="Expiration days (optional)"
              min="1"
              value={expirationDays === undefined ? "" : expirationDays}
              onChange={(e) =>
                setExpirationDays(
                  e.target.value === "" ? undefined : Number(e.target.value)
                )
              }
              className="bg-gray-800 text-white p-2 rounded"
            />
            <input
              type="password"
              placeholder="Password (optional)"
              value={password || ""}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-gray-800 text-white p-2 rounded"
            />
            <button
              type="submit"
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            >
              Create Secret
            </button>
          </form>
        </>
      ) : (
        <div className="text-center">
          <h1 className="text-2xl font-bold">Secret created successfully!</h1>
          <p className="mt-2">
            Share this link:{" "}
            <b>
              <a
                href={`${config.APP_URL}/secret/${shareId}`}
              >{`${config.APP_URL}/secret/${shareId}`}</a>
            </b>
          </p>
        </div>
      )}
    </div>
  );
}

export default CreateSecretPage;
