
import { useState, useEffect} from 'react';

import Control from './Control'
import Dialog from './Dialog'
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
    
    useEffect(() => {
        if(socket) {
            socket.on('connect', () => {
                setIsConnected(true);
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
                socket.off('pong');
            }
        }
    }, []);

    useEffect(()=>{
        if (isConnected) {
            setSequencerStatus('ready');
        } else {
            setSequencerStatus('disconnected');
        }
    }, [isConnected]);

    useEffect(()=>{
        const stConf = seqStatus[sequencerStatus];
        if(stConf){
            setDialog(stConf.dialog);
            setControl(stConf.control);
        } else {
            console.log('not implemented status');
        } 
    }, [sequencerStatus]);

    const handleRun = ()=>{
        socket.emit('run');
        // setSequencerStatus('running');
    }
    const handlePause = ()=>{
        socket.emit('pause')
        // setSequencerStatus('pause');
    }
    const handleStop = ()=>{
        socket.emit('abort');
        // setSequencerStatus('abort');
    }

    return(
        <div>
            <Control
                control={control}
                runAction={handleRun}
                pauseAction={handlePause}
                stopAction={handleStop}/>
            <Dialog 
                severity={dialog.severity}
                message={dialog.message} />
        </div>
    )
}

export default App;