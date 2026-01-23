const express = require("express");
const app = express();
const path = require("path");
const fs = require("fs");
const { exec } = require("child_process");

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const port = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("Judge Backend Running");
});

app.post("/compile", (req, res) => {
  let {
    code,
    language,
    input = "",
    timeLimit = 2,
    memoryLimit = 256,
  } = req.body;

  if (!code || !language) {
    return res.status(400).json({
      verdict: "ERROR",
      message: "Code and language are required",
    });
  }

  // Normalize newlines (Windows → Linux)
  code = code.replace(/\r\n/g, "\n");
  input = input.replace(/\r\n/g, "\n");

  const jobId = Date.now().toString();
  const jobsRoot = path.join(__dirname, "jobs");
  if (!fs.existsSync(jobsRoot)) fs.mkdirSync(jobsRoot);

  const jobDir = path.join(jobsRoot, jobId);
  fs.mkdirSync(jobDir, { recursive: true });

  let fileName;
  if (language === "cpp") fileName = "main.cpp";
  else if (language === "java") fileName = "Main.java";
  else if (language === "python") fileName = "main.py";
  else {
    fs.rmSync(jobDir, { recursive: true, force: true });
    return res.json({ verdict: "ERROR", message: "Unsupported language" });
  }

  fs.writeFileSync(path.join(jobDir, fileName), code);

  const dockerCmd =
    `docker run --rm ` +
    `--memory=${memoryLimit}m ` +
    `--cpus=1 ` +
    `--network=none ` +
    `-v "${jobDir}:/workspace" ` +
    `judge-sandbox ${language} ${timeLimit}`;

  exec(
    dockerCmd,
    {
      timeout: (timeLimit + 2) * 1000,
      input: input, // ✅ SAFE stdin
    },
    (error, stdout, stderr) => {
      fs.rmSync(jobDir, { recursive: true, force: true });

      let verdict = "AC";
      let output = stdout || "";

      if (error) {
        if (error.killed) {
          verdict = "TLE";
          output = "Time limit exceeded";
        } else {
          verdict = "RE";
          output = stderr || error.message;
        }
      }

      if (stderr) {
        if (stderr.includes("error")) {
          verdict = "CE";
          output = stderr;
        }
        if (stderr.toLowerCase().includes("oom")) {
          verdict = "MLE";
          output = "Memory limit exceeded";
        }
      }

      return res.json({ verdict, output });
    }
  );
});

app.listen(port, () => {
  console.log(`Judge backend running on port ${port}`);
});
