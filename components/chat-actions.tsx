import React, { useCallback, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { FileDown, Mail, Loader2, MoreHorizontal } from "lucide-react";
import { motion } from "framer-motion";
export type ChatMessage = {
  id?: string | number;
  role: "user" | "assistant" | "system" | string;
  content: string;
};

export type EmailConfig = {
  to?: string; // prefill a single recipient
  subjectPrefix?: string; // prepend to the generated subject
  serviceEndpoint?: string; // if provided, POSTs here instead of using mailto
};

export function ChatActions({
  messages,
  isLoading,
  emailConfig,
  className,
}: {
  messages: ChatMessage[];
  isLoading?: boolean;
  emailConfig?: EmailConfig;
  className?: string;
}) {
  const [downloading, setDownloading] = useState(false);
  const [emailing, setEmailing] = useState(false);

  const safeMessages = useMemo(
    () => messages?.filter(m => m.role !== "system") ?? [],
    [messages]
  );

  const plainTextHistory = useMemo(() => formatMessagesAsPlainText(safeMessages), [safeMessages]);

  const handleDownloadPdf = useCallback(async () => {
    try {
      setDownloading(true);
      const { jsPDF } = await import("jspdf");

      const doc = new jsPDF({ orientation: "p", unit: "pt", format: "a4" });
      const margin = 48;
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const usableWidth = pageWidth - margin * 2;
      let cursorY = margin;

      // Header
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text("Chat History", margin, cursorY);
      cursorY += 10;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(new Date().toLocaleString(), margin, cursorY);
      cursorY += 24;

      // Body
      doc.setFontSize(12);

      safeMessages.forEach((msg, idx) => {
        const label = labelForRole(msg.role);

        // Add role label
        doc.setFont("helvetica", "bold");
        const labelLines = doc.splitTextToSize(label, usableWidth);
        ({ cursorY } = ensureRoom(doc, cursorY, pageHeight, margin, 24));
        doc.text(labelLines, margin, cursorY);
        cursorY += lineBlockHeight(labelLines, 16);

        // Add content
        doc.setFont("helvetica", "normal");
        const contentLines = doc.splitTextToSize(msg.content, usableWidth);
        for (let i = 0; i < contentLines.length; i++) {
          ({ cursorY } = ensureRoom(doc, cursorY, pageHeight, margin, 18));
          doc.text(contentLines[i], margin, cursorY);
          cursorY += 16;
        }

        if (idx < safeMessages.length - 1) {
          cursorY += 8;
          // subtle divider
          ({ cursorY } = ensureRoom(doc, cursorY, pageHeight, margin, 18));
          doc.setDrawColor(200);
          doc.line(margin, cursorY, pageWidth - margin, cursorY);
          cursorY += 14;
        }
      });

      const fileName = `chat-history-${formatDateForFile(new Date())}.pdf`;
      doc.save(fileName);
    } catch (err) {
      console.error("PDF generation failed", err);
      alert("Sorry—couldn't generate the PDF. Check the console for details.");
    } finally {
      setDownloading(false);
    }
  }, [safeMessages]);

  const handleEmail = useCallback(async () => {
    try {
      setEmailing(true);

      const subjectBase = `${emailConfig?.subjectPrefix ? emailConfig.subjectPrefix + " " : ""}Chat history`;
      const subject = `${subjectBase} — ${new Date().toLocaleDateString()}`;

      if (emailConfig?.serviceEndpoint) {
        // POST to your backend for emailing (recommended for long chats)
        const res = await fetch(emailConfig.serviceEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: emailConfig.to,
            subject,
            body: plainTextHistory,
          }),
        });
        if (!res.ok) throw new Error(`Email service responded ${res.status}`);
        alert("Email sent!");
      } else {
        // Fallback: mailto URL (limited length, opens user's email client)
        const mailto = buildMailtoUrl({
          to: emailConfig?.to,
          subject,
          body: truncateForMailto(plainTextHistory),
        });
        window.location.href = mailto;
      }
    } catch (err) {
      console.error("Email failed", err);
      alert("Sorry—couldn't launch email. Check the console for details.");
    } finally {
      setEmailing(false);
    }
  }, [plainTextHistory, emailConfig]);

  return (
    <div className={"flex items-center gap-2 " + (className ?? "") }>
      <Button onClick={handleDownloadPdf} disabled={downloading} className="gap-2">
        {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />} 
        Download PDF
      </Button>

      <Button onClick={handleEmail} variant="secondary" disabled={emailing} className="gap-2">
        {emailing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />} 
        Email Chat
      </Button>

      {/* Optional overflow */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="More chat actions">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleDownloadPdf}>Download as PDF</DropdownMenuItem>
          <DropdownMenuItem onClick={handleEmail}>Email chat transcript</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Loading / typing animation */}
      {isLoading ? <TypingIndicator /> : null}
    </div>
  );
}

/**
 * Loading indicator — elegant, minimal typing dots
 */
function TypingIndicator() {
  return (
    <div className="ml-1 inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1">
      <span className="text-xs text-muted-foreground">responding</span>
      <motion.div
        className="flex items-end gap-1"
        initial="hidden"
        animate="visible"
        variants={{
          hidden: {},
          visible: { transition: { staggerChildren: 0.12 } },
        }}
      >
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="block h-1.5 w-1.5 rounded-full bg-foreground/60"
            variants={{
              hidden: { opacity: 0.2, y: 0 },
              visible: { opacity: 1, y: [0, -3, 0], transition: { repeat: Infinity, duration: 0.9, ease: "easeInOut" } },
            }}
          />
        ))}
      </motion.div>
    </div>
  );
}

// -------------------- helpers --------------------

function labelForRole(role: string) {
  const r = role.toLowerCase();
  if (r === "user") return "You:";
  if (r === "assistant") return "Assistant:";
  if (r === "system") return "System:";
  return `${capitalize(r)}:`;
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatMessagesAsPlainText(messages: ChatMessage[]) {
  return messages
    .map(m => `${labelForRole(m.role)}\n${m.content.trim()}\n`)
    .join("\n");
}

function formatDateForFile(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
}

function ensureRoom(
  doc: any,
  cursorY: number,
  pageHeight: number,
  margin: number,
  needed: number
) {
  if (cursorY + needed > pageHeight - margin) {
    doc.addPage();
    cursorY = margin;
  }
  return { cursorY };
}

function lineBlockHeight(lines: string[] | string, lineHeight: number) {
  const count = Array.isArray(lines) ? lines.length : 1;
  return count * lineHeight;
}

function buildMailtoUrl({ to, subject, body }: { to?: string; subject?: string; body?: string }) {
  const params = new URLSearchParams();
  if (subject) params.set("subject", subject);
  if (body) params.set("body", body);
  const addr = to ? encodeURIComponent(to) : "";
  return `mailto:${addr}?${params.toString()}`;
}

function truncateForMailto(text: string, max = 1800) {
  if (text.length <= max) return text;
  return text.slice(0, max - 20) + "\n\n…(truncated)";
}

export default ChatActions;
