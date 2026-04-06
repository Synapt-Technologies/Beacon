import { CoreDatabase } from "./src/database/CoreDatabase";
import { AedesNetworkConsumer } from "./src/tally/consumer/networkConsumer/AedesNetworkConsumer";
import type { ProducerConfig } from "./src/tally/producer/AbstractTallyProducer";
import { TallyOrchestrator } from "./src/tally/TallyOrchestrator";


const databTest = CoreDatabase.getInstance();
console.log("Producer DB: =", databTest.getProducers());
console.log("Consumer DB: =", databTest.getConsumers());

const orchestrator = new TallyOrchestrator({});







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