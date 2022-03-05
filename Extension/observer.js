

speakicon = chrome.extension.getURL('speakicon.png');

isObserving = false;
var StopObserver = function() {
    if (observer != undefined){
        observer.disconnect();
        //console.log("Observer disconnected");
        isObserving = false;
    }
}
StopObserver();

var observer;
function SetupObserver(){
    observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            nodes = mutation.addedNodes;
            for (var i = 0; i < nodes.length; i++){
                var node = nodes[i];
                if (!(node instanceof HTMLElement)){
                    continue;
                }
                CheckNode(node);
            }
        });
    });
}

function StartObserver(){
    SetupObserver();

    var obj = {childList: true, subtree: true};
    var findObservingClass;
    findObservingClass = document.getElementsByClassName(observingClass)[0];
    if (findObservingClass == undefined){
        isObserving = false;
        return;
    }
    observer.observe(findObservingClass, obj);
    isObserving = true;
}

var skipThis = false;
var autoSpeak = true;
var buttonInsert;
var nameForButton;
var textForButton;
function CheckNode(node){
    FindContent(node);
    
    if (skipThis){
        return;
    }
    //console.log(node);
    if (speakingOptionDict['suppressSameText'] && CheckSameText()){
        //console.log("Suppressed " + text);
        return;
    }
    
    let speak;
    if (speakingOptionDict['addNameSaid']){
        speak = AddNameIfPossible();
    }
    else{
        speak = text;
    }

    if (speakingOptionDict['autoSpeak'] && autoSpeak){
        Speak(speak);
    }
    if (speakingOptionDict['speakButtons'] && buttonInsert != null){
        let btn = document.createElement('button');
        let speakingName = pName;
        let speakingText = text;
        btn.className = "speakbutton"
        btn.style.width = '20px';
        btn.style.height = '20px';
        btn.style.border = 'none';
        btn.style.backgroundSize = 'cover';
        btn.style.imageRendeing = "pixelated";
        btn.style.borderRadius = "50%";
        btn.style.background = `url(${speakicon})`;
        
        btn.addEventListener('click', function(){
            UpdateVoice(speakingName);
            ButtonSpeak(speakingName, speakingText);
            
        }, null);
        
        if (filter['putButtonInTargetNode']){
            buttonInsert.appendChild(document.createElement('br'));
            buttonInsert.appendChild(btn);
        }
        else{
            let parent = buttonInsert.parentNode;
            parent.appendChild(btn);
        }
    }

    UpdateLastNameText();
}
function FindContent(node){
    skipThis = false;
    autoSpeak = true;
    TextIgnoreIfIs(node);
    if (skipThis){
        return;
    }
    FindName(node);
    if (skipThis){
        return;
    }
    DeepSearchForName();
    NameInList();
    if (skipThis){
        return;
    }
    FindText(node);
    
}
function TextIgnoreIfIs(node){
    if (filter['textIgnoreIfIs']){
        let ignore = filter['textIgnoreIfIs'];
        if (ignore[node.className]){
            skipThis = true;
            return;
        }
    }
}
function TextIgnoreAutoSpeakIfIs(node){
    if (filter['textIgnoreAutoSpeakIfIs']){
        let ignoreAutoTTS = filter['textIgnoreAutoSpeakIfIs'];
        IgnoreAutoSpeakIfIs(node, ignoreAutoTTS);
    }
}
function IgnoreAutoSpeakIfIs(node, ignoreAutoTTS){
    if (ignoreAutoTTS[node.className]){
        console.log("ignore auto");
        autoSpeak = false;
        return;
    }
}
function IgnoreIfContain(node, ignore){
    let children = node.childNodes;
    if (children.length >= 2){  //0 for empty, 1 for plain text only
        for (let child of children){
            if (ignore[child.className]){
                skipThis = true;
                return;
            }
        }
    }
}
function TextIgnoreIfContain(node){
    if (filter['textIgnoreIfContain']){
        let ignore = filter['textIgnoreIfContain'];
        IgnoreIfContain(node, ignore);
    }
}
function NameRemove(){
    if (filter['nameRemove'] && pName){
        pName = pName.replace(filter['nameRemove'], '').trim();
    }
}
function NameSplitIf(node){
    if (filter['nameSplitIf']){
        let list = filter['nameSplitIf'];
        if (list[node.className]){
            let content = text.split(list[node.className]);
            if (content.length == 2){
                pName = content[0];
                text = content[1];
            }
            else{
                skipThis = true;
                console.log("Split FAILED");
                console.log(content);
                return;
            }
        }
    }
}
function GetPlainText(node){
    let children = node.childNodes;
    let text = "";
    for (let i = 0; i < children.length; i++){
        if (children[i].nodeName == '#text'){
            text += children[i].textContent;
            continue;
        }
        if (!isNaN(children[i].textContent)){
            text += children[i].textContent;
        }
    }
    return text;
}
function FindName(node){
    if (node.className == nameClass){
        pName = node.textContent;
    }
    else{
        let nameNode = node.getElementsByClassName(nameClass);
        if (nameNode.length > 0){
            nameNode = nameNode[nameNode.length - 1];
            if (nameNode != null){
                pName = nameNode.textContent;
            }
        }
    }
    nameForButton = pName;
    NameRemove();
}
function FindText(node){
    buttonInsert = node;
    let textNode = node;
    let targetText;
    if (filter['textOnlyIs'] && node.className == textClass){
        targetText = node.textContent;
    }
    else if (filter['textIsAtRoot']){

    }
    else{
        textNode = node.getElementsByClassName(textClass)[0];
    }
    if (textNode != null){
        if (filter['textOnlyIs'] && textNode.className != textClass){
            console.log("Skip coz only is");
            skipThis = true;
            return;
        }
        TextIgnoreIfIs(textNode);
        if (skipThis){
            console.log("Ignore Because Is " + textNode.className);
            return;
        }
        TextIgnoreIfContain(textNode);
        if (skipThis){
            console.log("Ignore Because Contains ");
            return;
        }
        TextIgnoreAutoSpeakIfIs(textNode);

        if (filter['textPlainTextOnly']){
            targetText = GetPlainText(textNode);
            if (!targetText){
                console.log("Probably undefined");
                skipThis = true;
            }
            console.log(targetText);
        }
        else{
            targetText = textNode.textContent;
        }

        buttonInsert = textNode;
        text = targetText;
        textForButton = text;
        return;
    }
    skipThis = true;
    return;
}
function NameInList(){
    if (!speakingOptionDict['useWhiteBlackList']){
        //allow all coz not using black/white list
        return;
    }
    if (UpdateVoice(pName)){
        return;
    }
    
    //skip coz not found in white list
    skipThis = true;
    return;

    
    /* //allow coz not found in blacklist */
}
function UpdateVoice(name){
    if (speakingOptionDict['whiteBlackList']){
        let whitelist = speakingOptionDict['whiteBlackList'];
        if (whitelist[name]){
            voice = whitelist[name];
            return true;
        }
    }
    else{
        voice = "Default";
    }
    return false;
}
function AddNameIfPossible(){
    if (typeof pName === 'undefined'){
        return text;
    }
    return AddName(pName, text);
}
function AddName(name, text){
    return name + " said: " + text;
}
function DeepSearchForName(){
    if (!pName){
        if (filter['deepSearchForName']){
            const content = document.getElementsByClassName(observingClass)[0];
            
            let checkingNode = content.lastChild;
            while (!pName){
                if (checkingNode == null){
                    break;
                }
                FindName(checkingNode);
                checkingNode = checkingNode.previousSibling;
            }
            console.log("Succesful? -> " + pName);

        }
    }
}

function ButtonSpeak(name, text){
    let speak;
    if (speakingOptionDict['addNameSaid']){
        speak = AddName(name, text);
    }
    else{
        speak = text;
    }
    Speak(speak);
}



function Speak(text){

    if (text){
        //console.log("Speaking " + text);
        Send(text, voice);
        //socket.send(text);
    }

}
function CheckSameText(){
    return lastText == text;
}
function UpdateLastNameText(){
    lastPName = pName;
    lastText = text;
}

var lastPName;
var lastText;
var pName;
var voice;
var text;
StartObserver();

isObserving;
