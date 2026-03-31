import { TallyOrchestrator } from "./src/tallyServer/TallyOrchestrator";


const orchestrator = new TallyOrchestrator({name: "testOrchestrator"});
orchestrator.init();


// import { AtemSwitcherConnection } from "./src/server/switcherConnection/AtemSwitcherConnection";
// import util from "node:util";
// import { SwitcherInfo, SwitcherTallyState } from "./src/server/switcherConnection/switcherConnection";
// import { AedesEventServer } from "./src/server/eventServer/AedesEventServer";
// import { LightState } from "./src/server/eventServer/EventServer";

// let con1 = new AtemSwitcherConnection({host: "127.0.0.1"})
// let eventServ = new AedesEventServer({
//     name: "testAedes",
//     port: 1883,
//     serve_http: true,
//     serve_ws: true
// })

// // con1.on('info_update', function(info: SwitcherInfo, path: string[] | null) {
// //     console.log("Info Change at: ", path, "\nData: ", util.inspect(con1.getInfo(), false, null, true));
// // });
// con1.on('connected', function() {
//     console.log("Info: ", util.inspect(con1.getInfo(), false, null, true));
// });
// con1.on('tally_update', function(tallydata: SwitcherTallyState) {
//     console.log("Tally: ", util.inspect(tallydata, false, null, true));

//     const fullTally: LightState = {
//         alert: [
//             {number: 2, type: "talent"}
//         ],
//         program: tallydata.program,
//         preview: tallydata.preview
//     }

//     eventServ.broadcastTally(fullTally);
// })

// eventServ.on('subscribe', () => {

//     const tallydata = con1.getTallyState();

//     const fullTally: LightState = {
//         alert: [
//             {number: 2, type: "talent"}
//         ],
//         program: tallydata.program,
//         preview: tallydata.preview
//     }

//     eventServ.broadcastTally(fullTally);
// });

// con1.connect();

// setInterval(function ()  {

//     const tallydata = con1.getTallyState();

//     const fullTally: LightState = {
//         alert: [
//             {number: 2, type: "talent"}
//         ],
//         program: tallydata.program,
//         preview: tallydata.preview
//     }

//     eventServ.broadcastTally(fullTally);

// }, 1000);




// eventServ.init();