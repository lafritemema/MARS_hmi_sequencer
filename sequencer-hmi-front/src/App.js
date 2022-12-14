
import React, { useState, useEffect} from 'react';
import Control from './Control';
import Dialog from './Dialog';
import io from "socket.io-client";
import seqStatus from './status.json';
import { Stack } from '@mui/material';

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
    const [dialog, setDialog] = useState(defaultConfig.dialog);
    const [control, setControl] = useState(defaultConfig.control);
    const [mode, setMode] = useState('standard');
    
    useEffect(() => {
        if(socket) {
            socket.on('statusUpdate', (status) => {
                setSequencerStatus(status);
            });

            socket.on('modeUpdate', (mode)=>{
                setMode(mode);
            })

            socket.on('connect', ()=> {
                socket.emit('getStates');
            });

            socket.on('disconnect', () => {
                setSequencerStatus('disconnected')
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
                // socket.off('connect');
                socket.off('disconnect');
                // socket.off('pong');
            }
        }
    }, []);

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

    const handleModeChange = (event, nmode)=>{
        if (nmode != mode && mode != null) {
            console.log('send mode change to server');
            fetch(`http://${ENDPOINT}/settings/mode?value=${nmode}`,{method: 'POST'})
                .then((response)=>{
                    console.log('=> request transmited to sequencer');
                }).catch((error)=>{
                    console.log(error);
                });
        } else {
            console.log('send mode change to server');
        }
    }

    return(
        <Stack direction="column"
                spacing={5}
                sx={{alignItems:'center'}}>
            <Control
                control={control}
                loadAction={handleLoad}
                runAction={handleRun}
                pauseAction={handlePause}
                stopAction={handleStop}
                modeChangeAction={handleModeChange}
                mode={mode}/>
            <Dialog 
                severity={dialog.severity}
                message={dialog.message} />
        </Stack>
    )
}

export default App;