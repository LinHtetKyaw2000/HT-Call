import { createContext, useContext, useEffect, useRef, useState } from "react";
import Peer from "peerjs";
import { useAuth } from "./AuthContext";
import {
  doc,
  updateDoc,
  onSnapshot,
  getDoc,
  deleteField,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase/config";
import { playRingback, playIncoming, stopRingtone } from "../utils/ringtone";

const CallContext = createContext();
export const useCall = () => useContext(CallContext);

export const CallProvider = ({ children }) => {
  const { currentUser } = useAuth();
  const [peer, setPeer] = useState(null);
  const [callState, setCallState] = useState(null);
  const [callType, setCallType] = useState(null);
  const [remoteUser, setRemoteUser] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const activeCallRef = useRef(null);
  const callStateRef = useRef(null);
  const remoteUserRef = useRef(null);
  const localStreamRef = useRef(null);
  const endingRef = useRef(false);
  const outgoingSignalUnsubRef = useRef(null);

  useEffect(() => {
    callStateRef.current = callState;
  }, [callState]);

  useEffect(() => {
    remoteUserRef.current = remoteUser;
  }, [remoteUser]);

  useEffect(() => {
    localStreamRef.current = localStream;
  }, [localStream]);

  useEffect(() => {
    if (callState === "outgoing") playRingback();
    else if (callState === "incoming") playIncoming();
    else stopRingtone();
  }, [callState]);

  const stopOutgoingSignalWatch = () => {
    if (outgoingSignalUnsubRef.current) {
      outgoingSignalUnsubRef.current();
      outgoingSignalUnsubRef.current = null;
    }
  };

  const resetLocalCallState = () => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    callStateRef.current = null;
    remoteUserRef.current = null;
    setCallState(null);
    setCallType(null);
    setLocalStream(null);
    setRemoteStream(null);
    setRemoteUser(null);
    activeCallRef.current = null;
  };

  useEffect(() => {
    if (!currentUser) return;
    const p = new Peer(currentUser.uid);
    p.on("open", () => setPeer(p));
    p.on("call", async (incomingCall) => {
      const callerDoc = await getDoc(doc(db, "users", incomingCall.peer));
      remoteUserRef.current = callerDoc.data();
      setRemoteUser(callerDoc.data());
      setCallType(incomingCall.metadata?.type || "video");
      callStateRef.current = "incoming";
      setCallState("incoming");
      activeCallRef.current = incomingCall;
      incomingCall.on("close", () => {
        if (callStateRef.current === "incoming") {
          resetLocalCallState();
        }
      });
      incomingCall.on("error", () => {
        if (callStateRef.current === "incoming") {
          resetLocalCallState();
        }
      });
    });
    return () => {
      stopOutgoingSignalWatch();
      p.destroy();
    };
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;
    const unsub = onSnapshot(doc(db, "users", currentUser.uid), (snap) => {
      const data = snap.data();
      const incoming = data?.incomingCall;
      const response = data?.callResponse;

      if (
        callStateRef.current === "incoming" &&
        activeCallRef.current &&
        (
          !incoming ||
          incoming.from !== activeCallRef.current.peer ||
          !["ringing", "accepted"].includes(incoming.status || "ringing")
        )
      ) {
        activeCallRef.current?.close();
        resetLocalCallState();
      }

      if (
        callStateRef.current === "outgoing" &&
        response &&
        (response.status === "declined" || response.status === "cancelled") &&
        (response.from === remoteUserRef.current?.uid || response.from === activeCallRef.current?.peer)
      ) {
        endCall("remote-declined");
        updateDoc(doc(db, "users", currentUser.uid), {
          callResponse: deleteField(),
        }).catch((error) => {
          console.error("Failed to clear call response:", error);
        });
      }
    });
    return unsub;
  }, [currentUser]);

  const startCall = async (targetUser, type = "video") => {
    if (!peer) return;
    const stream = await navigator.mediaDevices.getUserMedia({ video: type === "video", audio: true });
    setLocalStream(stream);
    setCallType(type);
    remoteUserRef.current = targetUser;
    setRemoteUser(targetUser);
    callStateRef.current = "outgoing";
    setCallState("outgoing");

    const call = peer.call(targetUser.uid, stream, { metadata: { type } });
    activeCallRef.current = call;
    call.on("stream", (remote) => {
      setRemoteStream(remote);
      callStateRef.current = "active";
      setCallState("active");
    });
    call.on("close", () => endCall("peer-close"));
    call.on("error", () => endCall("peer-error"));

    await updateDoc(doc(db, "users", targetUser.uid), {
      incomingCall: { from: currentUser.uid, type, status: "ringing" },
    });
    await updateDoc(doc(db, "users", currentUser.uid), {
      callResponse: deleteField(),
    });

    stopOutgoingSignalWatch();
    outgoingSignalUnsubRef.current = onSnapshot(doc(db, "users", targetUser.uid), (snap) => {
      if (callStateRef.current !== "outgoing") return;
      const incoming = snap.data()?.incomingCall;
      if (
        !incoming ||
        incoming.from !== currentUser.uid ||
        incoming.status === "declined" ||
        incoming.status === "cancelled"
      ) {
        endCall("remote-declined");
      }
    });
  };

  const answerCall = async () => {
    if (!activeCallRef.current) return;
    const stream = await navigator.mediaDevices.getUserMedia({ video: callType === "video", audio: true });
    setLocalStream(stream);
    if (currentUser?.uid) {
      await updateDoc(doc(db, "users", currentUser.uid), {
        incomingCall: {
          from: activeCallRef.current.peer,
          type: callType || "video",
          status: "accepted",
        },
      });
    }
    activeCallRef.current.answer(stream);
    activeCallRef.current.on("stream", (remote) => {
      setRemoteStream(remote);
      callStateRef.current = "active";
      setCallState("active");
    });
    activeCallRef.current.on("close", () => endCall("peer-close"));
  };

  const endCall = (reason = "local-end") => {
    const normalizedReason = typeof reason === "string" ? reason : "local-end";
    if (endingRef.current) return;
    endingRef.current = true;

    const previousState = callStateRef.current;
    const remoteUid = remoteUserRef.current?.uid || activeCallRef.current?.peer;

    stopOutgoingSignalWatch();
    activeCallRef.current?.close();
    resetLocalCallState();

    if (currentUser?.uid) {
      updateDoc(doc(db, "users", currentUser.uid), {
        incomingCall: deleteField(),
      }).catch((error) => {
        console.error("Failed to clear incoming call:", error);
      });
    }

    if (remoteUid && currentUser?.uid && previousState === "incoming" && normalizedReason === "local-end") {
      updateDoc(doc(db, "users", remoteUid), {
        callResponse: {
          from: currentUser.uid,
          status: "declined",
          at: serverTimestamp(),
        },
      }).catch((error) => {
        console.error("Failed to send decline response:", error);
      });
    }

    if (remoteUid && currentUser?.uid && previousState === "outgoing" && normalizedReason === "local-end") {
      updateDoc(doc(db, "users", remoteUid), {
        callResponse: {
          from: currentUser.uid,
          status: "cancelled",
          at: serverTimestamp(),
        },
      }).catch((error) => {
        console.error("Failed to send cancel response:", error);
      });
    }

    if (
      remoteUid &&
      currentUser?.uid &&
      (previousState === "outgoing" || previousState === "active" || normalizedReason === "local-end")
    ) {
      updateDoc(doc(db, "users", remoteUid), {
        incomingCall: deleteField(),
      })
        .catch((error) => {
          console.error("Failed to clear remote incoming call:", error);
        });
    }

    endingRef.current = false;
  };

  return (
    <CallContext.Provider value={{ callState, callType, remoteUser, localStream, remoteStream, startCall, answerCall, endCall }}>
      {children}
    </CallContext.Provider>
  );
};
