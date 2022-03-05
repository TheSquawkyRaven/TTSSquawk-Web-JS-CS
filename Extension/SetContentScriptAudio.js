
var targetAudioElement;

function GetSpeakerByID(speakerID){
    if (targetSpeaker != null && targetSpeaker.deviceId == speakerID){
        return false;   //Relaunch
    }
    targetSpeaker = speakerDevices[0];
    for (let i = 0; i < speakerDevices.length; i++){
        if (speakerID == speakerDevices[i].deviceId){
            targetSpeaker = speakerDevices[i];
            break;
        }
    }
    return true;    //First Time Run
}

firstRunOrChange = GetSpeakerByID(speakerSelectedID);

if (firstRunOrChange){
    console.log("Selected: " + targetSpeaker.label);
    
}
