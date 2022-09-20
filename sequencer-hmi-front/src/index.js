import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import env from "react-dotenv"
// import {loadAsync} from 'node-yaml-config'

const endpoint = process.env.REACT_APP_BACKENDPOINT

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App endpoint={endpoint}/>);
