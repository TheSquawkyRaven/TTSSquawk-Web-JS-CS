
if (typeof hasSetup == 'undefined'){
    var hasSetup = true;
    var sendingDataAudioOutputDevices = null;
    var speakerDevices = null;
    var targetSpeaker = null;
    var speakerSelectedID = null;
    var socket = null;
    var socketOpen = null;
    var lastAudio = null;

    var voices = {};
    var voicesRead = false;

    //Mic devices Connection
    var gottenSpeakerDevices = false;
    function RequestDevices(){
        const mediaConstraints = {
            audio: true
        };
        navigator.mediaDevices.getUserMedia(mediaConstraints);
        navigator.mediaDevices.enumerateDevices().then(FilterDevices);
    }
    
    function FilterDevices(deviceInfos){
        sendingDataAudioOutputDevices = [];
        speakerDevices = [];
        
        let index = 0;
        for (let i = 0; i < deviceInfos.length; i++) {
            const deviceInfo = deviceInfos[i];
    
            if (deviceInfo.kind !== "audiooutput"){
                continue;
            }
    
            speakerDevices[index] = deviceInfo;
            sendingDataAudioOutputDevices[index] = deviceInfo.deviceId + "\n" + deviceInfo.label;
            index++;
        }
        gottenSpeakerDevices = true;
    }
    RequestDevices();

    function Send(text, voice = null){
        speak = "";
        if (voice){
            let length = voice.length;
            if (length == 2){
                console.log(voice + "->" + length);
            }
            if (length > 99){
                console.log("WARNING! Add voice Length!!!!");
                speak = text;
            }
            else{
                if (length < 10){
                    speak = "0";
                }
                speak = `${speak}${length}${voice}${text}`;
            }
        }
        else{
            speak = text;
        }
        
        socket.send(speak);

    }


    function RemoveLastAudio(){
        if (lastAudio){
            lastAudio.pause();
            if (socketOpen){
                socket.send(lastAudio.src);
            }
            lastAudio.remove();
            lastAudio = null;
        }
    }

    function AttemptConnection(){
        //Server Connection
        socket = new WebSocket("ws://127.0.0.1:6969");
        socketOpen = false;
        socketConnecting = true;
        socket.onopen = function(){
            socketOpen = true;
            socketConnecting = false;
            voicesRead = false;
        };
        
        socket.onmessage = function(message){

            socketOpen = true;
            socketConnecting = true;        
            
            if (message.data == '!{<-VOICES->}!'){
                voicesRead = true;
                return;
            }
            if (!voicesRead){
                voice = message.data.split(':');
                voices[voice[0]] = voice[1];
                voice = voice[1];
                return;
            }

            RemoveLastAudio();
            let aud = document.createElement('audio');
            aud.className = "ttsSpeechAudio";
            aud.src = message.data;
            aud.setSinkId(targetSpeaker.deviceId).then(function(){
                aud.play();
            });
            aud.onended = function(){
                RemoveLastAudio();
            };
            lastAudio = aud;
        };
        
        socket.onclose = function(){
            socketOpen = false;
            socketConnecting = false;
            readVoices = false;
            voicesRead = false;

            AttemptConnection();
        };
    }
    AttemptConnection();

}

