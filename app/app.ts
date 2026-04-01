import { TallyOrchestrator } from "./src/tallyServer/TallyOrchestrator";


const orchestrator = new TallyOrchestrator({name: "testOrchestrator"});
orchestrator.init();


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