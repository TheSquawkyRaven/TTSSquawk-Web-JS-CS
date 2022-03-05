using System;
using System.Net;
using System.Text;
using System.Threading;
using System.IO;
using System.Web;
using MimeMapping;

/// <summary>
/// Simple File Server
/// </summary>
public class FileServer
{

    public bool Running { get; private set; }

    public string ipAddress;
    public int port;

    private readonly HttpListener server;
    private string folder;
    public string Folder
    {
        get => folder;
        set
        {
            SetDirectory(value);
            folder = value;
        }
    }
    private string directory;

    private Thread servingThread;

    private void SetDirectory(string folder)
    {
        directory = Directory.GetCurrentDirectory() + (folder.Length == 0 ? string.Empty : "\\" + folder);
    }

    //public static void Main()
    //{
    //    FileServer fileServer = new FileServer("localhost", 6969, "FolderHost");
    //    fileServer.Start();
    //}

    /// <summary>
    /// Starts a File Server so files can be fetched
    /// </summary>
    /// <param name="ipAddress">IP Address to be hosted on</param>
    /// <param name="port">Port number to be hosted on</param>
    /// <param name="relativeFolderPath">The folder path relative to the running directory</param>
    public FileServer(string ipAddress, int port, string relativeFolderPath)
    {
        this.ipAddress = ipAddress;
        this.port = port;
        Folder = relativeFolderPath;

        server = new HttpListener();

    }

    public void Start()
    {
        server.Prefixes.Add($"http://{ipAddress}:{port}/");
        server.Start();

        
        servingThread = new Thread(Serve);
        servingThread.Start();
        Running = true;
    }
    public void Stop()
    {
        servingThread.Abort();
        server.Stop();

        Running = false;
    }

    private void Serve()
    {
        while (true)
        {
            HttpListenerContext context = server.GetContext();
            HttpListenerResponse response = context.Response;

            string file = context.Request.Url.LocalPath;
            string path = directory + file;

            if (File.Exists(path))
            {
                string mimeType = MimeUtility.GetMimeMapping(path);
                response.ContentType = mimeType;

                Stream st = response.OutputStream;
                using (BinaryReader br = new BinaryReader(File.Open(path, FileMode.Open)))
                {
                    while (br.BaseStream.Position != br.BaseStream.Length)
                    {
                        try
                        {
                            byte[] buffer = br.ReadBytes(1024);
                            st.Write(buffer, 0, buffer.Length);
                        }
                        catch (Exception)
                        {
                            break;
                        }
                    }
                }
            }
            context.Response.Close();
        }
    }

    public override string ToString()
    {
        return $"{ipAddress}:{port}";
    }

}