import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { ToastContainer } from "react-toastify";

const container = document.getElementById("root");
const root = createRoot(container!);
root.render(
  <React.StrictMode>
    <ToastContainer position="top-center" autoClose={3000} hideProgressBar />
    <App />
  </React.StrictMode>,
);
