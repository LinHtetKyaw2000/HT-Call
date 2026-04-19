import { useEffect, useRef, useState } from "react";
import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  doc,
  setDoc,
  deleteField,
} from "firebase/firestore";
import { db } from "../../firebase/config";
import { useAuth } from "../../contexts/AuthContext";
import { useCall } from "../../contexts/CallContext";
import { FiPhone, FiVideo, FiSend } from "react-icons/fi";
import { translateText } from "../../utils/translate";
import styles from "./Chat.module.css";

function getChatId(uid1, uid2) {
  return [uid1, uid2].sort().join("_");
}

const LANGUAGE_OPTIONS = [
  { code: "en", label: "English" },
  { code: "my", label: "Myanmar" },
  { code: "th", label: "Thai" },
  { code: "zh-CN", label: "Chinese (Simplified)" },
  { code: "zh-TW", label: "Chinese (Traditional)" },
  { code: "ja", label: "Japanese" },
  { code: "ko", label: "Korean" },
  { code: "vi", label: "Vietnamese" },
  { code: "hi", label: "Hindi" },
  { code: "es", label: "Spanish" },
  { code: "fr", label: "French" },
  { code: "de", label: "German" },
  { code: "ru", label: "Russian" },
  { code: "pt", label: "Portuguese" },
  { code: "id", label: "Indonesian" },
];

export default function ChatWindow({ selectedUser, onBack }) {
  const { currentUser } = useAuth();
  const { startCall } = useCall();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [openPickerId, setOpenPickerId] = useState(null);
  const [selectedLangByMsgId, setSelectedLangByMsgId] = useState({});
  const [translatedByMsgId, setTranslatedByMsgId] = useState({});
  const [translateLoadingByMsgId, setTranslateLoadingByMsgId] = useState({});
  const [translateErrorByMsgId, setTranslateErrorByMsgId] = useState({});
  const [isPeerTyping, setIsPeerTyping] = useState(false);
  const bottomRef = useRef(null);
  const typingTimerRef = useRef(null);
  const typingActiveRef = useRef(false);

  const chatId = getChatId(currentUser.uid, selectedUser.uid);

  useEffect(() => {
    const q = query(
      collection(db, "chats", chatId, "messages"),
      orderBy("createdAt")
    );
    const unsub = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [chatId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "users", selectedUser.uid), (snap) => {
      const typing = snap.data()?.typing;
      setIsPeerTyping(Boolean(typing?.to === currentUser.uid && typing?.chatId === chatId));
    });
    return unsub;
  }, [selectedUser.uid, currentUser.uid, chatId]);

  useEffect(() => () => {
    clearTimeout(typingTimerRef.current);
    if (typingActiveRef.current) {
      typingActiveRef.current = false;
      setDoc(doc(db, "users", currentUser.uid), {
        typing: deleteField(),
      }, { merge: true }).catch(() => {});
    }
  }, [chatId, currentUser.uid]);

  const markTyping = () => {
    if (typingActiveRef.current) return;
    typingActiveRef.current = true;
    setDoc(doc(db, "users", currentUser.uid), {
      typing: {
        to: selectedUser.uid,
        chatId,
        updatedAt: serverTimestamp(),
      },
    }, { merge: true }).catch(() => {});
  };

  const stopTyping = () => {
    clearTimeout(typingTimerRef.current);
    if (!typingActiveRef.current) return;
    typingActiveRef.current = false;
    setDoc(doc(db, "users", currentUser.uid), {
      typing: deleteField(),
    }, { merge: true }).catch(() => {});
  };

  const scheduleTypingStop = () => {
    clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(stopTyping, 1200);
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    await addDoc(collection(db, "chats", chatId, "messages"), {
      text: text.trim(),
      senderId: currentUser.uid,
      senderName: currentUser.displayName,
      createdAt: serverTimestamp(),
    });
    setText("");
    stopTyping();
  };

  const handleTranslateToggle = (msgId) => {
    setOpenPickerId((prev) => (prev === msgId ? null : msgId));
  };

  const handleLanguageChange = async (msg, targetLang) => {
    setSelectedLangByMsgId((prev) => ({ ...prev, [msg.id]: targetLang }));
    setTranslateErrorByMsgId((prev) => ({ ...prev, [msg.id]: "" }));
    setTranslateLoadingByMsgId((prev) => ({ ...prev, [msg.id]: true }));
    try {
      const translated = await translateText(msg.text, targetLang);
      setTranslatedByMsgId((prev) => ({
        ...prev,
        [msg.id]: { text: translated, lang: targetLang },
      }));
    } catch (error) {
      setTranslateErrorByMsgId((prev) => ({
        ...prev,
        [msg.id]: error?.message || "Unable to translate.",
      }));
    } finally {
      setTranslateLoadingByMsgId((prev) => ({ ...prev, [msg.id]: false }));
    }
  };

  return (
    <div className={styles.chatWindow}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.userInfo}>
          <button className={styles.backBtn} onClick={onBack}>‹</button>
          <img
            src={selectedUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedUser.displayName}`}
            alt={selectedUser.displayName}
          />
          <div>
              <span className={styles.name}>{selectedUser.displayName}</span>
              <span className={`${styles.status} ${isPeerTyping ? styles.typingIndicator : ""}`}>
                {isPeerTyping ? "typing..." : (selectedUser.online ? "● Online" : "○ Offline")}
              </span>
            </div>
          </div>
        <div className={styles.actions}>
          <button
            className={styles.callBtn}
            onClick={() => startCall(selectedUser, "voice")}
            title="Voice Call"
          >
            <FiPhone size={18} />
          </button>
          <button
            className={`${styles.callBtn} ${styles.videoBtn}`}
            onClick={() => startCall(selectedUser, "video")}
            title="Video Call"
          >
            <FiVideo size={18} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className={styles.messages}>
        {messages.map((msg) => {
          const isMine = msg.senderId === currentUser.uid;
          const translatedEntry = translatedByMsgId[msg.id];
          const selectedLang = selectedLangByMsgId[msg.id] || "en";
          const isTranslating = Boolean(translateLoadingByMsgId[msg.id]);
          const translateError = translateErrorByMsgId[msg.id];
          return (
            <div
              key={msg.id}
              className={`${styles.bubble} ${isMine ? styles.mine : styles.theirs}`}
            >
              <p>{msg.text}</p>
              {!isMine && (
                <div className={styles.translateRow}>
                  <button
                    type="button"
                    className={styles.translateBtn}
                    onClick={() => handleTranslateToggle(msg.id)}
                  >
                    Translate
                  </button>
                  {openPickerId === msg.id && (
                    <select
                      className={styles.langSelect}
                      value={selectedLang}
                      onChange={(e) => handleLanguageChange(msg, e.target.value)}
                    >
                      {LANGUAGE_OPTIONS.map((opt) => (
                        <option key={opt.code} value={opt.code}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}
              {!isMine && isTranslating && (
                <span className={styles.translateStatus}>Translating...</span>
              )}
              {!isMine && translateError && (
                <span className={styles.translateError}>{translateError}</span>
              )}
              {!isMine && translatedEntry && !isTranslating && (
                <div className={styles.translatedBubble}>
                  <span className={styles.translatedLabel}>
                    Translated ({translatedEntry.lang})
                  </span>
                  <p>{translatedEntry.text}</p>
                </div>
              )}
              <span className={styles.time}>
                {msg.createdAt?.toDate().toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form className={styles.inputRow} onSubmit={sendMessage}>
        <input
          value={text}
          onChange={(e) => {
            const next = e.target.value;
            setText(next);
            if (next.trim()) {
              markTyping();
              scheduleTypingStop();
            } else {
              stopTyping();
            }
          }}
          placeholder={`Message ${selectedUser.displayName}...`}
        />
        <button type="submit" disabled={!text.trim()}>
          <FiSend size={18} />
        </button>
      </form>
    </div>
  );
}
