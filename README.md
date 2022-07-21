The server requires System.Speech and MimeMapping packages. Both are available on NuGet

Note to self : The extension uses manifest version 2.0. Chrome will be deprecating this version in 2023. Remember to update to 3.0.

Instructions to <b>Run</b>
1. Download the project code in a zip file.
2. Unpack the zip.
3. Go to Chrome -> Extensions / Manage Extensions.
4. Click Load Unpacked. If this is an update, replace the files and click on the Update button.
5. Browse to the extracted folder and select the 'Extension' folder.
6. Run the TTSSquawk.exe file in 'Server Build'.
7. Open a Google Meet meeting.
8. Open up the chat
9. Open the extension
10. Select an audio speaker. Using VB-Cable in this option and selecting VB-Output as mic in Meet works.
11. Tick 'Auto Speak'. This will automatically speak as soon as a chat is sent/received. (Enable this first for testing purposes)
12. Click Start
13. Type some things into chat and hit send. Make sure the correct speaker is selected. If VB-Cable is used, you can go to your Windows Sounds and enable 'Listen to this device' in VB-Output properties.

Instructions to <b>Compile/Modify Code</b>
1. The files in the 'Extension' folder can be edited directly. The 'Update' button in Extensions is not even needed if the manifest is not modified. But definitely refresh Google Meet since the script injection will have the old script running in the background. Note that this uses manifest 2.0! I will upgrade soon. Also I hope that after I've updated it, I remember to edit this Readme.
2. For the server code, create a Visual Studio C# Console Application in any version. (Recommended .Net 6.0)
3. Copy the 3 .cs files into the project and start working on it.
