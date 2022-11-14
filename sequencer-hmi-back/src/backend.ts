"use-strict";

import process from 'node:process';
import { Server as SockioServer, Socket } from "socket.io";
import { loadAsync } from 'node-yaml-config';
import {AMQPClient} from './server/amqp';
import express, {Request, Response} from 'express';
import { RequestMessage } from './server/client';
import { createClient } from 'redis';
import { MessageQuery, ServerConfiguration } from './server/properties';
import { RedisClientType } from '@redis/client';
import { createServer } from "http";
import Logger from '@common/logger';
import cors from 'cors';
import assert from 'node:assert';


const CONFIG_FOLDER = process.cwd() + '/config';

// variable for amqp client
let amqpClient:AMQPClient;

// variable for redisClients
let redisClient:RedisClientType;
let pubsubStatusClient:RedisClientType;
let pubsubModeClient:RedisClientType;

// variable for socketio client
let socketIO:SockioServer<ClientToServerEvents, ServerToClientEvents>;
// variable for sequencer status
let sequencerStatus:string|null;
let sequencerMode:string|null;

const LOGGER = new Logger("HMI Sequencer");

// import rabbitmq_consumers from "./services/message_broker/rabbitmq_consumers";
// import MongoPool from "./services/db/dbConn";
// import socketInstance from "./services/socket/socketInstance";
// const FILE = "App.js";

// const TOPICS = ['request.hmi', "hmi.update"];
// const NAME = 'sequencerHMI';

// declare constants relative to sequencer servivce
const SEQUENCER_REQUEST_TOPIC = 'request.sequencer';
const SEQUENCER_KEYSPACE_STATUS = 'mars.sequencer.status';
const SEQUENCER_KEYSPACE_MODE = 'mars.sequencer.mode';
const RESPONSE_TOPICS = 'response.hmi.sequencer';


loadAsync(CONFIG_FOLDER + '/server.yaml')
  .then(async (serverConfig:ServerConfiguration)=>{
    const {redis, amqp} = serverConfig;

    const HOST = process.env.HOST;
    const PORT = parseInt(process.env.PORT);
    assert(HOST && PORT, 'Missing environment variable HOST or PORT')

    LOGGER.try('init redis clients');
    // init redis client
    redisClient = createClient({
      socket: {
        host: redis.host,
        port: redis.port
      },
      database:redis.database
    });
    // and connect it
    await redisClient.connect();
    const [status, mode] = await redisClient
        .multi()
        .get(SEQUENCER_KEYSPACE_STATUS)
        .get(SEQUENCER_KEYSPACE_MODE)
        .exec();
 
    sequencerMode = <string|null> mode;
    sequencerStatus = <string|null> status;

    // init pubsub client listening status
    pubsubStatusClient = redisClient.duplicate();
    // connect it
    pubsubStatusClient.connect();
    // and listen sequencer status
    pubsubStatusClient.subscribe('__keyspace@0__:'+SEQUENCER_KEYSPACE_STATUS,
        updateSequencerStatus);

    // init pubsub client listening status
    pubsubModeClient = redisClient.duplicate();
    // connect it
    pubsubModeClient.connect();
    // and listen sequencer status
    pubsubModeClient.subscribe('__keyspace@0__:'+SEQUENCER_KEYSPACE_MODE,
        updateSequencerMode);
    
    LOGGER.success('init redis clients');

    LOGGER.try('init http server');
    // init and configure express server
    const httpServer = createServer(buildExpressServer());
    LOGGER.success('init http server');

    LOGGER.try('init amqp client');
    // init amqp client
    amqpClient = new AMQPClient('hmi_sequencer',
            amqp.host,
            amqp.port,
            amqp.exchange);
    // configure amqp client
    amqpClient.listen(RESPONSE_TOPICS);
    LOGGER.success('init amqp client');

    LOGGER.try('init socketIO server');
    // build and configure socketIO server
    socketIO = new SockioServer<ClientToServerEvents, ServerToClientEvents>(httpServer, 
      {cors:{
        origin: '*',
        credentials:false}
      });
    
    socketIO.on('connection', (socket:Socket)=>{
      // status update
      // if (sequencerStatus) socket.emit('statusUpdate', sequencerStatus);
      socket.on('getStates', ()=>{
        socket.emit('statusUpdate', sequencerStatus);
        socket.emit('modeUpdate', sequencerMode);
      })
    });

    LOGGER.success('init socketIO server');

    // start to listening on http
    httpServer.listen(PORT, HOST, ()=>{
      LOGGER.info(`http server listening on port ${PORT}`);
    });

    LOGGER.info('connect AMPQ Client');
    // connect amqp client
    amqpClient.connect();

  }).catch(async (error)=>{
    console.log(error);
    await cleanConnection();
    process.exit(1);
  })

/* ------------------------
       EXPRESS SERVER
   ----------------------*/

function buildExpressServer() {
  const app = express();
  app.use(cors());
  app.all('*', logRequest);
  app.post('/sequence/*',
      handleSequenceAction,
      sendToSequencer);
  app.post('/settings/:setting',
      handleSettingsUpdate,
      sendToSequencer)
  return app;
}

function logRequest(request:Request,
  response:Response,
  next:()=>void) {
    LOGGER.info(`request on path ${request.path}`)
    next();
}

function handleSequenceActionTest(request, response, next) {
  console.log(request.path);
  response.end();
}

async function handleSequenceAction(request:Request,
    response:Response,
    next:()=>void) {
  
  // build query and request message
  const query = <MessageQuery> {
    path:  request.path,
    method: 'POST'
  }
  response.locals.message = new RequestMessage(query);
  next();
}

async function handleSettingsUpdate(request, response, next) {
  
  switch(request.params.setting) {
    case 'mode':
      const query = <MessageQuery>{
        method: 'POST',
        path: '/settings/mode',
        value: request.query.value
      }
      response.locals.message = new RequestMessage(query);
      next();
      break;
    default:
      // emit error
      response.end();
  }
}

async function sendToSequencer(request,response, next) {

  const requestMessage = response.locals.message;

  const amqpResponse = await amqpClient.request(SEQUENCER_REQUEST_TOPIC,
    requestMessage,
    RESPONSE_TOPICS);
  
  if (amqpResponse.status != 200) {
    // TODO  
    // emit an error
  }

  response.send('done');
}

async function updateSequencerStatus(event:string) {
  switch (event) {
    case 'set':
      sequencerStatus = <string> await redisClient.get(SEQUENCER_KEYSPACE_STATUS);
      LOGGER.info(`sequencer status change to ${sequencerStatus}`);
      socketIO.emit('statusUpdate', sequencerStatus);
      break;
    case 'del':
      sequencerStatus = null;
      socketIO.emit('statusUpdate', 'disconnected');
      LOGGER.info(`sequencer off duty`);
      break;
    default:
  }
}

async function updateSequencerMode(event:string) {
  switch (event) {
    case 'set':
      sequencerMode = <string> await redisClient.get(SEQUENCER_KEYSPACE_MODE);
      LOGGER.info(`sequencer mode change to ${sequencerMode}`);
      socketIO.emit('modeUpdate', sequencerMode);
      break;
    case 'del':
      sequencerMode = null;
      socketIO.emit('modeUpdate', sequencerMode);
      LOGGER.info(`sequencer off duty`);
      break;
    default:
  }
}

async function cleanConnection(){
  if (redisClient) await redisClient.disconnect();
  if (pubsubStatusClient) await pubsubStatusClient.disconnect();
  if (pubsubModeClient) await pubsubModeClient.disconnect();
}

interface ServerToClientEvents {
  error: (message:string)=>void,
  statusUpdate: (status:string|null)=>void,
  modeUpdate: (mode:string|null)=>void
}
interface ClientToServerEvents {
  getStates: ()=>void;
}


/*get config data
try {
  //get server configuration
  host = process.env.HOST // config.get('server.host');
  port = process.env.PORT // || config.get('server.port');
  // get message broker configuration
  rabbitMqUrl = config.get('rabbitMq.url');
  exchange = config.get('rabbitMq.exchange');
  // rabbitMQOpts = config.get("rabbitMQRouting.opts");
  //get db configuration
  // dbUri = config.get('mongoDB.url');
} catch (error) {
  console.log(FILE, " Error loading config data");
  console.log(error)
  process.exit(1);
}

// init socketIO server attached to express server
console.log("init socket connection");
const io = new sockioServer({
  cors: {
    origin: "*",
  },
  reconnect: true
}).attach(server);

io.on("connection", (socket) => {
  console.log("Client is connected");
  //Sending command to sequencer
  socket.on("2Seq", (a) => {
    runSequence(a)
  });
  
  //Called when the client disconnect from the socketio link
  socket.on("disconnect", () => {
    console.log("Client disconnected");
  });

  _socket = socket
});

// define amqp connection
console.log("init amqp server");
amqp
  .connect(rabbitMqUrl)
  .then((amqpConn)=>{
    console.log(`connection to amqp server ${rabbitMqUrl} : SUCCESS`);
    process.once('SIGINT', ()=>{ conn.close();});
    console.log('channel creation');

    return amqpConn.createChannel();
  }).then((amqpChannel)=>{
    console.log(`channel creation : SUCCESS`);
    
    console.log('exchange assertion');
    amqpChannel.assertExchange(exchange, 'topic', {durable: false});
    return amqpChannel
  }).then((amqpChannel)=>{
    console.log('queue assertion')
    
    amqpChannel.assertQueue('',
      {exclusive: false, durable: false, autoDelete: true})
      .then((queue)=>{
        TOPICS.forEach((t)=>{
          amqpChannel.bindQueue(queue.queue,
            exchange,
            t);
        })
        _amqpChannel = amqpChannel
        console.log('amqp server ready')
        _amqpChannel.consume(queue.queue,
          consumeMQPMessage,
          {noAck: true,
           consumerTag: NAME})
      })
  }).catch((error)=>{
    console.log(error);
    process.exit(1);
  });



//Initialize connection to MongoDB and return mongodb server infos
//MongoPool.initPool(dbUri, (pool) => { console.log("Connected to MongoDB pool \n", pool.s)});

function consumeMQPMessage(message) {
  console.log("message published on hmi queue")
    
  // get the routing key
  const routingKey = message.fields.routingKey;
  // get the path in the headers
  const path = message.properties.headers.path;
  // get the command uid in the headers
  const uid = message.properties.headers.uid;
  
  console.log(`routing key : ${routingKey}
               path: ${path}
               uid: ${uid}
               data: ${message.content}`)

  switch(routingKey){
    case 'request.hmi':
      // get the report topic
      const reportTopic = message.properties.headers.report_topic;
      // publish a message on the report topic to confim the reception
      publishSuccessMsg(reportTopic)
      // Sending manipualtion data to frontend
      console.log('send message on AlertSeq');
      _socket.emit("AlertSeq", JSON.parse(message.content));
      // Reset ActionRequested Flag
      _socket.emit("ActionReqHandling", false);
      break;
    case 'hmi.update':
      switch (path) {
        case '/hmi/reset':
          console.log("Reset HMI");
          _socket.emit("StackGestion", []);
          // handleResetHMI();
          break;
        case '/hmi/manipulation/response':
          const parsedData = JSON.parse(message.content); 
          console.log("received from : " + message.properties.headers.publisher, parsedData)
        default:
          console.log("Message received with routing key hmi.update does not have a recognized path");
          break;
      }
      break;
    default:
      console.log("Routing key not implemented in backend");
  }
}

function buildRunMsg() {
  return {
    
  }
}


function publishSuccessMsg(topic){
  try{
    _amqpChannel.publish(exchange,
      topic,
      Buffer.from(JSON.stringify({status: 'SUCCESS'})),
      { headers: {publisher : NAME}});
  } catch(e){
    console.log("could not send response message to sender : ", e);
  }
}


/*
function runSequence(data) {
  _amqpChannel.publish(exchange,
    "hmi.update",
    Buffer.from("reset"),
    { headers: {publisher : "sequencerHMI", path : "/hmi/reset"}});

  _amqpChannel.publish(exchange,
    "request.sequencer.run",
    Buffer.from(JSON.stringify({})),
    { headers: {publisher : "sequencerHMI", path : "/sequence/run"}});
}

//Launching httpserver on defined port in main functin that will be called in index.js
//in index.js we use babel to be able to use ES6 syntax on any files related to App.js
function main(){
  //launching express server
  server.listen(port, () => console.log(`Listening on port ${port}`));
}
*/