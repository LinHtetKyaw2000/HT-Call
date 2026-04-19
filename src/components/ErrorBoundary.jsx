import { Component } from "react";

export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          minHeight: "100vh", display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", padding: "20px",
          fontFamily: "system-ui", background: "#f7f8fc"
        }}>
          <div style={{
            background: "#fff", borderRadius: "16px", padding: "32px 40px",
            maxWidth: "500px", boxShadow: "0 4px 20px rgba(0,0,0,0.1)", textAlign: "center"
          }}>
            <div style={{ fontSize: "3rem", marginBottom: "16px" }}>⚠️</div>
            <h2 style={{ color: "#e03131", marginBottom: "12px" }}>App Error</h2>
            <p style={{ color: "#555", marginBottom: "16px" }}>
              {this.state.error.message}
            </p>
            <p style={{ color: "#888", fontSize: "0.85rem" }}>
              Make sure you have set up your Firebase config in{" "}
              <code style={{ background: "#f0f0f0", padding: "2px 6px", borderRadius: "4px" }}>
                src/firebase/config.js
              </code>
            </p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
