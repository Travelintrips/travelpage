import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/lib/supabase";
import {
  AlertCircle,
  CheckCircle2,
  Copy,
  Eye,
  EyeOff,
  Save,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const ApiSettings = () => {
  const [googleMapsKey, setGoogleMapsKey] = useState("");
  const [fonteApiKey, setFonteApiKey] = useState("");
  const [openaiApiKey, setOpenaiApiKey] = useState("");
  const [showGoogleKey, setShowGoogleKey] = useState(false);
  const [showFonteKey, setShowFonteKey] = useState(false);
  const [showOpenaiKey, setShowOpenaiKey] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{
    type: "success" | "error" | null;
    message: string;
  }>({ type: null, message: "" });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Load API keys from database or local storage
    const loadApiKeys = async () => {
      try {
        const { data, error } = await supabase
          .from("api_settings")
          .select("*")
          .limit(1)
          .maybeSingle();

        if (error) {
          console.error("Error loading API settings:", error);
          return;
        }

        if (data) {
          setGoogleMapsKey(data.google_maps_key || "");
          setFonteApiKey(data.fonte_api_key || "");
          setOpenaiApiKey(data.openai_api_key || "");
        }
      } catch (error) {
        console.error("Error:", error);
      }
    };

    loadApiKeys();
  }, []);

  const saveApiKeys = async () => {
    setLoading(true);
    setSaveStatus({ type: null, message: "" });

    try {
      const { error } = await supabase.from("api_settings").upsert({
        id: 1, // Using a fixed ID for the settings record
        google_maps_key: googleMapsKey,
        fonte_api_key: fonteApiKey,
        openai_api_key: openaiApiKey,
        updated_at: new Date().toISOString(),
      });

      if (error) {
        setSaveStatus({
          type: "error",
          message: "Failed to save API keys: " + error.message,
        });
      } else {
        setSaveStatus({
          type: "success",
          message: "API keys saved successfully!",
        });
      }
    } catch (error: any) {
      setSaveStatus({
        type: "error",
        message: "An unexpected error occurred: " + error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setSaveStatus({ type: "success", message: "Copied to clipboard!" });
    setTimeout(() => setSaveStatus({ type: null, message: "" }), 3000);
  };

  return (
    <div className="container mx-auto py-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">API Settings</h1>
        <p className="text-muted-foreground">
          Manage your API keys for various services
        </p>
      </div>

      {saveStatus.type && (
        <Alert
          className={`mb-6 ${saveStatus.type === "success" ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}
        >
          {saveStatus.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          ) : (
            <AlertCircle className="h-4 w-4 text-red-600" />
          )}
          <AlertDescription
            className={
              saveStatus.type === "success" ? "text-green-700" : "text-red-700"
            }
          >
            {saveStatus.message}
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="google" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-8">
          <TabsTrigger value="google">Google Maps API</TabsTrigger>
          <TabsTrigger value="fonte">Fonte API</TabsTrigger>
          <TabsTrigger value="openai">OpenAI API</TabsTrigger>
        </TabsList>

        <TabsContent value="google">
          <Card>
            <CardHeader>
              <CardTitle>Google Maps API Key</CardTitle>
              <CardDescription>
                Used for maps, location services, and address autocomplete
                functionality.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="googleMapsKey">API Key</Label>
                  <div className="flex">
                    <Input
                      id="googleMapsKey"
                      type={showGoogleKey ? "text" : "password"}
                      value={googleMapsKey}
                      onChange={(e) => setGoogleMapsKey(e.target.value)}
                      className="flex-1"
                      placeholder="Enter your Google Maps API key"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      type="button"
                      onClick={() => setShowGoogleKey(!showGoogleKey)}
                      className="ml-2"
                    >
                      {showGoogleKey ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      type="button"
                      onClick={() => copyToClipboard(googleMapsKey)}
                      className="ml-2"
                      disabled={!googleMapsKey}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fonte">
          <Card>
            <CardHeader>
              <CardTitle>Fonte API Key</CardTitle>
              <CardDescription>
                Used for messaging and notification services.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="fonteApiKey">API Key</Label>
                  <div className="flex">
                    <Input
                      id="fonteApiKey"
                      type={showFonteKey ? "text" : "password"}
                      value={fonteApiKey}
                      onChange={(e) => setFonteApiKey(e.target.value)}
                      className="flex-1"
                      placeholder="Enter your Fonte API key"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      type="button"
                      onClick={() => setShowFonteKey(!showFonteKey)}
                      className="ml-2"
                    >
                      {showFonteKey ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      type="button"
                      onClick={() => copyToClipboard(fonteApiKey)}
                      className="ml-2"
                      disabled={!fonteApiKey}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="openai">
          <Card>
            <CardHeader>
              <CardTitle>OpenAI API Key</CardTitle>
              <CardDescription>
                Used for AI-powered features and chatbot functionality.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="openaiApiKey">API Key</Label>
                  <div className="flex">
                    <Input
                      id="openaiApiKey"
                      type={showOpenaiKey ? "text" : "password"}
                      value={openaiApiKey}
                      onChange={(e) => setOpenaiApiKey(e.target.value)}
                      className="flex-1"
                      placeholder="Enter your OpenAI API key"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      type="button"
                      onClick={() => setShowOpenaiKey(!showOpenaiKey)}
                      className="ml-2"
                    >
                      {showOpenaiKey ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      type="button"
                      onClick={() => copyToClipboard(openaiApiKey)}
                      className="ml-2"
                      disabled={!openaiApiKey}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="mt-8 flex justify-end">
        <Button onClick={saveApiKeys} disabled={loading}>
          <Save className="mr-2 h-4 w-4" />
          {loading ? "Saving..." : "Save API Keys"}
        </Button>
      </div>
    </div>
  );
};

export default ApiSettings;
