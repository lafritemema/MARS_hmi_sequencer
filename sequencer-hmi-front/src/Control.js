import React from 'react';
import {Button,
  ToggleButtonGroup,
  ToggleButton,
  Stack,
  StyleSheet} from "@mui/material";
import {PlayArrow, Pause, Stop, CloudUpload} from "@mui/icons-material";



function Control ({control,
    loadAction,
    runAction,
    pauseAction,
    stopAction,
    modeChangeAction,
    mode}) {
  
  return (
    <Stack direction="row"
          spacing={2}>
      <Button variant="contained"
              startIcon={<CloudUpload />}
              disabled={!control.load}
              onClick={loadAction}>
        LOAD SEQUENCE
      </Button>
      <Button variant="contained"
              startIcon={<PlayArrow />}
              disabled={!control.run}
              onClick={runAction}>
        RUN
      </Button>
      <Button variant="contained"
              startIcon={<Pause />}
              disabled={!control.pause}
              onClick={pauseAction}>
        PAUSE
      </Button>
      <Button variant="contained"
              startIcon={<Stop />}
              disabled={!control.stop}
              onClick={stopAction}>
        STOP
      </Button>
      <ToggleButtonGroup
          color="primary"
          value={mode}
          exclusive
          onChange={modeChangeAction}
          aria-label="demo">
        <ToggleButton value="demo">DEMO MODE</ToggleButton>
        <ToggleButton value="continu">STANDARD MODE</ToggleButton>
        <ToggleButton value="step">DEBUG MODE</ToggleButton>
      </ToggleButtonGroup>
    </Stack>
  );
}

export default Control;