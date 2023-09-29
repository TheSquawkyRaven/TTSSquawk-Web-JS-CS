

function OnContentConnectionToServer(){
    const observeButton = document.getElementById('observe');
    observeButton.disabled = false;
    const highlightButton = document.getElementById('startHighlight');
    highlightButton.disabled = false;
    const overlay = document.getElementById('overlay');
    overlay.style.display = "none";
    SetupVoices();
    UpdateContentSpeakingOptionDict();
}
function OnContentLostConnection(){
    const observeButton = document.getElementById('observe');
    observeButton.disabled = true;
    const highlightButton = document.getElementById('startHighlight');
    highlightButton.disabled = true;
    const overlay = document.getElementById('overlay');
    overlay.style.display = "block";
}

const speakingStrings = {
    'suppressSameText' : false,
    'addNameSaid' : false,
    'autoSpeak' : false,
    'speakButtons' : false,
    'useWhiteBlackList' : false
}

function PopupSetup(){


    document.addEventListener('DOMContentLoaded', function() {

        SetOnClick('observe', function(){
            if (connected){
                StartObserve();
            }
        });
        SetOnClick('stopObserve', function(){
            StopObserve();
        });
        SetOnClick('startHighlight', StartHighlight);
        SetOnClick('stopHighlight', StopHighlight);

        speakingOptionDict = {
            'suppressSameText' : false,
            'addNameSaid' : false,
            'autoSpeak' : false,
            'speakButtons' : false,
            'useWhiteBlackList' : false
        };
        for (let i in speakingOptionDict){
            SetOnOptionChange(i);
        }
        //speakingOptionDict['isWhiteList'] = false;
        speakingOptionDict['whiteBlackList'] = {};
        //BlackWhiteListSetup();


        const highlightSelection = document.getElementById('highlightSelection');
        highlightSelection.addEventListener('change', function(){
            highlightVoiceName = highlightSelection.value;
            SetHighlightVoice(highlightSelection.value);
            SaveHighlightOptionVoice();
        }, false);

        const emergencyStopButton = document.getElementById('emergencyStopButton');
        emergencyStopButton.addEventListener('click', function(){
            InjectCode(`if (typeof StopAllAudio == 'function') StopAllAudio();`);
        }, false);

    }, false);


    chrome.tabs.executeScript(null, {
        code: 'window.location.hostname;'
    }, function(data){
        data = data[0];
        tablink = data;

        CheckObserving();
        Load(CheckSiteForPresetChat);
    })
}

function StartHighlight(){
    InjectScript('highlight.js', function(){
        InjectCode('StartHighlightCapture();');
        SetHighlightVoice(highlightVoiceName);
    });
}
function StopHighlight(){
    InjectCode(`if (typeof StopHighlightCapture == 'function') StopHighlightCapture();`);
}
function BlackWhiteListSetup(){
    /* const whiteBlackListOption = document.getElementById('whiteBlackListOption');
    const whiteBlackList = document.getElementById('whiteBlackList');
    
    whiteBlackListOption.addEventListener('change', function(){
        let value = whiteBlackListOption.value;
        let isNone = value == 'none';
        speakingOptionDict['useWhiteBlackList'] = !isNone;
        if (!isNone){
            speakingOptionDict['isWhiteList'] = value == 'whitelist';
        }
        SaveSpeakingOptions();
    }, false);

    whiteBlackList.addEventListener('change', function(){
        let strings = whiteBlackList.value.split(',');
        for (let i = 0; i < strings.length; i++){
            strings[i] = strings[i].trim();
        }
        speakingOptionDict['whiteBlackList'] = strings;
        console.log(speakingOptionDict['whiteBlackList']);
        SaveSpeakingOptions();
    }, false); */
}

function SetOnClick(element, callback, sendSelf = false){
    const node = document.getElementById(element);
    node.addEventListener('click', function(){
        if (sendSelf){
            callback(node);
            return;
        }
        callback();
    }, false);
}
function SetOnOptionChange(element){
    const node = document.getElementById(element);
    node.addEventListener('click', function(){
        OnSpeakingOptionChanged(element, node);
    });
}
function InjectCode(string, callback = null){
    chrome.tabs.executeScript(null, {
        code: string
    }, callback);
}
function InjectScript(script, callback = null){
    chrome.tabs.executeScript(null, {
        file: script
    }, callback)
}

PopupSetup();



var otherLoaded = false;
function Load(nextFunction){
    //LoadUserChatPresets(nextFunction);
    LoadSpeakingOptions(nextFunction);
}



var voices;
var voiceSelectOptions;
var voicesRetrieved = false;
function SetupVoices(){
    if (!voicesRetrieved){
        RetrieveVoices(SetVoices);
    }
}
function RetrieveVoices(callback){
    InjectCode("voicesRead", function(hasRead){
        hasRead = hasRead[0];
        if (hasRead){
            InjectCode("voices", function(result){
                result = result[0];
                if (result){
                    voices = result;
                    voicesRetrieved = true;
                    callback();
                    return;
                }
                console.log("STUPID ERROR");
            });
            return;
        }
        //Not yet read
        setTimeout(function(){
            RetrieveVoices(callback);
        }, 250);
    });
}
function SetVoices(){
    //console.log("Got Voices: ");
    //console.log(voices);
    SetBlackWhiteList(speakingOptionDict['whiteBlackList']);
    SetHighlightSelect();
}


var highlightVoiceName = 'Default';
function SetHighlightSelect(){
    const highlightSelection = document.getElementById('highlightSelection');
    CreateOptionsInSelect(highlightSelection);
    LoadHighlightOptionVoice(highlightSelection);
}
function SetHighlightVoice(voiceName){
    InjectCode(`if (typeof SetVoice == 'function') SetVoice('${voiceName}');`);
}
function LoadHighlightOptionVoice(selection){
    chrome.storage.local.get(['highlightVoice'], function(result) {
        
        if (result == null || result.highlightVoice == undefined){
            console.log("Save Not Found");
            return;
        }
        highlightVoiceName = result.highlightVoice;
        selection.value = highlightVoiceName;

        console.log("Set " + highlightVoiceName);
    });
}
function SaveHighlightOptionVoice(){
    console.log("Saving " + highlightVoiceName);
    chrome.storage.local.set({highlightVoice: highlightVoiceName}, function(){
        //console.log("Speaking Options Saved: ");
        //console.log(linkedSpeakingOptionDict);
    });
}



function SetBlackWhiteList(data = null){
    const whiteBlackListContainer = document.getElementById('whiteBlackListContainer');

    GetVoicesSelectOptions();
    if (data){
        whiteBlackListContainer.innerHTML = "";

        for (let key in data){
            const select = CreateInputWhiteBlackListPerson(whiteBlackListContainer, key);
            select.value = data[key];
        }
    }
    CreateInputWhiteBlackListPerson(whiteBlackListContainer, "");  //Create Empty

}
function CreateInputWhiteBlackListPerson(parent, key){

    const div = document.createElement('div');
    div.className = "whiteBlackListPerson";

    const input = document.createElement('input');
    input.className = "whiteBlackListText";
    input.type = "text";
    input.value = key;
    input.addEventListener('change', function(){
        WhiteBlackListOptionChanged();
    }, false);
    
    div.appendChild(input);
    const select = voiceSelectOptions.cloneNode(true);
    select.className = "whiteBlackListSelection";
    div.appendChild(select);

    select.addEventListener('change', function(){
        WhiteBlackListOptionChanged();
    }, false);

    parent.appendChild(div);

    return select;

}
function CreateOptionsInSelect(select){
    CreateOption(select, "Default", "Default", true);
    for (let voice in voices){
        CreateOption(select, voice, voices[voice], false);
    }
}
function GetVoicesSelectOptions(){
    
    const select = document.createElement('select');
    select.className = "whiteBlackListSelection";
    CreateOptionsInSelect(select);
    
    voiceSelectOptions = select;
    
}
function CreateOption(parent, value, text, checked){
    const option = document.createElement('option');
    option.value = value;
    option.text = text;
    option.checked = checked;
    parent.appendChild(option);
    return option;
}

function WhiteBlackListOptionChanged(){
    CheckFillAddRemoveWhiteBlackListOption();
}
function CheckFillAddRemoveWhiteBlackListOption(){
    speakingOptionDict['whiteBlackList'] = {};
    const divs = document.getElementsByClassName('whiteBlackListPerson');
    let hasEmpty = false;
    let emptyDiv;
    for (let i = divs.length - 1; i >= 0; i--){
        const input = divs[i].getElementsByTagName('input')[0];
        if (input.value){
            const select = divs[i].getElementsByTagName('select')[0];
            speakingOptionDict['whiteBlackList'][input.value] = select.value;
        }
        else{
            if (!hasEmpty){
                hasEmpty = true;
                emptyDiv = divs[i];
                continue;
            }
            divs[i].remove();
        }
    }
    if (hasEmpty){
        divs[0].parentNode.appendChild(emptyDiv);
    }
    else{
        GetVoicesSelectOptions();
        CreateInputWhiteBlackListPerson(divs[0].parentNode, "");
    }
    UpdateContentSpeakingOptionDict();
    SaveSpeakingOptions();
}







/*

!!If empty textClass or nameClass, use specified filters //!!NOT DONE!!

!!textClasses : {>class< : true} - Use list of this instead of normal textClass //!!NOT DONE!!
textOnlyIs : true - Allow only if the text is exactly textClass //DONE

textIgnoreIfIs : {>class< : true} - If textClass className is exactly this, ignore. //DONE
textIgnoreIfContain : {>class< : true} - If textClass' any children contains the class, ignore. //DONE
textIgnoreAutoSpeakIfIs : {>class< : true} - If textClass className is exactly this, don't speak automatically //DONE
!!textIgnoreAutoSpeakIfContain : {>class< : true} - If textClass' any children contains the class, don't speak automatically //!!NOT DONE!!

nameRemove : >string< - Remove this string from name //DONE
textPlainTextOnly : true - Use jQuery filter to only get within tag text without inner tags //DONE

nameSplitIf : {>class< : >string<} - Split the text if the class tag is this using the string //DONE

!!lookForNameInTextClass : true - Find the nameClass tag within the observing textClass //!!NOT DONE!!

textIsAtRoot : true - The textClass is always located at the highest point of the hierarchy (flipped tree root) //DONE

putButtonInTargetNode : true - Puts the speak button in the target node (text node) instead of after the node //DONE

deepSearchForName : true - Finds the name if undefined, by traversing from the final node back up to each previous sibling nodes until it finds a name //DONE

*/

const ChatPresets = [
    ["meet.google.com", "z38b6", "YTbUzc", "oIy2qc",
        {
        }
    ]
];
Object.freeze(ChatPresets);

var tablink;
var observingClass;
var nameClass;
var textClass;
var filter;
function CheckSiteForPresetChat(){

    const chatPresetCheck = document.getElementById('chatPresetCheck');
    //const chatPresetInput = document.getElementById('chatPresetInput');
    let found = false;
    
    DisplaySpeakingOptions();
    found = CheckSetObserver(ChatPresets);

    if (found){
        //Found by preset
        chatPresetCheck.textContent = tablink + " Available";
        chatPresetCheck.style.color = 'lime';
        ConnectionReady();
        return;
    }

    chatPresetCheck.textContent = tablink + " is not yet supported. :(";
    chatPresetCheck.style.color = 'red';
    
}
function CheckSetObserver(chatPresets){
    for (let preset of chatPresets){
        if (tablink == preset[0]){
            observingClass = preset[1];
            nameClass = preset[2];
            textClass = preset[3];
            filter = preset[4];
            return true;
        }
    }
    return false;
}



function ConnectionReady(){
    const start = document.getElementById('observe');
    start.disabled = !connected;
    const highlightButton = document.getElementById('startHighlight');
    highlightButton.disabled = !connected;

}


function StartObserve(){
    InjectCode(`observingClass = '${observingClass}';
    nameClass = '${nameClass}';
    textClass = '${textClass}';
    filter = ${JSON.stringify(filter)};
    ${SpeakingDictionaryString()}`,
    function(){
        InjectScript('observer.js', IsObserving);
    });
    const status = document.getElementById('observeStatus');
    status.textContent = "";
}
function StopObserve(){
    InjectCode(`if (typeof StopObserver == 'function') StopObserver();`, function(){
        CheckObserving();
    });
}

function CheckObserving(){
    InjectCode(`if (typeof isObserving == 'undefined') { false; } else { isObserving; }`,
    function(result){
        result = result[0];
        const isObserving = document.getElementById('isObserving');
        if (result){
            isObserving.innerHTML = "Program Is Observing Textchat";
            isObserving.style.color = "lime";
        }
        else{
            isObserving.innerHTML = "Not Observing.";
            isObserving.style.color = "";
        }
    });
}
function IsObserving(successful){
    successful = successful[0];
    const isObserving = document.getElementById('isObserving');
    if (successful){
        isObserving.innerHTML = "Program Is Observing Textchat";
        isObserving.style.color = "lime";
        return;
    }
    isObserving.textContent = "Error - Make sure chat panel is active";
    isObserving.style.color = "red";
}



var linkedSpeakingOptionDict = [];
var speakingOptionDict = {};
function UpdateContentSpeakingOptionDict(){
    InjectCode(SpeakingDictionaryString());
}
function SpeakingDictionaryString(){
    return `speakingOptionDict = ${JSON.stringify(speakingOptionDict)};`;
}
function OnSpeakingOptionChanged(element, node){
    let checked = node.checked;
    speakingOptionDict[element] = checked;
    UpdateContentSpeakingOptionDict();
    
    const status = document.getElementById('observeStatus');
    status.textContent = "Settings changed. Click 'Start' again to apply";
    SaveSpeakingOptions();
}

function LoadSpeakingOptions(nextFunction){
    chrome.storage.local.get(['speakingOptionLinks'], function(result) {
        
        if (result == null || result.speakingOptionLinks == undefined){
        }
        else{

            let saved = result.speakingOptionLinks;
            linkedSpeakingOptionDict = saved;
            let found = false;
            for (let i = 0; i < saved.length; i++){
                if (saved[i]['tablink'] == tablink){
                    found = true;
                    speakingOptionDict['tablink'] = tablink;
                    speakingOptionDict = saved[i];
                    break;
                }
            }
            if (found){
                if (Object.keys(linkedSpeakingOptionDict).length != Object.keys(saved).length){
                    for (let i in saved){
                        if (speakingOptionDict[i]){
                            speakingOptionDict[i] = saved[i];
                        }
                    }
                    SaveSpeakingOptions();
                }
            }
            else{
                speakingOptionDict['tablink'] = tablink;
                linkedSpeakingOptionDict.push(speakingOptionDict);
            }

        }

        //console.log(speakingOptionDict['whiteBlackList']);

        nextFunction();

        //console.log("Other loaded " + otherLoaded);
        /* if (otherLoaded){
            nextFunction();
            return;
        }
        otherLoaded = true; */
    });
}

function SaveSpeakingOptions(){
    let found = false;
    for (let i = 0; i < linkedSpeakingOptionDict.length; i++){
        if (linkedSpeakingOptionDict[i]['tablink'] == tablink){
            found = true;
            linkedSpeakingOptionDict[i] = speakingOptionDict;
            break;
        }
    }
    if (!found){
        speakingOptionDict['tablink'] = tablink;
        linkedSpeakingOptionDict.push(speakingOptionDict);
    }

    //linkedSpeakingOptionDict = {};  //SAVE RESET

    chrome.storage.local.set({speakingOptionLinks: linkedSpeakingOptionDict}, function(){
        //console.log("Speaking Options Saved: ");
        //console.log(linkedSpeakingOptionDict);
    });
}

function DisplaySpeakingOptions(){

    for (let option in speakingStrings){

        let node = document.getElementById(option);
        node.checked = speakingOptionDict[option];
    }
    //DisplayWhiteBlackListSpeakingOptions();
}
/* function DisplayWhiteBlackListSpeakingOptions(){
    const whiteBlackListOption = document.getElementById('whiteBlackListOption');
    //const whiteBlackList = document.getElementById('whiteBlackList');   //NOT FOUND

    let useWhiteBlackList = speakingOptionDict['useWhiteBlackList'];
    //let isWhiteList = speakingOptionDict['isWhiteList'];
    //let whiteBlackListJSON = speakingOptionDict['whiteBlackList'];  //JSON

    whiteBlackListOption.checked = useWhiteBlackList;
    if (useWhiteBlackList){
        whiteBlackListOption.value = 'whitelist';
        if (isWhiteList){
        }
        else{
            whiteBlackListOption.value = 'blacklist';
        } 
    }
    else{
        whiteBlackListOption.value = 'none';
    }

    //SetBlackWhiteList(whiteBlackListJSON);
    //whiteBlackList.value = whiteBlackListText;  //NO

}
*/