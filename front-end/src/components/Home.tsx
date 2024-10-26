import {
  ChatBubble,
  ChatBubbleAction,
  ChatBubbleAvatar,
  ChatBubbleMessage,
} from "@/components/ui/chat/chat-bubble";
import { ChatInput } from "@/components/ui/chat/chat-input";
import { ChatMessageList } from "@/components/ui/chat/chat-message-list";
import { Button } from "@/components/ui/button";
import {
  CopyIcon,
  CornerDownLeft,
  Mic,
  Paperclip,
  RefreshCcw,
  Volume2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useMutation } from "react-query";
import axios from "axios";
import { Link } from "react-router-dom"; // Import Link

const ChatAiIcons = [
  {
    icon: CopyIcon,
    label: "Copy",
  },
  {
    icon: RefreshCcw,
    label: "Refresh",
  },
  {
    icon: Volume2,
    label: "Volume",
  },
];

type Message = {
  role: string;
  content: string;
};

export default function Home() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "hello teacher, I'm your AI assistant how can i help ?",
    },
  ]);

  const messagesRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const addMessage = (role: string, content: string) => {
    setMessages((prev) => [...prev, { role, content }]);
  };

  const answerMutation = useMutation({
    mutationFn: async (question: string) => {
      const response = await axios.post("http://localhost:8080/answer", {
        question,
      });
      return response.data.answer;
    },
    onSuccess: (answer: string) => {
      addMessage("assistant", answer);
      setIsGenerating(false);
    },
    onError: (error) => {
      console.error("Error sending message:", error);
      setIsGenerating(false);
    },
  });

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const userMessage = (formData.get("message") as string) || "";
    if (!userMessage.trim()) return;

    addMessage("user", userMessage);
    setIsGenerating(true);

    answerMutation.mutate(userMessage);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (isGenerating) return;
      onSubmit(e as unknown as React.FormEvent<HTMLFormElement>);
    }
  };

  const handleActionClick = async (action: string, messageIndex: number) => {
    console.log("Action clicked:", action, "Message index:", messageIndex);
    if (action === "Refresh") {
      setIsGenerating(true);
      answerMutation.mutate(messages[messageIndex].content);
    } else if (action === "Copy") {
      const message = messages[messageIndex];
      if (message && message.role === "assistant") {
        navigator.clipboard.writeText(message.content);
      }
    }
  };

  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <main className="flex h-screen w-full max-w-3xl flex-col items-center mx-auto py-6">
      <div className="absolute top-4 right-4">
        {" "}
        {/* Add positioning for the button */}
        <Link to="/upload">
          <Button variant="outline">Upload Your Documents</Button>
        </Link>
      </div>
      <ChatMessageList ref={messagesRef}>
        {messages.map((message, index) => (
          <ChatBubble
            key={index}
            variant={message.role === "user" ? "sent" : "received"}
          >
            <ChatBubbleAvatar
              src=""
              fallback={message.role === "user" ? "👨🏽" : "🤖"}
            />
            <ChatBubbleMessage>
              {message.content.split("```").map((part: string, idx: number) => {
                if (idx % 2 === 0) {
                  return (
                    <Markdown key={idx} remarkPlugins={[remarkGfm]}>
                      {part}
                    </Markdown>
                  );
                } else {
                  return (
                    <pre className="whitespace-pre-wrap pt-2" key={idx}>
                      <div></div>
                    </pre>
                  );
                }
              })}

              {message.role === "assistant" &&
                messages.length - 1 === index && (
                  <div className="flex items-center mt-1.5 gap-1">
                    {!isGenerating && (
                      <>
                        {ChatAiIcons.map((icon, iconIdx) => {
                          const Icon = icon.icon;
                          return (
                            <ChatBubbleAction
                              variant="outline"
                              className="size-5"
                              key={iconIdx}
                              icon={<Icon className="size-3" />}
                              onClick={() =>
                                handleActionClick(icon.label, index)
                              }
                            />
                          );
                        })}
                      </>
                    )}
                  </div>
                )}
            </ChatBubbleMessage>
          </ChatBubble>
        ))}

        {isGenerating && (
          <ChatBubble variant="received">
            <ChatBubbleAvatar src="" fallback="🤖" />
            <ChatBubbleMessage isLoading />
          </ChatBubble>
        )}
      </ChatMessageList>
      <div className="w-full px-4">
        <form
          ref={formRef}
          onSubmit={onSubmit}
          className="relative rounded-lg border bg-background focus-within:ring-1 focus-within:ring-ring"
        >
          <ChatInput
            name="message"
            onKeyDown={onKeyDown}
            placeholder="Type your message here..."
            className="min-h-12 resize-none rounded-lg bg-background border-0 p-3 shadow-none focus-visible:ring-0"
          />
          <div className="flex items-center p-3 pt-0">
            <Button variant="ghost" size="icon">
              <Paperclip className="size-4" />
              <span className="sr-only">Attach file</span>
            </Button>

            <Button variant="ghost" size="icon">
              <Mic className="size-4" />
              <span className="sr-only">Use Microphone</span>
            </Button>

            <Button
              disabled={isGenerating}
              type="submit"
              size="sm"
              className="ml-auto gap-1.5"
            >
              Send Message
              <CornerDownLeft className="size-3.5" />
            </Button>
          </div>
        </form>
      </div>
    </main>
  );
}
