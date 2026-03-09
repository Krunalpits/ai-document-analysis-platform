"use client";

import React, { useState } from "react";
import { Input } from "./input";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Button } from "./button";
import { Send } from "lucide-react";
import MessageList from "./MessageList";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";

type Props = { chatId: number };

const ChatComponent = ({ chatId }: Props) => {
    const { data, isLoading } = useQuery({
        queryKey: ["chat", chatId],
        queryFn: async () => {
            const response = await axios.post("/api/get-messages", {
                chatId,
            });
            return response.data;
        },
    });

    // Convert DB messages to UIMessage format
    const initialMessages = React.useMemo(() => {
        if (!data) return [];
        return data.map((m: { id: number; content: string; role: string }) => ({
            id: String(m.id),
            role: m.role === "user" ? "user" as const : "assistant" as const,
            parts: [{ type: "text" as const, text: m.content }],
        }));
    }, [data]);

    if (isLoading) {
        return <div className="p-4">Loading chat...</div>;
    }

    return <ChatInner chatId={chatId} initialMessages={initialMessages} />;
};

// Separate component so useChat initializes AFTER data is loaded
function ChatInner({ chatId, initialMessages }: { chatId: number; initialMessages: any[] }) {
    const { messages, sendMessage, status } = useChat({
        transport: new DefaultChatTransport({
            api: "/api/chat",
            body: {
                chatId,
            },
        }),
        messages: initialMessages,
    });
    const [input, setInput] = useState("");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;
        sendMessage({ text: input });
        setInput("");
    };

    React.useEffect(() => {
        const messageContainer = document.getElementById("message-container");
        if (messageContainer) {
            messageContainer.scrollTo({
                top: messageContainer.scrollHeight,
                behavior: "smooth",
            });
        }
    }, [messages]);

    return (
        <div className="relative max-h-screen overflow-scroll" id="message-container">
            <div className="sticky top-0 inset-x-0 p-2 bg-white h-fit">
                <h3 className="text-xl font-bold">Chat</h3>
            </div>

            <MessageList messages={messages} />

            <form
                onSubmit={handleSubmit}
                className="sticky bottom-0 inset-x-0 px-2 py-4 bg-white flex"
            >
                <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask any question..."
                    className="w-full"
                />
                <Button type="submit" className="bg-blue-600 ml-2">
                    <Send className="h-4 w-4" />
                </Button>
            </form>
        </div>
    );
}

export default ChatComponent;