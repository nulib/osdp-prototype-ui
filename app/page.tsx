export default function Home() {
  const apiUrl = process.env.API_URL;

  if (!apiUrl) {
    throw new Error("API_URL is not defined");
  }

  return (
    <>
    <h1>Hello, cruel world!</h1>
    {/* add a button click that fetches from the apiURL */}
    <button onClick={async () => {
      const response = await fetch(apiUrl);
      const data = await response.json();
      console.log(data);
    }}>Fetch from API</button>
    </>
  );
}
