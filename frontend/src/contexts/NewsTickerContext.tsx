import React, { createContext, useContext, useState } from "react";

export interface TickerMessage {
  id: number;
  text: string;
  paid: boolean;
  active: boolean;
  price?: number;     // price in $ if it's a paid spot
  sponsor?: string;   // sponsor name for paid messages
  createdAt: string;
}

interface NewsTickerContextType {
  messages: TickerMessage[];
  isVisible: boolean;
  setIsVisible: (v: boolean) => void;
  addMessage: (msg: Omit<TickerMessage, "id" | "createdAt">) => void;
  updateMessage: (id: number, updated: Partial<Omit<TickerMessage, "id">>) => void;
  deleteMessage: (id: number) => void;
  toggleMessage: (id: number) => void;
}

const NewsTickerContext = createContext<NewsTickerContextType | undefined>(undefined);

const INIT_MESSAGES: TickerMessage[] = [
  {
    id: 1,
    text: "Bienvenue sur ISOKO — La plateforme de petites annonces du Congo",
    paid: false,
    active: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 2,
    text: "📢 Publiez vos annonces gratuitement et touchez des milliers d'acheteurs près de chez vous !",
    paid: false,
    active: true,
    createdAt: new Date().toISOString(),
  },
];

export const NewsTickerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [messages, setMessages] = useState<TickerMessage[]>(() => {
    const saved = localStorage.getItem("isoko_ticker_messages");
    if (saved) {
      try { return JSON.parse(saved); } catch { return INIT_MESSAGES; }
    }
    return INIT_MESSAGES;
  });

  const [isVisible, setIsVisibleState] = useState(true);

  const save = (msgs: TickerMessage[]) => {
    setMessages(msgs);
    localStorage.setItem("isoko_ticker_messages", JSON.stringify(msgs));
  };

  const setIsVisible = (v: boolean) => setIsVisibleState(v);

  const addMessage = (msg: Omit<TickerMessage, "id" | "createdAt">) => {
    const newMsg: TickerMessage = {
      ...msg,
      id: Date.now(),
      createdAt: new Date().toISOString(),
    };
    save([...messages, newMsg]);
  };

  const updateMessage = (id: number, updated: Partial<Omit<TickerMessage, "id">>) => {
    save(messages.map((m) => (m.id === id ? { ...m, ...updated } : m)));
  };

  const deleteMessage = (id: number) => {
    save(messages.filter((m) => m.id !== id));
  };

  const toggleMessage = (id: number) => {
    save(messages.map((m) => (m.id === id ? { ...m, active: !m.active } : m)));
  };

  return (
    <NewsTickerContext.Provider value={{ messages, isVisible, setIsVisible, addMessage, updateMessage, deleteMessage, toggleMessage }}>
      {children}
    </NewsTickerContext.Provider>
  );
};

export const useNewsTicker = () => {
  const ctx = useContext(NewsTickerContext);
  if (!ctx) throw new Error("useNewsTicker must be used within NewsTickerProvider");
  return ctx;
};
