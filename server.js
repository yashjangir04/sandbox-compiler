const express = require("express");
const app = express();
const path = require("path");
const fs = require("fs");
const { exec } = require("child_process");
const { spawn } = require("child_process");
``
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const port = process.env.PORT || 3000;

function toDockerPath(winPath) {
  return winPath
    .replace(/\\/g, "/")
    .replace(/^([A-Za-z]):/, (_, d) => `/${d.toLowerCase()}`);
}

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

  if (!code || !language) return res.status(400).json({ message: "Missing fields" });

  code = code.replace(/\r\n/g, "\n");
  input = input.replace(/\r\n/g, "\n");
  if (input !== "" && !input.endsWith("\n")) input += "\n";

  const jobId = Date.now().toString();
  const jobDir = path.join(__dirname, "jobs", jobId);
  fs.mkdirSync(jobDir, { recursive: true });

  let fileName = language === "cpp" ? "main.cpp" : 
                 language === "java" ? "Main.java" : 
                 language === "python" ? "main.py" : "";
                 
  fs.writeFileSync(path.join(jobDir, fileName), code);
  const dockerJobDir = toDockerPath(jobDir);

  // 1. USE SPAWN INSTEAD OF EXEC (Better Stream Handling)
  const child = spawn("docker", [
    "run", "-i", "--rm",
    `--memory=${memoryLimit}m`,
    "--cpus=1",
    "--network=none",
    "-v", `${dockerJobDir}:/workspace`,
    "code-runner", language, timeLimit
  ]);

  let stdoutData = "";
  let stderrData = "";
  let timeoutTriggered = false;

  // 2. INCREASE NODE.JS SAFETY TIMEOUT (15s)
  // This allows slow Docker startup + Compilation time. 
  // The 'run.sh' inside Docker still enforces the strict 2s execution limit.
  const safetyTimer = setTimeout(() => {
    timeoutTriggered = true;
    child.kill(); // Kill the Docker client if it hangs forever
  }, 15000); 

  child.stdout.on("data", (data) => { stdoutData += data.toString(); });
  child.stderr.on("data", (data) => { stderrData += data.toString(); });

  child.on("close", (exitCode) => {
    clearTimeout(safetyTimer);
    try { fs.rmSync(jobDir, { recursive: true, force: true }); } catch (e) {}

    let verdict = "AC";
    let output = stdoutData;

    // 3. ANALYZE EXIT CODES
    if (timeoutTriggered) {
      verdict = "TLE";
      output = "Execution timed out (System)";
    } 
    else if (exitCode === 124) { // 'timeout' command in run.sh returns 124
      verdict = "TLE";
      output = "Time limit exceeded";
    }
    else if (exitCode === 1) { // We set exit 1 for compilation errors in run.sh
      verdict = "CE";
      output = stderrData || stdoutData; // Compilers sometimes print to stdout
    }
    else if (exitCode !== 0) { // Runtime Error (Segfault, etc.)
      verdict = "RE";
      output = stderrData || "Runtime Error";
    }

    res.json({ verdict, output });
  });

  // 4. WRITE INPUT SAFELY
  if (input) {
    child.stdin.write(input);
  }
  child.stdin.end();
});

app.listen(port, () => {
  console.log(`Judge backend running on port ${port}`);
});
