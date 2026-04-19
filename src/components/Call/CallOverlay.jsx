import { useEffect, useRef, useState } from "react";
import { useCall } from "../../contexts/CallContext";
import { FiPhoneOff, FiMicOff, FiMic, FiVideoOff, FiVideo, FiMaximize2, FiMinimize2 } from "react-icons/fi";
import styles from "./Call.module.css";

function DraggableWindow({ children, className, defaultPos, isFullscreen }) {
  const [pos, setPos] = useState(defaultPos);
  const dragging = useRef(false);
  const offset = useRef({ x: 0, y: 0 });
  const ref = useRef(null);

  const clamp = (x, y) => {
    const width = ref.current?.offsetWidth || 320;
    const height = ref.current?.offsetHeight || 220;
    return {
      x: Math.min(Math.max(x, 8), window.innerWidth - width - 8),
      y: Math.min(Math.max(y, 8), window.innerHeight - height - 8),
    };
  };

  const canStartDrag = (target) => !target.closest("button, input, select, textarea, video, a");

  const onMouseDown = (e) => {
    if (isFullscreen) return;
    if (!canStartDrag(e.target)) return;
    dragging.current = true;
    offset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
    e.preventDefault();
  };

  useEffect(() => {
    const onMove = (e) => {
      if (!dragging.current) return;
      setPos(clamp(e.clientX - offset.current.x, e.clientY - offset.current.y));
    };
    const onUp = () => {
      dragging.current = false;
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  const onTouchStart = (e) => {
    if (isFullscreen) return;
    if (!canStartDrag(e.target)) return;
    dragging.current = true;
    const t = e.touches[0];
    offset.current = { x: t.clientX - pos.x, y: t.clientY - pos.y };
  };

  useEffect(() => {
    const onMove = (e) => {
      if (!dragging.current) return;
      const t = e.touches[0];
      setPos(clamp(t.clientX - offset.current.x, t.clientY - offset.current.y));
    };
    const onEnd = () => {
      dragging.current = false;
    };
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onEnd);
    return () => {
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
    };
  }, []);

  return (
    <div
      ref={ref}
      className={`${className} ${isFullscreen ? styles.popupFullscreen : ""}`}
      style={isFullscreen ? undefined : { left: pos.x, top: pos.y }}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
    >
      {children}
    </div>
  );
}

export default function CallOverlay() {
  const { callState, callType, remoteUser, localStream, remoteStream, answerCall, endCall } = useCall();
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const [muted, setMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(false);
  const [incomingFullscreen, setIncomingFullscreen] = useState(false);
  const [callFullscreen, setCallFullscreen] = useState(false);

  useEffect(() => {
    if (!localVideoRef.current) return;
    localVideoRef.current.srcObject = localStream || null;
    if (localStream) {
      localVideoRef.current.play().catch(() => {});
    }
  }, [localStream, callState, callType]);

  useEffect(() => {
    if (!remoteVideoRef.current) return;
    remoteVideoRef.current.srcObject = remoteStream || null;
    if (remoteStream) {
      remoteVideoRef.current.play().catch(() => {});
    }
  }, [remoteStream, callState, callType]);

  useEffect(() => {
    if (!remoteAudioRef.current) return;
    remoteAudioRef.current.srcObject = remoteStream || null;
    if (remoteStream) {
      remoteAudioRef.current.play().catch(() => {});
    }
  }, [remoteStream, callState, callType]);

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach((t) => (t.enabled = !t.enabled));
      setMuted((m) => !m);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach((t) => (t.enabled = !t.enabled));
      setVideoOff((v) => !v);
    }
  };

  if (!callState) return null;

  if (callState === "incoming") {
    return (
      <DraggableWindow
        className={`${styles.popupWindow} ${styles.incomingPopupWrap}`}
        defaultPos={{ x: Math.max(8, window.innerWidth - 340), y: Math.max(8, window.innerHeight - 240) }}
        isFullscreen={incomingFullscreen}
      >
        <div className={`${styles.incomingCard} ${incomingFullscreen ? styles.incomingCardFullscreen : ""}`}>
          <button
            type="button"
            className={styles.fullscreenBtn}
            onClick={() => setIncomingFullscreen((v) => !v)}
            title={incomingFullscreen ? "Exit fullscreen" : "Fullscreen"}
          >
            {incomingFullscreen ? <FiMinimize2 size={16} /> : <FiMaximize2 size={16} />}
          </button>
          <img
            src={remoteUser?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${remoteUser?.displayName}`}
            alt=""
          />
          <h3>{remoteUser?.displayName}</h3>
          <p>Incoming {callType} call...</p>
          <div className={styles.incomingActions}>
            <button className={styles.answer} onClick={answerCall}>
              📞 Accept
            </button>
            <button className={styles.decline} onClick={() => endCall()}>
              📵 Decline
            </button>
          </div>
        </div>
      </DraggableWindow>
    );
  }

  return (
      <DraggableWindow
        className={`${styles.popupWindow} ${styles.callPopup}`}
        defaultPos={{ x: Math.max(8, window.innerWidth - 390), y: 70 }}
        isFullscreen={callFullscreen}
      >
      <div className={`${styles.callWindow} ${callFullscreen ? styles.callWindowFullscreen : ""}`}>
        <audio ref={remoteAudioRef} autoPlay playsInline />
        <button
          type="button"
          className={styles.fullscreenBtn}
          onClick={() => setCallFullscreen((v) => !v)}
          title={callFullscreen ? "Exit fullscreen" : "Fullscreen"}
        >
          {callFullscreen ? <FiMinimize2 size={16} /> : <FiMaximize2 size={16} />}
        </button>
        <div className={styles.callTop}>
          <img
            src={remoteUser?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${remoteUser?.displayName}`}
            alt=""
          />
          <div>
            <h3>{remoteUser?.displayName}</h3>
            <p className={styles.callStatus}>
              {callState === "outgoing" ? "Calling..." : "Connected"}
            </p>
          </div>
        </div>

        {callType === "video" ? (
          <div className={styles.videoPanel}>
            <video
              ref={remoteVideoRef}
              className={styles.remoteVideo}
              autoPlay
              playsInline
            />
            <video
              ref={localVideoRef}
              className={styles.localVideo}
              autoPlay
              playsInline
              muted
            />
          </div>
        ) : (
          <div className={styles.voicePanel}>
            <p>{callState === "outgoing" ? "Waiting for answer..." : "Voice call active"}</p>
          </div>
        )}

        <div className={styles.controls}>
          <button className={styles.ctrl} onClick={toggleMute} title={muted ? "Unmute" : "Mute"}>
            {muted ? <FiMicOff size={18} /> : <FiMic size={18} />}
          </button>
          {callType === "video" && (
            <button className={styles.ctrl} onClick={toggleVideo} title={videoOff ? "Turn video on" : "Turn video off"}>
              {videoOff ? <FiVideoOff size={18} /> : <FiVideo size={18} />}
            </button>
          )}
          <button className={`${styles.ctrl} ${styles.endBtn}`} onClick={() => endCall()}>
            <FiPhoneOff size={18} />
          </button>
        </div>
      </div>
    </DraggableWindow>
  );
}
