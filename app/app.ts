import { CoreDatabase } from "./src/database/CoreDatabase";
import { AedesNetworkConsumer } from "./src/tally/consumer/networkConsumer/AedesNetworkConsumer";
import type { ProducerConfig } from "./src/tally/producer/AbstractTallyProducer";
import { TallyOrchestrator } from "./src/tally/TallyOrchestrator";


const orchestrator = new TallyOrchestrator({});


const databTest = CoreDatabase.getInstance();

console.log("empty: =", databTest.getConsumers());

const testAedes = new AedesNetworkConsumer({
    name: "AEDES", // TODO refactor default names, maybe also make it return e.g. Atem@192.168.10.240
    parent: TallyOrchestrator.name,
    keep_alive_ms: 5000,
    broadcast_all: true,
    id: "aedes"
});

databTest.saveConsumer(testAedes);
console.log("set: =", databTest.getConsumers());

//TODO add exit handler, kinda like this:

// // Handle "Ctrl+C" or "Stop" commands
// const shutdown = async () => {
//     console.log("\nShutting down gracefully...");
//     // This would call destroy() on all your producers
//     await orchestrator.destroy(); 
//     process.exit(0);
// };

// process.on("SIGINT", shutdown);
// process.on("SIGTERM", shutdown);