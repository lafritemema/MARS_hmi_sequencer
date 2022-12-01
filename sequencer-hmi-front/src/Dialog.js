
import React from 'react';
import {Alert} from '@mui/material'

function Dialog (props) {
  
  return (
    <Alert
      severity={props.severity}>
        {props.message}
    </Alert>
  )
}

export default Dialog