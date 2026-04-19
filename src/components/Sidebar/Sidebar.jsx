import { useEffect, useState } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../firebase/config";
import { useAuth } from "../../contexts/AuthContext";
import styles from "./Sidebar.module.css";

export default function Sidebar({ onSelectUser, selectedUser }) {
  const { currentUser, logout } = useAuth();
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchUsers = async () => {
      const q = query(
        collection(db, "users"),
        where("uid", "!=", currentUser.uid)
      );
      const snap = await getDocs(q);
      setUsers(snap.docs.map((d) => d.data()));
    };
    fetchUsers();
  }, [currentUser]);

  const filtered = users.filter((u) =>
    u.displayName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className={styles.sidebar}>
      <div className={styles.header}>
        <div className={styles.me}>
          <img src="/logo.jpg" alt="HT Call" style={{ width: 32, height: 32, borderRadius: "8px", border: "none" }} />
          <span>HT Call</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <img
            src={currentUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser.displayName}`}
            alt="me"
            style={{ width: 32, height: 32, borderRadius: "50%", border: "2px solid #333" }}
          />
          <button className={styles.logoutBtn} onClick={logout} title="Logout">
            ⏻
          </button>
        </div>
      </div>

      <div className={styles.searchBox}>
        <input
          placeholder="🔍 Search contacts..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className={styles.userList}>
        {filtered.map((user) => (
          <div
            key={user.uid}
            className={`${styles.userItem} ${
              selectedUser?.uid === user.uid ? styles.active : ""
            }`}
            onClick={() => onSelectUser(user)}
          >
            <img
              src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.displayName}`}
              alt={user.displayName}
            />
            <div className={styles.userInfo}>
              <span className={styles.name}>{user.displayName}</span>
              <span className={styles.email}>{user.email}</span>
            </div>
            <span
              className={`${styles.dot} ${user.online ? styles.online : styles.offline}`}
            />
          </div>
        ))}
        {filtered.length === 0 && (
          <p className={styles.empty}>No users found</p>
        )}
      </div>
    </div>
  );
}
