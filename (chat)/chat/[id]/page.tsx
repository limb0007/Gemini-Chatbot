import { CoreMessage } from "ai";
import { notFound } from "next/navigation";

import { auth } from "@/app/(auth)/auth";
import { Chat as PreviewChat } from "@/components/custom/chat";
import { getChatById } from "@/db/queries";
import { Chat } from "@/db/schema";
import { convertToUIMessages } from "@/lib/utils";

export default async function Page({ params }: { params: any }) {
  const { id } = params;
  const chatFromDb = await getChatById({ id });

  if (!chatFromDb) {
    notFound();
  }

  // type casting and converting messages to UI messages
  const chat: Chat = {
    ...chatFromDb,
    messages: convertToUIMessages(chatFromDb.messages as Array<CoreMessage>),
  };

  const session = await auth();

  if (!session || !session.user) {
    return notFound();
  }

  if (session.user.id !== chat.userId) {
    return notFound();
  }

  return (
    // Full-height page with a centered, shared container
    <div className="flex min-h-screen flex-col bg-black text-zinc-100">
      {/* Shared container: messages + composer inside PreviewChat should match this width */}
      <div
        className="mx-auto w-full max-w-3xl flex-1 px-4 py-6"
        // Optional CSS vars your Chat component can read (see note below)
        style={
          {
            // @ts-ignore — custom CSS var for user bubble bg (if your chat component uses it)
            "--user-bubble-bg": "black",
            "--user-bubble-border": "rgb(39 39 42)", // zinc-800
          } as React.CSSProperties
        }
      >
        <PreviewChat id={chat.id} initialMessages={chat.messages} />
      </div>
    </div>
  );
}
