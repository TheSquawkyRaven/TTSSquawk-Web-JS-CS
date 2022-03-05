using System;
using System.Collections;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Text;
using System.Threading;
using System.Speech.Synthesis;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

#pragma warning disable CA1416 // Validate platform compatibility

public class TTS
{

    private const int performance = 10;

    private const string dateTimeWAVFormat = "yyyy-MM-dd~HH.mm.ss.fffff.wav";
    private const string directoryPath = "FolderHost/";
    private string WAVFile => DateTime.Now.ToString(dateTimeWAVFormat);
    private string WAVFilePath => directoryPath + WAVFile;


    private const int serverPort = 6969;
    private const int fileServerPort = 6968;
    private readonly WebsocketServer server;
    private readonly FileServer fileServer;

    private readonly string requestHeader = $"http://localhost:{fileServerPort}/";

    private readonly SpeechSynthesizer speech = new SpeechSynthesizer();
    private readonly List<VoiceInfo> voices = new List<VoiceInfo>();
    private readonly ProcessedMessage processedMessage = new ProcessedMessage();

    private readonly Queue<(TcpClient, string)> processQueue = new Queue<(TcpClient, string)>();

    private readonly Dictionary<string, string> generatedFiles = new Dictionary<string, string>();

    public static void Main()
    {
        TTS tts = new TTS();
        Console.WriteLine($"Hosting contact server at http://{tts.server}");
        Console.WriteLine($"Hosting file server at http://{tts.fileServer}");


        //client.Start();
        //Console.WriteLine($"Type anything at any point to view debug information");     


        //client.WaitForInputDebug();
    }

    private TTS()
    {
        InitilaizeVoices();

        if (!Directory.Exists("FolderHost"))
        {
            Directory.CreateDirectory("FolderHost");
        }

        server = new WebsocketServer("127.0.0.1", serverPort, DataReceived, OnConnect);
        fileServer = new FileServer("127.0.0.1", fileServerPort, "FolderHost");

        server.Start();
        fileServer.Start();

        Thread thread = new Thread(ProcessQueue);
        thread.Start();
        //If error occurs here means there are no voices
    }

    private void InitilaizeVoices()
    {
        System.Collections.ObjectModel.ReadOnlyCollection<InstalledVoice> voiceCollection = speech.GetInstalledVoices();
        foreach (InstalledVoice voice in voiceCollection)
        {
            voices.Add(voice.VoiceInfo);
        }
    }


    private void DataReceived(TcpClient client, string text)
    {
        //Console.WriteLine("Received => " + text);
        processQueue.Enqueue((client, text));
    }
    private void OnConnect(TcpClient client)
    {
        for (int i = 0; i < voices.Count; i++)
        {
            string json = $"{voices[i].Name}:{voices[i].Description}";
            server.SendToClient(client, json);
        }
        server.SendToClient(client, "!{<-VOICES->}!");

    }

    private void ProcessQueue()
    {
        while (true)
        {
            while (processQueue.Count != 0)
            {
                (TcpClient, string) pair = processQueue.Dequeue();
                string response = ProcessMessage(pair.Item2);
                if (response != null)
                {
                    string send = requestHeader + response;
                    generatedFiles.Add(send, response);
                    server.SendToClient(pair.Item1, send);
                }
            }
            Thread.Sleep(performance);
        }
    }

    private class ProcessedMessage
    {
        public bool valid = false;
        public bool defaultVoice = false;
        public string voiceName;
        public string speak;
        public void Process(string text)
        {
            Console.WriteLine(text);
            string numbers = text.Substring(0, 2);
            if (int.TryParse(numbers, out int chars))
            {
                voiceName = text.Substring(2, chars);
                if (text.Length > 2 + chars)
                {
                    speak = text.Substring(2 + chars);
                    valid = true;
                }
                else
                {
                    valid = false;
                }

                defaultVoice = voiceName == "Default";
            }
            else
            {
                defaultVoice = true;
                speak = text;
                valid = true;
            }
        }
    }
    private bool CheckIsLinkString(string text)
    {
        if (text.StartsWith("http://localhost"))
        {
            if (generatedFiles.TryGetValue(text, out string path))
            {
                if (File.Exists(directoryPath + path))
                {
                    //Console.WriteLine(directoryPath + path + " deleted");
                    try
                    {
                        File.Delete(directoryPath + path);
                    }
                    catch (IOException)
                    {
                        Console.WriteLine("IO Exception when deleting, might be spamming speeches!");
                    }
                    generatedFiles.Remove(text);
                }
                //Console.WriteLine(directoryPath + path + " NOT FOUND!");
            }
            return true;
        }

        return false;
    }
    private string ProcessMessage(string text)
    {
        //FORMAT: "00NameSpeakingText";
        //"00" -> Numbers Describing how many next characters are used to identify the name.
        //"Name" -> Exact name using the numbers are used to identify the voice spoken
        //"SpeakingText" -> Speaking Text

        if (CheckIsLinkString(text))
        {
            return null;
        }

        processedMessage.Process(text);
        if (!processedMessage.valid)
        {
            Console.WriteLine("INVALID!!!!!");
            return string.Empty;
        }

        string path = ConvertToWAV(processedMessage.speak, processedMessage.defaultVoice, processedMessage.voiceName);
        path = FilterPath(path);

        //Console.WriteLine(path);
        return path;
        //SendToClientStream(path);
    }

    private string ConvertToWAV(string message, bool defaultVoice, string voiceName)
    {
        string path = WAVFilePath;

        speech.SetOutputToWaveFile(path);

        if (defaultVoice)
        {
            speech.SelectVoice(voices[0].Name);
        }
        else
        {
            try
            {
                speech.SelectVoice(voiceName);
            }
            catch
            {
                //Voice Probably Incorrect, thus use the last voice OR default voice
            }
        }
        speech.Speak(message);

        speech.SetOutputToNull();

        return path;
    }

    private string FilterPath(string path)
    {
        int length = directoryPath.Length;
        path = path.Substring(length);
        return path;
    }

}
