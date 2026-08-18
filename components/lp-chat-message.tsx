import styles from "./lp-chat-message.module.css";

type LPChatMessageProps = {
  role: "user" | "assistant";
  content: string;
};

type MarkdownBlock =
  | { type: "heading"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "unordered"; items: string[] }
  | { type: "ordered"; items: string[] };

function trimLine(value: string) {
  let start = 0;
  let end = value.length;
  while (start < end && value[start] === " ") start += 1;
  while (end > start && value[end - 1] === " ") end -= 1;
  return value.slice(start, end);
}

function orderedItemText(value: string) {
  let cursor = 0;
  while (cursor < value.length) {
    const code = value.charCodeAt(cursor);
    if (code < 48 || code > 57) break;
    cursor += 1;
  }
  if (cursor === 0 || value[cursor] !== "." || value[cursor + 1] !== " ") return null;
  return value.slice(cursor + 2);
}

function parseMarkdownBlocks(markdown: string) {
  const lines = markdown.replaceAll("\r\n", "\n").split("\n");
  const blocks: MarkdownBlock[] = [];
  let paragraph: string[] = [];
  let listType: "unordered" | "ordered" | null = null;
  let listItems: string[] = [];

  const flushParagraph = () => {
    const text = paragraph.join(" ").trim();
    if (text) blocks.push({ type: "paragraph", text });
    paragraph = [];
  };

  const flushList = () => {
    if (listType && listItems.length) blocks.push({ type: listType, items: listItems });
    listType = null;
    listItems = [];
  };

  for (const line of lines) {
    const trimmed = trimLine(line);
    const ordered = orderedItemText(trimmed);
    const unordered = (trimmed[0] === "-" || trimmed[0] === "*") && trimmed[1] === " " ? trimmed.slice(2) : null;

    if (!trimmed) {
      flushParagraph();
      flushList();
      continue;
    }

    if (trimmed.startsWith("## ")) {
      flushParagraph();
      flushList();
      blocks.push({ type: "heading", text: trimLine(trimmed.slice(3)) });
      continue;
    }

    if (unordered !== null || ordered !== null) {
      flushParagraph();
      const nextListType = unordered !== null ? "unordered" : "ordered";
      if (listType && listType !== nextListType) flushList();
      listType = nextListType;
      listItems.push(trimLine(unordered ?? ordered ?? ""));
      continue;
    }

    flushList();
    paragraph.push(trimmed);
  }

  flushParagraph();
  flushList();

  return blocks;
}

function MarkdownInline({ text }: { text: string }) {
  const nodes: React.ReactNode[] = [];
  let cursor = 0;
  let key = 0;

  while (cursor < text.length) {
    const start = text.indexOf("**", cursor);
    if (start === -1) {
      nodes.push(text.slice(cursor));
      break;
    }

    const end = text.indexOf("**", start + 2);
    if (end === -1) {
      nodes.push(text.slice(cursor));
      break;
    }

    if (start > cursor) nodes.push(text.slice(cursor, start));
    nodes.push(<strong key={key}>{text.slice(start + 2, end)}</strong>);
    key += 1;
    cursor = end + 2;
  }

  return <>{nodes}</>;
}

function Markdown({ content }: { content: string }) {
  const blocks = parseMarkdownBlocks(content);

  return (
    <div className={styles.lpbChatMarkdown}>
      {blocks.length ? blocks.map((block, index) => {
        if (block.type === "heading") return <h3 key={index}><MarkdownInline text={block.text} /></h3>;
        if (block.type === "paragraph") return <p key={index}><MarkdownInline text={block.text} /></p>;
        if (block.type === "ordered") return <ol key={index}>{block.items.map((item, itemIndex) => <li key={itemIndex}><MarkdownInline text={item} /></li>)}</ol>;
        return <ul key={index}>{block.items.map((item, itemIndex) => <li key={itemIndex}><MarkdownInline text={item} /></li>)}</ul>;
      }) : <p><MarkdownInline text={content} /></p>}
    </div>
  );
}

export function LPChatMessage({ role, content }: LPChatMessageProps) {
  const isUser = role === "user";

  return (
    <div className={`${styles.lpbChatMessageRow} ${isUser ? styles.lpbChatUserRow : styles.lpbChatAssistantRow}`}>
      <div className={isUser ? styles.lpbChatUserCard : styles.lpbChatAssistantCard}>
        {isUser ? content : <Markdown content={content} />}
      </div>
    </div>
  );
}
