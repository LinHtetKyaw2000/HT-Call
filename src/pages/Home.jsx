import { useState } from "react";
import Sidebar from "../components/Sidebar/Sidebar";
import ChatWindow from "../components/Chat/ChatWindow";
import CallOverlay from "../components/Call/CallOverlay";
import styles from "./Home.module.css";

export default function Home() {
  const [selectedUser, setSelectedUser] = useState(null);

  return (
    <div className={styles.layout}>
      {/* Contacts screen */}
      <div className={`${styles.screen} ${selectedUser ? styles.hidden : styles.visible}`}>
        <Sidebar onSelectUser={setSelectedUser} selectedUser={selectedUser} />
      </div>

      {/* Chat screen */}
      <div className={`${styles.screen} ${selectedUser ? styles.visible : styles.hidden}`}>
        {selectedUser && (
          <ChatWindow selectedUser={selectedUser} onBack={() => setSelectedUser(null)} />
        )}
      </div>

      <CallOverlay />
    </div>
  );
}
