import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
// import {loadAsync} from 'node-yaml-config'

const ENDPOINT = process.env.BACKENDPOINT ?
    process.env.BACKENDPOINT :
    process.env.REACT_APP_BACKENDPOINT

const root = ReactDOM
  .createRoot(document.getElementById("app"));
root.render(<App endpoint={ENDPOINT}/>);
