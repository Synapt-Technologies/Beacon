import { Aedes, type Client, type Subscription } from "aedes";
import { createServer, Server } from "node:net";
import {
  createServer as createHttpServer,
  type Server as HttpServer,
} from "node:http";
import { WebSocketServer, createWebSocketStream } from "ws";
import {
  AbstractNetServerConsumer,
  type NetServerConsumerConfig,
} from "./AbstractNetServerConsumer";
import type { IBroadcastConsumer } from "../IBroadcastConsumer";
import {
  ConnectionState,
  TallyState,
  type DisplayName,
} from "../../types/CommonTypes";
import type { ConsumerInfo } from "../../types/ConsumerTypes";
import type {
  DeviceAddress,
  DeviceAlertBundle,
  DeviceAlertData,
  DeviceDiscoveryMessage,
  DeviceDiscoveryReplyMessage,
  DeviceId,
  DeviceRuntimeConfig,
  DeviceRuntimeConfigBundle,
  DeviceStateBundle,
  GlobalDeviceRuntimeConfig,
} from "../../types/DeviceTypes";
import type { SourceInfo, SourceStateMap } from "../../types/SourceTypes";

export interface AedesConsumerConfig extends NetServerConsumerConfig {
  serve_tcp: boolean;
  serve_ws: boolean;
  ws_port: number;
  cancel_on_transport_failure: boolean;
}

export interface AedesConsumerInfo extends ConsumerInfo {
  tcp_active: boolean;
  ws_active: boolean;
  client_count: number;
}

interface TallyStatePackage {
  name: string;
  num: TallyState;
}

// ? payloads:
interface MqttPayload {
  moment: number;
}
interface KeepAliveMqttPayload extends MqttPayload {
  /* empty */
}

interface TallyBroadcastMqttPayload extends MqttPayload {
  source_states: Record<string, TallyStatePackage>;
}

// TODO: make this extend exiting interfaces?
interface DeviceStateMqttPayload extends MqttPayload {
  state: TallyStatePackage;
  active_sources: Record<string, SourceInfo>;
  moment: number;
}

// TODO: Check these payloads. It might be possible to use existing interfaces.
interface DeviceAlertMqttPayload extends MqttPayload, DeviceAlertData {
  /* empty */
}

interface DeviceRuntimeConfigMqttPayload
  extends MqttPayload, DeviceRuntimeConfig, GlobalDeviceRuntimeConfig {
  /* empty */
}

interface DeviceDiscoveryReplyMqttPayload
  extends MqttPayload, DeviceDiscoveryReplyMessage {
  /* empty */
}

export class AedesNetServerConsumer
  extends AbstractNetServerConsumer
  implements IBroadcastConsumer
{
  declare protected _config: AedesConsumerConfig; // Declare to indicate it overwrites the parent's type.

  public static readonly DefaultConfig: AedesConsumerConfig = {
    id: "aedes",
    name: "MQTT Consumer",
    port: 1883,
    serve_tcp: true,
    serve_ws: true,
    ws_port: 9001,
    keep_alive: true,
    keep_alive_ms: 500,
    cancel_on_transport_failure: false,
  };

  protected _getDefaultConfig(): AedesConsumerConfig {
    return AedesNetServerConsumer.DefaultConfig;
  }

  declare protected _info: AedesConsumerInfo;

  constructor(config: Partial<AedesConsumerConfig>) {
    super(config);
    this._info = {
      ...this._info,
      tcp_active: false,
      ws_active: false,
      client_count: 0,
    };
  }

  protected _checkConfig(config: AedesConsumerConfig) {
    super._checkConfig(config);

    if (
      config.serve_ws &&
      (config.ws_port == null || config.ws_port < 0 || config.ws_port > 65535)
    )
      this._logger.fatal(
        `Valid websocket Port is required. Submitted config:`,
        config,
      );
  }

  private _aedes?: Aedes;
  private _server?: Server;
  private _wsHttpServer?: HttpServer;
  private _wsServer?: WebSocketServer;

  protected async _init(): Promise<void> {
    const _enterFailState = async () => {
      this._info.state = ConnectionState.FAILED;

      await this._closeTransports();

      this._emitInfoUpdate();

      this._logger.error("Entered FAILED state.");
      return;
    };

    try {
      this._aedes = await Aedes.createBroker();
    } catch (err) {
      this._logger.error("Error starting Aedes broker:", err);
      return await _enterFailState();
    }

    try {
      await Promise.race([
        new Promise<void>((resolve, reject) => {
          type AedesPersistence = {
            createRetainedStream(topic: string): NodeJS.ReadableStream;
            cleanRetained(topic: string, cb: () => void): void;
          };
          const persistence = (
            this._aedes as unknown as { persistence: AedesPersistence }
          ).persistence;
          const stream = persistence.createRetainedStream("#");
          const clears: Promise<void>[] = [];
          stream.on("data", (packet: { topic: string }) => {
            clears.push(
              new Promise<void>((res) => {
                persistence.cleanRetained(packet.topic, () => res());
              }),
            );
          });
          stream.on("end", async () => {
            await Promise.all(clears);
            resolve();
          });
          stream.on("error", (err) => {
            this._logger.warn("Error clearing retained messages:", err);
            reject(err);
          });
        }),
        new Promise<void>((_, reject) =>
          setTimeout(() => reject(new Error("Timeout")), 5000),
        ),
      ]);
      this._logger.debug("Cleared retained messages.");
    } catch (err) {
      this._logger.warn("Error clearing retained messages on startup:", err);
    }

    if (this._config.serve_tcp) {
      try {
        this._server = createServer(this._aedes.handle);
        this._server.on("connection", (socket) => socket.setNoDelay(true));

        await new Promise<void>((resolve, reject) => {
          this._server!.listen(this._config.port, () => {
            this._logger.info(
              "Started and listening on port ",
              this._config.port,
            );
            resolve();
          });

          this._server!.once("error", (err) => {
            // Pesky boot errors
            this._logger.error("Error starting server:", err);
            reject(err);
          });
        });

        this._info.tcp_active = true;
      } catch (err) {
        this._logger.error("Error starting TCP server:", err);

        if (this._config.cancel_on_transport_failure) {
          return await _enterFailState(); // Handles setting the state.
        } else {
          this._info.state = ConnectionState.ERROR;
          this._emitInfoUpdate();
        }
      }
    }

    if (this._config.serve_ws) {
      try {
        this._wsHttpServer = createHttpServer();
        this._wsServer = new WebSocketServer({ server: this._wsHttpServer });
        this._wsServer.on("connection", (websocket, req) => {
          const stream = createWebSocketStream(websocket);
          this._aedes?.handle(stream, req);
        });
        await new Promise<void>((resolve, reject) => {
          this._wsHttpServer!.listen(this._config.ws_port, () => {
            this._logger.info(
              "WebSocket MQTT listening on port",
              this._config.ws_port,
            );
            resolve();
          });
          this._wsHttpServer!.once("error", (err) => {
            this._logger.error("Error starting WebSocket server:", err);
            reject(err);
          });
        });

        this._info.ws_active = true;
      } catch (err) {
        this._logger.error("Error starting WebSocket server:", err);

        if (this._config.cancel_on_transport_failure) {
          return await _enterFailState(); // Handles setting the state.
        } else {
          this._info.state = ConnectionState.ERROR;
          this._emitInfoUpdate();
        }
      }
    }

    if (!this._info.tcp_active && !this._info.ws_active) {
      this._logger.error(
        "Failed to start any transport! Entering FAILED state...",
      );
      return await _enterFailState();
    }

    //? Aedes event handlers
    this._aedes.on(
      "subscribe",
      (subscriptions: Subscription[], _client: Client) => {
        this._logger.debug("Subscription:", subscriptions); // TODO: Remove?
      },
    );

    this._aedes.on("publish", (packet, client) => {
      if (!client) return; // broker-internal messages

      this._logger.debug(
        "Message: MQTT Client",
        client.id,
        "has published message on",
        packet.topic,
      );

      if (packet.topic === "device/discovery") {
        try {
          const discovery: DeviceDiscoveryMessage = JSON.parse(
            packet.payload.toString(),
          );
          this._processDeviceDiscovery(discovery);
        } catch (err) {
          this._logger.warn(
            `Failed to parse discovery packet from client ${client.id}:`,
            err,
          );
        }
      } else if (packet.topic.startsWith("system/time/request/")) {
        try {
          const t2 = Date.now(); // Capture immediately
          const { t1 } = JSON.parse(packet.payload.toString());

          const deviceId = packet.topic.slice("system/time/request/".length);

          this._aedes?.publish(
            {
              cmd: "publish",
              qos: 0,
              dup: false,
              retain: false,
              topic: "system/time/response/" + deviceId,
              payload: Buffer.from(JSON.stringify({ t1, t2 })),
            },
            () => {},
          );
        } catch (err) {
          this._logger.warn(
            `Failed to process time request from client ${client.id}:`,
            err,
          );
        }
      }
    });

    this._aedes.on("clientReady", (client: Client) => {
      this._info.client_count++;
      this._logger.info(`MQTT client ready: ${client?.id ?? "unknown"}`);
      this._emitInfoUpdate();
    });

    this._aedes.on("clientDisconnect", (client: Client) => {
      this._info.client_count = Math.max(0, this._info.client_count - 1);
      this._logger.info(`MQTT client disconnected: ${client?.id ?? "unknown"}`);
      this._emitInfoUpdate();
    });

    this._aedes.on("clientError", (client: Client, err: Error) => {
      this._logger.warn(`MQTT client error: ${client?.id ?? "unknown"}`, err);
    });

    this._aedes.on("connectionError", (client: Client, err: Error) => {
      this._logger.warn(
        `MQTT connection error: ${client?.id ?? "unknown"}`,
        err,
      );
    });

    this._aedes.on("keepaliveTimeout", (client: Client) => {
      this._logger.warn(`MQTT keepalive timeout: ${client?.id ?? "unknown"}`); // TODO: Should this be logged? Happens a lot. Check why it happens.
    });

    if (this._info.state !== ConnectionState.ERROR)
      this._info.state = ConnectionState.ONLINE;
    this._emitInfoUpdate();

    // const testTallyDevice1: TallyDevice = {
    //     id: { consumer: this.config.id, device: 'ad322df69708' },
    //     name: {long: 'Test Device 1' },
    //     state: TallyState.NONE,
    //     connection: 2,
    //     patch: [],
    // };
    // const testTallyDevice2: TallyDevice = {
    //     id: { consumer: this.config.id, device: '9862eef93c9e' },
    //     name: {long: 'Test Device 2' },
    //     state: TallyState.NONE,
    //     connection: 3,
    //     patch: [],
    // };

    // this._addDevice(testTallyDevice1);
    // this._addDevice(testTallyDevice2);
  }

  // TODO: Move to a common place and use in more places?
  private async _closeWithTimeout(
    server: { close(cb: (err?: Error) => void): void } | undefined,
    ms: number,
    name: string,
    onClosed?: () => void,
  ): Promise<void> {
    if (!server) return;
    await Promise.race([
      new Promise<void>((r) =>
        server.close((err) => {
          if (err) this._logger.warn(`${name} close error:`, err);
          else this._logger.debug(`${name} closed.`);
          r();
        }),
      ),
      new Promise<void>((r) =>
        setTimeout(() => {
          this._logger.warn(`${name} did not close within ${ms}ms.`);
          r();
        }, ms),
      ),
    ]);
    onClosed?.();
  }

  private async _closeTransports(): Promise<void> {
    await this._closeWithTimeout(
      this._aedes,
      5000,
      "Aedes MQTT broker",
      () => (this._aedes = undefined),
    );

    if (this._wsServer)
      for (const client of this._wsServer.clients) client.terminate();

    await Promise.all([
      this._closeWithTimeout(
        this._wsServer,
        2000,
        "WebSocket server",
        () => (this._wsServer = undefined),
      ),
      this._closeWithTimeout(
        this._wsHttpServer,
        1000,
        "WebSocket HTTP server",
        () => (this._wsHttpServer = undefined),
      ),
      this._closeWithTimeout(
        this._server,
        1000,
        "TCP server",
        () => (this._server = undefined),
      ),
    ]);
  }

  protected async _destroy(): Promise<void> {
    try {
      await this._closeTransports();

      this._logger.debug("Destroyed successfully.");
    } catch (err) {
      this._logger.error("Error while destroying AedesNetServerConsumer:", err);
    }

    this._info.tcp_active = false;
    this._info.ws_active = false;
    this._info.client_count = 0;
  }

  private _publishDevice(
    address: DeviceAddress,
    subtopic: string,
    payload: MqttPayload | null,
    qos: 0 | 1 | 2,
    retain: boolean,
  ): void {
    const topic = `device/${address.consumer}/${address.device}/${subtopic}`;
    this._publish(topic, payload, qos, retain);
  }
  private _publish(
    topic: string,
    payload: MqttPayload | null,
    qos: 0 | 1 | 2,
    retain: boolean,
  ): void {
    if (!this._aedes) {
      this._logger.warn(
        "Attempting to publish before initialization. Discarding.",
      );
      return;
    }

    const buf =
      payload === null ? Buffer.alloc(0) : Buffer.from(JSON.stringify(payload));

    try {
      this._aedes.publish(
        {
          cmd: "publish",
          qos,
          dup: false,
          topic: topic,
          payload: buf,
          retain,
        },
        () => {},
      );
      this._logger.debug(`Published to ${topic}:`, payload);
    } catch (err) {
      this._logger.error(`Error publishing to MQTT topic ${topic}:`, err);
    }
  }

  private _clearDeviceRetained(address: DeviceAddress, subtopic: string): void {
    this._publishDevice(address, subtopic, null, 1, true);
  }
  private _clearRetained(topic: string): void {
    this._publish(topic, null, 1, true);
  }

  protected _sendDeviceState(bundle: DeviceStateBundle): void {
    const payload: DeviceStateMqttPayload = {
      state: {
        name: TallyState[bundle.data.state],
        num: bundle.data.state,
      },
      active_sources: Object.fromEntries(bundle.data.active_sources),
      moment: bundle.moment,
    };

    this._publishDevice(bundle.id, "tally", payload, 1, true);
  }

  protected _sendDeviceAlert(bundle: DeviceAlertBundle): void {
    const payload: DeviceAlertMqttPayload = {
      moment: bundle.moment,
      ...bundle.data.alert,
    };

    this._publishDevice(bundle.id, "alert", payload, 2, false);
  }

  protected _sendDeviceRuntimeConfig(bundle: DeviceRuntimeConfigBundle): void {
    const payload: DeviceRuntimeConfigMqttPayload = {
      moment: bundle.moment,
      ...bundle.data.runtime,
      ...bundle.data.global,
    };

    this._publishDevice(bundle.id, "config/runtime", payload, 2, true);
  }

  protected _sendDiscoveryReply(
    id: DeviceId,
    message: DeviceDiscoveryReplyMessage,
  ): void {
    const payload: DeviceDiscoveryReplyMqttPayload = {
      moment: Date.now(),
      ...message,
    };

    this._publish(`device/discovery/reply/${id}`, payload, 1, true);
  }

  protected _deleteDevice(address: DeviceAddress): void {
    //Remove retained messages.
    this._clearDeviceRetained(address, "tally");
    this._clearDeviceRetained(address, "alert");
    this._clearDeviceRetained(address, "config/runtime");
    this._clearRetained(`device/discovery/reply/${address.device}`);
  }

  protected _broadcastKeepAlive(): void {
    const payload: KeepAliveMqttPayload = {
      moment: Date.now(),
      // system: this.config.system_info // TODO: Add a way to get systemInfo.
    };

    this._publish("system/info", payload, 1, false);
  }

  public publishTally(state: SourceStateMap) {
    const map = Object.fromEntries(
      Array.from(state.entries()).map(([key, state]) => [
        key,
        { name: TallyState[state], num: state },
      ]),
    );

    const payload: TallyBroadcastMqttPayload = {
      moment: Date.now(),
      source_states: Object.fromEntries(
        Array.from(state.entries()).map(([key, state]) => [
          key,
          { name: TallyState[state], num: state },
        ]),
      ),
    };

    this._publish("tally/global", payload, 1, false);
  }
}
