import { EventEmitter } from "events";
import { Stats } from 'fs';
import * as http from 'http';
// import * as fs from 'fs';
import * as fs from 'node:fs';
import * as path from 'path';
import * as url from 'url';
import * as qs from 'querystring';
import WebSocket, { WebSocketServer } from 'ws';
import { Tally } from './Tally';
import { TallyManager } from './TallyManager';
import { SettingLoader } from './SettingLoader';
import { Settings } from 'atem-connection';
import { parse } from 'node:path';



export interface WebServerEvents {
  sourceChange: () => void;
}

export declare interface WebServer {
  on<U extends keyof WebServerEvents>(
    event: U, listener: WebServerEvents[U]
  ): this;

  emit<U extends keyof WebServerEvents>(
    event: U, ...args: Parameters<WebServerEvents[U]>
  ): boolean;
}

export class WebServer extends EventEmitter {

  server: http.Server;
  socketServer: WebSocketServer;

  deviceData: TallyManager.TallyManagerData;

  settingLoader: SettingLoader;

  constructor(settingLoader: SettingLoader) {
    super();
    
    this.settingLoader = settingLoader;

    this.deviceData = {
      tallyData: [],
      atemData: undefined
    };
  }

  start(){

    http.createServer((request, response) => {

      if (request.url == undefined) return;

      if (request.url.startsWith('/api/settings') && request.method == 'GET') {
        response.writeHead(200, {"Content-Type": "application/json"});
        response.write(this.settingLoader.config.settings.toJSON());
        response.end();
        return;
      } else if (request.url.startsWith('/api/settings') && request.method == 'POST') {
        var body = ''
        request.on('data', (data) => {
          body += data;
        });
        request.on('end', () => {
          var post = qs.parse(body);
          this.setSettings(post);
          response.writeHead(303, {
            location: '/'
         })
          response.end('post received');
        });
        return;
      } else if (request.url.startsWith('/api/sources') && request.method == 'GET'){
        response.writeHead(200, {"Content-Type": "application/json"});
        response.write(JSON.stringify(this.deviceData));
        response.end();
        return;
      } else if (request.url.startsWith('/api/sources') && request.method == 'POST'){
        var body = ''
        request.on('data', (data) => {
          body += data;
        });
        request.on('end', () => {
          var post = qs.parse(body);
          this.setTallySources(post);
          response.writeHead(303, {
            location: '/'
         })
          response.end('post received');
        });
      }
      else if(request.url.startsWith('/api')) {
        response.writeHead(200, {"Content-Type": "application/json"});
        response.write(JSON.stringify({ message: "Hello API World!" }));
        response.end();
        return;
      }

      var uri = "/src/frontend" + url.parse(request.url).pathname

      if(request.url.startsWith('/view/')) {
        uri = "/src/frontend/view/index.html";
      }


      if (uri == undefined) return;
      var filename = path.join(process.cwd(), uri);



      fs.open(filename, 'r', (err, fd) => {
        if (err) {
          if (err.code === 'ENOENT') {
            // response.writeHead(404, {"Content-Type": "text/plain"});
            // response.write("404 Not Found\n");
            // response.end();
            response.writeHead(303, {
              'Location': '/'
            });
            response.end();
            return;
          }
          response.writeHead(500, {"Content-Type": "text/plain"});
          response.write(err + "\n");
          response.end();
          return;
        }

        if (fs.statSync(filename).isDirectory()) filename += '/index.html';

        fs.readFile(filename, "binary", function(err, file) {
          if(err) {        
            response.writeHead(500, {"Content-Type": "text/plain"});
            response.write(err + "\n");
            response.end();
            return;
          }



          const _mimeTypes = {
            "html": "text/html",
            "jpeg": "image/jpeg",
            "jpg": "image/jpeg",
            "png": "image/png",
            "svg": "image/svg+xml",
            "json": "application/json",
            "js": "text/javascript",
            "css": "text/css"
          };

          var mimeType = "text/plain";

          const extension = filename.split('.').pop();
          switch(extension) {
            case 'html':
            case 'jpeg':
            case 'jpg':
            case 'png':
            case 'svg':
            case 'json':
            case 'js':
            case 'css':
              mimeType = _mimeTypes[extension];
              break;
          }

          // console.log('HTTP: ' + filename + ' ' + mimeType + ' ' + extension);
          
          response.writeHead(200, { "Content-Type": mimeType });
          response.write(file, "binary");
          response.end();
        });
      });
    
    
    }).listen(80);

    this.socketServer = new WebSocketServer({ port: 8080 });

    this.socketServer.on('connection', (socket, request) => {
      socket.isAlive = true;
      
      socket.on('error', console.error);

      socket.on('close', (socket) => {
        console.log('HTTP: Client disconnected');
      });

      console.log('HTTP: Client connected from: ' + request.socket.remoteAddress);
      socket.send(JSON.stringify(this.deviceData));
    });

  }

  setTallyData(tallyData: Tally[]) {
    this.deviceData.tallyData = tallyData;
    this._sendData();
  }

  setData(data: TallyManager.TallyManagerData) {
    this.deviceData = data;
    this._sendData();
  }

  private _sendData() {
    this.socketServer.clients?.forEach((socket) => {
      socket.send(JSON.stringify(this.deviceData));
    });
  }

  setSettings(settings) {

    Object.keys(settings).forEach((key) => {
      this.settingLoader.set(key, settings[key]);
    });
    // this.settingLoader.set(settings);
  }

  setTallySources(sources) {

    var keys = Object.keys(sources).map(Number);
    console.log(keys);


    var parsedSources: {[key: number]: any} = {};

    Object.keys(sources).forEach((key) => {
      parsedSources[parseInt(key)] = sources[key].replace(/(\r\n|\n|\r|;)/gm, ",").split(',').map(Number).sort();
      console.log(parseInt(key), parsedSources[parseInt(key)]);
    });

    this.deviceData.tallyData.forEach((tally) => {
      if (keys.includes(tally.id)) {

        tally.atemOutput = parsedSources[tally.id];

        console.log('HTTP: Set Tally ' + tally.id + ' sources to ' + sources[tally.id]);
      }
    });

    this.emit('sourceChange');

    this.settingLoader.setTally(this.deviceData.tallyData);
  }
}

