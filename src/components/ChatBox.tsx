import { useState, useEffect } from "react";
import { Avatar } from "./ui/avatar";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent, CardFooter, CardHeader } from "./ui/card";
import { ScrollArea } from "./ui/scroll-area";
import { v4 as uuidv4 } from "uuid";
import { supabase } from "@/lib/supabase";
import axios from "axios";

type Message = {
  id: string;
  text: string;
  sender: "user" | "other";
  timestamp: Date;
};

type ChatBoxProps = {
  recipient?: string;
  avatarUrl?: string;
  initialMessages?: Message[];
  onSendMessage?: (message: string) => void;
  className?: string;
  useAI?: boolean;
};

export default function ChatBox({
  recipient = "Chat",
  avatarUrl = "https://api.dicebear.com/7.x/avataaars/svg?seed=default",
  initialMessages = [],
  onSendMessage,
  className = "",
  useAI = false,
}: ChatBoxProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    // Add user message to chat
    const userMessage: Message = {
      id: uuidv4(),
      text: newMessage,
      sender: "user",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);

    // Call the onSendMessage callback if provided
    if (onSendMessage) {
      onSendMessage(newMessage);
    }

    setNewMessage("");

    // If AI mode is enabled, generate a response
    if (useAI) {
      setIsLoading(true);
      try {
        // Log the message to Supabase
        if (supabase) {
          await supabase.from("messages").insert({
            content: newMessage,
            sender: "user",
            recipient: recipient,
          });
        }

        // Send message via WhatsApp if needed
        // This would use the Fonnte API
        // const response = await sendWhatsAppMessage(recipient, newMessage, process.env.FONNTE_API_KEY);

        // Simulate AI response
        setTimeout(() => {
          const aiResponse: Message = {
            id: uuidv4(),
            text: "Thanks for your message! This is a simulated AI response.",
            sender: "other",
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, aiResponse]);
          setIsLoading(false);
        }, 1000);
      } catch (error) {
        console.error("Error sending message:", error);
        setIsLoading(false);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <Card className={`flex flex-col h-[500px] ${className}`}>
      <CardHeader className="flex flex-row items-center gap-3 p-4 border-b">
        <Avatar>
          <img src={avatarUrl} alt={recipient} />
        </Avatar>
        <div>
          <h3 className="font-semibold">{recipient}</h3>
        </div>
      </CardHeader>

      <CardContent className="flex-1 p-0">
        <ScrollArea className="h-[380px] p-4">
          <div className="flex flex-col gap-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${message.sender === "user" ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-800"}`}
                >
                  <p>{message.text}</p>
                  <p className="text-xs opacity-70 mt-1">
                    {message.timestamp.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 text-gray-800 rounded-lg p-3">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-75"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-150"></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>

      <CardFooter className="p-4 border-t">
        <div className="flex w-full gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button
            onClick={sendMessage}
            disabled={isLoading || !newMessage.trim()}
          >
            Send
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
