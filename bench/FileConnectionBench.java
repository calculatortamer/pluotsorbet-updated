package benchmark;

import com.sun.cldchi.jvm.JVM;
import com.sun.midp.crypto.SecureRandom;
import java.io.OutputStream;
import javax.microedition.io.Connector;
import javax.microedition.io.file.FileConnection;
import org.mozilla.MemorySampler;

public class FileConnectionBench {
  private static final byte[] b = new byte[1024];

  void runBenchmark() {
    try {
      long start, time;

      start = JVM.monotonicTimeMillis();

      String privateDir = System.getProperty("fileconn.dir.private");
      String filename = String.valueOf(System.currentTimeMillis());
      FileConnection file = (FileConnection)Connector.open(privateDir + filename);
      System.out.println("Writing to file " + privateDir + filename);
      file.create();

      OutputStream out = file.openOutputStream();
      for (int i = 0; i < 1000; i++) {
        out.write(b);
      }
      out.close();

      time = JVM.monotonicTimeMillis() - start;
      System.out.println("FileConnection.write time: " + time);
    } catch (Exception e) {
      System.out.println("Unexpected exception: " + e);
      e.printStackTrace();
    }
  }

  public static void main(String args[]) {
    try {
      SecureRandom rnd = SecureRandom.getInstance(SecureRandom.ALG_SECURE_RANDOM);
      rnd.nextBytes(b, 0, 1024);
    } catch (Exception e) {
      System.out.println("Unexpected exception: " + e);
      e.printStackTrace();
    }

    FileConnectionBench bench = new FileConnectionBench();

    MemorySampler.sampleMemory();
    bench.runBenchmark();
    MemorySampler.sampleMemory();
  }
}
