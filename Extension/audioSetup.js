
var proceed = false;
var hasSetup = false;


function CheckHasSetup(){
    chrome.tabs.executeScript(null, {
        code: 'if (typeof hasSetup == "undefined"){ false; }else{ true; };'
    }, function(state){
        state = state[0];
        if (state == true){
            hasSetup = true;
            EveryExtensionClick();
        }
        else{
            chrome.tabs.executeScript(null, {
                file: "setup.js"
            }, function(){
                hasSetup = true;
                DoAfterHasSetup();
                EveryExtensionClick();
            });
        }
    });
}
CheckHasSetup();

function DoAfterHasSetup(){
    //Only once per page load and the first time extension is clicked

}

function EveryExtensionClick(){
    //Everytime extension is clicked
    GetAudioDevices();
    CheckContentConnection();
}

var gottenSpeakersDone = false;
function GetAudioDevices(){
    chrome.tabs.executeScript(null, {
        code: "gottenSpeakerDevices;"
    }, function(hasGottenSpeakerDevices){
        hasGottenSpeakerDevices = hasGottenSpeakerDevices[0];
        
        if (hasGottenSpeakerDevices && !gottenSpeakersDone){
            chrome.tabs.executeScript(null, {
                code: "sendingDataAudioOutputDevices;"
            }, function (devices){
                gottenSpeakersDone = true;
                devices = devices[0];
                AssignAudioDevices(devices);
            });
        }
        else{
            setTimeout(function() {
                if (!gottenSpeakersDone){
                    GetAudioDevices();
                }
            }, 10);
        }
    });
}

function GetAudioDeviceHTMLSelect(){
    return document.querySelector("select#speakerChoices");
}

function AssignAudioDevices(devices) {
    const audioSelect = GetAudioDeviceHTMLSelect();

    for (let i = 0; i < devices.length; i++) {
        const device = devices[i];
        let deviceIDtoLabel = device.split("\n");

        const option = document.createElement("option");
        option.value = deviceIDtoLabel[0];
        option.text = deviceIDtoLabel[1];

        audioSelect.appendChild(option);
    }
    LoadSavedAudioData();
}

var savedAudio = {};
function LoadSavedAudioData(){
    chrome.storage.local.get(['speakerIDs'], function(result) {
        if (result == null || !result.speakerIDs){
            return;
        }
        savedAudio = result.speakerIDs;
        if (!savedAudio[tablink]){
            savedAudio[tablink] = 'default';
        }
        //console.log(savedAudio);
        const audioSelect = GetAudioDeviceHTMLSelect();
        audioSelect.value = savedAudio[tablink];
        UpdateAudioDeviceInContent();
    });
}

function UpdateAudioDeviceInContent(){
    const audioSelect = GetAudioDeviceHTMLSelect();
    let value = audioSelect.value;
    savedAudio[tablink] = value;

    chrome.tabs.executeScript(null, {
        code: 'speakerSelectedID = \"' + value + "\";"
    }, function(){
        chrome.tabs.executeScript(null, {
            file: 'SetContentScriptAudio.js'
        }, null);
    });
    
    if (value == undefined || value == null || value == ""){
        //console.log("Skipped Saving - value is empty");
        return;
    }

    chrome.storage.local.set({speakerIDs: savedAudio}, function(){
        //console.log(value + " saved");
    });
    
}

const ConnectionState = {
    DEFAULT : 0,    //DUMMY
    CONNECTING : 1,
    CONNECTIONREATTEMPT : 2,
    CONNECTED : 3,
    CONNECTIONLOST : 4,     //Reattempt like connecting. This goes back to connectionattempt
}
Object.freeze(ConnectionState);
var connected = false;
var connectionAttempts = 1;
var lostConnectionToServer = false;
var connectionState = ConnectionState.CONNECTING;
var lastConnectionStateWhenDisplayed = ConnectionState.DEFAULT;   //Dummy
function CheckContentConnection(){
    chrome.tabs.executeScript(null, {
        code: 'if (typeof socketStatus == "undefined"){ var socketStatus = []; } socketStatus[0] = socketOpen; socketStatus[1] = socketConnecting; socketStatus;'
    }, function(socketStatus){
        socketStatus = socketStatus[0];
        socketOpen = socketStatus[0];
        socketConnecting = socketStatus[1];

        ConnectionStatusReceived(socketOpen, socketConnecting);
    });
}

function ConnectionStatusReceived(socketOpen, socketConnecting){

    CheckConnection(socketOpen, socketConnecting);
    DisplayConnectionStatus();

}
function CheckConnection(socketOpen, socketConnecting){
    if (socketOpen){
        ConnectionConnected();
        return;
    }
    ConnectionConnectingOrFailed(socketConnecting);
}
function ConnectionConnected(){
    connectionState = ConnectionState.CONNECTED;
    //Connection successful, no need to do anything else
    connected = true;
    OnContentConnectionToServer();
    setTimeout(CheckContentConnection, 5000);   //Check connection every 5 seconds
}
function ConnectionConnectingOrFailed(socketConnecting){
    if (connected){
        connectionAttempts = 1;
        lostConnectionToServer = true;
        connectionState = ConnectionState.CONNECTIONLOST;
    }

    connected = false;
    if (socketConnecting){
        ConnectionConnecting();
    }
    else{
        ConnectionFailed();
    }
    OnContentLostConnection();
}
function ConnectionConnecting(){
    //Is still connecting, wait... check later
    setTimeout(CheckContentConnection, 200);
}
function ConnectionFailed(){
    if (!lostConnectionToServer){
        connectionAttempts++;
        connectionState = ConnectionState.CONNECTIONREATTEMPT;
        CheckAndApplyConnection();
    }
    else{
        lostConnectionToServer = false;
        CheckAndApplyConnection();
    }
}



function DisplayConnectionStatus(){
    const connectionText = document.getElementById('serverConnection');
    switch (connectionState){
        case ConnectionState.CONNECTING:
            if (lastConnectionStateWhenDisplayed != ConnectionState.CONNECTING){
                connectionText.textContent = "Connecting...";
                connectionText.style.color = "white";
            }
            break;
        case ConnectionState.CONNECTED:
            if (lastConnectionStateWhenDisplayed != ConnectionState.CONNECTED){
                connectionText.textContent = "Connected!";
                connectionText.style.color = "lime";
            }
            break;
        case ConnectionState.CONNECTIONREATTEMPT:
            connectionText.textContent = GetStringOfSaidNumberOrder(connectionAttempts) + " Connection Attempt. Retrying...";
            connectionText.style.color = "orange";
            break;
        case ConnectionState.CONNECTIONLOST:
            if (lastConnectionStateWhenDisplayed != ConnectionState.CONNECTIONLOST){
                connectionText.textContent = "Connection Lost! Reconnecting...";
                connectionText.style.color = "red";
            }
            break;
    }
    lastConnectionStateWhenDisplayed = connectionState;
}

function CheckAndApplyConnection(){
    chrome.tabs.executeScript(null, {
        code: 'AttemptConnection();'
    }, null);
    setTimeout(CheckContentConnection, 100);
}

function GetStringOfSaidNumberOrder(number){
    let digit = GetLastDigitOfNumber(number);
    let digit2 = Get2LastDigitsOfNumber(number);
    switch (digit2){
        case 11:
        case 12:
        case 13:
            return number + "th";
    }
    switch (digit){
        case 1:
            return number + "st";
        case 2:
            return number + "nd";
        case 3:
            return number + "rd";
        default:
            return number + "th";
    }
}
function GetLastDigitOfNumber(number){
    let digit = number % 10;
    return digit;
}
function Get2LastDigitsOfNumber(number){
    return number % 100;
}

function Setup(){
    document.addEventListener('DOMContentLoaded', function() {

        var audioSelect = GetAudioDeviceHTMLSelect();
        audioSelect.addEventListener('change', UpdateAudioDeviceInContent, null);

    }, false);
}

Setup();
