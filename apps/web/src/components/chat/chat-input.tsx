import { Button, Textarea } from "@selectio/ui";
import { Paperclip, Send } from "lucide-react";
import { useState } from "react";

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({
  onSendMessage,
  disabled = false,
  placeholder = "Напишите сообщение...",
}: ChatInputProps) {
  const [message, setMessage] = useState("");

  const handleSend = () => {
    if (!message.trim()) return;
    onSendMessage(message);
    setMessage("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="p-2 md:p-4">
        <div className="relative">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder={placeholder}
            disabled={disabled}
            className="w-full min-h-[50px] md:min-h-[60px] max-h-40 resize-none rounded-3xl pl-10 md:pl-12 pr-12 md:pr-14 py-3 md:py-4 focus-visible:ring-1 border-2 text-sm md:text-base"
            rows={1}
          />

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute left-1 md:left-2 top-2 md:top-3 h-8 w-8 md:h-9 md:w-9 text-muted-foreground hover:text-foreground"
            disabled={disabled}
          >
            <Paperclip className="h-4 w-4 md:h-5 md:w-5" />
          </Button>

          <Button
            onClick={handleSend}
            disabled={!message.trim() || disabled}
            size="icon"
            className="absolute right-1 md:right-2 top-2 md:top-3 h-8 w-8 md:h-9 md:w-9 rounded-full"
          >
            <Send className="h-3.5 w-3.5 md:h-4 md:w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
