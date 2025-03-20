"use client";
import { Amplify } from "aws-amplify";
import { Authenticator } from "@aws-amplify/ui-react";
import { useState, useEffect } from "react";
import { fetchAuthSession } from "@aws-amplify/auth";
import Markdown from "react-markdown";
import "@aws-amplify/ui-react/styles.css";

interface S3Location {
  uri: string;
}

interface Location {
  s3Location: S3Location;
  type: "S3";
}

interface Content {
  /**
   * The chunk the knowledge base used, which may or may not resemble a IIIF Manifest
   *
   * @remarks
   *
   * It will almost never be valid JSON
   */
  text: string;
}

interface Reference {
  content: Content;
  location: Location;
}

interface Response {
  answer: string;
  references: Reference[];
  session_id: string;
}

export default function Home() {
  const [inputValue, setInputValue] = useState("");
  const [apiResponse, setApiResponse] = useState<Response | null>(null);
  const [isConfigured, setIsConfigured] = useState(false);
  const [chatEndpoint, setChatEndpoint] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");

  useEffect(() => {
    const apiUrlValue = process.env.NEXT_PUBLIC_API_URL;
    const userPoolId = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID;
    const userPoolClientId =
      process.env.NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID;

    if (!apiUrlValue || !userPoolId || !userPoolClientId) {
      console.error("Required environment variables are not defined");
      return;
    }

    const chatEndpoint = new URL("chat", apiUrlValue).toString();
    setChatEndpoint(chatEndpoint);

    Amplify.configure({
      Auth: {
        Cognito: {
          userPoolId,
          userPoolClientId,
        },
      },
    });

    setIsConfigured(true);
  }, []);

  async function getToken() {
    try {
      const session = await fetchAuthSession();
      const accessToken = session.tokens?.accessToken?.toString() || "";
      const idToken = session.tokens?.idToken?.toString() || "";
      console.log("accessToken:", accessToken);
      console.log("idToken:", idToken);
      return idToken;
    } catch (error) {
      console.error("Error fetching auth session:", error);
      return null;
    }
  }

  const getApiResponse = async () => {
    setState("loading");

    try {
      const token = await getToken();

      if (!token) {
        console.error("User is not properly authenticated");
        return;
      }

      if (!chatEndpoint) {
        console.error("Chat endpoint is not defined");
        return;
      }

      return await fetch(chatEndpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ user_prompt: inputValue }),
      })
        .then(async (response) => {
          const data = await response.json();
          console.log(data);
          setApiResponse(data);
          setState("idle");
        })
        .catch((error) => {
          console.log("error", error);
          setState("error");
        });
    } catch (error) {
      console.error(error);
      setState("error");
    }
  };

  if (!isConfigured) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        Loading...
      </div>
    );
  }

  return (
    <Authenticator hideSignUp>
      {({ signOut, user }) => (
        <main className="container">
          <h1 className="title">Hello {user?.username}</h1>

          <div className="form-group">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Enter your question"
              className="input-field"
            />
            <button
              onClick={async () => {
                await getApiResponse();
              }}
              className={`button ${
                state === "loading" ? "disabled:bg-gray-400" : ""
              }`}
              disabled={state === "loading"}
            >
              {state === "loading" ? "Loading..." : "Chat with collection"}
            </button>
          </div>

          {/* Display the API response */}
          {apiResponse && (
            <div className="response-container flex flex-col gap-4 mb-4 [&_ol]:list-disc [&_ol]:pl-4 [&_ul]:list-disc [&_ul]:pl-4">
              <div className="answer">
                <Markdown>{apiResponse.answer}</Markdown>
              </div>
              <div className="references">
                <details className="border p-2 rounded bg-gray-100 border-gray-400 overflow-auto">
                  <summary className="">References</summary>
                  <pre className="whitespace-pre-wrap">
                    {JSON.stringify(apiResponse.references, null, 2)}
                  </pre>
                </details>
              </div>
            </div>
          )}

          {state === "error" && (
            <div className="error-message mb-4 border border-red-800 rounded p-4 bg-red-300">
              An error occurred while fetching the response. Please try again.
            </div>
          )}

          <button onClick={signOut} className="button">
            Sign out
          </button>
        </main>
      )}
    </Authenticator>
  );
}
