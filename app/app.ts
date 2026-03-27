import { AtemSwitcherConnection } from "./src/server/switcherConnection/AtemSwitcherConnection";
import util from "node:util";
import { SwitcherInfo, SwitcherTallyState } from "./src/server/switcherConnection/switcherConnection";
import { AedesEventServer } from "./src/server/eventServer/AedesEventServer";

let con1 = new AtemSwitcherConnection({host: "127.0.0.1"})


// con1.on('info_update', function(info: SwitcherInfo, path: string[] | null) {
//     console.log("Info Change at: ", path, "\nData: ", util.inspect(con1.getInfo(), false, null, true));
// });
con1.on('connected', function() {
    console.log("Info: ", util.inspect(con1.getInfo(), false, null, true));
});
con1.on('tally_update', function(tallydata: SwitcherTallyState) {
    console.log("Tally: ", util.inspect(tallydata, false, null, true));
    
})


con1.connect();

setInterval(function ()  {

    // console.log("Info: ", util.inspect(con1.getInfo(), false, null, true));
    // console.log("Sources: ", util.inspect(con1.getSources(), false, null, true));
    // console.log("Tally: ", con1.getTallyState());

}, 1000);


let eventServ = new AedesEventServer({
    name: "testAedes",
    port: 1883
})

eventServ.init();