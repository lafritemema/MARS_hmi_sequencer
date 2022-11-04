
import { useState, useEffect} from 'react';
import Control from './Control';
import Dialog from './Dialog';
import {FormControlLabel, Switch} from "@mui/material";
import io from "socket.io-client";
import seqStatus from './status.json';

function App(props){

    const ENDPOINT = props.endpoint;

    const socketOption = {
        autoConnect:false,
        reconnection:false
    }

    let socket = io(ENDPOINT,
                    socketOption);

    const defaultConfig = seqStatus['disconnected']
    // dialog component props
    
    const [sequencerStatus, setSequencerStatus] = useState('disconnected');
    const [isConnected, setIsConnected] = useState(socket.connected);
    const [dialog, setDialog] = useState(defaultConfig.dialog);
    const [control, setControl] = useState(defaultConfig.control);
    const [debugChecked, setDebugChecked] = useState(true);
    
    useEffect(() => {
        if(socket) {
            socket.on('statusUpdate', (status) => {
                setSequencerStatus(status);
            });

            socket.on('modeUpdate', (mode)=>{
                const isChecked = mode == 'step' ? true : false;
                setDebugChecked(isChecked);
            })

            socket.on('connect', ()=> {
                setIsConnected(true);
                socket.emit('getStates');
            });

            socket.on('disconnect', () => {
                setIsConnected(false);
                socket.connect();
            });

            socket.on("connect_error", () => {
                console.log('socket connection error, try to reconnect in 1 s' )
                setTimeout(() => {
                  socket.connect();
                }, 1000);
              });
            
            socket.connect();

            return () => {
                socket.off('connect');
                socket.off('disconnect');
                // socket.off('pong');
            }
        }
    }, []);

    useEffect(()=>{
        if (isConnected) {
            setSequencerStatus('connected');
        } else {
            setSequencerStatus('disconnected');
        }
    }, [isConnected]);

    useEffect(()=>{
        const stConf = seqStatus[sequencerStatus];
        if(stConf){
            setDialog(stConf.dialog);
            setControl(stConf.control);
        }
    }, [sequencerStatus]);

    const handleRun = ()=>{
        console.log('send run action to server');
        fetch(`http://${ENDPOINT}/sequence/run`,{method: 'POST'})
            .then((response)=>{
                console.log('=> request transmited to sequencer');
            }).catch((error)=>{
                console.log(error)
            }).finally();
        // setSequencerStatus('running');
    }
    const handlePause = ()=>{
        console.log('send pause action to server');
        fetch(`http://${ENDPOINT}/sequence/pause`,{method: 'POST'})
            .then((response)=>{
                console.log('=> request transmited to sequencer');
            }).catch((error)=>{
                console.log(error);
            });
        // setSequencerStatus('pause');
    }
    const handleStop = ()=>{
        console.log('send abort action to server');
        fetch(`http://${ENDPOINT}/sequence/abort`,{method: 'POST'})
            .then((response)=>{
                console.log('=> request transmited to sequencer');
            }).catch((error)=>{
                console.log(error);
            });
    }
    const handleLoad = ()=>{
        console.log('send load action to server');
        fetch(`http://${ENDPOINT}/sequence/load`,{method: 'POST'})
            .then((response)=>{
                console.log('=> request transmited to sequencer');
            }).catch((error)=>{
                console.log(error);
            });
    }

    const handleModeChange = ()=>{
        console.log('send mode change to server');
        // switch to 
        const modeValue = debugChecked ? 'continue' : 'step';
        fetch(`http://${ENDPOINT}/settings/mode?value=${modeValue}`,{method: 'POST'})
            .then((response)=>{
                console.log('=> request transmited to sequencer');
            }).catch((error)=>{
                console.log(error);
            });
    }

    return(
        <div>
            <Control
                control={control}
                loadAction={handleLoad}
                runAction={handleRun}
                pauseAction={handlePause}
                stopAction={handleStop}/>
            <Dialog 
                severity={dialog.severity}
                message={dialog.message} />
            <FormControlLabel control={
                <Switch
                    checked={debugChecked}
                    onChange={handleModeChange}
                    inputProps={{ 'aria-label': 'controlled' }}/>}
                label = "DEBUG MODE" />
        </div>
    )
}

export default App;