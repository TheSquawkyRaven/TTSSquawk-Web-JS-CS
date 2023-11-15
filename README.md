# TTS Squawk

TTS Squawk is a browser extension paired with a server that converts chat messages sent on Google Meet into speech (Text to speech), with the ability to play directly into a selected speaker.

### Features

* Whitelist/blacklist system to filter out specific people in chat.
* Ability to choose any available voice on a Windows system supported by the Speech library.
* Choose a specific speaker to output the voice, in which using [VB-Cable](https://vb-audio.com/Cable/) can channel the voice output into a microphone device.
* Auto conversion of text typed into a voice in Google Meet as a microphone.

### Video Demo

[Youtube Demo](https://youtu.be/dMTg3XHAHH0)

###### Why I made this

TTS Squawk is a hobby project I made during the pandemic. Since most interactions are done through Google Meet at that time, along with microphone problems, and other people not reading chat, I made this to simulate a voice for what I type on the chat.

### Built With

Frontend:
* HTML
* JavaScript
* CSS

Backend:
* C#
* Windows Speech Library

## Getting Started

This is an example of how you may give instructions on setting up your project locally.
To get a local copy up and running follow these simple example steps.

### Installation

Extension
1. Clone the repo.
2. Go to the selected browser's extensions tab.
3. Clone the repo
   ```
   git clone https://github.com/TheSquawkyRaven/TTSSquawk-Web-JS-CS.git
   ```
4. Enable Developer Mode.
5. Click Load Unpacked. Select the folder:
   ```
   /Extension/
   ```

## Usage

1. Get the server running. The exe file can be executed through the build.
2. Open a Google Meet conference call.
3. Ensure the chat is opened on the screen. _The chat window has to stay open for the extension to work._
4. Open the extension.
5. Set any configurations.
6. Click Run or Observe.

## License

Distributed under the MIT License. See `LICENSE.txt` for more information.
