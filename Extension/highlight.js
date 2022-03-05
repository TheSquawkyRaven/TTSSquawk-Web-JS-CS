
if (typeof highlightSetup == 'undefined'){
    var highlightSetup = false;
    var highlightActive = false;
    var popup;
    var sayingText = "";
    var defaultVoice = true;
    var voiceName;
}

function SetupPopup(){
    popup = document.createElement('div');
    const btn = document.createElement('button');
    btn.style.width = "20px";
    btn.style.height = "20px";
    btn.style.border = "none";
    btn.style.marginTop = "2px";
    btn.style.marginLeft = "1px";
    btn.style.backgroundSize = "cover";
    btn.style.imageRendering = "pixelated";
    btn.style.background = `url(${chrome.extension.getURL('speakicon.png')})`;
    popup.appendChild(btn);
    popup.style.width = "22px";
    popup.style.height = "36px";
    popup.style.backgroundImage = `url(${chrome.extension.getURL('speakfloaticon.png')})`;
    popup.style.position = "fixed";
    popup.style.zIndex = "69420";
    popup.style.display = "none";
    document.body.appendChild(popup);

    popup.addEventListener('click', function(){
        if (sayingText){
            if (defaultVoice){
                Send(sayingText);
            }
            else{
                Send(sayingText, voiceName);
            }
            //socket.send(sayingText);
        }
    });
}
function SetupHighlightCapture(){
    document.body.addEventListener('mouseup', function(){
        if (highlightActive){
            let selection = GetSelected();
            if (selection != null){
                HandleSelection(selection);
            }
            else{
                console.log("Highlight is not supported on this browser");
            }
        }
    }, false);
    document.body.addEventListener('scroll', function(){
        if (highlightActive){
            RemovePopup();
        }
    }, false);
}
function StartHighlightCapture(){
    highlightActive = true;
}
function StopHighlightCapture(){
    highlightActive = false;
    RemovePopup();
}
function SetVoice(voice){
    voiceName = voice;
    defaultVoice = false;
}

if (!highlightSetup){
    SetupHighlightCapture();
    SetupPopup();
    highlightSetup = true;
}




function GetSelected() {
    if(window.getSelection){
        return window.getSelection();
    }
    if(document.getSelection) {
        return document.getSelection();
    }
    return null;
}
function RemovePopup(){
    popup.style.display = "none";
    FadeOut();
}
function HandleSelection(selection) {

    let text = selection.toString().trim();

    if(text.length > 0) {
        
        const position = selection.getRangeAt(0);
        const rect = position.getBoundingClientRect();
        
        popup.style.left = `${rect.x + rect.width / 2 - 11}px`;
        popup.style.top = `${rect.y - 36}px`;

        popup.style.display = "block";
        FadeIn();

        sayingText = text;
        return;
    }
    RemovePopup();
}


var fadeID = 69420;
var rate = 50;
var opacityDiff = 0.1;
var add = true;
function FadeIn() {
    clearInterval(fadeID);
    add = true;
    fadeID = setInterval(Fade, rate);
}
function FadeOut(){
    clearInterval(fadeID);
    add = false;
    fadeID = setInterval(Fade, 50);
}

function Fade() {
    opacity = Number(popup.style.opacity);
    
    if ((add && opacity < 1) || (!add && opacity > 0)){
        opacity += add ? opacityDiff : -opacityDiff;
        popup.style.opacity = opacity;
    }
    else{
        clearInterval(fadeID);
    }
}