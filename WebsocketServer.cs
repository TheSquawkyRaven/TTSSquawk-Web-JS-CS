using System;
using System.Collections.Generic;
using System.Net;
using System.Net.Sockets;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading;
using System.Linq;

/// <summary>
/// Websocket Server that supports multiple clients (a client is handled by a thread each).
/// </summary>
public class WebsocketServer
{

    private class Client
    {
        private static int indexCount = 0;
        public readonly int index;
        public readonly TcpClient client;
        public readonly NetworkStream stream;
        public readonly Queue<byte[]> dataToSend = new Queue<byte[]>();
        public string firstConnectionMessage = string.Empty;
        public bool connected = false;

        public Client(TcpClient client)
        {
            this.client = client;
            stream = client.GetStream();
            index = indexCount++;
        }
    }

    public const int performance = 10;  //The lower, the better the response, but takes up more resources (Used for thread sleep waiting)

    public readonly IPAddress ipAddress;
    public readonly int port;

    public bool Running { get; private set; }

    public TcpListener server;
    public bool ignoreEmptyReplies;

    private readonly ManualResetEvent tcpClientConnected = new ManualResetEvent(false);

    private readonly Dictionary<TcpClient, Client> connections = new Dictionary<TcpClient, Client>();
    public int Connections => connections.Count;

    private readonly Queue<Thread> runningThreads = new Queue<Thread>();

    private Action<TcpClient, string> onDataReceived;
    /// <summary>
    /// Everytime this server receives a socket reply, this will be called
    /// </summary>
    public Action<TcpClient, string> OnDataReceived
    {
        get => onDataReceived;
        set
        {
            if (value == null)
            {
                onDataReceived = (client, text) => { };
                return;
            }
            onDataReceived = value;
        }
    }
    public Action<TcpClient> onConnect;
    /// <summary>
    /// After handshake has been established, this will be called
    /// </summary>
    public Action<TcpClient> OnConnect
    {
        get => onConnect;
        set
        {
            if (value == null)
            {
                onConnect = (client) => { };
                return;
            }
            onConnect = value;
        }
    }

    /// <summary>
    /// Starts a Websocket Server hosted at <paramref name="ipAddress"/>:<paramref name="port"/>
    /// </summary>
    /// <param name="ipAddress">IP Address to be hosted on</param>
    /// <param name="port">Port to be hosted on</param>
    /// <param name="OnDataReceived">Everytime this server receives a socket reply, this will be called</param>
    /// <param name="OnConnect">After handshake has been established, this will be called</param>
    /// <param name="ignoreEmptyReplies">Should empty replies invoke OnDataReceived?</param>
    public WebsocketServer(string ipAddress, int port, Action<TcpClient, string> OnDataReceived = null, Action<TcpClient> OnConnect = null, bool ignoreEmptyReplies = false)
    {
        this.ipAddress = IPAddress.Parse(ipAddress);
        this.port = port;
        this.ignoreEmptyReplies = ignoreEmptyReplies;

        this.OnDataReceived = OnDataReceived;
        this.OnConnect = OnConnect;

    }

    public void Start()
    {
        server = new TcpListener(ipAddress, port);
        server.Start();
        StartListeningForConnections();
        Running = true;
    }
    public void Stop()
    {
        while (runningThreads.Count != 0)
        {
            Thread thread = runningThreads.Dequeue();
            thread.Abort();
        }
        connections.Clear();
        server.Stop();
        Running = false;
    }

    //public static void Main()
    //{
    //    WebsocketServer server = new WebsocketServer("127.0.0.1", 9090, (client, text) =>
    //    {
    //        Console.WriteLine($"Received: {text}");
    //    },
    //    (client) =>
    //    {
    //        Console.WriteLine("Client Connected");
    //    }
    //    );
    //    server.Start();
    //}


    private void StartListeningForConnections()
    {
        Thread thread = new Thread(WaitForConnection);
        thread.Start();
        runningThreads.Enqueue(thread);
    }

    private void WaitForConnection()
    {
        while (true)
        {
            tcpClientConnected.Reset();

            server.BeginAcceptTcpClient(new AsyncCallback(ConnectionReceived), server);

            tcpClientConnected.WaitOne();
        }
    }

    private void ConnectionReceived(IAsyncResult asyncResult)
    {
        TcpClient client = server.EndAcceptTcpClient(asyncResult);

        ProcessConnection(client);
        tcpClientConnected.Set();

    }

    private void ProcessConnection(TcpClient client)
    {
        Thread thread = new Thread(TalkToClient);
        thread.Start(client);
    }

    private void ThreadWait()
    {
        Thread.Sleep(performance);
    }
    private void ThreadSendWait(Client client)
    {
        ThreadWait();
        CheckToSend(client);
    }
    private void TalkToClient(object data)
    {
        TcpClient tcpClient = (TcpClient)data;
        Client client = new Client(tcpClient);
        connections.Add(tcpClient, client);

        WaitForHandshake(client);

        OnConnect(client.client);
        while (true)
        {
            while (!client.stream.DataAvailable) ThreadSendWait(client);
            while (tcpClient.Available < 3) ThreadSendWait(client); // match against "get"

            byte[] bytes = new byte[tcpClient.Available];
            client.stream.Read(bytes, 0, tcpClient.Available);

            ReceiveFromClient(client, bytes);
        }
    }
    private void WaitForHandshake(Client client)
    {
        while (!client.stream.DataAvailable) ThreadWait();
        while (client.client.Available < 3) ThreadWait(); // match against "get"

        byte[] bytes = new byte[client.client.Available];
        client.stream.Read(bytes, 0, client.client.Available);
        string handshakeRequest = Encoding.UTF8.GetString(bytes);

        HandShake(client.stream, handshakeRequest);

    }
    private void CheckToSend(Client client)
    {
        while (client.dataToSend.Count != 0)
        {
            byte[] bytes = client.dataToSend.Dequeue();
            //Console.WriteLine("Sending " + Encoding.ASCII.GetString(bytes));
            try
            {
                client.stream.Write(bytes, 0, bytes.Length);
            }
            catch (System.IO.IOException)
            {
                //Connection has been closed...
                if (connections.ContainsKey(client.client))
                {
                    connections.Remove(client.client);
                }
            }
        }
    }

    private void ReceiveFromClient(Client client, byte[] bytes)
    {
        string text = Decrypt(bytes);
        if (ignoreEmptyReplies && text == string.Empty)
        {
            return;
        }
        onDataReceived(client.client, text);
    }

    private void HandShake(NetworkStream stream, string handshakeRequest)
    {
        //Console.WriteLine("=====Handshaking from client=====\n{0}\n", handshakeRequest);

        // 1. Obtain the value of the "Sec-WebSocket-Key" request header without any leading or trailing whitespace
        // 2. Concatenate it with "258EAFA5-E914-47DA-95CA-C5AB0DC85B11" (a special GUID specified by RFC 6455)
        // 3. Compute SHA-1 and Base64 hash of the new value
        // 4. Write the hash back as the value of "Sec-WebSocket-Accept" response header in an HTTP response
        string swk = Regex.Match(handshakeRequest, "Sec-WebSocket-Key: (.*)").Groups[1].Value.Trim();
        string swka = swk + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";
        byte[] swkaSha1 = System.Security.Cryptography.SHA1.Create().ComputeHash(Encoding.UTF8.GetBytes(swka));
        string swkaSha1Base64 = Convert.ToBase64String(swkaSha1);

        // HTTP/1.1 defines the sequence CR LF as the end-of-line marker
        byte[] response = Encoding.UTF8.GetBytes(
            "HTTP/1.1 101 Switching Protocols\r\n" +
            "Connection: Upgrade\r\n" +
            "Upgrade: websocket\r\n" +
            "Sec-WebSocket-Accept: " + swkaSha1Base64 + "\r\n\r\n");

        stream.Write(response, 0, response.Length);

    }

    private string Decrypt(byte[] bytes)
    {
        byte secondByte = bytes[1];

        byte length = (byte)(secondByte & 127); // may not be the actual length in the two special cases

        int indexFirstMask = 2;          // if not a special case

        if (length == 126)  // if a special case, change indexFirstMask
        {
            indexFirstMask = 4;
        }
        else if (length == 127) // ditto
        {
            indexFirstMask = 10;
        }

        byte[] masks = new byte[]
        {
            bytes[indexFirstMask],
            bytes[indexFirstMask + 1],
            bytes[indexFirstMask + 2],
            bytes[indexFirstMask + 3],
        };  // four bytes starting from indexFirstMask

        int indexFirstDataByte = indexFirstMask + 4; // four bytes further

        byte[] decoded = new byte[bytes.Length - indexFirstDataByte];

        for (int i = indexFirstDataByte, j = 0; i < bytes.Length; i++, j++)
        {
            decoded[j] = (byte)(bytes[i] ^ masks[j % 4]);
        }

        return Encoding.ASCII.GetString(decoded);
    }

    /// <summary>
    /// Reply to a client
    /// </summary>
    /// <param name="client">Client reference from an onDataReceived call</param>
    /// <param name="text">Text to send</param>
    public void SendToClient(TcpClient client, string text)
    {
        if (!Running)
        {
            throw new Exception("Websocket is not running");
        }
        byte[] bytesSend = EncodeTextForSending(text);
        connections[client].dataToSend.Enqueue(bytesSend);
    }
    /// <summary>
    /// Reply to all clients
    /// </summary>
    /// <param name="text">Text to send</param>
    public void SendToAll(string text)
    {
        if (!Running)
        {
            throw new Exception("Websocket is not running");
        }
        byte[] bytesSend = EncodeTextForSending(text);
        foreach (KeyValuePair<TcpClient, Client> client in connections)
        {
            client.Value.dataToSend.Enqueue(bytesSend);
        }
    }

    private byte[] EncodeTextForSending(string text)
    {
        byte[] bytesFormatted;
        byte[] bytesRaw = Encoding.ASCII.GetBytes(text);

        //int indexStartRawData;

        if (bytesRaw.Length <= 125)
        {
            bytesFormatted = new byte[2];
            bytesFormatted[0] = 129;
            bytesFormatted[1] = (byte)bytesRaw.Length;

            //indexStartRawData = 2;
        }
        else if (bytesRaw.Length >= 126 && bytesRaw.Length <= 65535)
        {
            bytesFormatted = new byte[4];
            bytesFormatted[0] = 129;
            bytesFormatted[1] = 126;
            bytesFormatted[2] = (byte)((((byte)bytesRaw.Length) >> 8) & 255);
            bytesFormatted[3] = (byte)(((byte)bytesRaw.Length) & 255);

            //indexStartRawData = 4;
        }
        else
        {
            bytesFormatted = new byte[10];
            bytesFormatted[0] = 129;
            bytesFormatted[1] = 127;
            bytesFormatted[2] = (byte)((((byte)bytesRaw.Length) >> 56) & 255);
            bytesFormatted[3] = (byte)((((byte)bytesRaw.Length) >> 48) & 255);
            bytesFormatted[4] = (byte)((((byte)bytesRaw.Length) >> 40) & 255);
            bytesFormatted[5] = (byte)((((byte)bytesRaw.Length) >> 32) & 255);
            bytesFormatted[6] = (byte)((((byte)bytesRaw.Length) >> 24) & 255);
            bytesFormatted[7] = (byte)((((byte)bytesRaw.Length) >> 16) & 255);
            bytesFormatted[8] = (byte)((((byte)bytesRaw.Length) >> 8) & 255);
            bytesFormatted[9] = (byte)(((byte)bytesRaw.Length) & 255);

            //indexStartRawData = 10;
        }

        // put raw data at the correct index
        byte[] bytesSend = bytesFormatted.Concat(bytesRaw).ToArray();

        return bytesSend;
    }

    /// <summary>
    /// Returns IP Address and Port, ie 127.0.0.1:6969
    /// </summary>
    /// <returns></returns>
    public override string ToString()
    {
        return $"{ipAddress}:{port}";
    }

}