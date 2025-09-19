"use client";

import { Attachment, Message } from "ai";
import { useChat } from "ai/react";
import { useState, useMemo } from "react";
import { toast } from "sonner";

import { Message as PreviewMessage } from "@/components/custom/message";
import { useScrollToBottom } from "@/components/custom/use-scroll-to-bottom";
import { MultimodalInput } from "./multimodal-input";
import { Overview } from "./overview";
import { CancelFlightCard } from "@/components/custom/Cancel-Flight-Card";
import TicketListCard from "@/components/custom/ticket-list-card";

// ⬇️ NEW: chat actions (download PDF, email, loading animation)
import ChatActions from "@/components/custom/chat-actions";

export function Chat({
  id,
  initialMessages,
}: {
  id: string;
  initialMessages: Array<Message>;
}) {
  const { messages, handleSubmit, input, setInput, append, isLoading, stop } =
    useChat({
      id,
      body: { id },
      initialMessages,
      maxSteps: 3, // lower to avoid extra model calls
      onFinish: () => {
        window.history.replaceState({}, "", `/chat/${id}`);
      },
      async onResponse(res) {
        if (!res.ok) {
          let msg = `Server error ${res.status}`;
          try {
            const data = await res.json();
            if (data?.error) msg = data.error;
          } catch {}
          toast.error(msg);
        }
      },
      onError(err) {
        toast.error(err?.message || "Something went wrong.");
      },
    });

  const [messagesContainerRef, messagesEndRef] =
    useScrollToBottom<HTMLDivElement>();
  const [attachments, setAttachments] = useState<Array<Attachment>>([]);

  // Map SDK Message -> lightweight shape expected by ChatActions
  const exportableMessages = useMemo(
    () =>
      messages.map((m) => ({ id: m.id, role: m.role, content: m.content })),
    [messages]
  );

  return (
    <div className="min-h-dvh h-dvh w-full bg-black text-zinc-100">
      {/* 🔒 Shared container: BOTH the message list and the composer live here */}
      <div className="mx-auto flex h-full w-full max-w-[820px] flex-col">
        {/* Messages */}
        <div
          ref={messagesContainerRef}
          className="flex w-full flex-1 flex-col gap-3 overflow-y-auto px-4 py-4"
        >
          {messages.length === 0 && <Overview />}

          {messages.map((message) => {
            const cancelUIs =
              message.toolInvocations?.map((ti, idx) => {
                const r: any = (ti as any).result;
                if (
                  r &&
                  typeof r === "object" &&
                  r.type === "cancelFlight.proposal" &&
                  r.proposal
                ) {
                  return (
                    <div key={`cancel-card-${message.id}-${idx}`} className="w-full">
                      <CancelFlightCard
                        proposal={r.proposal}
                        onSubmitted={({ cancelRequestId }) => {
                          append({
                            role: "user",
                            content: `I submitted the cancellation request (${cancelRequestId}).`,
                          });
                        }}
                      />
                    </div>
                  );
                }
                return null;
              }) || null;

            const ticketsUIs =
              message.toolInvocations?.map((ti, idx) => {
                const r: any = (ti as any).result;
                if (r && typeof r === "object" && r.type === "tickets.list") {
                  return (
                    <div key={`tickets-card-${message.id}-${idx}`} className="w-full">
                      <TicketListCard tickets={r.tickets || []} />
                    </div>
                  );
                }
                return null;
              }) || null;

            const isUser = message.role === "user";

            return (
              <div
                key={message.id}
                className={`flex w-full ${isUser ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`flex max-w-full flex-col gap-2 ${
                    isUser ? "items-end" : "items-start"
                  }`}
                >
                  {/* 🟢 Bubbles */}
                  <div
                    className={`inline-block w-auto max-w-[75%] whitespace-pre-wrap break-words rounded-2xl px-4 py-2 leading-relaxed
                                [&_*]:!max-w-full [&_*]:!min-w-0
                                ${
                                  isUser
                                    ? // USER bubble: black + right aligned
                                      "self-end border border-zinc-800 bg-black text-zinc-100 rounded-br-sm"
                                    : // ASSISTANT bubble
                                      "self-start bg-zinc-800/80 text-zinc-100 rounded-bl-sm"
                                }`}
                  >
                    <PreviewMessage
                      chatId={id}
                      role={message.role}
                      content={message.content}
                      attachments={message.experimental_attachments}
                      toolInvocations={message.toolInvocations}
                    />
                  </div>

                  {cancelUIs}
                  {ticketsUIs}
                </div>
              </div>
            );
          })}

          {/* Spacer at the end */}
          <div ref={messagesEndRef} className="min-h-[24px] min-w-[24px] shrink-0" />
        </div>

        {/* Composer (NO extra max-w/margins inside) */}
        <div className="w-full px-4 pb-3">
          {/* Moved actions lower, above the composer */}
          <div className="mb-2 flex w-full items-center justify-end">
            <ChatActions
              className="scale-[0.95]"
              messages={exportableMessages}
              isLoading={isLoading}
              emailConfig={{ to: undefined, subjectPrefix: "" }}
            />
          </div>
          <form className="relative flex w-full flex-row items-end gap-2">
            <div className="w-full">
              <MultimodalInput
                input={input}
                setInput={setInput}
                handleSubmit={(e) => {
                  // prevent double submits
                  if (isLoading) return;
                  handleSubmit(e);
                }}
                isLoading={isLoading}
                stop={stop}
                attachments={attachments}
                setAttachments={setAttachments}
                messages={messages}
                append={append}
                // IMPORTANT: make sure MultimodalInput root uses these if you accept className
                // className="w-full"
              />
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
