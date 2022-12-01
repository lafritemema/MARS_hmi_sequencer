import React from 'react';
import {Button, FormControlLabel, Switch} from "@mui/material";
import {PlayArrow, Pause, Stop, CloudUpload} from "@mui/icons-material";

function Control ({control,
    loadAction,
    runAction,
    pauseAction,
    stopAction,
    modeChangeAction,
    debugMode}) {
  
  const style = {
    button:{
      margin: '5px'
    },
    switch: {
      margin: '5px'
    }
  }



  return (
    <div>
      <Button sx={style.button}
              variant="contained"
              startIcon={<CloudUpload />}
              disabled={!control.load}
              onClick={loadAction}>
        LOAD SEQUENCE
      </Button>
      <Button sx={style.button}
              variant="contained"
              startIcon={<PlayArrow />}
              disabled={!control.run}
              onClick={runAction}>
        RUN
      </Button>
      <Button sx={style.button}
              variant="contained"
              startIcon={<Pause />}
              disabled={!control.pause}
              onClick={pauseAction}>
        PAUSE
      </Button>
      <Button sx={style.button}
              variant="contained"
              startIcon={<Stop />}
              disabled={!control.stop}
              onClick={stopAction}>
        STOP
      </Button>
      <FormControlLabel sx={style.switch} control={
                <Switch
                    checked={debugMode}
                    onChange={modeChangeAction}
                    inputProps={{ 'aria-label': 'controlled' }}/>}
                label = "DEBUG MODE" />
    </div>
  )
}

export default Control;