"use client";
import { Amplify } from "aws-amplify";
import { Authenticator } from "@aws-amplify/ui-react";
import { useState, useEffect } from "react";
import { fetchAuthSession } from '@aws-amplify/auth';
import "@aws-amplify/ui-react/styles.css";

export default function Home() {
  const [inputValue, setInputValue] = useState("");
  const [apiResponse, setApiResponse] = useState(null);
  const [isConfigured, setIsConfigured] = useState(false);
  const [chatEndpoint, setChatEndpoint] = useState(""); 
  
  useEffect(() => {
    const apiUrlValue = process.env.NEXT_PUBLIC_API_URL;
    const userPoolId = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID;
    const userPoolClientId = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID;

    if (!apiUrlValue || !userPoolId || !userPoolClientId) {
      console.error("Required environment variables are not defined");
      return;
    }

    const chatEndpoint = new URL('chat', apiUrlValue).toString();

    setChatEndpoint(chatEndpoint);

    Amplify.configure({
      Auth: {
        Cognito: {
          userPoolId,
          userPoolClientId
        },
      }
    });
    
    setIsConfigured(true);
  }, []);

  async function getToken() {
    try {
      const session = await fetchAuthSession();
      const accessToken = session.tokens?.accessToken?.toString() || '';
      const idToken = session.tokens?.idToken?.toString() || '';
      console.log('accessToken:', accessToken);
      console.log('idToken:', idToken);
      return idToken;
    } catch (error) {
      console.error('Error fetching auth session:', error);
      return null;
    }
  }

  const getApiResponse = async () => {
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
        credentials: 'include',
        body: JSON.stringify({ user_prompt: inputValue }),
      })
        .then(async (response) => {
          const data = await response.json();
          console.log(data);
          setApiResponse(data);
          return data;
        })
        .catch((error) => {
          console.log("error", error);
          return null;
        });
    } catch (error) {
      console.error(error);
      return null;
    }
  }

  if (!isConfigured) {
    return <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh' 
    }}>Loading...</div>;
  }

  return (
    <Authenticator
      hideSignUp
    >
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
              className="button"
            >
              Chat with collection
            </button>
          </div>

          {/* Display the API response */}
          {apiResponse && (
            <div className="response-container">
              <h3>Response:</h3>
              {typeof apiResponse === 'string' ? (
                <div>{apiResponse}</div>
              ) : (
                <pre className="response-content">
                  {JSON.stringify(apiResponse, null, 2)}
                </pre>
              )}
            </div>
          )}

          <button onClick={signOut} className="button">Sign out</button>
        </main>
      )}
    </Authenticator>
  );
}