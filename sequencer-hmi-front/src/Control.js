import {Button} from "@mui/material";
import {PlayArrow, Pause, Stop} from "@mui/icons-material";

function Control (props) {
  
  const style = {
    margin: '5px',
  }

  return (
    <div>
      <Button sx={style}
              variant="contained"
              startIcon={<PlayArrow />}
              disabled={!props.control.run}
              onClick={props.runAction}>
        RUN
      </Button>
      <Button sx={style}
              variant="contained"
              startIcon={<Pause />}
              disabled={!props.control.pause}
              onClick={props.pauseAction}>
        PAUSE
      </Button>
      <Button sx={style}
              variant="contained"
              startIcon={<Stop />}
              disabled={!props.control.stop}
              onClick={props.stopAction}>
        STOP
      </Button>
    </div>
  )
}

export default Control;