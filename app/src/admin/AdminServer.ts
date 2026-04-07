import express from "express";
import ViteExpress from "vite-express";
import { Logger } from "../logging/Logger";

export class AdminServer {

    private app = express();
    private logger = new Logger(["ADMIN"]);

    public start(port: number = 3000): void {
        this.app.use(express.json());

        ViteExpress.config({ verbosity: ViteExpress.Verbosity.Silent });

        // TODO: Register API routes here

        ViteExpress.listen(this.app, port, () => {
            this.logger.info(`Admin server running on http://localhost:${port}`);
        });
    }
}
