import { createContext, useContext, useEffect, useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../firebase/config";

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const register = async (email, password, displayName) => {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(result.user, { displayName });
    await setDoc(doc(db, "users", result.user.uid), {
      uid: result.user.uid,
      displayName,
      email,
      photoURL: `https://api.dicebear.com/7.x/avataaars/svg?seed=${displayName}`,
      online: true,
      createdAt: serverTimestamp(),
    });
    return result;
  };

  const login = (email, password) =>
    signInWithEmailAndPassword(auth, email, password);

  const logout = () => signOut(auth);

  useEffect(() => {
    let timeout;
    try {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        setCurrentUser(user);
        setLoading(false);
      });
      // Safety fallback: if Firebase never responds (bad config), stop loading after 5s
      timeout = setTimeout(() => setLoading(false), 5000);
      return () => {
        unsubscribe();
        clearTimeout(timeout);
      };
    } catch {
      setLoading(false);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ currentUser, register, login, logout }}>
      {loading ? (
        <div style={{
          minHeight: "100vh", display: "flex", alignItems: "center",
          justifyContent: "center", background: "#f7f8fc", flexDirection: "column", gap: "16px"
        }}>
          <div style={{ fontSize: "2.5rem" }}>💬</div>
          <p style={{ color: "#888", fontFamily: "system-ui" }}>Loading HT Call...</p>
        </div>
      ) : children}
    </AuthContext.Provider>
  );
};
