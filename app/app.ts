import { CoreDatabase } from "./src/database/CoreDatabase";
import { AedesNetworkConsumer } from "./src/tally/consumer/networkConsumer/AedesNetworkConsumer";
import { AtemNetClientTallyProducer } from "./src/tally/producer/networkProducer/AtemNetClientTallyProducer";
import { TallyOrchestrator } from "./src/tally/TallyOrchestrator";


const cdb = CoreDatabase.getInstance();
console.log("Producer DB: =", cdb.getProducers());
console.log("Consumer DB: =", cdb.getConsumers());

const orchestrator = new TallyOrchestrator({});

const testAedes = new AedesNetworkConsumer({
    name: "AEDES", // TODO refactor default names, maybe also make it return e.g. Atem@192.168.10.240
    parent: TallyOrchestrator.name,
    keep_alive_ms: 5000,
    broadcast_all: true,
    id: "aedes"
});

cdb.saveConsumer(testAedes);

await testAedes.init();

orchestrator.addConsumer(testAedes);

const testAtem = new AtemNetClientTallyProducer({
    name: "ATEM-TVSHD",
    parent: TallyOrchestrator.name,
    host: "127.0.0.1",
    id: "atem1"
});

cdb.saveProducer(testAtem);

await testAtem.init();

orchestrator.addProducer(testAtem);





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