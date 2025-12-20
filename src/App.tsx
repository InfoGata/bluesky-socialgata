import { useState, useEffect } from "preact/hooks";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { MessageType, UiMessageType } from "./shared";

const sendUiMessage = (message: UiMessageType) => {
  parent.postMessage(message, "*");
};

const App = () => {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const onMessage = (event: MessageEvent<MessageType>) => {
      switch (event.data.type) {
        case "info":
          setIdentifier(event.data.identifier);
          setPassword(event.data.password);
          setIsLoggedIn(event.data.isLoggedIn);
          break;
      }
    };

    window.addEventListener("message", onMessage);
    sendUiMessage({ type: "check-login" });
    return () => window.removeEventListener("message", onMessage);
  }, []);

  const saveCredentials = () => {
    sendUiMessage({ type: "save", identifier, password });
  };

  return (
    <div className="flex flex-col gap-4 p-4 max-w-md">
      <h1 className="text-xl font-bold">Bluesky Plugin Settings</h1>

      <div className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">
          Status: {isLoggedIn ? (
            <span className="text-green-600 font-medium">Logged In</span>
          ) : (
            <span className="text-yellow-600 font-medium">Not Logged In</span>
          )}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="font-medium">Bluesky Credentials (Optional)</h2>
        <p className="text-sm text-muted-foreground">
          For authenticated access, enter your Bluesky handle and an{" "}
          <a href="https://bsky.app/settings/app-passwords" target="_blank">
            App Password
          </a>
          {" "}(not your main password).
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">Handle or Email</label>
        <Input
          placeholder="user.bsky.social or email@example.com"
          value={identifier}
          onChange={(e: any) => {
            const value = (e.target as HTMLInputElement).value;
            setIdentifier(value);
          }}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">App Password</label>
        <Input
          type="password"
          placeholder="xxxx-xxxx-xxxx-xxxx"
          value={password}
          onChange={(e: any) => {
            const value = (e.target as HTMLInputElement).value;
            setPassword(value);
          }}
        />
      </div>

      <Button onClick={saveCredentials}>Save</Button>

      <div className="text-sm text-muted-foreground mt-4">
        <h3 className="font-medium mb-2">Instructions:</h3>
        <ol className="list-decimal list-inside space-y-1">
          <li>Go to <a href="https://bsky.app/settings/app-passwords" target="_blank">Bluesky App Passwords</a></li>
          <li>Click "Add App Password"</li>
          <li>Give it a name (e.g., "SocialGata")</li>
          <li>Copy the generated password</li>
          <li>Enter your handle (e.g., user.bsky.social) and the app password above</li>
          <li>Click Save, then use the Login feature in SocialGata</li>
        </ol>
        <p className="mt-4 text-yellow-600">
          <strong>Note:</strong> Never use your main Bluesky password. Always use an App Password for third-party apps.
        </p>
      </div>
    </div>
  );
};

export default App;
