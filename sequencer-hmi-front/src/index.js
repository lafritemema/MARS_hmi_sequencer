import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
// import {loadAsync} from 'node-yaml-config'


const root = ReactDOM
  .createRoot(document.getElementById("root"));
root.render(<App endpoint={process.env.REACT_APP_BACKENDPOINT}/>);
